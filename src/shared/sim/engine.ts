// The leap engine. Pure and deterministic: (world, actions, seed) -> next world.
import { CARDS, EVIL_ONES, SPECIES, TERRAIN, genArtifactName, kindForBuild, leapNameFor } from './data';
import { canSettle, foundCiv, hexDistance, neighbours, raiseRing, settle } from './map';
import { Rng } from './rng';
import {
  activeAscendants, beliefOf, cardCost, civPeople, isAscOwner, ownedRegions, rollLeapYears, scaled,
  strength, trustIncome, weightOf,
} from './rules';
import { botActions } from './bots';
import { seasonAfterLeap, seasonTick } from './season';
import { chronicleTitle } from './chronicle';
import type {
  ActionCard, Artifact, ArtifactKind, Ascendant, LeapInput, LeapResult, Region, WorldEvent, WorldState,
} from './types';
import { HOLLOW, RUIN, WILD } from './types';

export type Ctx = {
  w: WorldState;
  rng: Rng;
  events: WorldEvent[];
  trust: Record<string, number>;
  rem: Record<string, number>;
  trustDelta: Record<string, number>;
  remDelta: Record<string, number>;
  newArtifacts: Artifact[];
  inbox: { asc: string; text: string }[];
  drift: Map<number, number>;
  newCorrupt: number;
  leapNo: number;
};

export const addTrust = (c: Ctx, id: string, amt: number) => {
  c.trust[id] = (c.trust[id] ?? 0) + amt;
  c.trustDelta[id] = (c.trustDelta[id] ?? 0) + amt;
};
export const addRem = (c: Ctx, id: string, amt: number) => {
  c.rem[id] = (c.rem[id] ?? 0) + amt;
  c.remDelta[id] = (c.remDelta[id] ?? 0) + amt;
};

export const event = (c: Ctx, e: Omit<WorldEvent, 'civs'> & { civs?: string[] }) => {
  const civs = e.civs ?? e.ascs.map((a) => c.w.ascendants[a]?.civId).filter((x): x is string => !!x);
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const personal = e.personal ? Object.fromEntries(Object.entries(e.personal).map(([k, v]) => [k, cap(v)])) : undefined;
  c.events.push({ ...e, text: cap(e.text), civs, ...(personal ? { personal } : {}) });
};

const fmtYear = (y: number) => `Year ${y.toLocaleString('en-US')}`;
export const ascLabel = (a: Ascendant | undefined) => (a ? a.name : 'someone');

export const makeArtifact = (
  w: WorldState, out: Artifact[], asc: Ascendant, kind: ArtifactKind | null, place: string, rng: Rng,
  opts: { name?: string; great?: boolean; power?: Artifact['power'] } = {}
): Artifact => {
  const name = opts.name ?? genArtifactName(asc.species, place, () => rng.next());
  const a: Artifact = {
    id: `a${w.id === 'shared' ? '' : w.id.slice(0, 4)}${w.seq++}`,
    kind: kind ?? kindForBuild(name), name, ascendantId: asc.id, civName: asc.civName, species: asc.species,
    yearMade: w.year, inscription: asc.scripture, great: opts.great ?? false, power: opts.power ?? null,
    foundBy: null, foundYear: null, destroyed: false,
  };
  out.push(a);
  return a;
};

/** Turn a living region into a ruin layer. */
export const razeRegion = (c: Ctx, reg: Region, _reason: string) => {
  const builder = c.w.ascendants[reg.owner];
  if (builder) {
    const arts = [...reg.relics];
    if (c.rng.chance(0.7)) arts.push(makeArtifact(c.w, c.newArtifacts, builder, null, reg.name, c.rng).id);
    reg.ruinLayers.push({ builder: builder.id, civName: builder.civName, species: builder.species, year: c.w.year, artifacts: arts });
    reg.ruinLayers = reg.ruinLayers.slice(-5);
    reg.ruinRealm = SPECIES[builder.species].realm;
  }
  reg.owner = RUIN;
  reg.people = 0;
  reg.relics = [];
  reg.processes = [];
  reg.conversion = {};
};

