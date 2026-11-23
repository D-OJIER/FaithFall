// Hand-written content: species, domains, cards, leaps, Old Ones and Evil Ones.
import type { BotType, CardId, Domain, LeapName, Rarity, RuinRealm, SpeciesId, Terrain } from './types';

export type SpeciesDef = {
  id: SpeciesId;
  name: string;
  rarity: Rarity;
  lifespan: number;
  homes: Terrain[];
  realm: RuinRealm;
  learns: string;
  builds: string[];
  speciality: string;
  weakness: string;
  growth: number;
  emblem: string;
  counteredBy: SpeciesId | null;
  cradle: string;
};

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  humans: {
    id: 'humans', name: 'Humans', rarity: 'common', lifespan: 70, homes: ['plains'], realm: 'surface',
    learns: 'Trial and error: Teach pays off over a generation',
    builds: ['Walled Temple', 'Oath-Sword', 'High Altar', 'Gate-Spear'],
    speciality: 'Adaptable: no terrain penalty, expand 20% more often',
    weakness: 'Fickle: Doubtful +1% per tick', growth: 1, emblem: '⚜', counteredBy: null,
    cradle: 'a river valley',
  },
  tidefolk: {
    id: 'tidefolk', name: 'Tidefolk', rarity: 'common', lifespan: 90, homes: ['coast', 'water'], realm: 'sunken',
    learns: 'Contact: Teach costs 30% less',
    builds: ['Drowned Bell', 'Stilt Shrine', 'Pearl Oar', 'Tide Lantern'],
    speciality: 'Expand across water; more Food for each neighbour',
    weakness: 'Inland Food −30%', growth: 1, emblem: '≋', counteredBy: null,
    cradle: 'a sunken grotto',
  },
  emberkin: {
    id: 'emberkin', name: 'Emberkin', rarity: 'common', lifespan: 40, homes: ['desert', 'hills'], realm: 'surface',
    learns: 'Doing: Teach pays off the next leap',
    builds: ['Forge-Heart', 'Ash Blade', 'Ember Crown', 'Slag Idol'],
    speciality: 'Might grows 2×; raids succeed more often',
    weakness: 'Famine hits twice as hard', growth: 1, emblem: '✶', counteredBy: null,
    cradle: 'a smoking caldera',
  },
  duskwings: {
    id: 'duskwings', name: 'Duskwings', rarity: 'common', lifespan: 30, homes: ['forest', 'plains', 'hills'], realm: 'sky',
    learns: 'Dreams: Teach +50% while 30% are Devoted',
    builds: ['Dream-Mask', 'Sky-Shrine', 'Moth Lantern', 'Silk Censer'],
    speciality: 'Whisper costs 2; conversion +50%; can settle ruins',
    weakness: 'Might can’t pass 40; very fickle', growth: 1.1, emblem: '☾', counteredBy: null,
    cradle: 'a sky-island',
  },
  burrowkin: {
    id: 'burrowkin', name: 'Burrowkin', rarity: 'common', lifespan: 60, homes: ['hills', 'plains'], realm: 'deep',
    learns: 'Apprenticeship: Teach is never lost',
    builds: ['Clay Idol', 'Granary Seal', 'Root Lantern', 'Tunnel Hearth'],
    speciality: 'Famine can’t cut People more than 2% a tick',
    weakness: 'Might −20%; can’t cross water', growth: 1, emblem: '◉', counteredBy: null,
    cradle: 'a warm burrow under the hills',
  },
  fangkin: {
    id: 'fangkin', name: 'Fangkin', rarity: 'common', lifespan: 50, homes: ['forest', 'tundra'], realm: 'surface',
    learns: 'The hunt: Teach for Might counts double',
    builds: ['Bone Totem', 'Fang Spear', 'Moon Drum', 'Pelt Banner'],
    speciality: 'Pack: +25% Might beside other Fangkin',
    weakness: 'Doubtful +2% a tick when Food < 40', growth: 1, emblem: '⟁', counteredBy: null,
    cradle: 'a pine-dark hollow',
  },
  stonebound: {
    id: 'stonebound', name: 'Stonebound', rarity: 'uncommon', lifespan: 300, homes: ['hills', 'mountain'], realm: 'deep',
    learns: 'Inheritance: Teach takes 50 years, double bonus',
    builds: ['Runic Axe', 'Carved Hall Door', 'Hearth-Stone', 'Deep Anvil'],
    speciality: '+10 Might when defending; can settle mountains',
    weakness: 'Growth ×0.5; slow to convert', growth: 0.5, emblem: '▲', counteredBy: null,
    cradle: 'a mountain hollow',
  },
  mirefolk: {
    id: 'mirefolk', name: 'Mirefolk', rarity: 'uncommon', lifespan: 80, homes: ['swamp'], realm: 'sunken',
    learns: 'Shedding: old lessons grow stronger with each age',
    builds: ['Reed Temple', 'Bone Idol', 'Mire Crown', 'Heron Staff'],
    speciality: 'Smite does half to them; swamps can’t be raided',
    weakness: 'Food −20% outside swamps', growth: 1, emblem: '❦', counteredBy: null,
    cradle: 'a fog-wrapped mere',
  },
  sylvan: {
    id: 'sylvan', name: 'Sylvan', rarity: 'rare', lifespan: 400, homes: ['forest'], realm: 'surface',
    learns: 'Song: Teach takes 100 years',
    builds: ['Grove-Seed', 'Song-Leaf', 'Thorn Harp', 'Living Arch'],
    speciality: 'Start 50% Devoted; belief barely drifts',
    weakness: 'Growth ×0.4; farmed Food −20%', growth: 0.4, emblem: '❧', counteredBy: null,
    cradle: 'an old-growth glade',
  },
  ashborne: {
    id: 'ashborne', name: 'Ashborne', rarity: 'epic', lifespan: 100, homes: ['desert'], realm: 'sky',
    learns: 'Rebirth: keep half their lessons after collapse',
    builds: ['Flame-Crown', 'Pyre-Stone', 'Phoenix Quill', 'Cinder Bell'],
    speciality: 'Once a season, rise again at half People instead of fading',
    weakness: 'Food −40% on coasts', growth: 0.8, emblem: '✹', counteredBy: 'tidefolk',
    cradle: 'a glass desert under red stars',
  },
};

