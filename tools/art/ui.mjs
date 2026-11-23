// UI icons (32×32) and dig results (160×160).
import { P, S } from './lib.mjs';
import { coin, crown, flame, rays, star } from './motifs.mjs';

const icons = {
  trust: ['Trust (a gold coin with a flame mark)', (p) => coin(p, 16, 16, 13)],
  people: ['People', (p) => P(p.circle(16, 10, 4.2, 4.2, 0.1) + p.circle(7.5, 13, 3.2, 3.2, 0.1) + p.circle(24.5, 13, 3.2, 3.2, 0.1), 'a-fs a-sk a-w2')
    + P('M8 28Q8 17 16 17Q24 17 24 28Z', 'a-fs a-sk a-w2') + S('M2 26Q2 19 7.5 19M30 26Q30 19 24.5 19', 'a-sk a-w2')],
  food: ['Food (a bound sheaf)', (p) => {
    let g = '';
    for (const [x, y] of [[11, 7], [16, 5], [21, 7], [11, 11], [16, 9.5], [21, 11]]) g += p.circle(x, y, 1.8, 2.6, 0.05, 6);
    return S(p.line(16, 29, 16, 12, 0.2) + p.line(13, 29, 11, 13, 0.2) + p.line(19, 29, 21, 13, 0.2), 'a-sk a-w2') + P(g, 'a-fg a-se a-w1') + P('M11 20L21 20L21 23L11 23Z', 'a-fv a-sk a-w1');
  }],
  might: ['Might (a war hammer)', (p) => S(p.line(9, 29, 20, 11, 0.2), 'a-sk a-w3') + P('M14 6L26 13L22 20L10 13Z', 'a-ff a-sk a-w2') + S(p.line(16, 9, 13, 14, 0) + p.line(20, 11, 17, 16, 0), 'a-sk a-w1')],
  remembrance: ['Remembrance (a candle)', (p) => P('M11 14L21 14L21 29L11 29Z', 'a-fp a-sk a-w2') + S(p.line(16, 14, 16, 11, 0), 'a-sk a-w2') + flame(p, 16, 11, 9, 7) + S(p.line(13, 18, 13, 26, 0), 'a-sf a-w1') + P('M8 29L24 29L24 31L8 31Z', 'a-fk')],
  streak: ['Streak flame', (p) => flame(p, 16, 29, 26, 20)],
  dig: ['Dig (a brush and trowel)', (p) => S(p.line(6, 27, 18, 15, 0.2), 'a-sk a-w3') + P('M17 16L26 4L29 7L22 19Z', 'a-ff a-sk a-w2')
    + S(p.line(26, 26, 13, 12, 0.2), 'a-sk a-w3') + P('M14 13L6 5L8 3L16 11Z', 'a-fg a-se a-w1') + S(p.line(6, 5, 4, 3, 0) + p.line(8, 3, 6, 1.5, 0), 'a-se a-w1')],
  prophecy: ['Prophecy (an eye over a star)', (p) => P('M3 12Q16 1 29 12Q16 23 3 12Z', 'a-fp a-sk a-w2') + P(p.circle(16, 12, 4.4, 4.4, 0.1), 'a-fl a-sk a-w1') + P(p.circle(16, 12, 1.7), 'a-fk') + star(16, 26, 5)],
  library: ['Library (books)', (p) => P('M4 28L4 8L9 8L9 28Z', 'a-fv a-sk a-w2') + P('M10 28L10 5L15 5L15 28Z', 'a-fl a-sk a-w2') + P('M16 28L16 9L21 9L21 28Z', 'a-fd a-sk a-w2')
    + P('M22 28L26 10L30 11L26 29Z', 'a-fs a-sk a-w2') + S(p.line(10, 9, 15, 9, 0) + p.line(4, 12, 9, 12, 0) + p.line(16, 13, 21, 13, 0), 'a-sg a-w1') + S(p.line(2, 29, 30, 29, 0.2), 'a-sk a-w2')],
  chronicle: ['Chronicle (a scroll)', (p) => P('M7 7L25 7L25 25L7 25Z', 'a-fp a-sk a-w2') + P(p.circle(7, 7, 3, 3, 0.05, 8) + p.circle(25, 25, 3, 3, 0.05, 8), 'a-fs a-sk a-w2')
    + S(p.line(10, 12, 22, 12, 0.2) + p.line(10, 16, 21, 16, 0.2) + p.line(10, 20, 18, 20, 0.2), 'a-sf a-w1') + P('M9 10L11 10L11 12L9 12Z', 'a-fv')],
  'old-one': ['Old One badge (a hollow crown)', (p) => crown(p, 16, 18, 24)],
  lock: ['Lock', (p) => S('M10 15L10 10Q10 4 16 4Q22 4 22 10L22 15', 'a-sk a-w3') + P('M6 15L26 15L26 29L6 29Z', 'a-fg a-se a-w2') + P(p.circle(16, 21, 2) + 'M15 22L17 22L17 26L15 26Z', 'a-fk')],
  close: ['Close', (p) => P(p.taper(7, 7, 25, 25, 2) + p.taper(25, 7, 7, 25, 2), 'a-fk')],
  back: ['Back', (p) => S(p.curve([[26, 24], [24, 14], [16, 11], [7, 12]], { amp: 0.2 }), 'a-sk a-w3') + P('M4 12L11 6L11 18Z', 'a-fk')],
};

