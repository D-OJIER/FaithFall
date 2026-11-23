import type { PublicRegion } from '../../shared/api';
import type { Terrain } from '../../shared/sim/types';

export const HEX = 20;
const SQ3 = Math.sqrt(3);

export const hexCenter = (q: number, r: number) => ({ x: HEX * SQ3 * (q + r / 2), y: HEX * 1.5 * r });

export const hexPoints = (cx: number, cy: number, size = HEX) => {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + size * Math.cos(a)).toFixed(2)},${(cy + size * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
};

const T = '︎';
export const TERRAIN_STYLE: Record<Terrain, { fill: string; glyph: string; label: string }> = {
  plains: { fill: '#ece0bd', glyph: '⁖', label: 'Plains' },
  forest: { fill: '#d6c89c', glyph: '♣' + T, label: 'Forest' },
  hills: { fill: '#d9c597', glyph: '⌒', label: 'Hills' },
  desert: { fill: '#f4e7c3', glyph: '∴', label: 'Desert' },
  coast: { fill: '#e2d8bb', glyph: '∽', label: 'Coast' },
  water: { fill: '#c7bea6', glyph: '≈', label: 'Water' },
  swamp: { fill: '#cbbd95', glyph: '⁂', label: 'Swamp' },
  tundra: { fill: '#f6f0de', glyph: '✳' + T, label: 'Tundra' },
  mountain: { fill: '#bca67f', glyph: '▲' + T, label: 'Mountain' },
};

export const SIGILS = ['☉', '☽', '✶', '✠', '❂', '⚚', '✧', '♁', '⟡', '❖', '✺', '⚝'].map((s) => s + T);

export const neighbourIds = (regions: PublicRegion[]) => {
  const idx = new Map<string, number>();
  regions.forEach((r) => idx.set(`${r.q},${r.r}`, r.id));
  const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]] as const;
  return (id: number) => {
    const r = regions[id];
    if (!r) return [];
    return dirs.map(([dq, dr]) => idx.get(`${r.q + dq},${r.r + dr}`)).filter((v): v is number => v !== undefined);
  };
};

export const fmt = (n: number) => n.toLocaleString('en-US');
export const fmtPeople = (k: number) => (k >= 10 ? `${Math.round(k)}k` : `${(Math.round(k * 10) / 10).toFixed(1)}k`);
