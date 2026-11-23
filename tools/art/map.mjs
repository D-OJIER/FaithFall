// Hex terrain tiles and overlays (viewBox 0 0 104 120, pointy-top).
import { P, S, hexD } from './lib.mjs';
import { terrain } from './terrain.mjs';

const VB = '0 0 104 120';
const HEX = hexD();
// --- overlays ------------------------------------------------------------------
// --- ruins ------------------------------------------------------------------
// Each ruin is an engraved object sitting on the tile: ink outline, parchment-shade body,
// lee-side hatching (light from the upper left), rubble and ground cracks.
const shadeBox = (p, d, box, gap = 2.2, angle = 65) => p.hatch(d, { ...box, angle, gap, cls: 'a-sk a-w1', amp: 0.1 });

const block = (p, x, y, w, h, tilt = 0) => {
  const pts = [[x, y], [x + w, y + tilt], [x + w, y + h + tilt], [x, y + h]];
  const d = p.poly(pts, 0.25);
  return P(d, 'a-fs') + shadeBox(p, `M${x + w * 0.62} ${y}L${x + w} ${y + tilt}L${x + w} ${y + h + tilt}L${x + w * 0.62} ${y + h}Z`, { x, y, w, h: h + Math.abs(tilt) }, 1.8) + S(d, 'a-sk a-w2');
};

const stump = (p, x, base, w, h) => {
  const top = p.curve([[x - w / 2, base - h + 2], [x - w / 6, base - h - 1.5], [x + w / 8, base - h + 1], [x + w / 2, base - h - 2]], { amp: 0.2 });
  const body = `M${x - w / 2} ${base}L${x - w / 2} ${base - h + 2}${top.replace(/^M[^C]+/, '')}L${x + w / 2} ${base}Z`;
  let flutes = '';
  for (const f of [-0.2, 0.15]) flutes += p.line(x + w * f, base - 1.5, x + w * f, base - h + 3, 0.1);
  return P(body, 'a-fp') + shadeBox(p, `M${x + w * 0.2} ${base - h}L${x + w / 2} ${base - h}L${x + w / 2} ${base}L${x + w * 0.2} ${base}Z`, { x: x - w / 2, y: base - h, w, h }, 1.6, 80)
    + S(flutes, 'a-sf a-w1') + S(body, 'a-sk a-w2') + P(p.poly([[x - w / 2 - 1.5, base], [x + w / 2 + 1.5, base], [x + w / 2 + 1.5, base + 2.5], [x - w / 2 - 1.5, base + 2.5]], 0.1), 'a-fs a-sk a-w1');
};

const rubble = (p, pts) => pts.map(([x, y, s]) => P(p.poly([[x, y], [x + 3 * s, y - 1.5 * s], [x + 5 * s, y + 0.5 * s], [x + 3.5 * s, y + 2.5 * s], [x + 0.5 * s, y + 2 * s]], 0.15), 'a-fs a-sk a-w1')).join('');

const cracks = (p, list) => S(list.map((pts) => p.curve(pts, { amp: 0.3 })).join(''), 'a-sk a-w1');

const ground = (p, y, x0, x1) => S(p.line(x0, y, x1, y, 0.4), 'a-sk a-w2') + S(p.line(x0 + 6, y + 3, x0 + 20, y + 3, 0.1) + p.line(x1 - 22, y + 3.5, x1 - 6, y + 3.5, 0.1), 'a-sf a-w1');

