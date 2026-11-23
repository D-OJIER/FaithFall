// The Corruption: a hidden, seasonal threat with omens, spread, an Evil One and its aftermath.
import { EVIL_ONES, OMEN_MOODS } from './data';
import { hexDistance, neighbours } from './map';
import { Rng } from './rng';
import { activeAscendants, isAscOwner } from './rules';
import type { Ctx } from './engine';
import { addRem, addTrust, event, makeArtifact } from './engine';
import type { LeapInput, Season, WorldState } from './types';
import { HOLLOW, RUIN, WASTE, WILD } from './types';

export const startSeason = (w: WorldState, rng: Rng): Season => {
  const fogged = w.regions.filter((r) => r.fog);
  const ruins = w.regions.filter((r) => r.owner === RUIN && !r.landing);
  let source = undefined;
  if (fogged.length && rng.chance(0.6)) source = rng.pick(fogged);
  if (!source && ruins.length) {
    // prefer the ruins of the most forgotten Old One
    const forgotten = Object.values(w.ascendants).filter((a) => a.isBot && a.status === 'fading');
    const theirs = ruins.filter((r) => r.ruinLayers.some((l) => forgotten.some((f) => f.id === l.builder)));
    source = rng.pick(theirs.length ? theirs : ruins);
  }
  source ??= rng.pick(w.regions.filter((r) => !isAscOwner(r.owner) && !r.landing));
  const nbs = neighbours(w.regions, source.id).map((n) => w.regions[n]!).filter((r) => !isAscOwner(r.owner) && !r.landing);
  const lair = nbs.find((r) => r.fog || r.owner === RUIN) ?? source;
  w.seasonCount++;
  const s: Season = {
    id: `s${w.seasonCount}`, number: w.seasonCount, phase: 'omens', day: 1,
    evilOne: (w.seasonCount - 1) % EVIL_ONES.length, source: source.id, lair: lair.id,
    discovered: false, discoveredBy: null, awake: false, lairFound: false, lairFoundBy: null,
    hp: 0, maxHp: 0, outcome: null, aftermathDays: 0, slayer: null,
  };
  source.corruption = 45;
  w.season = s;
  return s;
};

const compass = (w: WorldState, id: number): string => {
  const reg = w.regions[id]!;
  const n = w.regions.length;
  const cx = w.regions.reduce((a, r) => a + r.q + r.r / 2, 0) / n;
  const cy = w.regions.reduce((a, r) => a + r.r, 0) / n;
  const x = reg.q + reg.r / 2 - cx;
  const y = reg.r - cy;
  const ang = (Math.atan2(-y, x) * 180) / Math.PI;
  const dirs = ['east', 'north-east', 'north', 'north-west', 'west', 'south-west', 'south', 'south-east'];
  const i = Math.round(((ang + 360) % 360) / 45) % 8;
  return dirs[i]!;
};

/** Public omen text for a given season day. Never reveals ids or levels, only words. */
export const omenText = (w: WorldState, day: number): string[] => {
  const s = w.season;
  if (!s || s.outcome) return [];
  const src = w.regions[s.source]!;
  const out: string[] = [];
  const rng = new Rng(`${s.id}:omen`);
  out.push(rng.pick(OMEN_MOODS));
  if (day >= 3) {
    const where = src.fog ? 'beyond the fog, on the Dark Continent' : src.owner === RUIN
      ? `beneath ${src.ruinRealm === 'sunken' ? 'deep water' : src.ruinRealm === 'sky' ? 'the clouds' : 'old ruins'}`
      : `under the ${src.terrain}`;
    out.push(`It sleeps ${where}.`);
  }
  if (day >= 4) out.push(`In the far ${compass(w, s.source)}, the land has turned.`);
  if (day >= 5) {
    const landmark = w.regions
      .filter((r) => r.id !== s.source && !r.fog && hexDistance(r, src) <= 2)
      .sort((a, b) => hexDistance(a, src) - hexDistance(b, src))[0];
    if (landmark) out.push(`Within sight of ${landmark.name}.`);
  }
  return out;
};

