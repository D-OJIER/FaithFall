// Player actions. Each validates against the current world; card plays are queued for the next leap.
import { context, reddit, redis } from '@devvit/web/server';
import { CARDS, DOMAIN_IDS, LEAPS, LORE_DUST, RARITY_START, SPECIES, cleanText, genArtifactName } from '../../shared/sim/data';
import { CRADLE_DARK, CRADLE_RUIN, CRADLE_WILD, createCradle, starryDraw } from '../../shared/sim/cradle';
import { discoverLair, discoverSource, makeArtifact, makeCtx, returnAscendant, runLeap, twilightNear } from '../../shared/sim/engine';
import { canSettle, foundCiv, hexDistance, neighbours, newAscendant, raiseRing } from '../../shared/sim/map';
import { mythLine } from '../../shared/sim/chronicle';
import { Rng, hashStr } from '../../shared/sim/rng';
import { cardCost, dayOf, isAscOwner, ownedRegions, scaled, touchesOwn, unlockedCards, weightOf } from '../../shared/sim/rules';
import type { ActionCard, Artifact, CardId, Domain, LeapName, WorldState } from '../../shared/sim/types';
import { HOLLOW, RUIN, WASTE, WILD } from '../../shared/sim/types';
import type { CradleView, DigResult, PlayerRecord } from '../../shared/api';
import {
  GameError, K, appendLog, assertNotLeaping, getArtifacts, getNum, getSalt, loadPlayer, loadWorld, mutateWorld,
  pushInbox, saveArtifacts, savePlayer, spendTrust,
} from './store';
import { publicAsc, publicRegion, rollDay } from './view';

export type Session = { userId: string; username: string };

export const requireUser = async (): Promise<Session> => {
  const userId = context.userId;
  if (!userId) throw new GameError('Log in to Reddit to become an Ascendant.');
  const username = context.username ?? (await reddit.getCurrentUsername()) ?? 'someone';
  return { userId, username };
};

export const getOrCreatePlayer = async (s: Session): Promise<PlayerRecord> => {
  const p = await loadPlayer(s.userId);
  if (p) return p;
  const fresh: PlayerRecord = {
    userId: s.userId, username: s.username, ascId: null, stage: 'new', draw: null, redrawUsed: false,
    day: -1, hand: [], played: [], digs: 3, streak: 0, lastPlayedLeap: -1, prophecyStreak: 0, pending: null, joinedAt: Date.now(),
  };
  await savePlayer(s.userId, fresh);
  return fresh;
};

const requireWorld = async () => {
  const w = await loadWorld();
  if (!w) throw new GameError('The world is still being made. A moderator needs to install the app.');
  return w;
};

const requireJoined = async (s: Session) => {
  const w = await requireWorld();
  let p = await getOrCreatePlayer(s);
  if (!p.ascId || p.stage !== 'joined' || !w.ascendants[p.ascId]) throw new GameError('You are not an Ascendant yet.');
  p = await rollDay(w, p);
  return { w, p, asc: w.ascendants[p.ascId!]! };
};

const markPlayed = (w: WorldState, p: PlayerRecord) => {
  if (p.lastPlayedLeap === w.leap) return;
  p.streak = p.lastPlayedLeap === w.leap - 1 ? p.streak + 1 : 1;
  p.lastPlayedLeap = w.leap;
};

// ---------- Onboarding ----------

const takenSpecies = (w: WorldState) => {
  const taken: Record<string, number> = {};
  for (const a of Object.values(w.ascendants)) if (!a.isBot) taken[a.species] = (taken[a.species] ?? 0) + 1;
  return taken;
};

export const draw = async (s: Session, redraw: boolean) => {
  const w = await requireWorld();
  const p = await getOrCreatePlayer(s);
  if (p.stage === 'joined' || p.stage === 'cradle') throw new GameError('You have already chosen your people.');
  if (p.draw && !redraw) return p;
  if (p.draw && redraw) {
    if (p.redrawUsed) throw new GameError('You have used your free redraw.');
    p.redrawUsed = true;
  }
  const salt = await getSalt();
  p.draw = starryDraw(`${salt}:draw:${s.userId}:${p.redrawUsed ? 1 : 0}`, takenSpecies(w));
  p.stage = 'drawn';
  await savePlayer(s.userId, p);
  return p;
};

