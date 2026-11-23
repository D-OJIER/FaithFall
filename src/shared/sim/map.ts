// Hex map: axial coordinates, generation of the 88-region world, and helpers.
import { OLD_ONES, SPECIES, genPlaceName } from './data';
import { Rng } from './rng';
import type { Ascendant, Region, SpeciesId, Terrain, WorldState } from './types';
import { RUIN, WILD } from './types';

const DIRS: [number, number][] = [
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
];

const key = (q: number, r: number) => `${q},${r}`;

export const hexDistance = (a: { q: number; r: number }, b: { q: number; r: number }) =>
  (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;

/** Adjacency cache per region-list identity. */
const adjCache = new WeakMap<Region[], number[][]>();
export const neighbours = (regions: Region[], id: number): number[] => {
  let adj = adjCache.get(regions);
  if (!adj || adj.length !== regions.length) {
    const idx = new Map<string, number>();
    regions.forEach((r) => idx.set(key(r.q, r.r), r.id));
    adj = regions.map((r) =>
      DIRS.map(([dq, dr]) => idx.get(key(r.q + dq, r.r + dr))).filter((v): v is number => v !== undefined)
    );
    adjCache.set(regions, adj);
  }
  return adj[id] ?? [];
};

export const blankRegion = (id: number, q: number, r: number, terrain: Terrain, name: string, dark: boolean): Region => ({
  id, q, r, name, terrain, dark, fog: dark, landing: false,
  owner: WILD, species: 'humans', people: 0, food: 50, foodCap: 100, might: 10,
  belief: { devoted: 0, faithful: 0, doubtful: 1 }, corruption: 0, ward: false, tradition: 0,
  conversion: {}, processes: [], relics: [], ruinLayers: [], ruinRealm: null, buried: 0,
  faithTicks: 0, smitesThisLeap: 0, glowUntil: -1, namedBy: null, revealedBy: null,
});

const growBlob = (rng: Rng, start: [number, number], size: number, taken: Set<string>): [number, number][] => {
  const cells: [number, number][] = [start];
  taken.add(key(...start));
  while (cells.length < size) {
    const [q, r] = rng.pick(cells);
    const [dq, dr] = rng.pick(DIRS);
    const n: [number, number] = [q + dq, r + dr];
    // keep the blob compact
    if (hexDistance({ q: n[0], r: n[1] }, { q: start[0], r: start[1] }) > Math.sqrt(size) * 0.95) continue;
    if (taken.has(key(...n))) continue;
    taken.add(key(...n));
    cells.push(n);
  }
  return cells;
};

const assignTerrain = (rng: Rng, cells: [number, number][], all: Set<string>, palette: Terrain[]): Terrain[] => {
  const seeds = palette.map((t) => ({ t, c: rng.pick(cells) }));
  return cells.map(([q, r]) => {
    let best = seeds[0]!;
    let bd = Infinity;
    for (const s of seeds) {
      const d = hexDistance({ q, r }, { q: s.c[0], r: s.c[1] }) + rng.next() * 1.4;
      if (d < bd) { bd = d; best = s; }
    }
    const edge = DIRS.some(([dq, dr]) => !all.has(key(q + dq, r + dr)));
    if (edge && best.t !== 'mountain' && best.t !== 'tundra' && rng.chance(0.55)) return 'coast';
    return best.t;
  });
};

const realmOf = (species: SpeciesId) => SPECIES[species].realm;

export const canSettle = (species: SpeciesId, terrain: Terrain, seaDomain: boolean): boolean => {
  if (terrain === 'mountain') return species === 'stonebound';
  if (terrain === 'water') return species === 'tidefolk' || species === 'mirefolk' || seaDomain;
  return true;
};

export const bestHomeSpecies = (terrain: Terrain): SpeciesId[] => {
  const s = (Object.keys(SPECIES) as SpeciesId[]).filter((id) => SPECIES[id].homes.includes(terrain));
  return s.length ? s : ['humans'];
};

/** Build the initial shared world: 64 known regions + 24 on the fogged Dark Continent, 12 Old Ones. */
export const generateWorld = (id: string, seed: string): WorldState => {
  const rng = new Rng(`map:${seed}`);
  const taken = new Set<string>();
  const known = growBlob(rng, [0, 0], 64, taken);
  // Dark Continent touches the east edge of the known land
  const eastMost = known.reduce((a, b) => (b[0] * 2 + b[1] > a[0] * 2 + a[1] ? b : a));
  let dcStart: [number, number] = [eastMost[0] + 1, eastMost[1]];
  if (taken.has(key(...dcStart))) dcStart = [eastMost[0] + 2, eastMost[1] - 1];
  const dark = growBlob(rng, dcStart, 24, taken);
  const all = new Set([...known, ...dark].map((c) => key(...c)));
  const kt = assignTerrain(rng, known, all, ['plains', 'plains', 'forest', 'forest', 'hills', 'desert', 'swamp', 'tundra', 'mountain', 'plains', 'water']);
  const dt = assignTerrain(rng, dark, all, ['mountain', 'swamp', 'desert', 'forest', 'tundra', 'hills']);
  const r2 = () => rng.next();
  const used = new Set<string>();
  const name = () => {
    for (let i = 0; i < 40; i++) {
      const n = genPlaceName(r2);
      if (!used.has(n)) { used.add(n); return n; }
    }
    return genPlaceName(r2) + ' ' + used.size;
  };
  const regions: Region[] = [];
  known.forEach(([q, r], i) => regions.push(blankRegion(regions.length, q, r, kt[i] ?? 'plains', name(), false)));
  dark.forEach(([q, r], i) => regions.push(blankRegion(regions.length, q, r, dt[i] ?? 'hills', name(), true)));

  const world: WorldState = {
    id, kind: 'shared', ownerId: null, leap: 0, year: 0, regions,
    ascendants: {}, season: null, seasonCount: 0, lastSeasonEnd: 0, recentLeaps: [], seq: 1, civs: {},
  };

  // Wild peoples: about a third of the land.
  for (const reg of regions) {
    if (reg.terrain === 'water' || reg.terrain === 'mountain') continue;
    if (rng.chance(reg.dark ? 0.55 : 0.35)) {
      reg.species = rng.pick(bestHomeSpecies(reg.terrain));
      reg.people = rng.int(2, 6);
      reg.food = 60;
      reg.tradition = rng.int(0, 3);
      reg.might = rng.int(8, 30);
    }
  }

  // Landing regions: 6 spread across the known coast-ish edge, kept empty and locked.
  const knownLand = regions.filter((r) => !r.dark && r.terrain !== 'water' && r.terrain !== 'mountain');
  const landingPicks = rng.shuffle([...knownLand]).filter((r) => r.terrain !== 'swamp');
  const landings: Region[] = [];
  for (const r of landingPicks) {
    if (landings.length >= 6) break;
    if (landings.every((l) => hexDistance(l, r) >= 4)) landings.push(r);
  }
  for (const l of landings) {
    l.landing = true;
    l.people = 0;
    l.foodCap = 100;
  }

  // Old Ones: spread out homes.
  const homes: Region[] = [];
  const candidates = rng.shuffle(knownLand.filter((r) => !r.landing));
  OLD_ONES.forEach((def, i) => {
    const sp = def.species;
    let home = candidates.find((r) => SPECIES[sp].homes.includes(r.terrain) && homes.every((h) => hexDistance(h, r) >= 3));
    home ??= candidates.find((r) => homes.every((h) => hexDistance(h, r) >= 2) && !homes.includes(r));
    if (!home) return;
    homes.push(home);
    const asc: Ascendant = newAscendant({
      id: `old:${i}`, isBot: true, botType: def.type, name: def.name, epithet: def.epithet,
      domain: def.domain, species: sp, sigil: i, scripture: def.scripture, joinedLeap: 0,
    });
    world.ascendants[asc.id] = asc;
    foundCiv(world, asc, home, 6, rng);
    // a second region
    const n2 = neighbours(regions, home.id).map((n) => regions[n]!).find((n) => n.owner === WILD && !n.landing && canSettle(sp, n.terrain, false));
    if (n2) settle(world, asc, n2, 4);
  });

  // a few old ruins from before history began
  const ruinCands = rng.shuffle(regions.filter((r) => r.owner === WILD && r.people === 0 && !r.landing && r.terrain !== 'water'));
  for (const r of ruinCands.slice(0, 6)) {
    r.owner = RUIN;
    r.ruinRealm = r.dark ? 'sky' : 'surface';
    r.buried = r.dark ? 2 : 0;
  }
  return world;
};

export const newAscendant = (o: {
  id: string; isBot: boolean; botType: Ascendant['botType']; name: string; epithet: string;
  domain: Ascendant['domain']; species: SpeciesId; sigil: number; scripture: string; joinedLeap: number;
  userId?: string | null; username?: string | null;
}): Ascendant => ({
  id: o.id, isBot: o.isBot, botType: o.botType, userId: o.userId ?? null, username: o.username ?? null,
  name: o.name, epithet: o.epithet, domain: o.domain, species: o.species, sigil: o.sigil,
  status: 'active', civId: null, civName: '', foundedYear: 0, joinedLeap: o.joinedLeap,
  protectedUntil: o.joinedLeap + 3, scripture: o.scripture, memory: {}, twilight: 0, inspire: 0,
  defiledUntil: -1, ashRisen: null, fadedAt: -99, titles: [], shrines: [],
});

export const settle = (world: WorldState, asc: Ascendant, reg: Region, people: number) => {
  reg.owner = asc.id;
  reg.species = asc.species;
  reg.people = people;
  reg.food = Math.max(reg.food, 50);
  reg.might = Math.max(reg.might, 20);
  reg.belief = asc.species === 'sylvan'
    ? { devoted: 0.5, faithful: 0.35, doubtful: 0.15 }
    : { devoted: 0.3, faithful: 0.5, doubtful: 0.2 };
  reg.conversion = {};
  reg.landing = false;
  reg.fog = false;
  void world;
};

export const foundCiv = (world: WorldState, asc: Ascendant, home: Region, people: number, rng: Rng) => {
  const civId = `civ:${world.seq++}`;
  const species = asc.species;
  const place = home.name;
  const civName = `the ${SPECIES[species].name} of ${place}`;
  world.civs[civId] = { id: civId, name: civName, species, ascendantId: asc.id, foundedYear: world.year, fellYear: null, peak: people };
  asc.civId = civId;
  asc.civName = civName;
  asc.foundedYear = world.year;
  // a ruin under the home keeps its old layers
  if (home.owner === RUIN) home.ruinRealm = home.ruinRealm ?? realmOf(species);
  settle(world, asc, home, people);
  void rng;
  return civId;
};

/** Raise a ring of 12 new regions at the edge of the known map (used as player count grows). */
export const raiseRing = (world: WorldState, rng: Rng): Region[] => {
  const regs = world.regions;
  const occupied = new Set(regs.map((r) => key(r.q, r.r)));
  const frontier: [number, number][] = [];
  for (const r of regs) {
    if (r.dark) continue;
    for (const [dq, dr] of DIRS) {
      const k = key(r.q + dq, r.r + dr);
      if (!occupied.has(k)) {
        occupied.add(k);
        frontier.push([r.q + dq, r.r + dr]);
      }
    }
  }
  // prefer cells far from the Dark Continent
  frontier.sort((a, b) => a[0] * 2 + a[1] - (b[0] * 2 + b[1]));
  const picks = frontier.slice(0, 18);
  rng.shuffle(picks);
  const added: Region[] = [];
  const terrains: Terrain[] = ['plains', 'forest', 'coast', 'hills', 'plains', 'coast'];
  for (const [q, r] of picks.slice(0, 12)) {
    const reg = blankRegion(regs.length, q, r, rng.pick(terrains), genPlaceName(() => rng.next()), false);
    regs.push(reg);
    added.push(reg);
  }
  added.forEach((r, i) => {
    if (i % 3 === 0) r.landing = true;
  });
  return added;
};
