// Action card frame (250×350), 13 card illustrations (206×168 window), Starry Draw rarity frames.
import { P, S } from './lib.mjs';
import { illus } from './illus.mjs';
import { coin, crown, flame, glyph, ground, knot, rays, star } from './motifs.mjs';

const W = 206, H = 168;
const IVB = `0 0 ${W} ${H}`;

const frame = (p) => {
  const outer = 'M6 8' + [p.line(6, 8, 244, 7, 0.6), p.line(244, 7, 245, 342, 0.6), p.line(245, 342, 5, 343, 0.6), p.line(5, 343, 6, 8, 0.6)].map((d) => d.replace(/^M[^LC]+/, '')).join('') + 'Z';
  const band = `M14 16L236 16L236 334L14 334ZM20 22L20 328L230 328L230 22Z`;
  // lozenges set into the gold band, alternating rubric and ink
  const lz = (x, y) => `M${x} ${y - 2.4}L${x + 3} ${y}L${x} ${y + 2.4}L${x - 3} ${y}Z`;
  const spots = [];
  for (let x = 74; x <= 216; x += 18) spots.push([x, 19]);
  for (let x = 40; x <= 112; x += 18) spots.push([x, 331]);
  for (let x = 140; x <= 216; x += 18) spots.push([x, 331]);
  for (let y = 70; y <= 310; y += 20) spots.push([17, y], [233, y]);
  const loz = spots.filter((_, i) => i % 2).map(([x, y]) => lz(x, y)).join('');
  const loz2 = spots.filter((_, i) => !(i % 2)).map(([x, y]) => lz(x, y)).join('');
  const win = 'M22 46L228 46L228 214L22 214Z';
  const banner = p.curve([[24, 224], [125, 220], [226, 224], [226, 252], [125, 248], [24, 252]], { closed: true, amp: 0.4 });
  const tailL = 'M24 228L8 232L16 240L8 248L24 250Z';
  const tailR = 'M226 228L242 232L234 240L242 248L226 250Z';
  let rules = '';
  for (let y = 270; y <= 318; y += 16) rules += p.line(40, y, 210, y, 0.3);
  return P(outer, 'a-fp a-sk a-w3')
    + `<path d="${band}" class="a-fg" fill-rule="evenodd"/>` + S('M14 16L236 16L236 334L14 334Z', 'a-se a-w1') + S('M20 22L230 22L230 328L20 328Z', 'a-se a-w1') + P(loz, 'a-fv') + P(loz2, 'a-fk')
    + P(win, 'a-fs a-sk a-w2') + S('M26 50L224 50L224 210L26 210Z', 'a-sf a-w1')
    + P(tailL + tailR, 'a-fs a-sk a-w2') + P(banner, 'a-fs a-sk a-w2') + S(p.line(30, 229, 220, 228, 0.3) + p.line(30, 247, 220, 246, 0.3), 'a-sf a-w1')
    + S(rules, 'a-sf a-w1')
    + knot(p, 228, 30) + knot(p, 22, 320) + knot(p, 228, 320) + knot(p, 125, 336, 5)
    + P(p.circle(38, 38, 26, 26, 0.4), 'a-fp a-sk a-w3') + coin(p, 38, 38, 20);
};

// --- Starry Draw cards (160×224) --------------------------------------------
const RVB = '0 0 160 224';
const RARITY = { common: 'k', uncommon: 'd', rare: 'l', epic: 'v' };

const cardBack = (p) => {
  const body = 'M6 6L154 6L154 218L6 218Z';
  const stars = [[30, 40], [52, 60], [44, 92], [80, 50], [110, 70], [126, 40], [100, 110], [70, 130], [40, 160], [90, 170], [124, 150], [118, 196], [50, 196]];
  let lines = '';
  for (const [a, b] of [[0, 1], [1, 3], [3, 5], [3, 4], [4, 6], [6, 7], [7, 8], [7, 9], [9, 10], [10, 11]]) lines += p.line(stars[a][0], stars[a][1], stars[b][0], stars[b][1], 0.3);
  let dust = '';
  for (let i = 0; i < 40; i++) dust += p.circle(p.R.range(14, 146), p.R.range(14, 210), 0.6, 0.6, 0, 4);
  return P(body, 'a-fl a-sk a-w3') + S('M12 12L148 12L148 212L12 212Z', 'a-sg a-w2') + P(dust, 'a-fs') + S(lines, 'a-ss a-w1')
    + stars.map(([x, y], i) => star(x, y, i % 3 === 0 ? 6 : 4)).join('') + S(p.circle(80, 112, 34, 34, 0.4), 'a-sg a-w1') + glyph(p, 80, 112, 16);
};

const cardFace = (code) => (p) => {
  const body = 'M6 6L154 6L154 218L6 218Z';
  const gem = (x, y) => P(`M${x} ${y - 6}L${x + 6} ${y}L${x} ${y + 6}L${x - 6} ${y}Z`, `a-f${code} a-sk a-w1`);
  return P(body, 'a-fp a-sk a-w3') + S('M13 13L147 13L147 211L13 211Z', `a-s${code} a-w4`) + S('M19 19L141 19L141 205L19 205Z', `a-s${code} a-w1`)
    + P(p.circle(80, 82, 50, 50, 0.4), 'a-fs a-sk a-w2') + S(p.circle(80, 82, 55, 55, 0.4), `a-s${code} a-w2`)
    + P(p.curve([[24, 150], [80, 146], [136, 150], [136, 172], [80, 168], [24, 172]], { closed: true, amp: 0.3 }), 'a-fs a-sk a-w2')
    + gem(13, 13) + gem(147, 13) + gem(13, 211) + gem(147, 211) + gem(80, 196);
};

export const assets = [
  { dir: 'cards', file: 'frame', title: 'Action card frame', vb: '0 0 250 350', draw: frame, small: 48 },
  ...Object.entries(illus).map(([k, [t, f]]) => ({ dir: 'cards', file: k === 'chosen' ? 'raise-chosen' : k === 'bless' ? 'bless-harvest' : k === 'spring' ? 'reveal-spring' : k === 'inspire' ? 'inspire-leader' : k, title: `Card illustration: ${t}`, vb: IVB, draw: f, small: 48 })),
  { dir: 'rarity', file: 'card-back', title: 'Starry Draw card back (a star map)', vb: RVB, draw: cardBack, small: 40 },
  ...Object.entries(RARITY).map(([k, code]) => ({ dir: 'rarity', file: `frame-${k}`, title: `Starry Draw frame: ${k[0].toUpperCase()}${k.slice(1)}`, vb: RVB, draw: cardFace(code), small: 40 })),
];
void flame;