type CradleState = { world: WorldState; stage: number; relic: Artifact | null; rarity: string };

const loadCradle = async (userId: string): Promise<CradleState | null> => {
  const raw = await redis.get(K.cradle(userId));
  return raw ? (JSON.parse(raw) as CradleState) : null;
};

export const choose = async (s: Session, body: { card: number; domain: Domain; name: string; epithet: string }) => {
  const p = await getOrCreatePlayer(s);
  if (p.stage !== 'drawn' || !p.draw) throw new GameError('Draw your cards first.');
  const card = p.draw[body.card];
  if (!card) throw new GameError('Pick one of your seven cards.');
  if (!DOMAIN_IDS.includes(body.domain)) throw new GameError('Pick a domain.');
  const name = cleanText(body.name ?? '', 24);
  const epithet = cleanText(body.epithet ?? '', 48);
  if (!name || !epithet) throw new GameError('That name cannot be used. Try another.');
  const world = createCradle(s.userId, card.species, body.domain, name, epithet);
  const asc = world.ascendants[`p:${s.userId}`]!;
  asc.username = s.username;
  const cradle: CradleState = { world, stage: 0, relic: null, rarity: card.rarity };
  await redis.set(K.cradle(s.userId), JSON.stringify(cradle));
  p.stage = 'cradle';
  await savePlayer(s.userId, p);
  return p;
};

const landingsFor = (w: WorldState, cradle: CradleState) => {
  const asc = Object.values(cradle.world.ascendants)[0]!;
  const sp = SPECIES[asc.species];
  const harsh = cradle.rarity === 'rare' || cradle.rarity === 'epic';
  const bots = Object.values(w.ascendants).filter((a) => a.isBot && a.status !== 'fading');
  const strongest = bots.flatMap((b) => ownedRegions(w, b.id)).filter((r) => r.people > 8);
  const dark = w.regions.filter((r) => r.dark);
  return w.regions
    .filter((r) => r.landing && canSettle(asc.species, r.terrain, asc.domain === 'sea'))
    .map((r) => {
      const danger = Math.min(...strongest.map((x) => hexDistance(x, r)), 9);
      const dc = Math.min(...dark.map((x) => hexDistance(x, r)), 9);
      const home = sp.homes.includes(r.terrain) ? 3 : 0;
      const score = home + (harsh ? 9 - dc : danger);
      return { r, score, note: `${home ? 'Home terrain. ' : ''}${danger <= 2 ? 'A strong empire is near.' : 'Far from strong empires.'}${dc <= 2 ? ' Beside the Dark Continent.' : ''}` };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ r, note }) => ({ id: r.id, name: r.name, terrain: r.terrain, note }));
};

export const cradleView = async (s: Session): Promise<CradleView | null> => {
  const c = await loadCradle(s.userId);
  if (!c) return null;
  const w = c.world;
  const asc = Object.values(w.ascendants)[0]!;
  const home = w.regions[0]!;
  const shared = c.stage >= 4 ? await loadWorld() : null;
  return {
    stage: c.stage,
    regions: w.regions.map((r) => publicRegion(w, r, asc.id)),
    asc: publicAsc(w, asc),
    relic: c.relic,
    people: Math.round(ownedRegions(w, asc.id).reduce((a, r) => a + r.people, 0) * 10) / 10,
    food: Math.round(home.food),
    year: w.year,
    landings: shared ? landingsFor(shared, c) : [],
  };
};