export const collapseCiv = (c: Ctx, asc: Ascendant, cause: string) => {
  const regs = ownedRegions(c.w, asc.id);
  // Ashborne: once a season, rise again at half People instead of fading.
  const seasonKey = c.w.season?.id ?? `s${c.w.seasonCount}`;
  if (asc.species === 'ashborne' && asc.ashRisen !== seasonKey && regs.length) {
    asc.ashRisen = seasonKey;
    const best = regs.reduce((a, b) => (b.food > a.food ? b : a));
    best.people = Math.max(best.people, 1.5);
    event(c, {
      kind: 'rebirth', weight: 6, ascs: [asc.id],
      text: `From the pyres of ${best.name}, ${asc.civName} rose again.`,
      title: `The Rebirth of ${best.name}`,
    });
    return;
  }
  const civ = asc.civId ? c.w.civs[asc.civId] : undefined;
  const homeName = regs[0]?.name ?? asc.civName;
  for (const r of regs) razeRegion(c, r, cause);
  // the sealed Book of the people is buried as a Great Relic
  const lastRuin = regs[0];
  if (lastRuin && civ) {
    const book = makeArtifact(c.w, c.newArtifacts, asc, 'scripture', homeName, c.rng, {
      name: `The Book of ${homeName}`, great: true, power: 'crown',
    });
    lastRuin.ruinLayers[lastRuin.ruinLayers.length - 1]?.artifacts.push(book.id);
  }
  if (civ) civ.fellYear = c.w.year;
  asc.status = 'fading';
  asc.fadedAt = c.leapNo;
  asc.civId = null;
  asc.shrines = [];
  event(c, {
    kind: 'fall', weight: 9, ascs: [asc.id],
    text: `${civ ? civ.name[0]!.toUpperCase() + civ.name.slice(1) : 'A people'} fell ${cause}. ${asc.name} fades from memory.`,
    personal: { [asc.id]: `Your people fell ${cause}. You are fading, but the ruins remember you.` },
    title: `The Fall of ${homeName}`,
  });
  c.inbox.push({ asc: asc.id, text: `Your civilization has fallen (${fmtYear(c.w.year)}). Dig, prophesy and Whisper to return.` });
};