// --- dig results ------------------------------------------------------------
const tablet = (p) => {
  const t = 'M44 140L46 52Q48 28 80 26Q112 28 114 52L116 140Z';
  return P(t, 'a-fs a-sk a-w3') + p.hatch(t, { x: 96, y: 26, w: 22, h: 116, angle: 75, gap: 4.5 })
    + P('M58 60L102 60L103 122L57 122Z', 'a-fp a-sf a-w2') + S(p.line(56, 46, 104, 46, 0.4), 'a-sf a-w1')
    + S(p.curve([[48, 84], [54, 90], [52, 98]], { amp: 0.3 }) + p.curve([[110, 70], [106, 76], [110, 82]], { amp: 0.3 }), 'a-sk a-w1')
    + P('M36 140L124 140L126 148L34 148Z', 'a-ff a-sk a-w2');
};

const dig = {
  dust: ['Dig result: Dust', (p) => {
    let motes = '';
    for (let i = 0; i < 22; i++) motes += p.circle(p.R.range(30, 130), p.R.range(40, 110), p.R.range(0.6, 1.6), undefined, 0, 5);
    const mound = p.curve([[24, 132], [50, 110], [80, 104], [110, 112], [136, 132]], { amp: 0.6 });
    return P(mound + 'Z', 'a-fs a-sf a-w2') + p.hatch(mound + 'Z', { x: 24, y: 100, w: 112, h: 34, angle: 30, gap: 5, cls: 'a-sf a-w1' }) + P(motes, 'a-ff')
      + S(p.curve([[40, 86], [56, 80], [70, 86]], { amp: 0.4 }) + p.curve([[90, 70], [104, 64], [120, 70]], { amp: 0.4 }), 'a-sf a-w1');
  }],
  fragment: ['Dig result: Fragment (pottery shards)', (p) => {
    const shard = (pts) => {
      const d = p.curve(pts, { closed: true, amp: 0.4 });
      const c = p.clip(d);
      const [x, y] = pts[0];
      return P(d, 'a-fs a-sk a-w2') + `<g clip-path="url(#${c})">${S(p.line(x - 40, y + 10, x + 60, y + 4, 0.3), 'a-sv a-w4')}${S(p.line(x - 40, y + 18, x + 60, y + 12, 0.3), 'a-sk a-w1')}</g>`;
    };
    return shard([[30, 70], [66, 58], [74, 92], [40, 104]]) + shard([[84, 52], [124, 60], [118, 90], [90, 86]]) + shard([[60, 110], [100, 102], [106, 130], [66, 134]])
      + S(p.line(20, 140, 140, 140, 0.5), 'a-sf a-w2');
  }],
  artifact: ['Dig result: Artifact (a stone tablet with room for an inscription)', (p) => tablet(p)],
  'great-relic': ['Dig result: Great Relic (a tablet with a gold halo of hatched rays)', (p) => rays(p, 80, 70, 40, 78, 16, 0, Math.PI * 2, 0.07) + S(p.circle(80, 70, 44, 44, 0.4), 'a-sg a-w3') + tablet(p)],
};

export const assets = [
  ...Object.entries(icons).map(([k, [t, f]]) => ({ dir: 'icons', file: k, title: `Icon: ${t}`, vb: '0 0 32 32', draw: f, small: 16 })),
  ...Object.entries(dig).map(([k, [t, f]]) => ({ dir: 'dig', file: k, title: t, vb: '0 0 160 160', draw: f, small: 40 })),
];