export const cradleStep = async (s: Session, beat: string) => {
  const c = await loadCradle(s.userId);
  if (!c) throw new GameError('You are not in the Cradle.');
  const w = c.world;
  const asc = Object.values(w.ascendants)[0]!;
  const step = (actions: ActionCard[], years: number) => {
    const r = runLeap({ world: c.world, trust: { [asc.id]: 99 }, remembrance: {}, actions, seed: `cradle:${s.userId}:${c.stage}`, forcedYears: years, quiet: true });
    c.world = r.world;
    return r;
  };
  if (beat === 'bless' && c.stage === 0) {
    step([{ ascendantId: asc.id, card: 'bless', target: 0 }], 5);
    c.stage = 1;
  } else if (beat === 'dig' && c.stage === 1) {
    // The Cradle's ruin always holds a relic of a fallen Old One.
    const shared = await requireWorld();
    const bots = Object.values(shared.ascendants).filter((a) => a.isBot);
    const fallen = bots.filter((b) => b.status !== 'active');
    const rng = new Rng(`cradle-relic:${s.userId}`);
    const old = rng.pick(fallen.length ? fallen : bots);
    const place = rng.pick(shared.regions.filter((r) => !r.fog)).name;
    const relic: Artifact = {
      id: `c${hashStr(s.userId).toString(36)}`, kind: 'relic', name: genArtifactName(old.species, place, () => rng.next()),
      ascendantId: old.id, civName: `the ${SPECIES[old.species].name} of ${place}`, species: old.species,
      yearMade: Math.max(0, shared.year - rng.int(300, 1500)), inscription: old.scripture, great: false, power: null,
      foundBy: asc.id, foundYear: shared.year, destroyed: false,
    };
    c.relic = relic;
    w.regions[CRADLE_RUIN]!.ruinLayers.push({ builder: old.id, civName: relic.civName, species: old.species, year: relic.yearMade, artifacts: [relic.id] });
    await saveArtifacts([relic]);
    await redis.hIncrBy(K.trust, old.id, 5);
    await redis.hIncrBy(K.rem, old.id, 1);
    c.stage = 2;
  } else if (beat === 'whisper' && c.stage === 2) {
    step([{ ascendantId: asc.id, card: 'whisper', target: CRADLE_WILD }], 25);
    c.world.regions[CRADLE_DARK]!.corruption = 70;
    c.stage = 3;
  } else if (beat === 'ward' && c.stage === 3) {
    step([{ ascendantId: asc.id, card: 'ward', target: 0 }], 5);
    c.world.regions[CRADLE_DARK]!.corruption = 45;
    c.stage = 4;
  } else {
    throw new GameError('That is not the next step.');
  }
  await redis.set(K.cradle(s.userId), JSON.stringify(c));
};