export const SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];

export const RARITY_ODDS: [Rarity, number][] = [
  ['common', 55],
  ['uncommon', 28],
  ['rare', 13],
  ['epic', 4],
];

export const RARITY_START: Record<Rarity, { foodCap: number; text: string }> = {
  common: { foodCap: 100, text: '3k People, a fertile home' },
  uncommon: { foodCap: 100, text: '3k People, an ordinary home' },
  rare: { foodCap: 80, text: '3k People, Food cap −20%, a hostile neighbour' },
  epic: { foodCap: 65, text: '3k People, Food cap −35%, near the Dark Continent' },
  legendary: { foodCap: 100, text: 'Old Ones only' },
};

export const TERRAIN: Record<Terrain, { yield: number; defence: number; label: string }> = {
  plains: { yield: 12, defence: 1, label: 'Plains' },
  forest: { yield: 9, defence: 1.2, label: 'Forest' },
  hills: { yield: 8, defence: 1.3, label: 'Hills' },
  desert: { yield: 5, defence: 1, label: 'Desert' },
  coast: { yield: 11, defence: 1, label: 'Coast' },
  water: { yield: 7, defence: 1.1, label: 'Water' },
  swamp: { yield: 8, defence: 1.3, label: 'Swamp' },
  tundra: { yield: 5, defence: 1.1, label: 'Tundra' },
  mountain: { yield: 4, defence: 1.6, label: 'Mountain' },
};