export const ruins = {
  surface: ['Ruin overlay: Surface (broken columns)', (p) => ground(p, 84, 18, 86)
    + block(p, 22, 74, 60, 9) + block(p, 28, 68, 48, 6)
    + stump(p, 36, 68, 8, 26) + stump(p, 52, 68, 8, 15) + stump(p, 68, 68, 8, 32)
    + P(p.poly([[56, 92], [76, 89], [77, 96], [57, 99]], 0.2), 'a-fs a-sk a-w2') + P(p.circle(77, 92.6, 2.2, 3.6, 0.1, 8), 'a-fs a-sk a-w1')
    + rubble(p, [[26, 90, 1], [44, 94, 0.8], [82, 80, 0.8], [30, 62, 0.6]]) + cracks(p, [[[18, 98], [26, 102], [34, 100], [40, 106]], [[78, 104], [84, 100], [90, 102]]])],
  deep: ['Ruin overlay: Deep (a sealed door in the earth)', (p) => {
    const mound = p.curve([[14, 92], [26, 70], [44, 58], [64, 58], [80, 68], [92, 92]], { amp: 0.4 });
    const frame = 'M36 92L36 70Q36 60 52 58Q68 60 68 70L68 92Z';
    const door = 'M41 92L41 72Q41 65 52 63Q63 65 63 72L63 92Z';
    let rune = '';
    for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i * Math.PI * 2) / 3; rune += p.line(52 + Math.cos(a) * 5.5, 78 + Math.sin(a) * 5.5, 52 + Math.cos(a) * 2.4, 78 + Math.sin(a) * 2.4, 0); }
    return P(mound + 'Z', 'a-fs') + shadeBox(p, mound + 'Z', { x: 52, y: 56, w: 42, h: 38 }, 2.4, 60) + S(mound, 'a-sk a-w2')
      + P(frame, 'a-fp a-sk a-w2') + P(door, 'a-ff') + p.hatch(door, { x: 40, y: 62, w: 24, h: 30, angle: 90, gap: 2.4, cls: 'a-sk a-w1', amp: 0 }) + S(door, 'a-sk a-w2')
      + P(p.circle(52, 78, 7, 7, 0.2, 12), 'a-fg a-se a-w2') + S(rune, 'a-se a-w1')
      + S(p.line(40, 96, 64, 96, 0.2) + p.line(43, 100, 61, 100, 0.2), 'a-sk a-w1') + rubble(p, [[22, 94, 0.9], [74, 96, 1]])
      + cracks(p, [[[30, 64], [36, 68], [34, 74]], [[72, 66], [68, 72], [72, 78]]]);
  }],
  peak: ['Ruin overlay: Peak (a broken spire on a summit)', (p) => {
    const mtn = p.curve([[16, 100], [34, 74], [46, 62], [54, 60], [64, 70], [76, 84], [90, 100]], { amp: 0.4 });
    const lee = 'M54 60L64 70L76 84L90 100L58 100L60 80Z';
    const spire = 'M45 62L46 30L49 24L52 30L53 22L57 30L58 62Z';
    return P(mtn + 'Z', 'a-fs') + shadeBox(p, lee, { x: 54, y: 60, w: 36, h: 40 }, 2.4, 70) + S(mtn, 'a-sk a-w2')
      + P(spire, 'a-fp') + shadeBox(p, 'M52 22L58 30L58 62L53 62Z', { x: 52, y: 22, w: 6, h: 40 }, 1.6, 80) + S(spire, 'a-sk a-w2')
      + P('M48.5 36L48.5 32Q50.5 29.5 52.5 32L52.5 36Z' + 'M48.5 48L48.5 44Q50.5 41.5 52.5 44L52.5 48Z', 'a-fk')
      + rubble(p, [[60, 66, 0.9], [36, 76, 0.8], [66, 74, 0.7]]) + S(p.line(42, 62, 62, 62, 0.2), 'a-sk a-w2');
  }],
  sunken: ['Ruin overlay: Sunken (a drowned tower under the waves)', (p) => {
    const tower = 'M38 82L40 46L36 46L36 38L42 38L42 42L47 42L47 36L53 38L53 42L58 42L58 37L64 39L64 46L61 46L64 82Z';
    const c = p.clip(hexD(52, 60, 58, 1).d);
    let lining = '';
    for (let i = 0; i < 10; i++) { const y = 77 + i * (2.6 + i * 0.32); lining += p.line(0, y, 104, y + p.R.j(0.3), 0.2); }
    return P(tower, 'a-fs') + shadeBox(p, 'M54 36L64 39L64 82L54 82Z', { x: 54, y: 36, w: 10, h: 46 }, 1.8, 80) + S(tower, 'a-sk a-w2')
      + P('M47.5 56L47.5 51Q50 48 52.5 51L52.5 56Z', 'a-fk')
      + `<g clip-path="url(#${c})">${P('M0 74L104 74L104 120L0 120Z', 'a-fp')}${S(lining, 'a-sl a-w1')}${S(p.line(42, 80, 42, 96, 0.3) + p.line(60, 80, 60, 94, 0.3), 'a-sf a-w1')}</g>`
      + `<g clip-path="url(#${c})">${S(p.curve([[0, 74], [20, 72.5], [40, 75], [60, 72.5], [80, 74.5], [104, 73]], { amp: 0.3 }), 'a-sl a-w2')}</g>`
      + P(p.taper(24, 70, 32, 70, 1, -1.2) + p.taper(70, 70, 80, 70, 1, -1.2), 'a-fl');
  }],
  sky: ['Ruin overlay: Sky (a faint floating shimmer)', (p) => {
    const rock = p.curve([[28, 64], [52, 60], [78, 64], [70, 72], [60, 84], [52, 92], [46, 82], [36, 72]], { closed: true, amp: 0.5 });
    const arch = 'M38 62L38 44Q38 36 52 34Q66 36 66 44L66 62L60 62L60 46Q60 42 52 41Q44 42 44 46L44 62Z';
    let roots = p.curve([[48, 88], [46, 96], [48, 102]], { amp: 0.3 }) + p.curve([[58, 80], [62, 88], [60, 94]], { amp: 0.3 });
    let shimmer = '';
    for (const [x, y, s] of [[24, 46, 3], [82, 40, 3.5], [22, 84, 2.5], [84, 80, 3], [70, 24, 2.5]]) shimmer += p.line(x - s, y, x + s, y, 0) + p.line(x, y - s, x, y + s, 0);
    return `<g opacity=".72">${P(rock, 'a-fs')}${shadeBox(p, rock, { x: 50, y: 60, w: 30, h: 34 }, 2.4, 60)}${S(rock, 'a-sf a-w2')}${S(roots, 'a-sf a-w1')}`
      + `${P(arch, 'a-fp')}${S(arch, 'a-sf a-w2')}${S(p.line(46, 50, 46, 56, 0) , 'a-sf a-w1')}</g>`
      + `<g stroke-dasharray="2 3">${S(p.circle(52, 62, 40, 36, 0.6, 18), 'a-sg a-w1')}</g>` + S(shimmer, 'a-sg a-w1');
  }],
};