export const ascend = async (s: Session, regionId: number, scripture: string) => {
  const p = await getOrCreatePlayer(s);
  const c = await loadCradle(s.userId);
  if (!c || c.stage < 4 || p.stage !== 'cradle') throw new GameError('Finish the Cradle first.');
  const line = scripture ? cleanText(scripture, 80) : '';
  if (scripture && !line) throw new GameError('That scripture cannot be carved. Try other words.');
  const ascId = `p:${s.userId}`;
  const cAsc = c.world.ascendants[ascId]!;
  const salt = await getSalt();
  const outcome = await mutateWorld((w) => {
    if (w.ascendants[ascId]) throw new GameError('You have already ascended.');
    let reg = w.regions[regionId];
    if (!reg || !reg.landing || !canSettle(cAsc.species, reg.terrain, cAsc.domain === 'sea')) {
      if (!w.regions.some((r) => r.landing)) raiseRing(w, new Rng(`${salt}:ring:${w.regions.length}`));
      throw new GameError('That landing is no longer open. Choose another.');
    }
    const asc = newAscendant({
      id: ascId, isBot: false, botType: null, name: cAsc.name, epithet: cAsc.epithet, domain: cAsc.domain,
      species: cAsc.species, sigil: hashStr(ascId) % 12, scripture: line ?? '', joinedLeap: w.leap, userId: s.userId, username: s.username,
    });
    w.ascendants[ascId] = asc;
    const rng = new Rng(`${salt}:ascend:${ascId}`);
    foundCiv(w, asc, reg, 3, rng);
    reg.foodCap = RARITY_START[c.rarity as keyof typeof RARITY_START]?.foodCap ?? 100;
    reg.food = Math.min(reg.foodCap, 60);
    // The Cradle becomes your first ruin in the shared world.
    const ctx = makeCtx(w, `${salt}:cradle-ruin:${ascId}`);
    const stone = makeArtifact(w, ctx.newArtifacts, asc, 'relic', 'the Cradle', ctx.rng, { name: `The Cradle-Stone of ${asc.name}` });
    const ruins = w.regions.filter((r) => r.owner === RUIN && !r.fog && hexDistance(r, reg!) >= 2)
      .sort((a, b) => hexDistance(a, reg!) - hexDistance(b, reg!));
    const ruin = ruins[0] ?? w.regions.find((r) => r.owner === WILD && r.people <= 0 && !r.landing && !r.fog && r.id !== reg!.id);
    if (ruin) {
      ruin.owner = RUIN;
      ruin.ruinRealm ??= SPECIES[asc.species].realm;
      ruin.ruinLayers.push({ builder: asc.id, civName: `the Cradle of ${asc.name}`, species: asc.species, year: w.year, artifacts: [stone.id] });
    }
    const twi = twilightNear(w, reg.id);
    if (w.regions.filter((r) => r.landing).length < 2) raiseRing(w, rng);
    reg = w.regions[regionId]!;
    return {
      result: { asc, region: reg.name, twilight: twi ? w.ascendants[twi]?.name ?? null : null, year: w.year, leap: w.leap },
      ops: async (tx) => {
        await tx.hSet(K.trust, { [ascId]: '50' });
        await tx.hSet(K.rem, { [ascId]: '0' });
        await tx.hSet(K.artifacts, { [stone.id]: JSON.stringify(stone) });
      },
    };
  });
  if (c.relic) await redis.zAdd(K.reliquary(ascId), { score: Date.now(), member: c.relic.id });
  await redis.zAdd(K.players, { score: Date.now(), member: s.userId });
  const civId = (await loadWorld())?.ascendants[ascId]?.civId;
  const line1 = `${outcome.asc.name}, ${outcome.asc.epithet}, descended upon ${outcome.region} with ${outcome.asc.civName}.`;
  await appendLog(K.annals, [line1 + (outcome.twilight ? ` The Old One ${outcome.twilight} entered its twilight.` : '')], 100_000_000 + outcome.leap * 1000 + 999);
  if (civId) await appendLog(K.book(civId), [`Year ${outcome.year.toLocaleString('en-US')}. ${line1}`], 100_000_000 + outcome.leap * 1000);
  await redis.zAdd(K.extra(outcome.leap + 1), { score: 5, member: line1 });
  await redis.zIncrBy(K.scripture, ascId, 0);
  p.stage = 'joined';
  p.ascId = ascId;
  p.day = -1;
  await savePlayer(s.userId, p);
  await redis.del(K.cradle(s.userId));
  await pushInbox(ascId, `Welcome, ${outcome.asc.name}. For 3 days no one can Smite or raid your lands.`);
};

// ---------- Daily play ----------

