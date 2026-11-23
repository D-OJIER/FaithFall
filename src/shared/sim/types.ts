// Core data model shared by the leap engine (server) and the client views.

export type Domain = 'war' | 'harvest' | 'death' | 'sea' | 'wisdom';

export type Terrain =
  | 'plains'
  | 'forest'
  | 'hills'
  | 'desert'
  | 'coast'
  | 'water'
  | 'swamp'
  | 'tundra'
  | 'mountain';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type SpeciesId =
  | 'humans'
  | 'tidefolk'
  | 'emberkin'
  | 'duskwings'
  | 'burrowkin'
  | 'fangkin'
  | 'stonebound'
  | 'mirefolk'
  | 'sylvan'
  | 'ashborne';

export type RuinRealm = 'surface' | 'deep' | 'peak' | 'sunken' | 'sky';

export type BotType = 'devourer' | 'shepherd' | 'hermit' | 'trickster' | 'pale';

export type CardId =
  | 'bless'
  | 'spring'
  | 'inspire'
  | 'teach'
  | 'whisper'
  | 'sign'
  | 'smite'
  | 'ward'
  | 'cleanse'
  | 'explore'
  | 'commission'
  | 'envoy';

export type ArtifactKind = 'temple' | 'idol' | 'weapon' | 'scripture' | 'relic';

export type LeapName = 'A Season' | 'A Generation' | 'An Era' | 'An Age' | 'A Great Age';

/** Owner value of a region: an Ascendant id or one of the unowned states. */
export type RegionOwner = string;
export const WILD = 'wild';
export const RUIN = 'ruin';
export const WASTE = 'waste';
export const HOLLOW = 'hollow';

export type Belief = { devoted: number; faithful: number; doubtful: number };

export type Process =
  | { kind: 'food'; amount: number; ticks: number }
  | { kind: 'might'; amount: number; ticks: number; delay: number }
  | { kind: 'convert'; asc: string; amount: number; ticks: number };

export type RuinLayer = {
  /** Ascendant who built the civilization that fell here. */
  builder: string;
  civName: string;
  species: SpeciesId;
  year: number;
  artifacts: string[];
};

export type Region = {
  id: number;
  q: number;
  r: number;
  name: string;
  terrain: Terrain;
  dark: boolean; // part of the Dark Continent
  fog: boolean;
  landing: boolean; // reserved landing region
  owner: RegionOwner;
  species: SpeciesId;
  people: number; // thousands
  food: number;
  foodCap: number;
  might: number;
  belief: Belief;
  corruption: number;
  ward: boolean;
  tradition: number; // 0-3, wild regions only
  conversion: Record<string, number>; // asc id -> 0..1
  processes: Process[];
  relics: string[]; // artifacts standing in a living region
  ruinLayers: RuinLayer[];
  ruinRealm: RuinRealm | null;
  buried: number; // extra depth from Great Ages
  faithTicks: number; // ticks of strong faith, used for temples
  smitesThisLeap: number;
  glowUntil: number; // leap; ruins made to glow by a Sign
  namedBy: string | null; // ascendant who revealed and named it
  revealedBy: string | null;
};

export type Ascendant = {
  id: string;
  isBot: boolean;
  botType: BotType | null;
  userId: string | null;
  username: string | null;
  name: string;
  epithet: string;
  domain: Domain;
  species: SpeciesId;
  sigil: number;
  status: 'active' | 'fading' | 'returned';
  civId: string | null;
  civName: string;
  foundedYear: number;
  joinedLeap: number;
  protectedUntil: number; // leap number
  scripture: string;
  memory: Record<string, number>;
  twilight: number; // leaps remaining in twilight, 0 when none
  inspire: number; // leaps of inspiration left
  defiledUntil: number;
  ashRisen: string | null; // season id where Ashborne rebirth was used
  fadedAt: number; // leap of the last fall
  titles: string[];
  shrines: number[]; // ruin region ids claimed
};

export type Artifact = {
  id: string;
  kind: ArtifactKind;
  name: string;
  ascendantId: string;
  civName: string;
  species: SpeciesId;
  yearMade: number;
  inscription: string;
  great: boolean;
  power: 'shard' | 'crown' | null;
  foundBy: string | null;
  foundYear: number | null;
  destroyed: boolean;
};

export type SeasonPhase = 'omens' | 'spread' | 'emergence' | 'aftermath';

export type Season = {
  id: string;
  number: number;
  phase: SeasonPhase;
  day: number; // season day, advances once per leap
  evilOne: number; // index into EVIL_ONES
  source: number; // region id, secret
  lair: number; // region id, secret
  discovered: boolean;
  discoveredBy: string | null;
  awake: boolean;
  lairFound: boolean;
  lairFoundBy: string | null;
  hp: number;
  maxHp: number;
  outcome: 'won' | 'lost' | null;
  aftermathDays: number;
  slayer: string | null;
};

export type ActionCard = {
  ascendantId: string;
  card: CardId;
  target: number | null;
  text?: string; // envoy message
  to?: string; // envoy recipient
};

export type WorldEvent = {
  /** Higher importance is more likely to become a Chronicle headline. */
  weight: number;
  text: string;
  ascs: string[]; // involved ascendants (books, personal lines)
  civs: string[]; // civ books to append to
  personal?: Record<string, string>; // per-ascendant version of the line
  title?: string; // candidate Chronicle title fragment
  kind: string;
};

export type WorldState = {
  id: string;
  kind: 'shared' | 'cradle';
  ownerId: string | null;
  leap: number;
  year: number;
  regions: Region[];
  ascendants: Record<string, Ascendant>;
  season: Season | null;
  seasonCount: number;
  lastSeasonEnd: number;
  recentLeaps: number[]; // years of the last leaps, most recent last
  seq: number; // id counter for artifacts and civs
  civs: Record<string, CivRecord>;
};

export type CivRecord = {
  id: string;
  name: string;
  species: SpeciesId;
  ascendantId: string;
  foundedYear: number;
  fellYear: number | null;
  peak: number;
};

export type LeapInput = {
  world: WorldState;
  trust: Record<string, number>;
  remembrance: Record<string, number>;
  actions: ActionCard[];
  seed: string;
  forcedYears?: number;
  quiet?: boolean;
  pledged?: number;
  slayer?: string | null;
  contributors?: [string, number][];
};

export type LeapResult = {
  world: WorldState;
  years: number;
  leapName: LeapName;
  events: WorldEvent[];
  trustDelta: Record<string, number>;
  remDelta: Record<string, number>;
  newArtifacts: Artifact[];
  inbox: { asc: string; text: string }[];
  title: string;
};