export type DomainDef = { id: Domain; name: string; draws: CardId[]; passive: string; glyph: string };
export const DOMAINS: Record<Domain, DomainDef> = {
  war: { id: 'war', name: 'War', draws: ['smite', 'teach'], passive: '+10% Might growth', glyph: '⚔' },
  harvest: { id: 'harvest', name: 'Harvest', draws: ['bless', 'spring'], passive: '+10% Food', glyph: '❀' },
  death: { id: 'death', name: 'Death', draws: ['whisper', 'cleanse'], passive: 'Digs find relics more often', glyph: '☠' },
  sea: { id: 'sea', name: 'Sea', draws: ['inspire', 'whisper'], passive: 'Can expand across water', glyph: '⚓' },
  wisdom: { id: 'wisdom', name: 'Wisdom', draws: ['teach', 'ward'], passive: 'Teach pays off faster', glyph: '✦' },
};
export const DOMAIN_IDS = Object.keys(DOMAINS) as Domain[];

export type CardTarget = 'own' | 'any' | 'wild' | 'foreign' | 'fog' | 'none' | 'ascendant' | 'ruinOrWild';
export type CardDef = {
  id: CardId;
  name: string;
  cost: number;
  effect: string;
  lands: string;
  target: CardTarget;
  unlockDay: number;
  glyph: string;
};

export const CARDS: Record<CardId, CardDef> = {
  bless: { id: 'bless', name: 'Bless Harvest', cost: 6, effect: 'Food +25 over 3 ticks', lands: 'Next leap', target: 'any', unlockDay: 1, glyph: '❀' },
  whisper: { id: 'whisper', name: 'Whisper', cost: 4, effect: 'Begin or advance converting a wild people', lands: 'In 1–3 leaps', target: 'ruinOrWild', unlockDay: 1, glyph: '❝' },
  ward: { id: 'ward', name: 'Ward', cost: 8, effect: 'Blocks Corruption entering a region', lands: 'Next leap', target: 'any', unlockDay: 1, glyph: '⛨' },
  explore: { id: 'explore', name: 'Explore', cost: 8, effect: 'Reveal a fogged region; 20% are lost', lands: 'Next leap', target: 'fog', unlockDay: 1, glyph: '⌖' },
  smite: { id: 'smite', name: 'Smite', cost: 15, effect: 'People −10%, Might −15; leaves war ruins', lands: 'Next leap', target: 'foreign', unlockDay: 2, glyph: 'ϟ' },
  sign: { id: 'sign', name: 'Sign', cost: 3, effect: 'Doubtful −3%; fading: make a ruin glow', lands: 'Next leap', target: 'none', unlockDay: 2, glyph: '✧' },
  envoy: { id: 'envoy', name: 'Envoy', cost: 2, effect: 'Send a 140-character message', lands: 'Next leap', target: 'ascendant', unlockDay: 2, glyph: '✉' },
  teach: { id: 'teach', name: 'Teach', cost: 10, effect: 'Might +20, built up over 25 years', lands: 'Long leaps pay more', target: 'own', unlockDay: 3, glyph: '✎' },
  inspire: { id: 'inspire', name: 'Inspire Leader', cost: 10, effect: '+15% expansion, Doubtful −5%', lands: '1–2 leaps', target: 'none', unlockDay: 3, glyph: '♛' },
  commission: { id: 'commission', name: 'Commission', cost: 15, effect: 'Build a named artifact; Devoted +3%', lands: 'Next leap', target: 'own', unlockDay: 3, glyph: '⌂' },
  spring: { id: 'spring', name: 'Reveal Spring', cost: 5, effect: 'Food cap +15, forever', lands: 'Next leap', target: 'own', unlockDay: 3, glyph: '♒' },
  cleanse: { id: 'cleanse', name: 'Cleanse', cost: 12, effect: 'Corruption −30 in one region', lands: 'Next leap', target: 'any', unlockDay: 1, glyph: '☼' },
};
export const CARD_IDS = Object.keys(CARDS) as CardId[];