export const playCard = async (s: Session, body: { card: CardId; target: number | null; text?: string; to?: string }) => {
  await assertNotLeaping();
  const { w, p, asc } = await requireJoined(s);
  const fading = asc.status === 'fading';
  const max = fading ? 1 : 2;
  if (p.played.length >= max) throw new GameError(`You can play ${max} card${max > 1 ? 's' : ''} a day.`);
  const card = body.card;
  if (!p.hand.includes(card) || p.played.includes(card)) throw new GameError('That card is not in your hand.');
  if (!fading && !unlockedCards(dayOf(w, asc)).includes(card)) throw new GameError('That card has not been revealed to you yet.');
  const def = CARDS[card];
  const reg = body.target !== null && body.target !== undefined ? w.regions[body.target] : undefined;
  const discovered = !!w.season?.discovered;
  const action: ActionCard = { ascendantId: asc.id, card, target: reg ? reg.id : null };
  switch (def.target) {
    case 'own':
      if (!reg || reg.owner !== asc.id) throw new GameError('Choose one of your own regions.');
      break;
    case 'any':
      if (!reg || reg.fog) throw new GameError('Choose a region on the map.');
      if ((card === 'ward' || card === 'cleanse') && !discovered && reg.owner !== asc.id)
        throw new GameError('Until the source is found, you can only Ward or Cleanse your own lands.');
      if (card === 'cleanse' && !discovered && reg.corruption <= 0) throw new GameError('There is no sickness here that you can see.');
      break;
    case 'ruinOrWild':
      if (!reg || reg.fog) throw new GameError('Choose a region on the map.');
      if (reg.owner === HOLLOW) break;
      if (fading) {
        if (reg.owner !== WILD && reg.owner !== RUIN) throw new GameError('Whisper to a wild people or an untended ruin.');
        if (reg.landing) throw new GameError('Landing regions are reserved for new Ascendants.');
      } else {
        if (reg.owner !== WILD || reg.people <= 0) throw new GameError('Whisper to a wild people (an unclaimed region with people).');
        if (reg.landing) throw new GameError('Landing regions are reserved for new Ascendants.');
        if (!touchesOwn(w, asc.id, reg.id)) throw new GameError('Your voice only carries to lands beside your own.');
      }
      break;
    case 'foreign': {
      if (!reg || !isAscOwner(reg.owner) || reg.owner === asc.id) throw new GameError('Choose another Ascendant’s region.');
      const victim = w.ascendants[reg.owner];
      if (victim && victim.protectedUntil > w.leap + 1) throw new GameError(`${victim.name} is newly arrived and protected.`);
      break;
    }
    case 'fog':
      if (!reg || !reg.fog || !neighbours(w.regions, reg.id).some((n) => !w.regions[n]!.fog)) throw new GameError('Choose a fogged region beside known land.');
      break;
    case 'ascendant': {
      const to = body.to ? w.ascendants[body.to] : undefined;
      if (!to || to.id === asc.id) throw new GameError('Choose an Ascendant to send your envoy to.');
      const text = cleanText(body.text ?? '', 140);
      if (!text) throw new GameError('Write a message (no rude words).');
      action.to = to.id;
      action.text = text;
      break;
    }
    case 'none':
      break;
  }
  const cost = cardCost(w, asc.id, card);
  if (!(await spendTrust(asc.id, cost))) throw new GameError(`You need ${cost} Trust for ${def.name}.`);
  const key = K.actions(w.leap + 1);
  const prev = await redis.hGet(key, asc.id);
  const list = prev ? (JSON.parse(prev) as ActionCard[]) : [];
  list.push(action);
  await redis.hSet(key, { [asc.id]: JSON.stringify(list) });
  p.played.push(card);
  markPlayed(w, p);
  await savePlayer(s.userId, p);
  return { cost, lands: def.lands };
};

