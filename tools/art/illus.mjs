// Card illustrations (206×168 window) composed like manuscript miniatures:
// a sky (engraved hatching, gold-leaf diaper, storm or dusk), a horizon with distant hills,
// a textured ground plane and one large, shaded subject.
import { P, S } from './lib.mjs';
import { coin, crown, glyph, rays, star } from './motifs.mjs';
void rays;

const W = 206, H = 168;

// --- backgrounds ----------------------------------------------------------------
const engravedSky = (p, horizon) => {
  let d = '';
  let y = 4;
  let gap = 2.2;
  while (y < horizon - 8) { d += p.line(p.R.range(0, 6), y + p.R.j(0.3), W - p.R.range(0, 6), y + p.R.j(0.4), 0); y += gap; gap *= 1.16; }
  return S(d, 'a-sf a-w1');
};

const goldSky = (p, horizon) => {
  // gold leaf with a diaper (lattice) pattern and a dot in each lozenge
  const c = p.clip(`M0 0L${W} 0L${W} ${horizon}L0 ${horizon}Z`);
  let lattice = '';
  for (let x = -horizon; x < W + horizon; x += 16) lattice += `M${x} 0L${x + horizon} ${horizon}M${x + horizon} 0L${x} ${horizon}`;
  let dots = '';
  for (let y = 8; y < horizon; y += 16) for (let x = (y / 8) % 4 ? 0 : 8; x < W; x += 16) dots += `M${x} ${y}h.1`;
  return `<g clip-path="url(#${c})">${P(`M0 0L${W} 0L${W} ${horizon}L0 ${horizon}Z`, 'a-fg')}${S(lattice, 'a-se a-w1')}${S(dots, 'a-se a-w3')}</g>`;
};

const stormSky = (p, horizon) => {
  const box = `M0 0L${W} 0L${W} ${horizon}L0 ${horizon}Z`;
  return P(box, 'a-fs') + p.hatch(box, { x: 0, y: 0, w: W, h: horizon, angle: 20, gap: 3.2, cls: 'a-sf a-w1' }) + p.hatch(box, { x: 0, y: 0, w: W, h: horizon, angle: -25, gap: 4.5, cls: 'a-sf a-w1' });
};

const duskSky = (p, horizon) => {
  const box = `M0 0L${W} 0L${W} ${horizon}L0 ${horizon}Z`;
  return P(box, 'a-fl') + S(p.stipple(p.scatter(26, [6, 4, W - 6, horizon - 10])), 'a-sp a-w2') + star(40, 22, 4, 'a-fp') + star(160, 30, 3, 'a-fp') + star(120, 14, 2.5, 'a-fp');
};

const hillsLine = (p, y) => {
  const d = p.curve([[0, y], [24, y - 9], [50, y - 4], [80, y - 12], [110, y - 5], [140, y - 11], [170, y - 3], [W, y - 8]], { amp: 0.6 });
  return P(d + `L${W} ${y + 2}L0 ${y + 2}Z`, 'a-fs') + S(d, 'a-sf a-w2');
};

const groundPlane = (p, y, opts = {}) => {
  const d = `M0 ${y}L${W} ${y}L${W} ${H}L0 ${H}Z`;
  let furrows = '';
  if (opts.furrows) for (let i = -6; i <= 6; i++) furrows += p.line(W / 2 + i * 4, y + 2, W / 2 + i * 26, H, 0);
  else for (let i = 0; i < 5; i++) { const yy = y + 6 + i * i * 2.4 + i * 3; furrows += p.line(p.R.range(4, 40), yy, p.R.range(150, 200), yy + p.R.j(0.5), 0); }
  const tufts = (opts.tufts ?? 6);
  let t = '';
  for (let i = 0; i < tufts; i++) {
    const x = p.R.range(10, W - 10), yy = p.R.range(y + 10, H - 6);
    t += p.taper(x, yy, x - 2.5, yy - 5, 0.5) + p.taper(x, yy, x + 0.4, yy - 6.5, 0.55) + p.taper(x, yy, x + 3, yy - 4.5, 0.5);
  }
  return P(d, 'a-fs') + S(furrows, 'a-sf a-w1') + P(t, 'a-fk') + S(p.line(0, y, W, y, 0.6), 'a-sk a-w2');
};