/** A fading Ascendant returns on a region with 3k People. */
export const returnAscendant = (c: Ctx, asc: Ascendant, reg: Region, how: string) => {
  if (reg.owner !== WILD && reg.owner !== RUIN) return false;
  if (!canSettle(asc.species, reg.terrain, asc.domain === 'sea')) return false;
  asc.status = 'returned';
  foundCiv(c.w, asc, reg, Math.max(3, reg.people), c.rng);
  asc.protectedUntil = c.leapNo + 2;
  event(c, {
    kind: 'return', weight: 8, ascs: [asc.id],
    text: `The forgotten Ascendant ${asc.name} has returned${how}, to ${reg.name}.`,
    personal: { [asc.id]: `You have returned. ${asc.civName} begins in ${reg.name}.` },
    title: `The Return of ${asc.name}`,
  });
  return true;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const shiftDoubt = (c: Ctx, r: Region, amt: number) => {
  // positive amt moves belief toward Doubtful, capped per leap for drift
  if (amt > 0) {
    const fromF = Math.min(r.belief.faithful, amt * 0.7);
    const fromD = Math.min(r.belief.devoted, amt - fromF);
    r.belief.faithful -= fromF;
    r.belief.devoted -= fromD;
    r.belief.doubtful += fromF + fromD;
  } else {
    const take = Math.min(r.belief.doubtful, -amt);
    r.belief.doubtful -= take;
    r.belief.faithful += take;
  }
  void c;
};

export const reveal = (c: Ctx, reg: Region, ascId: string) => {
  reg.fog = false;
  reg.revealedBy = ascId;
  const s = c.w.season;
  if (s && !s.outcome) {
    if (reg.id === s.source && !s.discovered) discoverSource(c, ascId, 'exploring the fog');
    if (reg.id === s.lair && s.awake && !s.lairFound) discoverLair(c, ascId, 'exploring the fog');
  }
};

export const discoverSource = (c: Ctx, ascId: string, how: string) => {
  const s = c.w.season;
  if (!s || s.discovered) return;
  s.discovered = true;
  s.discoveredBy = ascId;
  const asc = c.w.ascendants[ascId];
  const reg = c.w.regions[s.source];
  const evil = EVIL_ONES[s.evilOne]!;
  addTrust(c, ascId, scaled(c.w, ascId, 50));
  if (asc) asc.titles.push(`Seeker of ${evil.blight}`);
  const who = asc?.username ? `u/${asc.username}` : ascLabel(asc);
  event(c, {
    kind: 'discovery', weight: 12, ascs: [ascId],
    text: `${who} found the heart of ${evil.blight} in ${reg?.name ?? 'the dark'}, ${how}.`,
    personal: { [ascId]: `You found the heart of ${evil.blight}. You are named Seeker of ${evil.blight}.` },
    title: `The Finding of ${evil.blight}`,
  });
};

export const discoverLair = (c: Ctx, ascId: string, how: string) => {
  const s = c.w.season;
  if (!s || s.lairFound) return;
  s.lairFound = true;
  s.lairFoundBy = ascId;
  if (!s.discovered) {
    s.discovered = true;
    s.discoveredBy = ascId;
  }
  const evil = EVIL_ONES[s.evilOne]!;
  const reg = c.w.regions[s.lair];
  addTrust(c, ascId, scaled(c.w, ascId, 25));
  event(c, {
    kind: 'lair', weight: 12, ascs: [ascId],
    text: `The lair is found, ${how}! ${evil.name}, ${evil.epithet}, waits in ${reg?.name ?? 'the dark'}: ${evil.form}. Pledge Trust to wound it.`,
    title: `The Lair of ${evil.name}`,
  });
};

const applyAction = (c: Ctx, a: ActionCard) => {
  const w = c.w;
  const asc = w.ascendants[a.ascendantId];
  if (!asc) return;
  const reg = a.target !== null ? w.regions[a.target] : undefined;
  const own = ownedRegions(w, asc.id);
  const s = w.season;
  const def = CARDS[a.card];
  // Spending Trust on your own people builds belief.
  if (reg?.owner === asc.id || def.target === 'none') for (const r of own) shiftDoubt(c, r, -0.01);

  switch (a.card) {
    case 'bless':
      if (reg) {
        reg.processes.push({ kind: 'food', amount: 25, ticks: 3 });
        if (reg.owner !== asc.id) {
          const other = w.ascendants[reg.owner];
          if (other?.isBot) other.memory[asc.id] = clamp((other.memory[asc.id] ?? 0) + 2, -10, 10);
        }
      }
      break;
    case 'spring':
      if (reg && reg.owner === asc.id) reg.foodCap = Math.min(150, reg.foodCap + 15);
      break;
    case 'inspire':
      asc.inspire = 2;
      for (const r of own) shiftDoubt(c, r, -0.05);
      break;
    case 'teach': {
      if (!reg || reg.owner !== asc.id) break;
      let amount = 20;
      let ticks = 5;
      const sp = asc.species;
      if (sp === 'emberkin') ticks = 1;
      if (sp === 'stonebound') { ticks = 10; amount = 40; }
      if (sp === 'sylvan') ticks = 20;
      if (sp === 'fangkin') amount *= 2;
      if (sp === 'duskwings' && beliefOf(w, asc.id).devoted >= 0.3) amount *= 1.5;
      if (asc.domain === 'war') amount *= 1.1;
      if (asc.domain === 'wisdom') ticks = Math.max(1, Math.round(ticks / 2));
      if (asc.domain === 'harvest') { reg.foodCap = Math.min(150, reg.foodCap + 10); amount /= 2; }
      reg.processes.push({ kind: 'might', amount, ticks, delay: 0 });
      break;
    }
    case 'whisper': {
      if (!reg) break;
      if (reg.owner === HOLLOW && s && !s.outcome) {
        discoverSource(c, asc.id, 'listening to the Hollowed');
        if (s.awake) discoverLair(c, asc.id, 'listening to the Hollowed');
        break;
      }
      const rem = c.rem[asc.id] ?? 0;
      if (asc.status === 'fading') {
        if (rem >= 5 && (reg.owner === WILD || reg.owner === RUIN) && !reg.landing && !reg.fog) {
          if (c.rng.chance(0.7)) returnAscendant(c, asc, reg, '');
          else event(c, {
            kind: 'whisper', weight: 1, ascs: [asc.id], text: `${asc.name} whispered to ${reg.name}, but no one answered.`,
            personal: { [asc.id]: `You whispered to ${reg.name}, but no one answered. Try again.` },
          });
        } else if (rem < 5) {
          c.inbox.push({ asc: asc.id, text: `Your Whisper faded: you need 5 Remembrance to return (you have ${rem}).` });
        }
        break;
      }
      if (reg.owner !== WILD || reg.people <= 0 || reg.landing) break;
      let amt = 0.22 + c.rng.next() * 0.12;
      if (asc.species === 'duskwings') amt *= 1.5;
      if (reg.species === 'stonebound') amt *= 0.6;
      amt /= 1 + 0.5 * reg.tradition;
      reg.processes.push({ kind: 'convert', asc: asc.id, amount: amt, ticks: 5 });
      break;
    }
    case 'sign':
      if (asc.status === 'fading') {
        const ruin = w.regions.find((r) => r.owner === RUIN && r.ruinLayers.some((l) => l.builder === asc.id));
        if (ruin) {
          ruin.glowUntil = c.leapNo + 3;
          event(c, { kind: 'sign', weight: 3, ascs: [asc.id], text: `A light glows over the ruins of ${ruin.name}. Something there wants to be found.` });
        }
      } else for (const r of own) shiftDoubt(c, r, -0.03);
      break;
    case 'smite': {
      if (!reg || !isAscOwner(reg.owner) || reg.owner === asc.id) break;
      const victim = w.ascendants[reg.owner];
      if (!victim || victim.protectedUntil > c.leapNo) break;
      let f = reg.smitesThisLeap > 0 ? 0.5 : 1;
      if (reg.species === 'mirefolk') f *= 0.5;
      reg.smitesThisLeap++;
      reg.people *= 1 - 0.1 * f;
      reg.might = Math.max(0, reg.might - 15 * f);
      if (c.rng.chance(0.4)) reg.relics.push(makeArtifact(w, c.newArtifacts, victim, 'weapon', reg.name, c.rng).id);
      if (own.some((r) => hexDistance(r, reg) <= 2)) for (const r of own) shiftDoubt(c, r, 0.02);
      if (victim.isBot) victim.memory[asc.id] = clamp((victim.memory[asc.id] ?? 0) - 4, -10, 10);
      event(c, {
        kind: 'smite', weight: 4, ascs: [asc.id, victim.id],
        text: `${asc.name} smote ${reg.name}, and ${victim.civName} wept.`,
        personal: { [asc.id]: `Your Smite fell on ${reg.name}.`, [victim.id]: `${asc.name} smote your people in ${reg.name}.` },
        title: `The Smiting of ${reg.name}`,
      });
      if (reg.people < 0.5) razeRegion(c, reg, 'smitten');
      break;
    }
    case 'ward':
      if (reg) reg.ward = true;
      break;
    case 'cleanse':
      if (!reg) break;
      reg.corruption = Math.max(0, reg.corruption - 30);
      if (s && !s.outcome) {
        if (reg.id === s.source && !s.discovered) discoverSource(c, asc.id, 'cleansing it');
        if (s.awake && reg.id === s.lair) {
          if (!s.lairFound) discoverLair(c, asc.id, 'cleansing it');
          s.hp = Math.max(0, s.hp - 25);
          if (s.hp <= 0 && !s.slayer) s.slayer = asc.id;
        }
      }
      break;
    case 'explore': {
      if (!reg || !reg.fog) break;
      const touch = neighbours(w.regions, reg.id).some((n) => !w.regions[n]?.fog);
      if (!touch) break;
      if (c.rng.chance(0.2)) {
        event(c, { kind: 'explore', weight: 2, ascs: [asc.id], text: `An expedition sent by ${asc.name} into the fog was never seen again.`,
          personal: { [asc.id]: 'Your expedition into the fog was lost.' } });
      } else {
        reveal(c, reg, asc.id);
        event(c, {
          kind: 'explore', weight: 4, ascs: [asc.id], text: `${asc.name}'s explorers walked out of the fog into ${reg.name}.`,
          personal: { [asc.id]: `Your explorers revealed ${reg.name}. You may give it a name.` },
          title: `The Unveiling of ${reg.name}`,
        });
      }
      break;
    }
    case 'commission': {
      if (!reg || reg.owner !== asc.id) break;
      const art = makeArtifact(w, c.newArtifacts, asc, null, reg.name, c.rng);
      reg.relics.push(art.id);
      reg.belief.devoted = Math.min(1, reg.belief.devoted + 0.03);
      reg.belief.doubtful = Math.max(0, reg.belief.doubtful - 0.03);
      event(c, {
        kind: 'commission', weight: 3, ascs: [asc.id],
        text: `In ${reg.name}, ${asc.civName} raised ${art.name}, carved with the words “${asc.scripture || '…'}”.`,
        personal: { [asc.id]: `Your people built ${art.name}.` },
      });
      break;
    }
    case 'envoy': {
      const to = a.to ? w.ascendants[a.to] : undefined;
      if (!to || !a.text) break;
      c.inbox.push({ asc: to.id, text: `An envoy from ${asc.name}: “${a.text}”` });
      event(c, {
        kind: 'envoy', weight: 1, ascs: [asc.id, to.id],
        text: `An envoy of ${asc.name} came before ${to.name}, saying: “${a.text}”`,
        personal: { [asc.id]: `Your envoy reached ${to.name}.`, [to.id]: `An envoy from ${asc.name} arrived.` },
      });
      break;
    }
  }
};

const runProcesses = (r: Region) => {
  const keep = [];
  for (const p of r.processes) {
    if (p.kind === 'food') r.food = Math.min(r.foodCap, r.food + p.amount / Math.max(1, p.ticks + 0));
    if (p.kind === 'might') {
      if (p.delay > 0) { keep.push({ ...p, delay: p.delay - 1 }); continue; }
      const cap = r.species === 'duskwings' ? 40 : 100;
      r.might = Math.min(cap, r.might + p.amount / p.ticks);
    }
    if (p.kind === 'convert') {
      const per = p.amount / p.ticks;
      r.conversion[p.asc] = Math.min(1, (r.conversion[p.asc] ?? 0) + per);
    }
    const left = p.ticks - 1;
    if (left > 0) {
      if (p.kind === 'food') keep.push({ ...p, amount: p.amount - p.amount / p.ticks, ticks: left });
      else if (p.kind === 'might') keep.push({ ...p, amount: p.amount - p.amount / p.ticks, ticks: left });
      else keep.push({ ...p, amount: p.amount - p.amount / p.ticks, ticks: left });
    }
  }
  r.processes = keep;
};

const tickRegion = (c: Ctx, r: Region) => {
  const w = c.w;
  runProcesses(r);
  if (r.owner === WILD && r.people > 0) {
    const cap = TERRAIN[r.terrain].yield * 0.6;
    r.people = Math.min(cap, r.people * 1.01);
    // conversion completes
    for (const [ascId, prog] of Object.entries(r.conversion)) {
      if (prog <= 0.5) continue;
      const asc = w.ascendants[ascId];
      if (!asc || asc.status === 'fading') continue;
      const people = r.people;
      const sp = r.species;
      settle(w, asc, r, people);
      r.species = sp; // they keep their own species
      r.belief = { devoted: 0.2, faithful: 0.55, doubtful: 0.25 };
      event(c, {
        kind: 'convert', weight: 5, ascs: [asc.id],
        text: `The ${SPECIES[sp].name} of ${r.name} came to believe in ${asc.name}.`,
        personal: { [asc.id]: `The people of ${r.name} now believe in you. Your land grows.` },
        title: `The Conversion of ${r.name}`,
      });
      break;
    }
    return;
  }
  if (!isAscOwner(r.owner)) return;
  const asc = w.ascendants[r.owner];
  if (!asc) return;
  const sp = r.species;
  const def = SPECIES[sp];
  let y = TERRAIN[r.terrain].yield;
  const watery = r.terrain === 'coast' || r.terrain === 'water';
  if (asc.domain === 'harvest') y *= 1.1;
  if (sp === 'tidefolk' && !watery) y *= 0.7;
  if (sp === 'mirefolk' && r.terrain !== 'swamp') y *= 0.8;
  if (sp === 'sylvan') y *= 0.8;
  if (sp === 'ashborne' && watery) y *= 0.6;
  if (sp === 'tidefolk') {
    const others = neighbours(w.regions, r.id).filter((n) => {
      const o = w.regions[n]!.owner;
      return isAscOwner(o) && o !== r.owner;
    }).length;
    y += Math.min(3, others) * 2;
  }
  r.food = clamp(r.food + y - r.people * 0.9, 0, r.foodCap);
  if (r.food > 60) r.people *= 1 + 0.02 * def.growth;
  else if (r.food < 20) {
    let loss = 0.04;
    if (sp === 'emberkin') loss *= 2;
    if (sp === 'burrowkin') loss = Math.min(loss, 0.02);
    r.people *= 1 - loss;
    shiftDoubt(c, r, 0.02);
  }
  // memory: belief drifts toward Doubtful, capped at 8 points per leap
  let drift = 0.01 * (60 / def.lifespan);
  if (sp === 'sylvan') drift *= 0.3;
  if (sp === 'humans') drift += 0.01;
  if (sp === 'duskwings') drift += 0.01;
  if (sp === 'fangkin' && r.food < 40) drift += 0.02;
  // Old civilizations slowly forget why they believe.
  const age = w.year - asc.foundedYear;
  if (age > 300) drift += 0.002 * ((age - 300) / 100);
  const used = c.drift.get(r.id) ?? 0;
  drift = Math.min(drift, Math.max(0, 0.08 - used));
  c.drift.set(r.id, used + drift);
  shiftDoubt(c, r, drift);
  // prosperity: a well-fed people believes more
  if (r.food > 70) {
    const back = Math.min(r.belief.doubtful, 0.005);
    r.belief.doubtful -= back;
    r.belief.faithful += back;
    if (r.belief.faithful > 0.1) {
      r.belief.faithful -= 0.004;
      r.belief.devoted += 0.004;
    }
  }
  if (r.might > 30 && sp !== 'burrowkin' && sp !== 'stonebound') r.might -= 0.3;
  if (r.corruption > 60) {
    r.people *= 0.97;
    shiftDoubt(c, r, 0.03);
  }
  // temples after 50 years of strong faith
  if (r.belief.devoted >= 0.33) r.faithTicks++;
  if (r.faithTicks >= 10) {
    r.faithTicks = -30;
    const art = makeArtifact(w, c.newArtifacts, asc, 'temple', r.name, c.rng, { name: `The Temple of ${asc.name} at ${r.name}` });
    r.relics.push(art.id);
    event(c, { kind: 'temple', weight: 2, ascs: [asc.id], text: `${asc.civName} raised a temple to ${asc.name} at ${r.name}.`,
      personal: { [asc.id]: `Your faithful built you a temple at ${r.name}.` } });
  }
  // calamities
  if (w.kind === 'shared' && c.rng.chance(0.003)) {
    const what = c.rng.pick(['A plague', 'A great fire', 'A flood', 'An earthquake']);
    r.people *= 0.6;
    r.food *= 0.5;
    event(c, { kind: 'calamity', weight: 3, ascs: [asc.id], text: `${what} struck ${r.name}.`,
      personal: { [asc.id]: `${what} struck your people in ${r.name}.` }, title: `The ${what.split(' ').slice(1).map((x) => x[0]!.toUpperCase() + x.slice(1)).join(' ')} of ${r.name}` });
  }
  const regionCount = ownedRegions(w, asc.id).length;
  // when faith fails in a last stronghold, its people abandon their Ascendant
  if (r.belief.doubtful > 0.7 && regionCount === 1) {
    r.people = 0;
    return;
  }
  // a faction splits off
  if (r.belief.doubtful > 0.5 && regionCount > 1) {
    r.owner = WILD;
    r.tradition = 1;
    r.conversion = {};
    r.belief = { devoted: 0, faithful: 0, doubtful: 1 };
    event(c, { kind: 'schism', weight: 4, ascs: [asc.id], text: `Doubt split ${r.name} away from ${asc.name}.`,
      personal: { [asc.id]: `Doubters in ${r.name} broke away from you.` }, title: `The Schism of ${r.name}` });
  }
};

const expandAndRaid = (c: Ctx, r: Region) => {
  const w = c.w;
  if (!isAscOwner(r.owner)) return;
  const asc = w.ascendants[r.owner];
  if (!asc || asc.twilight > 0) return;
  const nbs = neighbours(w.regions, r.id).map((n) => w.regions[n]!);
  // Expand
  const owned = ownedRegions(w, asc.id).length;
  if (r.people > 8 && r.might > 30) {
    let p = 0.1;
    if (r.species === 'humans') p *= 1.2;
    if (asc.inspire > 0) p += 0.15;
    if (c.rng.chance(p)) {
      const sea = asc.domain === 'sea' || r.species === 'tidefolk';
      const targets = nbs.filter((n) => (n.owner === WILD || n.owner === RUIN) && !n.landing && !n.fog && canSettle(r.species, n.terrain, sea)
        && !(r.species === 'burrowkin' && n.terrain === 'water'));
      const wilds = targets.filter((t) => t.owner === WILD);
      const pool = wilds.length && (r.species !== 'duskwings' || c.rng.chance(0.5)) ? wilds : c.rng.chance(0.3) ? targets : [];
      const t = pool.length ? c.rng.pick(pool) : undefined;
      if (t && (t.owner === RUIN || t.people <= 0 || strength(r, false) > strength(t, true))) {
        const moved = 2.5;
        r.people -= moved;
        const old = t.people;
        const sp = t.owner === WILD && t.people > 0 ? t.species : r.species;
        settle(w, asc, t, moved + old * 0.5);
        t.species = sp;
        if (owned < 3 || c.rng.chance(0.3)) event(c, {
          kind: 'expand', weight: 3, ascs: [asc.id], text: `${asc.civName} spread into ${t.name}.`,
          personal: { [asc.id]: `Your people settled ${t.name}.` },
        });
      }
    }
  }
  // Raid
  for (const n of nbs) {
    if (!isAscOwner(n.owner) || n.owner === asc.id) continue;
    const victim = w.ascendants[n.owner];
    if (!victim || victim.protectedUntil > c.leapNo) continue;
    if (n.species === 'mirefolk' && n.terrain === 'swamp') continue;
    if (r.might < n.might + 20) continue;
    const p = r.species === 'emberkin' ? 0.15 : 0.1;
    if (!c.rng.chance(p / 2)) continue;
    const def = SPECIES[n.species].counteredBy === r.species ? 1.5 : 1;
    const atk = strength(r, false) * def;
    const dfn = strength(n, true) * TERRAIN[n.terrain].defence * (SPECIES[r.species].counteredBy === n.species ? 1.5 : 1);
    if (atk <= dfn) continue;
    n.people *= 0.85;
    n.food = Math.max(0, n.food - 20);
    n.might = Math.max(0, n.might - 5);
    r.food = Math.min(r.foodCap, r.food + 10);
    if (victim.isBot) victim.memory[asc.id] = clamp((victim.memory[asc.id] ?? 0) - 3, -10, 10);
    if (c.rng.chance(0.3)) n.relics.push(makeArtifact(w, c.newArtifacts, victim, 'weapon', n.name, c.rng).id);
    event(c, {
      kind: 'raid', weight: 4, ascs: [asc.id, victim.id],
      text: `${asc.civName[0]!.toUpperCase()}${asc.civName.slice(1)} raided ${n.name}.`,
      personal: { [asc.id]: `Your warriors raided ${n.name}.`, [victim.id]: `${asc.civName} raided your people in ${n.name}.` },
      title: `The Raid on ${n.name}`,
    });
    if (n.people < 1.5) {
      const victimCiv = victim.civName;
      razeRegion(c, n, 'in war');
      event(c, { kind: 'razed', weight: 5, ascs: [victim.id], text: `${n.name} of ${victimCiv} was burned to ruins.`, title: `The Burning of ${n.name}` });
    }
    break;
  }
};

const tick = (c: Ctx) => {
  const w = c.w;
  w.year += 5;
  for (const r of w.regions) tickRegion(c, r);
  for (const r of c.rng.shuffle([...w.regions])) expandAndRaid(c, r);
  seasonTick(c);
  // collapses
  for (const asc of Object.values(w.ascendants)) {
    if (asc.status === 'fading' || !asc.civId) continue;
    const ppl = civPeople(w, asc.id);
    const civ = w.civs[asc.civId];
    if (civ) civ.peak = Math.max(civ.peak, ppl);
    if (ppl < 1) collapseCiv(c, asc, ownedRegions(w, asc.id).length ? 'when its faith failed' : 'when its last city was lost');
  }
};

/** A context for applying rules outside a leap (digs, Homecomings, Ascension). Mutates w in place. */
export const makeCtx = (w: WorldState, seed: string, trust: Record<string, number> = {}, rem: Record<string, number> = {}): Ctx => ({
  w, rng: new Rng(seed), events: [], trust: { ...trust }, rem: { ...rem }, trustDelta: {}, remDelta: {},
  newArtifacts: [], inbox: [], drift: new Map(), newCorrupt: 0, leapNo: w.leap,
});

export const runLeap = (input: LeapInput): LeapResult => {
  const w: WorldState = structuredClone(input.world);
  const c = makeCtx(w, input.seed, input.trust, input.remembrance);
  c.leapNo = w.leap + 1;
  const rng = c.rng;
  const years = input.forcedYears ?? rollLeapYears(w, rng);
  const ticks = Math.max(1, Math.round(years / 5));
  for (const r of w.regions) {
    r.smitesThisLeap = 0;
    r.ward = false;
  }

  // Old Ones choose, then all queued actions start their processes.
  const actions = [...input.actions, ...(w.kind === 'shared' ? botActions(c) : [])];
  for (const a of actions) applyAction(c, a);
  for (let t = 0; t < ticks; t++) tick(c);

  // Great Age: every ruin sinks one layer deeper
  if (years >= 300) for (const r of w.regions) if (r.ruinLayers.length) r.buried = Math.min(5, r.buried + 1);

  // Twilight for Old Ones stepping aside
  for (const asc of Object.values(w.ascendants)) {
    if (asc.twilight > 0) {
      for (const r of ownedRegions(w, asc.id)) r.people *= 0.7;
      asc.twilight--;
      if (asc.twilight === 0 && asc.status !== 'fading') collapseCiv(c, asc, 'into twilight');
    }
    if (asc.inspire > 0) asc.inspire--;
    for (const k of Object.keys(asc.memory)) {
      const v = asc.memory[k]!;
      asc.memory[k] = v > 0 ? v - 1 : v < 0 ? v + 1 : 0;
      if (asc.memory[k] === 0) delete asc.memory[k];
    }
  }

  // Keep the world alive: at least 12 active Ascendants.
  if (w.kind === 'shared') {
    const active = activeAscendants(w).length;
    if (active < 12) {
      const faded = Object.values(w.ascendants).filter((a) => a.isBot && a.status === 'fading' && c.leapNo - (a.fadedAt ?? -99) >= 3);
      const spots = rng.shuffle(w.regions.filter((r) => (r.owner === WILD || r.owner === RUIN) && !r.landing && !r.fog && r.terrain !== 'water'));
      for (const bot of faded.slice(0, 12 - active)) {
        const spot = spots.find((r) => canSettle(bot.species, r.terrain, false) && r.owner !== bot.id);
        if (spot) {
          spots.splice(spots.indexOf(spot), 1);
          returnAscendant(c, bot, spot, ' out of legend');
        }
      }
    }
  }

  // Trust income, Shrines
  for (const asc of Object.values(w.ascendants)) {
    addTrust(c, asc.id, trustIncome(w, asc.id));
    for (const rid of asc.shrines) {
      const r = w.regions[rid];
      if (!r || r.owner !== RUIN) continue;
      addTrust(c, asc.id, scaled(w, asc.id, 2));
      const builder = r.ruinLayers[r.ruinLayers.length - 1]?.builder;
      if (builder && builder !== asc.id) addRem(c, builder, 1);
    }
    asc.shrines = asc.shrines.filter((rid) => w.regions[rid]?.owner === RUIN);
  }

  seasonAfterLeap(c, input);

  // Grow the map when landing regions run low.
  if (w.kind === 'shared' && w.regions.filter((r) => r.landing).length < 3) {
    const ring = raiseRing(w, rng);
    event(c, { kind: 'ring', weight: 5, ascs: [], text: `New land rose from the sea in the west: ${ring.slice(0, 3).map((r) => r.name).join(', ')} and more.`,
      title: 'The Rising of New Shores' });
  }

  w.leap = c.leapNo;
  w.recentLeaps = [...w.recentLeaps, years].slice(-7);
  const leapName = leapNameFor(years);
  return {
    world: w, years, leapName, events: c.events, trustDelta: c.trustDelta, remDelta: c.remDelta,
    newArtifacts: c.newArtifacts, inbox: c.inbox, title: chronicleTitle(c.events, w, years, rng),
  };
};

/** Old Ones are placed in twilight when a player lands near them (if enough Ascendants remain). */
export const twilightNear = (w: WorldState, regionId: number): string | null => {
  const reg = w.regions[regionId];
  if (!reg) return null;
  if (activeAscendants(w).length <= 12) return null;
  const near = w.regions.filter((r) => hexDistance(r, reg) <= 2 && isAscOwner(r.owner)).map((r) => w.ascendants[r.owner]!)
    .find((a) => a?.isBot && a.status !== 'fading' && a.twilight === 0);
  if (!near) return null;
  near.twilight = 3;
  return near.id;
};

export { cardCost, weightOf, fmtYear };