export const dig = async (s: Session, regionId: number): Promise<DigResult> => {
  await assertNotLeaping();
  const { w, p, asc } = await requireJoined(s);
  if (p.digs <= 0) throw new GameError('You have used your 3 digs today.');
  if (p.pending) throw new GameError('First decide what to do with the ruin you discovered.');
  const reg = w.regions[regionId];
  if (!reg || reg.fog || (reg.owner !== RUIN && reg.owner !== WASTE)) throw new GameError('You can only dig in ruins.');
  const salt = await getSalt();
  const rng = new Rng(`${salt}:dig:${asc.id}:${w.leap}:${p.digs}:${reg.id}`);
  const great = asc.domain === 'death' ? 0.05 : 0.03;
  const depth = 1 + 0.2 * reg.buried + (reg.owner === WASTE ? 0.5 : 0);
  const artP = 0.17 * (reg.glowUntil >= w.leap ? 2 : 1) * depth;
  const roll = rng.next();
  let outcome: DigResult['outcome'] = roll < great * depth ? 'great' : roll < great * depth + artP ? 'artifact' : roll < 0.55 ? 'fragment' : 'dust';
  p.digs--;
  markPlayed(w, p);

  const ids = reg.ruinLayers.slice().reverse().flatMap((l) => l.artifacts);
  const arts = (await getArtifacts(ids)).filter((a) => !a.foundBy && !a.destroyed);
  let found: Artifact | undefined;
  if (outcome === 'great') found = arts.find((a) => a.great) ?? undefined;
  if (outcome === 'great' && !found) {
    const top = reg.ruinLayers[reg.ruinLayers.length - 1];
    const builder = top ? w.ascendants[top.builder] : undefined;
    if (top && builder) {
      found = {
        id: `g${w.leap}${hashStr(asc.id + reg.id + p.digs).toString(36)}`, kind: 'relic', name: `Crown of ${top.civName.replace(/^the /, 'the ')}`,
        ascendantId: builder.id, civName: top.civName, species: top.species, yearMade: top.year, inscription: builder.scripture,
        great: true, power: 'crown', foundBy: null, foundYear: null, destroyed: false,
      };
    } else outcome = 'artifact';
  }
  if (outcome === 'artifact') {
    found = arts.find((a) => !a.great);
    if (!found) outcome = 'fragment';
  }

  const result: DigResult = { outcome, text: '', trust: 0, artifact: null, homecoming: false, discovery: null };
  const s0 = w.season;
  const mayDiscover = !!s0 && !s0.outcome && ((reg.id === s0.source && !s0.discovered) || (reg.id === s0.lair && s0.awake && !s0.lairFound));

  if (outcome === 'dust') {
    result.text = rng.pick(LORE_DUST);
  } else if (outcome === 'fragment') {
    result.trust = scaled(w, asc.id, 2);
    result.text = `Fragments of ${reg.ruinLayers[reg.ruinLayers.length - 1]?.civName ?? 'a forgotten people'}: pottery, beads, a broken seal.`;
  } else if (found) {
    const creator = w.ascendants[found.ascendantId];
    found.foundBy = asc.id;
    found.foundYear = w.year;
    result.artifact = found;
    const home = found.ascendantId === asc.id;
    result.homecoming = home;
    result.trust = scaled(w, asc.id, outcome === 'great' ? 15 : 5) + (home ? scaled(w, asc.id, 25) : 0);
    result.text = home
      ? `Homecoming! You found ${found.name}, made by your own people in Year ${found.yearMade.toLocaleString('en-US')}.`
      : `You unearthed ${found.name}, made by ${found.civName} for ${creator?.name ?? 'a forgotten Ascendant'}.`;
    await saveArtifacts([found]);
    await redis.zAdd(K.reliquary(asc.id), { score: Date.now(), member: found.id });
    if (home) await redis.hIncrBy(K.rem, asc.id, 3);
    else if (creator) {
      await redis.hIncrBy(K.trust, creator.id, scaled(w, creator.id, 5));
      await redis.hIncrBy(K.rem, creator.id, found.power === 'crown' ? 4 : 1);
      const ago = Math.max(0, w.year - found.yearMade);
      await pushInbox(creator.id, `Your ${found.name.replace(/^The /, '')} was unearthed by u/${s.username}, ${ago} years after it was made.`);
    }
    if (outcome === 'great') {
      await redis.zAdd(K.extra(w.leap + 1), { score: 9, member: `u/${s.username} unearthed a Great Relic: ${found.name}.` });
    }
    p.pending = { regionId: reg.id, artifactId: found.id };
  }

  const needWorld = mayDiscover || (result.homecoming && asc.status === 'fading') || found?.power === 'shard';
  if (needWorld) {
    const lines = await mutateWorld((mw) => {
      const ctx = makeCtx(mw, `${salt}:digw:${asc.id}:${w.leap}`);
      const me = mw.ascendants[asc.id]!;
      const r = mw.regions[reg.id]!;
      const s = mw.season;
      if (s && !s.outcome && r.id === s.source && !s.discovered) {
        discoverSource(ctx, asc.id, `digging in the ${r.ruinRealm ?? 'old'} ruins`);
        result.discovery = 'You found the source of the Corruption!';
      }
      if (s && !s.outcome && s.awake && r.id === s.lair && !s.lairFound) {
        discoverLair(ctx, asc.id, 'digging');
        result.discovery = 'You found the lair of the Evil One!';
      }
      if (result.homecoming && me.status === 'fading') returnAscendant(ctx, me, r, ' on the spot, walking again among the halls of their people');
      if (found?.power === 'shard') {
        const worst = ownedRegions(mw, me.id).sort((a, b) => b.corruption - a.corruption)[0] ?? r;
        worst.corruption = Math.max(0, worst.corruption - 50);
      }
      return {
        result: ctx.events.map((e) => e.text),
        ops: async (tx) => {
          for (const [k, v] of Object.entries(ctx.trustDelta)) if (Math.round(v)) await tx.hIncrBy(K.trust, k, Math.round(v));
        },
      };
    });
    for (const l of lines) await redis.zAdd(K.extra(w.leap + 1), { score: 10, member: l });
    if (lines.length) await appendLog(K.annals, lines, 100_000_000 + w.leap * 1000 + 500);
  }
  if (result.trust) await redis.hIncrBy(K.trust, asc.id, result.trust);
  await savePlayer(s.userId, p);
  return result;
};