/** A parchment sun disc with inked rays, readable on gold leaf. */
const sun = (p, cx, cy, r) => {
  let d = '';
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; d += p.line(cx + Math.cos(a) * (r + 3), cy + Math.sin(a) * (r + 3), cx + Math.cos(a) * (r + (i % 2 ? 9 : 15)), cy + Math.sin(a) * (r + (i % 2 ? 9 : 15)), 0); }
  return S(d, 'a-se a-w2') + P(p.circle(cx, cy, r, r, 0.3), 'a-fp a-se a-w2') + glyph(p, cx, cy, r * 0.55, 'a-se a-w1');
};

const shade = (p, d, box, gap = 2.6, angle = 62) => p.hatch(d, { ...box, angle, gap, cls: 'a-sk a-w1', amp: 0 });

// --- shared subjects ------------------------------------------------------------
const hut = (p, x, y, s = 1) => {
  const wall = `M${x - 10 * s} ${y}L${x - 10 * s} ${y - 11 * s}L${x + 10 * s} ${y - 11 * s}L${x + 10 * s} ${y}Z`;
  const roof = p.curve([[x - 13 * s, y - 10 * s], [x - 2 * s, y - 23 * s], [x + 13 * s, y - 10 * s]], { amp: 0.3 }) + 'Z';
  return P(wall, 'a-fp') + shade(p, `M${x + 3 * s} ${y - 11 * s}L${x + 10 * s} ${y - 11 * s}L${x + 10 * s} ${y}L${x + 3 * s} ${y}Z`, { x: x - 10 * s, y: y - 11 * s, w: 20 * s, h: 11 * s }, 1.8, 80) + S(wall, 'a-sk a-w2')
    + P(roof, 'a-fs') + shade(p, roof, { x: x - 13 * s, y: y - 23 * s, w: 26 * s, h: 13 * s }, 2, 120) + S(roof, 'a-sk a-w2')
    + P(`M${x - 2.6 * s} ${y}L${x - 2.6 * s} ${y - 6 * s}Q${x} ${y - 8.5 * s} ${x + 2.6 * s} ${y - 6 * s}L${x + 2.6 * s} ${y}Z`, 'a-fk');
};

/** A robed figure seen from behind/side, manuscript style (no face detail). */
const figure = (p, x, y, s = 1, robe = 'a-fv') => {
  const body = p.curve([[x - 9 * s, y], [x - 7 * s, y - 16 * s], [x - 4 * s, y - 27 * s], [x + 4 * s, y - 27 * s], [x + 7 * s, y - 16 * s], [x + 9 * s, y]], { amp: 0.3 }) + 'Z';
  return P(body, robe) + (s >= 0.8 ? shade(p, body, { x, y: y - 28 * s, w: 10 * s, h: 28 * s }, 2.4 * s, 75) : '') + S(body, 'a-sk a-w2')
    + S(p.line(x - 2 * s, y - 24 * s, x - 4 * s, y - 2 * s, 0.2) + p.line(x + 2 * s, y - 22 * s, x + 3 * s, y - 2 * s, 0.2), 'a-sk a-w1')
    + P(p.circle(x, y - 31 * s, 4.4 * s, 4.6 * s, 0.1, 9), 'a-fs a-sk a-w2');
};

const wheat = (p, x, y, h, lean = 0) => {
  let grains = '';
  for (let i = 0; i < 7; i++) {
    const t = i / 7, gx = x + lean * (1 - t * 0.3), gy = y - h + i * 5.2;
    grains += p.circle(gx - 3.2, gy + 1, 2.3, 3.8, 0.1, 7) + p.circle(gx + 3.2, gy + 2.6, 2.3, 3.8, 0.1, 7);
  }
  const awns = p.line(x + lean, y - h - 2, x + lean - 3, y - h - 12, 0.1) + p.line(x + lean, y - h - 2, x + lean + 3, y - h - 12, 0.1) + p.line(x + lean, y - h - 2, x + lean, y - h - 13, 0.1);
  return S(p.curve([[x, y], [x + lean * 0.35, y - h * 0.45], [x + lean, y - h + 30]], { amp: 0.3 }), 'a-sk a-w2') + S(awns, 'a-sk a-w1') + P(grains, 'a-fg a-sk a-w1')
    + (lean ? P(p.taper(x + lean * 0.3, y - h * 0.4, x + lean * 0.3 + Math.sign(lean) * 16, y - h * 0.52, 2.4, 1.5), 'a-fd a-sk a-w1') : '');
};

