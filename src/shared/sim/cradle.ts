// Onboarding: the Starry Draw and the Cradle, a private 7-region tutorial world.
import { RARITY_ODDS, SPECIES, SPECIES_IDS } from './data';
import { blankRegion, newAscendant, foundCiv } from './map';
import { Rng } from './rng';
import type { Domain, Rarity, SpeciesId, WorldState } from './types';
import { RUIN, WILD } from './types';

export type StarCard = { rarity: Rarity; species: SpeciesId };

/** Seven sealed cards; the sign-up draw always succeeds. Prefers species no player has yet. */
export const starryDraw = (seed: string, taken: Partial<Record<SpeciesId, number>>): StarCard[] => {
  const rng = new Rng(seed);
  const cards: StarCard[] = [];
  for (let i = 0; i < 7; i++) {
    const rarity = rng.weighted(RARITY_ODDS);
    const pool = SPECIES_IDS.filter((s) => SPECIES[s].rarity === rarity && !cards.some((c) => c.species === s));
    const fallback = SPECIES_IDS.filter((s) => SPECIES[s].rarity === rarity);
    const options = pool.length ? pool : fallback;
    const min = Math.min(...options.map((s) => taken[s] ?? 0));
    const fresh = options.filter((s) => (taken[s] ?? 0) === min);
    cards.push({ rarity, species: rng.pick(fresh) });
  }
  return cards;
};

export const CRADLE_BEATS = ['bless', 'dig', 'whisper', 'ward', 'ascend'] as const;
export type CradleBeat = (typeof CRADLE_BEATS)[number];

// Ring layout around the home hex. Ring index i borders i-1 and i+1.
const RING: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const CRADLE_RUIN = 1;
export const CRADLE_WILD = 2;
export const CRADLE_DARK = 5; // the corrupted patch; among owned land it borders only home

export const createCradle = (userId: string, species: SpeciesId, domain: Domain, name: string, epithet: string): WorldState => {
  const sp = SPECIES[species];
  const home = sp.homes[0] ?? 'plains';
  const rng = new Rng(`cradle:${userId}`);
  const w: WorldState = {
    id: `cradle-${userId}`, kind: 'cradle', ownerId: userId, leap: 0, year: 0, regions: [], ascendants: {},
    season: null, seasonCount: 0, lastSeasonEnd: 0, recentLeaps: [], seq: 1, civs: {},
  };
  w.regions.push(blankRegion(0, 0, 0, home, 'the Cradle', false));
  RING.forEach(([q, r], i) => {
    const t = i === CRADLE_RUIN ? (home === 'water' ? 'coast' : home) : sp.homes[i % sp.homes.length] ?? home;
    w.regions.push(blankRegion(i + 1, q, r, t, ['Hearthrise', 'Old Stones', 'Lowfold', 'Mistwater', 'Thornbank', 'Gloaming'][i]!, false));
  });
  const asc = newAscendant({ id: `p:${userId}`, isBot: false, botType: null, name, epithet, domain, species, sigil: 0, scripture: '', joinedLeap: 0, userId });
  w.ascendants[asc.id] = asc;
  foundCiv(w, asc, w.regions[0]!, 3, rng);
  w.regions[0]!.food = 35;
  const r1 = w.regions[CRADLE_RUIN]!;
  r1.owner = RUIN;
  r1.ruinRealm = 'surface';
  const r2 = w.regions[CRADLE_WILD]!;
  r2.owner = WILD;
  r2.species = species;
  r2.people = 2;
  r2.tradition = 0;
  r2.conversion = { [asc.id]: 0.4 }; // contact has already been made
  for (const r of w.regions) {
    r.fog = false;
    if (r.owner === WILD && r.id !== CRADLE_WILD) r.people = 0;
  }
  return w;
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary',
};