export const resolveDiscovery = async (s: Session, choice: 'claim' | 'destroy' | 'leave') => {
  const { w, p, asc } = await requireJoined(s);
  if (!p.pending) throw new GameError('There is nothing to decide.');
  const { regionId, artifactId } = p.pending;
  const reg = w.regions[regionId]!;
  const layer = reg.ruinLayers.find((l) => l.artifacts.includes(artifactId));
  let msg = 'You leave the ruin open for others to find.';
  if (choice === 'claim') {
    if (asc.shrines.length >= 3) throw new GameError('You already hold 3 Shrines.');
    await mutateWorld((mw) => {
      const me = mw.ascendants[asc.id]!;
      if (!me.shrines.includes(regionId)) me.shrines.push(regionId);
      return true;
    });
    msg = `${reg.name} is now your Shrine: +${scaled(w, asc.id, 2)} Trust a day while you hold it.`;
  } else if (choice === 'destroy') {
    const gain = scaled(w, asc.id, 20);
    const arts = layer ? await getArtifacts(layer.artifacts) : [];
    for (const a of arts) if (a.id !== artifactId) a.destroyed = true;
    await saveArtifacts(arts.filter((a) => a.id !== artifactId));
    await redis.hIncrBy(K.trust, asc.id, gain);
    if (layer && layer.builder !== asc.id) await redis.hIncrBy(K.trust, layer.builder, 10);
    await mutateWorld((mw) => {
      const me = mw.ascendants[asc.id]!;
      me.defiledUntil = mw.leap + 7;
      for (const r of ownedRegions(mw, me.id)) {
        const t = Math.min(0.03, r.belief.faithful);
        r.belief.faithful -= t;
        r.belief.doubtful += t;
      }
      return true;
    });
    const line = `${asc.name} the Defiler destroyed the ruins of ${layer?.civName ?? 'a forgotten people'} at ${reg.name}.`;
    await redis.zAdd(K.extra(w.leap + 1), { score: 6, member: line });
    await appendLog(K.annals, [line], 100_000_000 + w.leap * 1000 + 600);
    if (layer) await pushInbox(layer.builder, `${asc.name} destroyed your ruins at ${reg.name}. Your followers’ anger gives you +10 Trust.`);
    msg = `You destroyed the layer for +${gain} Trust. The Chronicle will call you the Defiler for 7 days.`;
  }
  p.pending = null;
  await savePlayer(s.userId, p);
  return msg;
};

export const prophesy = async (s: Session, guess: LeapName) => {
  const { w, p, asc } = await requireJoined(s);
  if (!LEAPS.some((l) => l.name === guess)) throw new GameError('Choose a leap.');
  const ok = await redis.hSetNX(K.prophecy(w.leap + 1), asc.id, guess);
  if (!ok) throw new GameError('You have already made today’s prophecy.');
  markPlayed(w, p);
  await savePlayer(s.userId, p);
};

export const writeScripture = async (s: Session, text: string) => {
  const { asc } = await requireJoined(s);
  const line = cleanText(text, 80);
  if (!line) throw new GameError('Those words cannot be carved. Try others (80 characters, no rude words).');
  await mutateWorld((mw) => {
    mw.ascendants[asc.id]!.scripture = line;
    return true;
  });
  await redis.zIncrBy(K.scripture, asc.id, 0);
  return line;
};

export const vote = async (s: Session, target: string) => {
  const { w, asc } = await requireJoined(s);
  if (target === asc.id) throw new GameError('You cannot upvote your own scripture.');
  if (!w.ascendants[target]?.scripture) throw new GameError('That Ascendant has no scripture.');
  const ok = await redis.hSetNX(K.votes(w.leap), asc.id, target);
  if (!ok) throw new GameError('You have already upvoted a line today.');
  await redis.zIncrBy(K.scripture, target, 1);
};

