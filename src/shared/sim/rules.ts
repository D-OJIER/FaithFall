// Pure helper rules: weight, costs, income, card hands, ownership queries.
import { CARDS, DOMAINS, LEAPS, SPECIES } from './data';
import { neighbours } from './map';
import { Rng } from './rng';
import type { Ascendant, CardId, Domain, Region, WorldState } from './types';
import { HOLLOW, RUIN, WASTE, WILD } from './types';

export const isAscOwner = (owner: string) => owner !== WILD && owner !== RUIN && owner !== WASTE && owner !== HOLLOW;

export const ownedRegions = (w: WorldState, ascId: string): Region[] => w.regions.filter((r) => r.owner === ascId);

export const civPeople = (w: WorldState, ascId: string): number =>
  ownedRegions(w, ascId).reduce((a, r) => a + r.people, 0);

export const beliefOf = (w: WorldState, ascId: string) => {
  const regs = ownedRegions(w, ascId);
  const total = regs.reduce((a, r) => a + r.people, 0) || 1;
  const sum = (k: 'devoted' | 'faithful' | 'doubtful') => regs.reduce((a, r) => a + r.belief[k] * r.people, 0) / total;
  return { devoted: sum('devoted'), faithful: sum('faithful'), doubtful: sum('doubtful') };
};

export const civStats = (w: WorldState, ascId: string) => {
  const regs = ownedRegions(w, ascId);
  const people = regs.reduce((a, r) => a + r.people, 0);
  const n = regs.length || 1;
  return {
    regions: regs.length,
    people,
    food: regs.reduce((a, r) => a + r.food, 0) / n,
    might: regs.reduce((a, r) => a + r.might, 0) / n,
    belief: beliefOf(w, ascId),
  };
};

export const generationsOf = (w: WorldState, asc: Ascendant) => Math.max(0, Math.floor((w.year - asc.foundedYear) / 25));

export const weightOf = (w: WorldState, ascId: string): number => {
  const asc = w.ascendants[ascId];
  if (!asc) return 1;
  const p = civPeople(w, ascId);
  const size = Math.max(1, Math.sqrt(p / 3));
  const age = asc.status === 'fading' ? 1 : Math.min(2, 1 + 0.02 * generationsOf(w, asc));
  return size * age;
};

export const baseCost = (asc: Ascendant, card: CardId): number => {
  let c = CARDS[card].cost;
  if (card === 'whisper' && asc.species === 'duskwings') c = 2;
  if (card === 'teach' && asc.species === 'tidefolk') c = Math.round(c * 0.7);
  return c;
};

export const cardCost = (w: WorldState, ascId: string, card: CardId): number => {
  const asc = w.ascendants[ascId];
  if (!asc) return 999;
  return Math.max(1, Math.round(baseCost(asc, card) * weightOf(w, ascId)));
};

export const scaled = (w: WorldState, ascId: string, base: number) => Math.round(base * weightOf(w, ascId));

export const trustIncome = (w: WorldState, ascId: string): number => {
  const asc = w.ascendants[ascId];
  if (!asc) return 0;
  if (asc.status === 'fading') return 5;
  const regs = ownedRegions(w, ascId);
  let base = 3 + 1.5 * regs.reduce((a, r) => a + r.people * (3 * r.belief.devoted + r.belief.faithful), 0);
  const upkeep = Math.max(0, regs.length - 4) * weightOf(w, ascId);
  base -= upkeep;
  return Math.max(3, Math.round(base));
};

/** Days since an Ascendant joined (1 on the first shared day): drives progressive reveal. */
export const dayOf = (w: WorldState, asc: Ascendant) => Math.max(1, w.leap - asc.joinedLeap + 1);

export const unlockedCards = (day: number): CardId[] =>
  (Object.keys(CARDS) as CardId[]).filter((c) => CARDS[c].unlockDay <= day && (c !== 'cleanse' || day >= 1));

export const drawHand = (seed: string, domain: Domain, day: number, fading: boolean): CardId[] => {
  const rng = new Rng(seed);
  if (fading) return [rng.chance(0.6) ? 'whisper' : 'sign'];
  const pool = unlockedCards(day);
  const hand: CardId[] = [];
  for (let i = 0; i < 3; i++) {
    const options = pool.filter((c) => !hand.includes(c));
    const c = rng.weighted(options.map((id) => [id, DOMAINS[domain].draws.includes(id) ? 3 : 1] as const));
    hand.push(c);
  }
  return hand;
};

export const rollLeapYears = (w: WorldState, rng: Rng): number => {
  let options = LEAPS.map((l) => [l.years, l.chance] as const);
  const recentBig = w.recentLeaps.slice(-6).filter((y) => y >= 100).length;
  if (recentBig >= 2) options = options.filter(([y]) => y < 100);
  if (w.season && !w.season.outcome) {
    if (w.season.awake) options = options.filter(([y]) => y <= 25);
    else if (w.season.phase === 'spread') options = options.filter(([y]) => y <= 50);
  }
  return rng.weighted(options);
};

export const touchesOwn = (w: WorldState, ascId: string, regionId: number): boolean =>
  w.regions[regionId]?.owner === ascId || neighbours(w.regions, regionId).some((n) => w.regions[n]?.owner === ascId);

export const realmLabel: Record<string, string> = {
  surface: 'cracked stone', deep: 'sealed doors in the earth', peak: 'broken spires',
  sunken: 'drowned towers', sky: 'a shimmer in the clouds',
};

export const strength = (r: Region, defending: boolean) => {
  let might = r.might;
  if (defending && r.species === 'stonebound') might += 10;
  if (r.species === 'burrowkin') might *= 0.8;
  return might * Math.sqrt(Math.max(0.1, r.people)) * (defending ? 1 : 1);
};

export const lifespanOf = (r: Region) => SPECIES[r.species].lifespan;

export const activeAscendants = (w: WorldState) => Object.values(w.ascendants).filter((a) => a.status !== 'fading');
