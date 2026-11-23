// Paths to the art kit (art/ → public/art via `npm run art`, served at /art/).
import type { CardId, Domain, Rarity, SpeciesId, Terrain } from '../shared/sim/types';

const A = '/art';

const CARD_FILE: Record<CardId, string> = {
  bless: 'bless-harvest', spring: 'reveal-spring', inspire: 'inspire-leader', teach: 'teach', whisper: 'whisper',
  sign: 'sign', smite: 'smite', ward: 'ward', cleanse: 'cleanse', explore: 'explore', commission: 'commission', envoy: 'envoy',
};

export type IconName =
  | 'trust' | 'people' | 'food' | 'might' | 'remembrance' | 'streak' | 'dig' | 'prophecy' | 'library' | 'chronicle'
  | 'old-one' | 'lock' | 'close' | 'back';

export const art = {
  terrain: (t: Terrain) => `${A}/terrain/${t}.svg`,
  overlay: (name: string) => `${A}/overlays/${name}.svg`,
  card: (id: CardId) => `${A}/cards/${CARD_FILE[id]}.svg`,
  cardFrame: `${A}/cards/frame.svg`,
  sigil: (d: Domain) => `${A}/sigils/${d}.svg`,
  species: (s: SpeciesId) => `${A}/species/${s}.svg`,
  rarityFrame: (r: Rarity) => `${A}/rarity/frame-${r === 'legendary' ? 'epic' : r}.svg`,
  cardBack: `${A}/rarity/card-back.svg`,
  icon: (n: IconName) => `${A}/icons/${n}.svg`,
  dig: (o: 'dust' | 'fragment' | 'artifact' | 'great') => `${A}/dig/${o === 'great' ? 'great-relic' : o}.svg`,
  evil: (n: 'vashtar-hidden' | 'vashtar-revealed' | 'health-bar') => `${A}/evil-one/${n}.svg`,
  frame: (n: 'chronicle-page' | 'library-page' | 'drop-cap' | 'share-card' | 'omens-panel') => `${A}/frames/${n}.svg`,
  logo: (n: 'wordmark' | 'app-icon') => `${A}/logo/${n}.svg`,
  anim: (n: 'inkwash' | 'dig-reveal') => `${A}/animations/${n}.svg`,
};