export type LeapDef = { years: number; name: LeapName; chance: number; payout: number };
export const LEAPS: LeapDef[] = [
  { years: 5, name: 'A Season', chance: 30, payout: 13 },
  { years: 25, name: 'A Generation', chance: 35, payout: 11 },
  { years: 50, name: 'An Era', chance: 20, payout: 20 },
  { years: 100, name: 'An Age', chance: 10, payout: 40 },
  { years: 300, name: 'A Great Age', chance: 5, payout: 80 },
];
export const leapNameFor = (years: number): LeapName =>
  (LEAPS.find((l) => l.years === years) ?? LEAPS[0]!).name;

export type OldOneDef = {
  name: string;
  epithet: string;
  type: BotType;
  domain: Domain;
  species: SpeciesId;
  scripture: string;
};

// Twelve hand-written Old Ones.
export const OLD_ONES: OldOneDef[] = [
  { name: 'Morrak', epithet: 'the Iron Appetite', type: 'devourer', domain: 'war', species: 'emberkin', scripture: 'What the fire takes, the fire keeps.' },
  { name: 'Gulvane', epithet: 'Who Eats the Border', type: 'devourer', domain: 'war', species: 'fangkin', scripture: 'The hungry are never lost.' },
  { name: 'Kharos', epithet: 'the Red Anvil', type: 'devourer', domain: 'war', species: 'humans', scripture: 'Steel is a prayer that is always answered.' },
  { name: 'Ilsabet', epithet: 'Shepherd of Small Fields', type: 'shepherd', domain: 'harvest', species: 'humans', scripture: 'Plant for a harvest you will not see.' },
  { name: 'Oruun', epithet: 'the Patient Root', type: 'shepherd', domain: 'harvest', species: 'burrowkin', scripture: 'Under every field, a granary of mercy.' },
  { name: 'Thessaly Quill', epithet: 'Keeper of the Last Lamp', type: 'hermit', domain: 'wisdom', species: 'stonebound', scripture: 'Write it in stone, for ink forgets.' },
  { name: 'Avenmoor', epithet: 'the Listening Grove', type: 'hermit', domain: 'wisdom', species: 'sylvan', scripture: 'Sing slowly; the trees are listening.' },
  { name: 'Liriel', epithet: 'the Twice-Burned', type: 'hermit', domain: 'wisdom', species: 'ashborne', scripture: 'From the ash, a smaller flame, and then a sun.' },
  { name: 'Nerith', epithet: 'Mother of Low Tides', type: 'trickster', domain: 'sea', species: 'tidefolk', scripture: 'Every shore belongs to the tide in the end.' },
  { name: 'Pell', epithet: 'the Laughing Wake', type: 'trickster', domain: 'sea', species: 'mirefolk', scripture: 'Believe whatever floats.' },
  { name: 'Sorrowmere', epithet: 'the Pale Shepherd', type: 'pale', domain: 'death', species: 'mirefolk', scripture: 'All roads go down to the mere.' },
  { name: 'Vey', epithet: 'Lantern in the Barrow', type: 'pale', domain: 'death', species: 'duskwings', scripture: 'The dead dream, and I keep their dreams.' },
];

export type EvilOneDef = { name: string; epithet: string; form: string; blight: string };
export const EVIL_ONES: EvilOneDef[] = [
  { name: 'Vashtar', epithet: 'the Hunger Beneath', form: 'a mouth of roots under the world', blight: 'the Blight' },
  { name: 'Oloch', epithet: 'the Drowned Choir', form: 'a thousand voices singing under black water', blight: 'the Black Tide' },
  { name: 'Sere', epithet: 'the Ash That Walks', form: 'a grey wind wearing a crown', blight: 'the Greying' },
  { name: 'Mother Nhal', epithet: 'Who Unmakes', form: 'a hollow woman stitched from fog', blight: 'the Unravelling' },
];

export const OMEN_MOODS = [
  'Somewhere, the rivers run black.',
  'The birds have stopped singing at dawn.',
  'Milk sours in the pail before it cools.',
  'Children dream of a door that should not open.',
  'The stars over the sea flicker and go out.',
];