export const overlays = {
  'owner-border': ['Owner border (gold)', (p) => {
    const r1 = hexD(52, 60, 58, 2.5), r2 = hexD(52, 60, 58, 7.5);
    let hl = '';
    for (let i = 0; i < 6; i++) {
      const [ax, ay] = r1.pts[i], [bx, by] = r1.pts[(i + 1) % 6];
      for (const t of [0.3, 0.38, 0.62, 0.7]) hl += p.line(ax + (bx - ax) * t, ay + (by - ay) * t, ax + (bx - ax) * (t + 0.04), ay + (by - ay) * (t + 0.04), 0);
    }
    return `<path d="${r1.d}${r2.d}" class="a-fg" fill-rule="evenodd"/>` + S(p.poly(r1.pts, 0.2), 'a-se a-w1') + S(p.poly(r2.pts, 0.2), 'a-se a-w1')
      + `<g transform="translate(52 60) scale(.955) translate(-52 -60)">${S(hl, 'a-sp a-w1')}</g>`;
  }],
  'wild-village': ['Wild village overlay', (p) => {
    const hut = (x, y, s = 1) => P(`M${x - 7 * s} ${y}L${x - 7 * s} ${y - 7 * s}L${x + 7 * s} ${y - 7 * s}L${x + 7 * s} ${y}Z`, 'a-fp a-sk a-w2')
      + P(p.curve([[x - 9 * s, y - 6 * s], [x, y - 15 * s], [x + 9 * s, y - 6 * s]], { amp: 0.3 }) + 'Z', 'a-fs a-sk a-w2')
      + S(p.line(x - 5 * s, y - 9 * s, x + 4 * s, y - 12 * s) + p.line(x - 3 * s, y - 7 * s, x + 6 * s, y - 10 * s), 'a-sk a-w1')
      + P(`M${x - 1.5 * s} ${y}L${x - 1.5 * s} ${y - 4 * s}L${x + 1.5 * s} ${y - 4 * s}L${x + 1.5 * s} ${y}Z`, 'a-fk');
    return hut(42, 72) + hut(62, 70, 0.9) + hut(52, 86, 1.05)
      + S(p.curve([[62, 58], [59, 52], [63, 47], [60, 40]], { amp: 0.4 }), 'a-sf a-w1');
  }],
  fog: ['Fog overlay (the Dark Continent)', (p) => {
    const c = HEX.d;
    return P(c, 'a-ff') + p.hatch(c, { x: 0, y: 0, w: 104, h: 120, angle: 35, gap: 4, cls: 'a-sk a-w1' }) + p.hatch(c, { x: 0, y: 0, w: 104, h: 120, angle: -35, gap: 7, cls: 'a-sk a-w1' })
      + S(p.curve([[24, 50], [36, 44], [48, 50], [60, 44]], { amp: 0.4 }) + p.curve([[44, 76], [58, 70], [72, 76], [82, 70]], { amp: 0.4 }) + p.curve([[26, 96], [40, 90], [52, 96]], { amp: 0.4 }), 'a-ss a-w2');
  }],
  landing: ['Reserved landing region (gold dashed ring)', (p) => `<g stroke-dasharray="5 4">${S(p.circle(52, 60, 36, 36, 0.4, 20), 'a-sg a-w3')}</g>` + S(p.circle(52, 60, 31, 31, 0.3, 18), 'a-se a-w1')],
  'corruption-light': ['Corruption overlay: light veins', (p) => {
    const vein = (pts) => S(p.curve(pts, { amp: 0.6 }), 'a-sc a-w2');
    return vein([[14, 34], [26, 42], [34, 40], [42, 50], [50, 52]]) + vein([[26, 42], [24, 54], [30, 62]]) + vein([[42, 50], [46, 62], [44, 70]])
      + vein([[90, 84], [80, 80], [72, 84], [64, 80]]) + S(p.curve([[80, 80], [78, 70], [82, 64]], { amp: 0.4 }), 'a-sb a-w1') + P(p.circle(51, 53, 2.4) + p.circle(64, 80, 2), 'a-fc');
  }],
  'corruption-heavy': ['Corruption overlay: heavy blotch', (p) => {
    const blot = p.curve(p.ringPts(50, 58, 26, 22, 16, 6), { closed: true, amp: 1.2 });
    const drips = P(p.curve([[40, 76], [41, 88], [39, 94]], { amp: 0.3 }) + 'L42 94Z' + p.circle(40.5, 96, 2.2) + p.circle(62, 88, 1.8), 'a-fc')
      + S(p.curve([[40, 77], [40.5, 90]], { amp: 0.2 }) + p.curve([[61, 76], [62, 85]], { amp: 0.2 }), 'a-sc a-w3');
    return P(blot, 'a-fc') + drips + S(p.curve([[38, 50], [46, 56], [54, 52], [60, 60]], { amp: 0.4 }) + p.curve([[46, 66], [52, 62], [58, 68]], { amp: 0.4 }), 'a-sb a-w1')
      + S(p.curve([[24, 46], [14, 40], [10, 44]], { amp: 0.4 }) + p.curve([[76, 54], [86, 50], [92, 56]], { amp: 0.4 }), 'a-sc a-w2');
  }],
  hollowed: ['Corruption overlay: Hollowed (fully consumed)', (p) => {
    const ring = p.curve(hexD(52, 60, 58, 2).pts.flatMap((pt, i, a) => { const q = a[(i + 1) % a.length]; return [pt, [(pt[0] + q[0]) / 2 + p.R.j(3), (pt[1] + q[1]) / 2 + p.R.j(3)]]; }), { closed: true, amp: 1 });
    const hole = p.curve(p.ringPts(52, 60, 12, 15, 10, 2), { closed: true, amp: 0.5 });
    let cracks = '';
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + p.R.j(0.3); cracks += p.curve([[52 + Math.cos(a) * 15, 60 + Math.sin(a) * 18], [52 + Math.cos(a) * 28 + p.R.j(3), 60 + Math.sin(a) * 32 + p.R.j(3)], [52 + Math.cos(a) * 40, 60 + Math.sin(a) * 46]], { amp: 0.6 }); }
    const c = p.clip(hexD(52, 60, 58, 0.5).d);
    void ring;
    return `<g clip-path="url(#${c})">${P(hexD().d, 'a-fc')}${S(p.poly(hexD(52, 60, 58, 6).pts, 1.2), 'a-sb a-w1')}${p.hatch(hexD().d, { x: 0, y: 0, w: 104, h: 120, angle: -30, gap: 5, cls: 'a-sk a-w1' })}${S(cracks, 'a-sb a-w1')}</g>` + P(hole, 'a-fk') + S(hole, 'a-sb a-w2');
  }],
};

export const mapAssets = [
  ...Object.entries(terrain).map(([k, [t, f]]) => ({ dir: 'terrain', file: k, title: t, vb: VB, draw: f, small: 32 })),
  ...Object.entries(ruins).map(([k, [t, f]]) => ({ dir: 'overlays', file: `ruin-${k}`, title: t, vb: VB, draw: f, small: 32, under: 'plains' })),
  ...Object.entries(overlays).map(([k, [t, f]]) => ({ dir: 'overlays', file: k, title: t, vb: VB, draw: f, small: 32, under: 'plains' })),
];