export const pledge = async (s: Session, amount: number) => {
  const { w, asc } = await requireJoined(s);
  const sea = w.season;
  if (!sea || !sea.awake || !sea.lairFound || sea.outcome) throw new GameError('There is no Evil One to fight yet.');
  const amt = Math.floor(amount);
  if (!(amt >= 1)) throw new GameError('Pledge at least 1 Trust.');
  if (!(await spendTrust(asc.id, amt))) throw new GameError('You do not have that much Trust.');
  const weight = Math.max(1, weightOf(w, asc.id));
  const dmg = Math.max(1, Math.round(amt / weight));
  const pending = await redis.incrBy(K.pledge(sea.id), dmg);
  await redis.zIncrBy(K.contrib(sea.id), asc.id, dmg);
  if (sea.hp - pending <= 0) await redis.set(K.slayer(sea.id), asc.id, { nx: true });
  return { damage: dmg, hp: Math.max(0, sea.hp - pending) };
};

export const nameRegion = async (s: Session, regionId: number, name: string) => {
  const { asc } = await requireJoined(s);
  const clean = cleanText(name, 24);
  if (!clean) throw new GameError('That name cannot be used.');
  await mutateWorld((mw) => {
    const r = mw.regions[regionId];
    if (!r || r.revealedBy !== asc.id || r.namedBy) throw new GameError('Only the first to reveal a land may name it.');
    r.name = clean;
    r.namedBy = asc.id;
    return true;
  });
  return clean;
};

export const shareMyth = async (s: Session) => {
  const { w, asc } = await requireJoined(s);
  const postId = context.postId;
  if (!postId) throw new GameError('Open the game from a post to share.');
  const myth = mythLine(w, asc.id, `${w.leap}:${asc.id}`);
  const title = asc.titles.length ? ` (${asc.titles[asc.titles.length - 1]})` : '';
  const text = `**${asc.name}${title}**, ${asc.epithet}\n\n> ${myth}\n\n*Return tomorrow to see what history remembers.*`;
  await reddit.submitComment({ id: postId, text, runAs: 'USER' });
  return myth;
};

export const myth = async (s: Session) => {
  const { w, asc } = await requireJoined(s);
  return mythLine(w, asc.id, `${w.leap}:${asc.id}`);
};

/** Delete a player's personal data. Their Ascendant stays in history, anonymised. */
export const forgetMe = async (s: Session) => {
  const p = await loadPlayer(s.userId);
  const ascId = p?.ascId ?? `p:${s.userId}`;
  const w = await loadWorld();
  if (w?.ascendants[ascId]) {
    await mutateWorld((mw) => {
      const a = mw.ascendants[ascId];
      if (a) {
        a.userId = null;
        a.username = null;
      }
      return true;
    });
  }
  await redis.del(K.player(s.userId), K.cradle(s.userId), K.inbox(ascId));
  await redis.zRem(K.players, [s.userId]);
};

export const getUserTrust = (ascId: string) => getNum(K.trust, ascId);

const isT2 = (id: string): id is `t2_${string}` => id.startsWith('t2_');

/**
 * Devvit Rules: delete a user's data when their Reddit account is deleted.
 * Checks a rotating slice of players each day and purges any whose account is gone.
 */
export const purgeDeletedUsers = async (limit = 25) => {
  const total = await redis.zCard(K.players);
  if (!total) return 0;
  const start = Number((await redis.get(K.purgeCursor)) ?? 0) % total;
  const batch = await redis.zRange(K.players, start, start + limit - 1, { by: 'rank' });
  let purged = 0;
  for (const { member: userId } of batch) {
    if (!isT2(userId)) continue;
    try {
      const user = await reddit.getUserById(userId);
      if (user) continue;
    } catch (e) {
      console.warn('user lookup failed', userId, e);
      continue;
    }
    await forgetMe({ userId, username: '' });
    purged++;
  }
  await redis.set(K.purgeCursor, String(start + batch.length));
  return purged;
};

