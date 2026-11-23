// Builds what a player may see. Secret Corruption state never leaves the server.
import { redis } from '@devvit/web/server';
import { EVIL_ONES } from '../../shared/sim/data';
import { omenText, privateClue } from '../../shared/sim/season';
import { cardCost, civStats, dayOf, drawHand, ownedRegions, weightOf } from '../../shared/sim/rules';
import type { Ascendant, Region, WorldState } from '../../shared/sim/types';
import { RUIN, WASTE } from '../../shared/sim/types';
import type { ChronicleView, MeView, PlayerRecord, PublicAsc, PublicRegion, SeasonView } from '../../shared/api';
import { K, getArtifacts, getNum, savePlayer } from './store';

export const publicRegion = (w: WorldState, r: Region, viewer: string | null): PublicRegion => {
  const s = w.season;
  const revealed = !!s && s.discovered;
  let corruption = 0;
  if (r.corruption > 0) {
    if (revealed || w.kind === 'cradle') corruption = Math.round(r.corruption);
    else if (viewer && r.owner === viewer) corruption = -1;
  }
  const hidden = r.fog;
  const ruin = r.owner === RUIN || r.owner === WASTE
    ? { layers: r.ruinLayers.length, realm: r.ruinRealm, buried: r.buried, glow: r.glowUntil >= w.leap }
    : null;
  const owner = w.ascendants[r.owner];
  return {
    id: r.id, q: r.q, r: r.r,
    name: hidden ? 'Fog' : r.name,
    terrain: hidden ? null : r.terrain,
    dark: r.dark, fog: hidden, landing: r.landing,
    owner: hidden ? 'fog' : r.owner,
    species: r.species,
    people: hidden ? 0 : Math.round(r.people * 10) / 10,
    food: hidden ? 0 : Math.round(r.food),
    might: hidden ? 0 : Math.round(r.might),
    devoted: Math.round(r.belief.devoted * 100),
    doubtful: Math.round(r.belief.doubtful * 100),
    corruption,
    ruin: hidden ? null : ruin,
    protected: !!owner && owner.protectedUntil > w.leap,
    canName: !!viewer && r.revealedBy === viewer && !r.namedBy,
  };
};

export const publicAsc = (w: WorldState, a: Ascendant): PublicAsc => {
  const regs = ownedRegions(w, a.id);
  return {
    id: a.id, name: a.name, epithet: a.epithet, domain: a.domain, species: a.species, sigil: a.sigil,
    isBot: a.isBot, status: a.status, civName: a.civName, username: a.username, titles: a.titles,
    regions: regs.length, people: Math.round(regs.reduce((x, r) => x + r.people, 0) * 10) / 10,
    scripture: a.scripture, defiler: a.defiledUntil >= w.leap,
  };
};

export const seasonView = async (w: WorldState, viewer: string | null): Promise<SeasonView | null> => {
  const s = w.season;
  if (!s) return null;
  const evil = EVIL_ONES[s.evilOne]!;
  const pending = Number((await redis.get(K.pledge(s.id))) ?? 0);
  const topRaw = s.lairFound ? await redis.zRange(K.contrib(s.id), 0, 4, { by: 'rank', reverse: true }) : [];
  const viewerAsc = viewer ? w.ascendants[viewer] : undefined;
  const earlyClue = viewerAsc?.domain === 'death';
  return {
    number: s.number, phase: s.phase, day: s.day,
    omens: omenText(w, s.day),
    clue: viewer ? privateClue(w, viewer, earlyClue) : null,
    discovered: s.discovered,
    discoveredBy: s.discoveredBy ? w.ascendants[s.discoveredBy]?.name ?? null : null,
    awake: s.awake,
    lairFound: s.lairFound,
    evil: s.lairFound ? evil : s.discovered ? { name: '???', epithet: '', form: '', blight: evil.blight } : null,
    hp: s.lairFound ? Math.max(0, s.hp - pending) : 0,
    maxHp: s.lairFound ? s.maxHp : 0,
    lairRegion: s.lairFound ? s.lair : null,
    sourceRegion: s.discovered ? s.source : null,
    top: topRaw.map((t) => ({ name: w.ascendants[t.member]?.name ?? '?', amount: Math.round(t.score), isBot: !!w.ascendants[t.member]?.isBot })),
    outcome: s.outcome,
  };
};

/** Start a new day for the player if the world has leapt since they last played. */
export const rollDay = async (w: WorldState, p: PlayerRecord): Promise<PlayerRecord> => {
  if (!p.ascId || p.day === w.leap) return p;
  const asc = w.ascendants[p.ascId];
  if (!asc) return p;
  const fading = asc.status === 'fading';
  const next: PlayerRecord = {
    ...p,
    day: w.leap,
    hand: drawHand(`${w.id}:${w.leap}:${asc.id}:hand`, asc.domain, dayOf(w, asc), fading),
    played: [],
    digs: 3,
    pending: null,
  };
  await savePlayer(p.userId, next);
  return next;
};

export const meView = async (w: WorldState, p: PlayerRecord): Promise<MeView | null> => {
  if (!p.ascId) return null;
  const asc = w.ascendants[p.ascId];
  if (!asc) return null;
  const [trust, rem, inboxRaw, reliquary, prophecy, voted] = await Promise.all([
    getNum(K.trust, asc.id), getNum(K.rem, asc.id),
    redis.zRange(K.inbox(asc.id), 0, 9, { by: 'rank', reverse: true }),
    redis.zCard(K.reliquary(asc.id)),
    redis.hGet(K.prophecy(w.leap + 1), asc.id),
    redis.hGet(K.votes(w.leap), asc.id),
  ]);
  const stats = civStats(w, asc.id);
  let pending: MeView['pending'] = null;
  if (p.pending) {
    const [art] = await getArtifacts([p.pending.artifactId]);
    const reg = w.regions[p.pending.regionId];
    if (art && reg) pending = { artifact: art, regionName: reg.name, builder: w.ascendants[art.ascendantId]?.name ?? 'a forgotten one' };
  }
  return {
    asc: publicAsc(w, asc),
    trust, remembrance: rem,
    weight: Math.round(weightOf(w, asc.id) * 100) / 100,
    day: dayOf(w, asc),
    stats: {
      people: Math.round(stats.people * 10) / 10, food: Math.round(stats.food), might: Math.round(stats.might),
      devoted: Math.round(stats.belief.devoted * 100), faithful: Math.round(stats.belief.faithful * 100),
      doubtful: Math.round(stats.belief.doubtful * 100), regions: stats.regions,
    },
    hand: p.hand.map((id) => ({ id, cost: cardCost(w, asc.id, id) })),
    played: p.played,
    maxPlays: asc.status === 'fading' ? 1 : 2,
    digsLeft: p.digs,
    prophecy: (prophecy as MeView['prophecy']) ?? null,
    streak: p.streak,
    prophecyStreak: p.prophecyStreak,
    inbox: inboxRaw.map((m) => m.member.slice(m.member.indexOf('|') + 1)),
    pending,
    canReturn: asc.status === 'fading' && rem >= 5,
    reliquary,
    votedFor: voted ?? null,
  };
};

export const loadChronicle = async (w: WorldState, ascId: string | null): Promise<ChronicleView | null> => {
  const raw = await redis.get(K.chronicle(w.leap));
  if (!raw) return null;
  const c = JSON.parse(raw) as ChronicleView;
  if (ascId) c.personal = (await redis.hGet(K.personal(w.leap), ascId)) ?? null;
  c.omens = omenText(w, w.season?.day ?? 0);
  return c;
};