const blot = (p, x, y, r) => P(p.curve(p.ringPts(x, y, r, r * 0.75, 12, r * 0.28), { closed: true, amp: 0.6 }), 'a-fc')
  + S(p.curve([[x - r * 0.5, y], [x, y + r * 0.2], [x + r * 0.45, y - r * 0.15]], { amp: 0.3 }), 'a-sb a-w1');

const tablet = (p, x, y, w, h) => {
  const d = `M${x} ${y + h}L${x + 2} ${y + 12}Q${x + 4} ${y} ${x + w / 2} ${y}Q${x + w - 4} ${y} ${x + w - 2} ${y + 12}L${x + w} ${y + h}Z`;
  let marks = '';
  for (let yy = y + 18; yy < y + h - 8; yy += 9) marks += p.line(x + 10, yy, x + 10 + p.R.range(w * 0.4, w * 0.62), yy, 0.4);
  return P(d, 'a-fs') + shade(p, d, { x: x + w * 0.62, y, w: w * 0.4, h }, 2.2, 75) + S(marks, 'a-sf a-w2') + S(d, 'a-sk a-w3');
};

// --- the thirteen illustrations ------------------------------------------------
export const illus = {
  bless: ['Bless Harvest', (p) => goldSky(p, 104) + sun(p, 103, 0, 22) + hillsLine(p, 104) + groundPlane(p, 108, { furrows: true, tufts: 0 })
    + wheat(p, 96, 160, 112, -30) + wheat(p, 110, 160, 112, 30) + wheat(p, 100, 160, 120, -10) + wheat(p, 106, 160, 122, 10) + wheat(p, 103, 160, 128, 0)
    + P(`M92 136L114 136L113 144L93 144Z`, 'a-fv a-sk a-w2')],
  spring: ['Reveal Spring', (p) => {
    const rock = p.curve([[30, 136], [34, 100], [52, 80], [80, 74], [100, 84], [110, 108], [114, 136]], { amp: 0.6 }) + 'Z';
    let arcs = '';
    for (const o of [0, 5, 10]) arcs += p.curve([[100, 92 + o * 0.2], [120 + o, 66 + o], [146 + o, 80 + o * 0.5], [156 + o * 0.5, 120]], { amp: 0.4 });
    const pool = p.curve([[118, 130], [140, 120], [176, 122], [196, 132], [170, 144], [130, 144]], { closed: true, amp: 0.5 });
    const pc = p.clip(pool);
    let lining = '';
    for (let y = 122; y < 146; y += 3.4) lining += p.line(112, y, 200, y, 0.2);
    return engravedSky(p, 96) + hillsLine(p, 96) + groundPlane(p, 100, { tufts: 4 })
      + P(rock, 'a-fs') + shade(p, rock, { x: 72, y: 74, w: 44, h: 64 }, 2.2, 60) + S(rock, 'a-sk a-w3')
      + S(p.curve([[52, 100], [60, 110], [56, 124]], { amp: 0.4 }) + p.curve([[74, 90], [80, 98]], { amp: 0.3 }), 'a-sk a-w1')
      + P(pool, 'a-fp') + `<g clip-path="url(#${pc})">${S(lining, 'a-sl a-w1')}</g>` + S(pool, 'a-sk a-w2') + S(arcs, 'a-sl a-w2')
      + P(p.taper(24, 138, 18, 112, 2.2) + p.taper(28, 138, 30, 108, 2.2) + p.taper(186, 130, 194, 106, 2.2), 'a-fd a-sk a-w1')
      + star(150, 50, 7) + star(170, 36, 4);
  }],
  inspire: ['Inspire Leader', (p) => {
    const pennant = p.curve([[108, 26], [150, 30], [180, 40], [154, 48], [176, 60], [108, 60]], { amp: 0.5 }) + 'Z';
    let crowd = '';
    for (let i = 0; i < 6; i++) crowd += figure(p, 26 + i * 12 + (i > 2 ? 84 : 0), 168, 0.6 + (i % 2) * 0.06, i % 3 ? 'a-fs' : 'a-fl');
    return goldSky(p, 112) + sun(p, 108, 20, 14) + hillsLine(p, 112) + groundPlane(p, 116, { tufts: 2 })
      + S(p.line(108, 24, 108, 150, 0.3), 'a-sk a-w4') + P(pennant, 'a-fv') + shade(p, pennant, { x: 140, y: 26, w: 40, h: 36 }, 2, 80) + S(pennant, 'a-sk a-w2')
      + P(p.circle(108, 20, 5.5), 'a-fg a-se a-w2') + figure(p, 96, 152, 1.25, 'a-fl') + crowd;
  }],
  teach: ['Teach', (p) => {
    const niche = 'M28 168L28 54Q28 18 103 14Q178 18 178 54L178 168Z';
    const desk = 'M40 132L166 132L160 168L46 168Z';
    const quill = p.taper(126, 120, 176, 40, 9, 3);
    return P(`M0 0L${W} 0L${W} ${H}L0 ${H}Z`, 'a-fs') + shade(p, `M0 0L${W} 0L${W} ${H}L0 ${H}Z`, { x: 0, y: 0, w: W, h: H }, 4, 90)
      + P(niche, 'a-fp') + S(niche, 'a-sk a-w3') + S('M36 168L36 56Q36 26 103 22Q170 26 170 56L170 168', 'a-sf a-w1')
      + tablet(p, 58, 40, 70, 94) + P(desk, 'a-ff') + shade(p, desk, { x: 40, y: 132, w: 126, h: 36 }, 2.4, 20) + S(desk, 'a-sk a-w2')
      + P(quill, 'a-fp a-sk a-w2') + S(p.line(126, 120, 172, 46, 0.3), 'a-sk a-w1')
      + P('M146 132L146 112L156 112L156 132Z', 'a-fp a-sk a-w2') + P(p.curve([[151, 94], [155, 102], [151, 110], [147, 102]], { closed: true, amp: 0.1 }), 'a-fv a-sk a-w1') + star(151, 86, 5);
  }],
  whisper: ['Whisper', (p) => {
    let curls = '';
    for (let i = 0; i < 5; i++) {
      const x = 74 + i * 20, y = 74 - Math.sin(i * 0.9) * 10;
      curls += p.curve([[x, y + 8], [x + 6, y - 3], [x + 13, y + 1], [x + 9, y + 9], [x + 4, y + 5]], { amp: 0.3 });
    }
    return duskSky(p, 112) + hillsLine(p, 112) + groundPlane(p, 116, { tufts: 3 })
      + figure(p, 46, 150, 1.4, 'a-fl') + P(p.curve([[54, 108], [64, 98], [74, 82], [80, 78], [80, 94], [72, 104]], { closed: true, amp: 0.3 }), 'a-fg a-se a-w2')
      + S(curls, 'a-sg a-w3') + S(curls, 'a-se a-w1') + hut(p, 162, 142, 1.1) + hut(p, 134, 140, 0.8) + hut(p, 186, 136, 0.7);
  }],
  sign: ['Sign', (p) => {
    const hill = p.curve([[0, 140], [50, 116], [103, 108], [156, 118], [W, 136]], { amp: 0.6 });
    return goldSky(p, 130) + P(p.circle(103, 56, 44, 44, 0.4), 'a-fp a-sk a-w2') + S(p.circle(103, 56, 49, 49, 0.4), 'a-se a-w2')
      + glyph(p, 103, 56, 32, 'a-sv a-w4') + glyph(p, 103, 56, 32, 'a-sk a-w1')
      + P(hill + `L${W} ${H}L0 ${H}Z`, 'a-fs') + S(hill, 'a-sk a-w2') + hut(p, 78, 130, 0.75) + hut(p, 102, 124, 0.85) + hut(p, 128, 128, 0.75)
      + figure(p, 154, 146, 0.6) + figure(p, 50, 150, 0.6, 'a-fl');
  }],
  smite: ['Smite', (p) => {
    const bolt = 'M112 6L94 72L114 74L86 150L138 60L116 58L132 6Z';
    const tower = 'M58 156L62 88L54 88L54 74L64 74L64 80L72 80L72 72L80 74L80 80L88 80L88 74L96 76L96 88L90 88L94 156Z';
    let debris = '';
    for (const [x, y, s] of [[110, 118, 1.2], [124, 132, 1], [44, 128, 1], [38, 142, 0.8], [132, 104, 0.9], [102, 104, 0.7]]) debris += `M${x} ${y}l${4 * s} ${-3 * s}l${3 * s} ${4 * s}l${-4 * s} ${3 * s}z`;
    return stormSky(p, 140) + hillsLine(p, 140) + groundPlane(p, 144, { tufts: 2 })
      + P(tower, 'a-fs') + shade(p, tower, { x: 76, y: 72, w: 20, h: 84 }, 2, 80) + S(tower, 'a-sk a-w2')
      + S(p.curve([[78, 90], [72, 106], [80, 116], [74, 134]], { amp: 0.4 }), 'a-sk a-w3') + P('M66 104L66 98Q69 94 72 98L72 104Z', 'a-fk')
      + P(bolt, 'a-fg a-sv a-w3') + S(p.line(108, 30, 100, 62, 0) + p.line(118, 78, 104, 112, 0), 'a-se a-w1') + P(debris, 'a-fs a-sk a-w1');
  }],
  ward: ['Ward', (p) => {
    let notches = '';
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; notches += p.line(103 + Math.cos(a) * 54, 96 + Math.sin(a) * 46, 103 + Math.cos(a) * 62, 96 + Math.sin(a) * 53, 0); }
    const vein = (pts) => S(p.curve(pts, { amp: 0.6 }), 'a-sc a-w3');
    return engravedSky(p, 108) + hillsLine(p, 108) + groundPlane(p, 112, { tufts: 3 })
      + vein([[0, 30], [16, 40], [26, 36], [36, 50]]) + vein([[W, 24], [190, 38], [176, 34], [164, 48]]) + vein([[W, 162], [184, 150], [174, 154], [162, 140]]) + vein([[0, 150], [18, 144], [30, 150], [40, 140]])
      + P(p.circle(37, 51, 3.4) + p.circle(163, 49, 3.4) + p.circle(161, 139, 3.4) + p.circle(41, 139, 3.4), 'a-fc')
      + S(p.circle(103, 96, 58, 49, 0.4, 24), 'a-se a-w4') + S(p.circle(103, 96, 58, 49, 0.4, 24), 'a-sg a-w2') + S(p.circle(103, 96, 51, 43, 0.3, 22), 'a-se a-w1') + S(notches, 'a-se a-w2')
      + hut(p, 92, 122, 1.2) + hut(p, 122, 120, 0.9) + glyph(p, 103, 66, 10, 'a-se a-w2');
  }],
  cleanse: ['Cleanse', (p) => {
    let drops = '';
    for (const [x, y, r] of [[44, 140, 5], [26, 124, 3.5], [68, 156, 4], [156, 146, 4.5], [178, 128, 3], [134, 158, 3]]) drops += p.circle(x, y, r, r, 0.3, 7);
    return goldSky(p, 108) + sun(p, 103, 52, 26)
      + hillsLine(p, 108) + groundPlane(p, 112, { tufts: 0 })
      + blot(p, 66, 138, 17) + blot(p, 146, 138, 13) + P(drops, 'a-fc')
      + S(p.line(88, 82, 72, 120, 0.4) + p.line(118, 82, 138, 122, 0.4) + p.line(103, 84, 103, 118, 0.4), 'a-sg a-w4') + S(p.line(88, 82, 72, 120, 0.4) + p.line(118, 82, 138, 122, 0.4), 'a-se a-w1');
  }],
  explore: ['Explore', (p) => {
    let pts = '';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 22 : 44, a1 = a - 0.24, a2 = a + 0.24;
      pts += `M84 74L${(84 + Math.cos(a1) * r * 0.3).toFixed(1)} ${(74 + Math.sin(a1) * r * 0.3).toFixed(1)}L${(84 + Math.cos(a) * r).toFixed(1)} ${(74 + Math.sin(a) * r).toFixed(1)}L${(84 + Math.cos(a2) * r * 0.3).toFixed(1)} ${(74 + Math.sin(a2) * r * 0.3).toFixed(1)}Z`;
    }
    const fog = 'M126 0L206 0L206 168L150 168Q132 140 144 116Q122 96 140 70Q118 40 126 0Z';
    return engravedSky(p, 110) + hillsLine(p, 110) + groundPlane(p, 114, { tufts: 3 })
      + P(fog, 'a-ff') + p.hatch(fog, { x: 116, y: 0, w: 90, h: 168, angle: 40, gap: 3.4, cls: 'a-sk a-w1' }) + p.hatch(fog, { x: 116, y: 0, w: 90, h: 168, angle: -40, gap: 6, cls: 'a-sk a-w1' })
      + S(p.curve([[150, 40], [164, 34], [178, 40], [190, 34]], { amp: 0.3 }) + p.curve([[154, 100], [170, 94], [186, 100]], { amp: 0.3 }), 'a-ss a-w2')
      + `<g stroke-dasharray="4 4">${S(p.curve([[10, 160], [40, 146], [70, 152], [100, 136], [126, 124], [148, 110]], { amp: 0.6 }), 'a-sk a-w2')}</g>`
      + S(p.circle(84, 74, 36, 36, 0.4), 'a-sk a-w1') + P(pts, 'a-fg a-se a-w1') + P(p.circle(84, 74, 6), 'a-fl a-sk a-w1')
      + S(p.line(146, 104, 158, 116, 0) + p.line(158, 104, 146, 116, 0), 'a-sv a-w4');
  }],
  commission: ['Commission', (p) => {
    const idol = p.curve([[80, 156], [76, 112], [84, 84], [94, 66], [104, 58], [114, 66], [124, 84], [132, 112], [128, 156]], { amp: 0.5 }) + 'Z';
    const scaffold = p.line(56, 156, 56, 40, 0) + p.line(154, 156, 154, 40, 0) + p.line(50, 52, 160, 52, 0) + p.line(50, 104, 160, 104, 0) + p.line(56, 52, 154, 104, 0) + p.line(56, 104, 154, 52, 0);
    return engravedSky(p, 120) + hillsLine(p, 120) + groundPlane(p, 124, { tufts: 2 })
      + S(scaffold, 'a-sf a-w4') + S(scaffold, 'a-ss a-w1')
      + P(idol, 'a-fs') + shade(p, idol, { x: 104, y: 58, w: 30, h: 100 }, 2, 72) + S(idol, 'a-sk a-w3')
      + P(p.circle(104, 92, 8), 'a-fg a-se a-w2') + glyph(p, 104, 92, 5, 'a-se a-w1') + S(p.line(92, 124, 116, 124, 0.3), 'a-sk a-w1')
      + figure(p, 168, 156, 0.85, 'a-fd') + P('M150 126L172 104L178 110L156 132Z', 'a-fs a-sk a-w2') + S(p.line(152, 130, 140, 144, 0.2), 'a-sk a-w3')
      + star(138, 96, 5) + star(150, 84, 3);
  }],
  envoy: ['Envoy', (p) => {
    const letter = 'M36 56L170 46L176 128L42 138Z';
    const fold = 'M36 56L106 100L170 46';
    return engravedSky(p, 100) + hillsLine(p, 100) + groundPlane(p, 104, { tufts: 2 })
      + P(letter, 'a-fp') + shade(p, 'M106 100L170 46L176 128L42 138Z', { x: 42, y: 46, w: 134, h: 92 }, 3, 20) + S(letter, 'a-sk a-w3') + S(fold, 'a-sk a-w2')
      + P(p.curve(p.ringPts(106, 100, 15, 15, 11, 1.4), { closed: true, amp: 0.4 }), 'a-fv a-sk a-w2') + glyph(p, 106, 100, 8, 'a-sp a-w2')
      + P('M98 112L90 140L100 132L104 146L108 114Z', 'a-fv a-sk a-w1')
      + P(p.taper(134, 160, 196, 104, 8, 2), 'a-fp a-sk a-w2') + S(p.line(134, 160, 192, 108, 0.3), 'a-sk a-w1') + coin(p, 30, 150, 10);
  }],
  chosen: ['Raise Chosen', (p) => {
    const trunk = p.curve([[100, 168], [104, 140], [98, 116], [103, 96]], { amp: 0.5 });
    const branches = p.curve([[101, 128], [78, 116], [56, 100]], { amp: 0.4 }) + p.curve([[101, 120], [126, 108], [150, 94]], { amp: 0.4 }) + p.curve([[102, 104], [88, 92], [76, 82]], { amp: 0.4 }) + p.curve([[102, 104], [118, 90], [130, 80]], { amp: 0.4 });
    const medal = (x, y, r = 10) => P(p.circle(x, y, r, r, 0.4), 'a-fp a-sk a-w2') + figure(p, x, y + r * 0.7, r * 0.045, 'a-fv');
    return goldSky(p, 150) + groundPlane(p, 150, { tufts: 0 }) + S(trunk, 'a-sk a-w4') + S(branches, 'a-sk a-w3')
      + P(p.curve([[84, 168], [100, 160], [120, 168]], { amp: 0.4 }), 'a-fs a-sk a-w2')
      + medal(56, 100, 12) + medal(150, 94, 12) + medal(76, 82, 9) + medal(130, 80, 9)
      + P(p.circle(103, 48, 30, 30, 0.4), 'a-fp a-sk a-w2') + crown(p, 103, 52, 40);
  }],
};

export const ILLUS_VB = `0 0 ${W} ${H}`;
