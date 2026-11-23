// Types shared by the client and server for the HTTP API.
import type { StarCard } from './sim/cradle';
import type {
  Artifact, CardId, Domain, LeapName, RuinRealm, SeasonPhase, SpeciesId, Terrain,
} from './sim/types';

export type Stage = 'new' | 'drawn' | 'cradle' | 'joined';

export type PlayerRecord = {
  userId: string;
  username: string;
  ascId: string | null;
  stage: Stage;
  draw: StarCard[] | null;
  redrawUsed: boolean;
  day: number;
  hand: CardId[];
  played: CardId[];
  digs: number;
  streak: number;
  lastPlayedLeap: number;
  prophecyStreak: number;
  pending: { regionId: number; artifactId: string } | null;
  joinedAt: number;
};

export type PublicRegion = {
  id: number;
  q: number;
  r: number;
  name: string;
  terrain: Terrain | null;
  dark: boolean;
  fog: boolean;
  landing: boolean;
  owner: string;
  species: SpeciesId;
  people: number;
  food: number;
  might: number;
  devoted: number;
  doubtful: number;
  /** -1 means "a sickness with no name" (own symptoms before discovery). */
  corruption: number;
  ruin: { layers: number; realm: RuinRealm | null; buried: number; glow: boolean } | null;
  protected: boolean;
  canName: boolean;
};

export type PublicAsc = {
  id: string;
  name: string;
  epithet: string;
  domain: Domain;
  species: SpeciesId;
  sigil: number;
  isBot: boolean;
  status: 'active' | 'fading' | 'returned';
  civName: string;
  username: string | null;
  titles: string[];
  regions: number;
  people: number;
  scripture: string;
  defiler: boolean;
};

export type SeasonView = {
  number: number;
  phase: SeasonPhase;
  day: number;
  omens: string[];
  clue: string | null;
  discovered: boolean;
  discoveredBy: string | null;
  awake: boolean;
  lairFound: boolean;
  evil: { name: string; epithet: string; form: string; blight: string } | null;
  hp: number;
  maxHp: number;
  lairRegion: number | null;
  sourceRegion: number | null;
  top: { name: string; amount: number; isBot: boolean }[];
  outcome: 'won' | 'lost' | null;
};

export type ChronicleView = {
  leap: number;
  year: number;
  years: number;
  leapName: LeapName;
  title: string;
  headlines: string[];
  personal: string | null;
  scripture: { text: string; by: string } | null;
  omens: string[];
};

export type HandCard = { id: CardId; cost: number };

export type MeView = {
  asc: PublicAsc;
  trust: number;
  remembrance: number;
  weight: number;
  day: number;
  stats: { people: number; food: number; might: number; devoted: number; faithful: number; doubtful: number; regions: number };
  hand: HandCard[];
  played: CardId[];
  maxPlays: number;
  digsLeft: number;
  prophecy: LeapName | null;
  streak: number;
  prophecyStreak: number;
  inbox: string[];
  pending: { artifact: Artifact; regionName: string; builder: string } | null;
  canReturn: boolean;
  reliquary: number;
  votedFor: string | null;
};

export type CradleView = {
  stage: number;
  regions: PublicRegion[];
  asc: PublicAsc;
  relic: Artifact | null;
  people: number;
  food: number;
  year: number;
  landings: { id: number; name: string; terrain: Terrain; note: string }[];
};

export type StateResponse = {
  status: 'ok';
  stage: Stage;
  username: string;
  loggedIn: boolean;
  world: { leap: number; year: number; nextLeapAt: number; regions: PublicRegion[]; ascendants: PublicAsc[]; leaping: boolean };
  me: MeView | null;
  chronicle: ChronicleView | null;
  season: SeasonView | null;
  onboarding: { draw: StarCard[] | null; redrawUsed: boolean } | null;
  cradle: CradleView | null;
};

export type DigResult = {
  outcome: 'dust' | 'fragment' | 'artifact' | 'great';
  text: string;
  trust: number;
  artifact: Artifact | null;
  homecoming: boolean;
  discovery: string | null;
};

export type ErrorResponse = { status: 'error'; message: string };

export type LibraryShelf = { species: SpeciesId; civs: { id: string; name: string; ascendant: string; founded: number; fell: number | null; isBot: boolean }[] };

export type LogPage = { total: number; lines: { score: number; text: string }[]; title: string };

export type Leaderboards = {
  remembered: { name: string; value: number; isBot: boolean }[];
  devoted: { name: string; value: number; isBot: boolean }[];
  people: { name: string; value: number; isBot: boolean }[];
  slayers: { name: string; value: string; isBot: boolean }[];
  scripture: { ascId: string; name: string; text: string; votes: number; isBot: boolean }[];
};

/** postData attached to each Chronicle post (kept under 2 KB). */
export type ChroniclePostData = {
  leap: number;
  year: number;
  leapName: string;
  years: number;
  headlines: string[];
  evil: { name: string; hp: number; maxHp: number } | null;
  omen: string | null;
};
