// Chronicle writing from hand-written templates (no AI model).
import { SPECIES, leapNameFor } from './data';
import { Rng } from './rng';
import { civStats } from './rules';
import type { WorldEvent, WorldState } from './types';

const QUIET_TITLES = ['The Quiet Years', 'The Long Harvest', 'The Years of Small Things', 'The Turning of Seasons', 'The Patient Age'];

export const chronicleTitle = (events: WorldEvent[], w: WorldState, years: number, rng: Rng): string => {
  const top = [...events].filter((e) => e.title).sort((a, b) => b.weight - a.weight)[0];
  const name = top?.title ?? rng.pick(QUIET_TITLES);
  const year = w.year.toLocaleString('en-US');
  return `Year ${year}: ${name} (${leapNameFor(years)}, ${years} years)`;
};

export const headlines = (events: WorldEvent[], n = 3): string[] => {
  const seen = new Set<string>();
  return [...events]
    .sort((a, b) => b.weight - a.weight)
    .filter((e) => {
      if (seen.has(e.kind) && e.weight < 8) return false;
      seen.add(e.kind);
      return true;
    })
    .slice(0, n)
    .map((e) => e.text);
};

export const personalLine = (events: WorldEvent[], ascId: string, w: WorldState): string => {
  const mine = events.filter((e) => e.ascs.includes(ascId)).sort((a, b) => b.weight - a.weight)[0];
  if (mine) return mine.personal?.[ascId] ?? mine.text;
  const asc = w.ascendants[ascId];
  if (!asc) return '';
  if (asc.status === 'fading') return 'You drift at the edge of memory. Dig, prophesy, and wait to be remembered.';
  const s = civStats(w, ascId);
  if (s.food < 25) return `Hunger stalks ${asc.civName}. Bless their fields.`;
  if (s.belief.doubtful > 0.35) return `Doubt grows among ${asc.civName}. Send them a Sign.`;
  return `${asc.civName[0]!.toUpperCase()}${asc.civName.slice(1)} endured, ${Math.round(s.people)}k strong.`;
};

const VERBS = ['taught', 'led', 'sheltered', 'sang to', 'watched over', 'hardened', 'blessed', 'tested'];
const DEEDS = [
  'to sing to the tide', 'through a long winter', 'out of the ashes', 'to carve their names in stone',
  'beyond the edge of the map', 'to bury their kings with honour', 'to fear nothing but forgetting',
];

/** A one-line myth for the share card. */
export const mythLine = (w: WorldState, ascId: string, seed: string): string => {
  const asc = w.ascendants[ascId];
  if (!asc) return '';
  const rng = new Rng(seed);
  const year = `Year ${w.year.toLocaleString('en-US')}`;
  if (asc.status === 'fading') return `${asc.name}, ${asc.epithet}, waits beneath the ruins to be remembered. ${year}.`;
  return `${asc.name}, ${asc.epithet}, ${rng.pick(VERBS)} ${asc.civName} ${rng.pick(DEEDS)}. ${year}.`;
};

export const speciesShelf = (id: string) => SPECIES[id as keyof typeof SPECIES]?.name ?? id;