/** A private clue for an Ascendant whose land is touched by the sickness. */
export const privateClue = (w: WorldState, ascId: string, early: boolean): string | null => {
  const s = w.season;
  if (!s || s.outcome || s.discovered) return null;
  const touched = w.regions.some((r) => r.owner === ascId && r.corruption > 0);
  const asc = w.ascendants[ascId];
  if (!touched && !early) return null;
  if (!touched && early && asc?.domain === 'death') {
    return `The dead whisper of tomorrow: ${omenText(w, s.day + 1).slice(-1)[0] ?? ''}`;
  }
  const own = w.regions.find((r) => r.owner === ascId && r.corruption > 0);
  if (!own) return null;
  const src = w.regions[s.source]!;
  const d = hexDistance(own, src);
  const dir = compass(w, s.source);
  return `The sickness in ${own.name} came on a wind from the ${dir}, perhaps ${d <= 2 ? 'very near' : d <= 4 ? 'a few lands away' : 'far off'}.`;
};

export const seasonTick = (c: Ctx) => {
  const w = c.w;
  const s = w.season;
  if (w.kind === 'cradle') {
    // The Cradle's scripted omen: spread from any strong patch into unwarded neighbours.
    for (const r of w.regions) {
      if (r.corruption <= 40) continue;
      for (const n of neighbours(w.regions, r.id)) {
        const nr = w.regions[n]!;
        if (!nr.ward && nr.corruption < r.corruption - 20) nr.corruption = Math.min(100, nr.corruption + 10);
      }
    }
    return;
  }
  if (!s || s.outcome) {
    for (const r of w.regions) if (r.corruption > 0 && r.owner !== HOLLOW) r.corruption = Math.max(0, r.corruption - 8);
    return;
  }
  const src = w.regions[s.source]!;
  if (s.phase === 'omens') {
    src.corruption = Math.min(60, src.corruption + 2);
    return;
  }
  const growing = w.regions.filter((r) => r.corruption > 40);
  for (const r of growing) {
    if (r.owner === HOLLOW || r.id === s.source) r.corruption = Math.min(100, r.corruption + 1);
    if (!c.rng.chance(0.12)) continue;
    for (const n of neighbours(w.regions, r.id)) {
      const nr = w.regions[n]!;
      if (nr.ward || nr.owner === WASTE) continue;
      if (nr.corruption === 0) {
        if (c.newCorrupt >= 3) continue;
        c.newCorrupt++;
      }
      nr.corruption = Math.min(100, nr.corruption + 20);
    }
  }
  for (const r of w.regions) {
    if (r.corruption >= 100 && r.owner !== HOLLOW && r.owner !== WASTE) {
      const victim = w.ascendants[r.owner];
      if (victim) event(c, {
        kind: 'hollow', weight: 6, ascs: [victim.id], text: `${r.name} fell silent. Its people now kneel to something else.`,
        personal: { [victim.id]: `${r.name} was Hollowed by ${s.discovered ? EVIL_ONES[s.evilOne]!.blight : 'a sickness with no name'}.` },
      });
      r.owner = HOLLOW;
      r.conversion = {};
      r.processes = [];
    }
  }
};