// Name parts for generated names.
const SYL_A = ['Vae', 'Os', 'Kae', 'Mor', 'Sel', 'Thar', 'Ir', 'Ul', 'Ys', 'Ber', 'Cael', 'Dun', 'Esh', 'Fen', 'Hal', 'Lun', 'Nor', 'Quen', 'Rho', 'Tav'];
const SYL_B = ['lor', 'tra', 'ith', 'ane', 'ven', 'dra', 'mir', 'oth', 'iel', 'gar', 'wen', 'ric', 'umb', 'ess', 'ark', 'ion'];
const TITLES = ['Keeper', 'Warden', 'Voice', 'Lantern', 'Hand', 'Mother', 'Father', 'Singer', 'Shepherd', 'Herald', 'Witness', 'Heart'];
const ADJS = ['Drowned', 'Hollow', 'Ninth', 'Burning', 'Quiet', 'Sunken', 'Iron', 'Silver', 'Last', 'Weeping', 'Unlit', 'Golden'];
const NOUNS = ['Bell', 'Gate', 'Star', 'Furrow', 'Tide', 'Ember', 'Lantern', 'Crown', 'Root', 'Choir', 'Well', 'Road'];
const PLACE_A = ['Os', 'Vel', 'Kar', 'Am', 'Bry', 'Cor', 'Dra', 'Eld', 'Gal', 'Hes', 'Ith', 'Jor', 'Lym', 'Mar', 'Nes', 'Or', 'Pyr', 'Ruth', 'Sar', 'Tor', 'Ul', 'Wyn', 'Zan', 'Fal'];
const PLACE_B = ['tra', 'mere', 'holm', 'reach', 'dun', 'vale', 'mark', 'wick', 'ford', 'heth', 'oss', 'ara', 'enn', 'gard', 'more', 'stead'];

export const genAscendantName = (r: () => number): { name: string; epithet: string } => {
  const p = <T,>(a: T[]): T => a[Math.floor(r() * a.length)] as T;
  return {
    name: p(SYL_A) + p(SYL_B),
    epithet: `${p(TITLES)} of the ${p(ADJS)} ${p(NOUNS)}`,
  };
};

export const genPlaceName = (r: () => number): string => {
  const p = <T,>(a: T[]): T => a[Math.floor(r() * a.length)] as T;
  return p(PLACE_A) + p(PLACE_B);
};

export const genArtifactName = (species: SpeciesId, place: string, r: () => number): string => {
  const builds = SPECIES[species].builds;
  const noun = builds[Math.floor(r() * builds.length)] ?? 'Relic';
  return r() < 0.5 ? `The ${noun} of ${place}` : `${place}'s ${noun}`;
};

export const kindForBuild = (name: string): 'temple' | 'idol' | 'weapon' | 'relic' => {
  if (/Temple|Shrine|Hall|Altar|Arch|Hearth|Granary|Grove/.test(name)) return 'temple';
  if (/Sword|Spear|Axe|Blade|Oar|Staff|Anvil/.test(name)) return 'weapon';
  if (/Idol|Totem|Mask|Crown/.test(name)) return 'idol';
  return 'relic';
};

export const LORE_DUST = [
  'Only dust, and a child’s footprint pressed in clay.',
  'A shard of a bowl, painted with a star no one remembers.',
  'Ash, and under it, more ash.',
  'A coin worn smooth. The face on it is gone.',
  'Roots have split the floor here. Nothing remains.',
  'A scratched name on a wall, half a word long.',
  'Broken roof tiles, and the smell of old rain.',
];

export const PROFANITY = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'retard', 'bitch', 'whore', 'slut', 'rape', 'nazi', 'kike', 'spic', 'chink', 'dick', 'cock', 'pussy', 'asshole', 'bastard'];
export const cleanText = (s: string, max: number): string | null => {
  // eslint-disable-next-line no-control-regex
  const t = s.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  if (!t) return null;
  const low = t.toLowerCase().replace(/[^a-z]/g, '');
  if (PROFANITY.some((w) => low.includes(w))) return null;
  return t;
};