export const seasonAfterLeap = (c: Ctx, input: LeapInput) => {
  const w = c.w;
  // Automatic seasons: a new one rises 3 leaps after the last ends (the first is started by a moderator).
  if (!w.season && w.seasonCount > 0 && w.kind === 'shared' && c.leapNo - w.lastSeasonEnd >= 3 && !input.quiet) {
    startSeason(w, c.rng);
    event(c, { kind: 'omen', weight: 7, ascs: [], text: 'Strange omens are seen. A new sickness is waiting somewhere in the world.', title: 'The Season of Omens' });
    return;
  }
  const s = w.season;
  if (!s) return;
  const evil = EVIL_ONES[s.evilOne]!;
  const hollowed = w.regions.filter((r) => r.owner === HOLLOW).length;

  if (s.outcome) {
    s.aftermathDays++;
    if (s.aftermathDays >= 3) {
      for (const r of w.regions) {
        if (r.owner !== HOLLOW) continue;
        if (s.outcome === 'lost') {
          r.owner = WASTE;
          r.buried = 3;
          r.ruinRealm = 'deep';
        } else {
          r.owner = WILD;
          r.people = 2;
          r.corruption = 0;
        }
      }
      if (s.outcome === 'lost') event(c, { kind: 'waste', weight: 6, ascs: [], text: `The Hollowed lands of ${evil.blight} hardened into Wasteland.` });
      w.season = null;
      w.lastSeasonEnd = c.leapNo;
    }
    return;
  }

  // Pledged damage arrives from the server as already-applied hp.
  if (input.pledged && s.awake) s.hp = Math.max(0, s.hp - input.pledged);
  if (input.slayer && !s.slayer) s.slayer = input.slayer;

  if (s.awake) {
    s.hp += 3 * hollowed;
    // attack regions bordering the Hollowed area (or the lair)
    const front = w.regions.filter((r) => r.owner !== HOLLOW && r.owner !== WASTE
      && neighbours(w.regions, r.id).some((n) => w.regions[n]!.owner === HOLLOW || n === s.lair));
    for (const r of c.rng.shuffle(front).slice(0, 2)) if (!r.ward) r.corruption = Math.min(100, r.corruption + 20);
    if (s.hp <= 0 && s.lairFound) {
      s.outcome = 'won';
      s.phase = 'aftermath';
      const top = (input.contributors ?? []).slice(0, 5);
      const slayer = s.slayer ? w.ascendants[s.slayer] : undefined;
      if (slayer) slayer.titles.push(`Slayer of ${evil.name}`);
      for (const [ascId] of top) {
        const asc = w.ascendants[ascId];
        if (!asc) continue;
        const shard = makeArtifact(w, c.newArtifacts, asc, 'relic', evil.name, c.rng, { name: `Shard of ${evil.name}`, great: true, power: 'shard' });
        shard.foundBy = asc.id;
        shard.foundYear = w.year;
        addTrust(c, ascId, 15);
        addRem(c, ascId, 1);
      }
      for (const r of w.regions) if (r.owner !== HOLLOW) r.corruption = Math.floor(r.corruption / 2);
      event(c, {
        kind: 'victory', weight: 15, ascs: top.map(([a]) => a).concat(slayer ? [slayer.id] : []),
        text: `${evil.name}, ${evil.epithet}, is shattered${slayer ? ` by ${slayer.name}` : ''}! Its shards fall as Great Relics.`,
        title: `The Shattering of ${evil.name}`,
      });
      return;
    }
  }

  s.day++;
  if (s.phase === 'omens' && s.day >= 3) {
    s.phase = 'spread';
    event(c, { kind: 'omen', weight: 6, ascs: [], text: s.discovered ? `${evil.blight} is spreading.` : 'A sickness with no name begins to spread.', title: 'The Spreading Sickness' });
  }
  if (!s.awake && s.phase === 'spread' && (hollowed >= 8 || s.day >= 7)) {
    s.phase = 'emergence';
    s.awake = true;
    s.maxHp = 150 + 20 * activeAscendants(w).length;
    s.hp = s.maxHp;
    w.regions[s.lair]!.corruption = 100;
    event(c, { kind: 'awake', weight: 10, ascs: [], text: 'Something has awoken.', title: 'The Awakening' });
  }
  // Safety net: it shows itself at last.
  if (s.awake && !s.lairFound && s.day >= 9) {
    s.lairFound = true;
    s.discovered = true;
    event(c, { kind: 'lair', weight: 11, ascs: [], text: `It shows itself at last: ${evil.name}, ${evil.epithet}, ${evil.form}, in ${w.regions[s.lair]!.name}.`, title: `The Coming of ${evil.name}` });
  }
  if (s.awake && s.day >= 14) {
    s.outcome = 'lost';
    s.phase = 'aftermath';
    event(c, { kind: 'defeat', weight: 12, ascs: [], text: `${evil.name} could not be stopped. The Hollowed lands will become Wasteland.`, title: `The Triumph of ${evil.name}` });
  }
};
