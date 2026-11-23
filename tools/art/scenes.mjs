// The Evil One, page frames, logo and animations.
import { readFileSync } from 'node:fs';
import { P, S } from './lib.mjs';
import { coin, glyph, knot, rays, star } from './motifs.mjs';

const WM = JSON.parse(readFileSync(new URL('./wordmark.json', import.meta.url), 'utf8'));

// --- The Evil One: Vashtar, the Hunger Beneath ------------------------------------
const evilHidden = (p) => {
  // a scalloped wax seal, cracked, stamped with an invented hook-and-three-dots rune
  const pts = [];
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; const r = i % 2 ? 60 : 55; pts.push([80 + Math.cos(a) * r + p.R.j(1.2), 78 + Math.sin(a) * r + p.R.j(1.2)]); }
  const seal = p.curve(pts, { closed: true, amp: 0.3 });
  const c = p.clip(seal);
  let cracks = '';
  for (const k of [0.4, 1.6, 2.7, 3.9, 5.1]) {
    const a = k + p.R.j(0.15);
    cracks += p.curve([[80 + Math.cos(a) * 22, 78 + Math.sin(a) * 22], [80 + Math.cos(a + 0.12) * 38, 78 + Math.sin(a + 0.12) * 38], [80 + Math.cos(a - 0.06) * 58, 78 + Math.sin(a - 0.06) * 58]], { amp: 0.8 });
  }
  const hook = 'M66 58Q66 44 80 44Q94 44 94 58Q94 68 84 72Q80 74 80 82L80 90';
  const dots = p.circle(68, 102, 3.4) + p.circle(80, 106, 3.4) + p.circle(92, 102, 3.4);
  const bleed = p.curve([[96, 130], [98, 140], [96, 150], [99, 158]], { amp: 0.3 });
  return P(seal, 'a-fc') + `<g clip-path="url(#${c})">${p.hatch(seal, { x: 80, y: 18, w: 62, h: 122, angle: 60, gap: 3.4, cls: 'a-sk a-w1' })}</g>`
    + S(seal, 'a-sk a-w3') + S(p.circle(80, 78, 44, 44, 0.5, 20), 'a-sb a-w1') + S(cracks, 'a-sb a-w2')
    + S(bleed, 'a-sc a-w4') + P(p.circle(99, 160, 3.2), 'a-fc')
    + S(hook, 'a-sk a-w4') + S(hook, 'a-sb a-w2') + P(dots, 'a-fb a-sk a-w1');
};

const evilRevealed = (p) => {
  // a vast many-jawed mass rising from a pool of deep ink
  const key = [[20, 206], [38, 176], [32, 150], [52, 126], [58, 96], [82, 74], [100, 44], [128, 22], [156, 12], [184, 18], [204, 36], [222, 30], [242, 48], [250, 78], [272, 100], [266, 132], [288, 162], [302, 206]];
  const outline = [];
  key.forEach(([x, y], i) => {
    outline.push([x, y]);
    const nx = key[i + 1];
    if (nx) { const mx = (x + nx[0]) / 2, my = (y + nx[1]) / 2; outline.push([mx + p.R.j(3), my - p.R.range(3, 8)]); }
  });
  const mass = p.curve(outline, { amp: 1 }) + 'L300 210L20 210Z';
  const jaw = (x, y, w, h, tilt) => {
    const mouth = `M${x - w} ${y + tilt}Q${x} ${y - h} ${x + w} ${y - tilt}Q${x} ${y + h} ${x - w} ${y + tilt}Z`;
    let teeth = '';
    const k = 7;
    for (let i = 1; i < k; i++) {
      const tx = x - w + (2 * w * i) / k, ty = y + tilt * (1 - (2 * i) / k);
      teeth += `M${(tx - 3.2).toFixed(1)} ${(ty - h * 0.45).toFixed(1)}L${tx.toFixed(1)} ${(ty - h * 0.02).toFixed(1)}L${(tx + 3.2).toFixed(1)} ${(ty - h * 0.45).toFixed(1)}Z`;
      teeth += `M${(tx - 2.6).toFixed(1)} ${(ty + h * 0.45).toFixed(1)}L${(tx + 0.6).toFixed(1)} ${(ty + h * 0.06).toFixed(1)}L${(tx + 3).toFixed(1)} ${(ty + h * 0.45).toFixed(1)}Z`;
    }
    return P(mouth, 'a-fk a-sb a-w2') + P(teeth, 'a-fp');
  };
  let eyes = '';
  for (const [x, y, r] of [[146, 44, 3.4], [158, 40, 4], [170, 46, 3], [128, 86, 2.6], [194, 92, 2.8], [104, 136, 2.4], [216, 140, 2.6], [150, 64, 2.2], [176, 62, 2.2]]) eyes += p.circle(x, y, r, r * 0.8);
  let tendrils = '';
  for (const [x, s, h] of [[46, -1, 70], [70, -1, 104], [262, 1, 92], [286, 1, 60]]) tendrils += p.curve([[x, 200], [x + 16 * s, 200 - h * 0.35], [x + 2 * s, 200 - h * 0.7], [x + 18 * s, 200 - h]], { amp: 1 });
  const pool = p.curve([[0, 200], [60, 194], [120, 202], [180, 195], [250, 201], [320, 196]], { amp: 1 }) + 'L320 240L0 240Z';
  let lining = '';
  for (let i = 0; i < 7; i++) { const y = 206 + i * (3 + i * 0.6); lining += p.line(p.R.range(0, 30), y, p.R.range(290, 320), y, 0); }
  return P(mass, 'a-fc') + p.hatch(mass, { x: 170, y: 10, w: 140, h: 200, angle: 66, gap: 3.6, cls: 'a-sk a-w1' }) + p.hatch(mass, { x: 236, y: 70, w: 70, h: 140, angle: -50, gap: 4.5, cls: 'a-sk a-w1' })
    + S(p.curve(outline, { amp: 0 }), 'a-sk a-w3')
    + jaw(160, 74, 34, 22, 3) + jaw(118, 128, 30, 18, -4) + jaw(204, 132, 32, 20, 4) + jaw(160, 176, 40, 16, 0)
    + P(eyes, 'a-fb') + S(tendrils, 'a-sk a-w4') + S(tendrils, 'a-sc a-w2')
    + P(pool, 'a-fk') + S(lining, 'a-sc a-w2') + S(p.curve([[30, 214], [70, 210], [104, 216]], { amp: 0.6 }) + p.curve([[200, 222], [250, 218], [292, 224]], { amp: 0.6 }), 'a-sb a-w1');
};

const evilBar = (p) => {
  const track = 'M28 12L292 12L292 28L28 28Z';
  const claw = (x, s) => P(`M${x} 6L${x + 22 * s} 20L${x} 34L${x + 8 * s} 20Z`, 'a-fc a-sk a-w2');
  let ticks = '';
  for (let x = 60; x < 292; x += 33) ticks += p.line(x, 12, x, 16, 0);
  return P(track, 'a-fs a-sk a-w3') + S(ticks, 'a-sf a-w1') + S('M31 15L289 15', 'a-sf a-w1') + claw(28, -1) + claw(292, 1)
    + `<rect id="evil-one-health-bar-fill" x="30" y="14" width="260" height="12" class="a-fc"/>`;
};

// --- Page frames -------------------------------------------------------------
const corner = (p, x, y, sx, sy) => {
  const leaf = p.curve([[x, y], [x + 22 * sx, y + 4 * sy], [x + 34 * sx, y + 16 * sy], [x + 18 * sx, y + 12 * sy]], { amp: 0.3 });
  const leaf2 = p.curve([[x, y], [x + 4 * sx, y + 22 * sy], [x + 16 * sx, y + 34 * sy], [x + 12 * sx, y + 18 * sy]], { amp: 0.3 });
  return P(leaf + 'Z' + leaf2 + 'Z', 'a-fg a-se a-w1') + knot(p, x + 8 * sx, y + 8 * sy, 5);
};

const pageFrame = (kind) => (p) => {
  const w = 375, h = 640;
  const outer = `M8 8L${w - 8} 8L${w - 8} ${h - 8}L8 ${h - 8}Z`;
  const inner = `M18 18L${w - 18} 18L${w - 18} ${h - 18}L18 ${h - 18}Z`;
  let vine = '';
  let leaves = '';
  for (let y = 60; y < h - 60; y += 46) {
    vine += p.curve([[13, y], [10, y + 12], [16, y + 24], [13, y + 46]], { amp: 0.3 });
    leaves += p.taper(13, y + 23, 22, y + 16, 2.4, 0.5);
  }
  const head = kind === 'chronicle'
    ? P(`M40 34L${w - 40} 34L${w - 40} 70L40 70Z`, 'a-fs a-sk a-w2') + S(p.line(48, 40, w - 48, 40, 0.3) + p.line(48, 64, w - 48, 64, 0.3), 'a-sf a-w1') + coin(p, w / 2, 34, 12)
    : P(`M36 36L${w - 36} 36L${w - 36} 46L36 46Z` + `M36 ${h - 46}L${w - 36} ${h - 46}L${w - 36} ${h - 36}L36 ${h - 36}Z`, 'a-ff a-sk a-w2')
      + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => P(`M${48 + i * 36} 36L${48 + i * 36 + 8} 36L${48 + i * 36 + 8} 46L${48 + i * 36} 46Z`, i % 2 ? 'a-fv' : 'a-fl')).join('');
  return P(outer, 'a-fp a-sk a-w3') + S(inner, 'a-sk a-w2') + S(`M22 22L${w - 22} 22L${w - 22} ${h - 22}L22 ${h - 22}Z`, 'a-sf a-w1')
    + S(vine, 'a-sd a-w2') + P(leaves, 'a-fd') + head
    + corner(p, 18, 18, 1, 1) + corner(p, w - 18, 18, -1, 1) + corner(p, 18, h - 18, 1, -1) + corner(p, w - 18, h - 18, -1, -1)
    + tail(p, w / 2, h - 40);
};

const tail = (p, x, y) => {
  // rubricated tailpiece: a diamond between two tapering flourishes
  return P(p.taper(x - 70, y, x - 10, y, 2, 0) + p.taper(x + 10, y, x + 70, y, 2, 0), 'a-fk') + knot(p, x, y, 6)
    + P(p.circle(x - 78, y, 2) + p.circle(x + 78, y, 2), 'a-fv');
};

const dropCap = (p) => {
  const box = 'M4 4L60 4L60 60L4 60Z';
  const curl = (x, y, sx, sy) => p.curve([[x, y], [x + 9 * sx, y + 1 * sy], [x + 12 * sx, y + 7 * sy], [x + 7 * sx, y + 10 * sy], [x + 4 * sx, y + 6 * sy], [x + 7 * sx, y + 4 * sy]], { amp: 0.1 });
  let leaves = '';
  for (const [x, y, sx, sy] of [[10, 10, 1, 1], [54, 10, -1, 1], [10, 54, 1, -1], [54, 54, -1, -1]]) leaves += p.taper(x + 12 * sx, y + 2 * sy, x + 18 * sx, y - 1 * sy, 1.2) + p.taper(x + 2 * sx, y + 12 * sy, x - 1 * sx, y + 18 * sy, 1.2);
  return P(box, 'a-fv a-se a-w3') + S('M9 9L55 9L55 55L9 55Z', 'a-sg a-w1')
    + S(curl(10, 10, 1, 1) + curl(54, 10, -1, 1) + curl(10, 54, 1, -1) + curl(54, 54, -1, -1), 'a-sg a-w2') + P(leaves, 'a-fg');
};

const shareCard = (p) => {
  const W = 1080;
  let rays2 = '';
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; rays2 += p.line(540 + Math.cos(a) * 150, 330 + Math.sin(a) * 150, 540 + Math.cos(a) * 196, 330 + Math.sin(a) * 196, 0); }
  let lines = '';
  for (let y = 760; y <= 880; y += 40) lines += p.line(180, y, 900, y, 0.6);
  return P(`M0 0L${W} 0L${W} ${W}L0 ${W}Z`, 'a-fp')
    + `<path d="M28 28L1052 28L1052 1052L28 1052ZM52 52L52 1028L1028 1028L1028 52Z" class="a-fg" fill-rule="evenodd"/>`
    + S('M28 28L1052 28L1052 1052L28 1052Z', 'a-se a-w3') + S('M52 52L1028 52L1028 1028L52 1028Z', 'a-se a-w3') + S('M70 70L1010 70L1010 1010L70 1010Z', 'a-sk a-w3')
    + S(rays2, 'a-sg a-w4') + P(p.circle(540, 330, 140, 140, 1, 24), 'a-fs a-sk a-w4') + S(p.circle(540, 330, 124, 124, 0.8, 24), 'a-sg a-w3')
    + P(p.curve([[160, 520], [540, 506], [920, 520], [920, 610], [540, 596], [160, 610]], { closed: true, amp: 1 }), 'a-fs a-sk a-w4')
    + P('M160 528L100 540L130 566L100 592L160 602Z' + 'M920 528L980 540L950 566L980 592L920 602Z', 'a-fs a-sk a-w3')
    + P(`M420 646L660 646L660 700L420 700Z`, 'a-fv a-sk a-w3') + S(lines, 'a-sf a-w2')
    + [[100, 100], [980, 100], [100, 980], [980, 980]].map(([x, y]) => knot(p, x, y, 16)).join('') + glyph(p, 540, 960, 26);
};

const omens = (p) => {
  const box = 'M6 8L334 6L336 114L4 116Z';
  const top = [[4, 58], [40, 54], [62, 64], [90, 50], [118, 62], [146, 52], [176, 66], [204, 50], [236, 62], [262, 52], [296, 64], [336, 56]];
  const bottom = top.map(([x, y], i) => [x + (i % 2 ? 1.5 : -1.5), y + (i === 0 || i === top.length - 1 ? 1.5 : 6 + Math.abs(Math.sin(i * 1.7)) * 4)]).reverse();
  const crack = 'M' + [...top, ...bottom].map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
  let branches = '';
  for (const i of [2, 4, 7, 9]) { const [x, y] = top[i]; branches += `M${x} ${y}L${x + 6} ${y - 9}L${x + 4} ${y - 15}` + `M${x} ${y + 3}L${x - 5} ${y + 10}`; }
  let bleed = '';
  for (const [x, y, r] of [[64, 70, 2.4], [148, 60, 2], [208, 57, 2.6], [298, 71, 2]]) bleed += p.circle(x, y + 3, r, r * 1.4);
  return P(box, 'a-fp a-sk a-w3') + S('M14 15L326 14L328 107L12 108Z', 'a-sf a-w1')
    + S(branches, 'a-sc a-w1') + P(crack, 'a-fc') + S('M' + top.map(([x, y]) => `${x} ${y}`).join('L'), 'a-sk a-w1') + P(bleed, 'a-fc')
    + S(p.line(30, 54.5, 52, 55, 0) + p.line(186, 63, 196, 58, 0), 'a-sb a-w1') + knot(p, 20, 22, 5) + knot(p, 320, 100, 5);
};

// --- Logo ---------------------------------------------------------------------
const mark = (p, cx, cy, r) => {
  // a gold ring broken at its foot, a flame inside, and a falling star below: faith that falls
  const a0 = Math.PI * 0.62, a1 = Math.PI * 2.38;
  let ring = '';
  const pts = [];
  for (let i = 0; i <= 18; i++) { const a = a0 + ((a1 - a0) * i) / 18; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  ring = p.curve(pts, { amp: r * 0.01 });
  const fl = p.curve([[cx, cy - r * 0.62], [cx + r * 0.32, cy - r * 0.1], [cx + r * 0.22, cy + r * 0.34], [cx, cy + r * 0.44], [cx - r * 0.22, cy + r * 0.34], [cx - r * 0.3, cy], [cx - r * 0.08, cy - r * 0.22]], { closed: true, amp: r * 0.01 });
  return S(ring, 'a-se a-w4') + S(ring, 'a-sg a-w2') + P(fl, 'a-fg a-se a-w2') + star(cx, cy + r * 1.18, r * 0.26) + S(p.line(cx, cy + r * 0.82, cx, cy + r * 0.92, 0), 'a-sg a-w2');
};

const wordmark = (p) => mark(p, 34, -34, 22) + `<path d="${WM.d}" transform="translate(76 0)" class="a-fk"/>` + P(`M76 14L${76 + WM.width} 14L${76 + WM.width} 17L76 17Z`, 'a-fv');

const appIcon = (p) => P('M24 8L488 8Q504 8 504 24L504 488Q504 504 488 504L24 504Q8 504 8 488L8 24Q8 8 24 8Z', 'a-fp a-sk a-w4')
  + `<path d="M40 40L472 40L472 472L40 472ZM58 58L58 454L454 454L454 58Z" class="a-fg" fill-rule="evenodd"/>` + S('M40 40L472 40L472 472L40 472Z', 'a-se a-w3') + S('M58 58L454 58L454 454L58 454Z', 'a-se a-w3')
  + rays(p, 256, 232, 128, 170, 16, 0, Math.PI * 2, 0.05) + `<g transform="translate(256 232) scale(4.6) translate(-34 0)">${mark(p, 34, 0, 22)}</g>`
  + [[78, 78], [434, 78], [78, 434], [434, 434]].map(([x, y]) => knot(p, x, y, 10)).join('');

// --- Animations ----------------------------------------------------------------
const reduced = '@media (prefers-reduced-motion: reduce){.ff-anim,.ff-anim *{animation:none!important}}';

const inkwash = (p) => {
  // a band of ink with a ragged leading edge and drips, swept left to right
  const edge = [];
  for (let y = -10; y <= 230; y += 20) edge.push([300 + p.R.j(18), y]);
  const band = `M0 -10L${edge.map(([x, y]) => `${x.toFixed(1)} ${y}`).join('L')}L0 230Z`;
  let drips = '';
  for (let i = 0; i < 6; i++) { const y = 20 + i * 34; drips += p.circle(318 + p.R.range(0, 30), y + p.R.j(6), p.R.range(3, 7)); }
  let streaks = '';
  for (let y = 10; y < 220; y += 14) streaks += p.line(20, y, 260 + p.R.j(20), y + p.R.j(2), 0.5);
  return `<g class="ff-anim"><g class="ff-wash">${P(band + 'Z', 'a-fk')}${P(drips, 'a-fk')}${S(streaks, 'a-sf a-w2')}</g></g>`;
};
const inkwashStyle = '.ff-wash{animation:ff-sweep 1.2s cubic-bezier(.6,0,.4,1) both}@keyframes ff-sweep{from{transform:translateX(-360px)}to{transform:translateX(420px)}}' + reduced;

const digReveal = (p) => {
  const t = 'M44 140L46 52Q48 28 80 26Q112 28 114 52L116 140Z';
  const tablet = P(t, 'a-fs a-sk a-w3') + P('M58 60L102 60L103 122L57 122Z', 'a-fp a-sf a-w2') + rays(p, 80, 70, 52, 74, 12, 0, Math.PI * 2, 0.06);
  const mid = p.id('mask');
  let strokes = '';
  for (let i = 0; i < 6; i++) { const y = 30 + i * 22; strokes += `<path d="${p.curve([[10, y], [60, y - 6], [110, y + 6], [150, y]], { amp: 2 })}" pathLength="1" class="ff-brush" style="animation-delay:${(i * 0.18).toFixed(2)}s"/>`; }
  let dust = '';
  for (let i = 0; i < 34; i++) dust += p.circle(p.R.range(10, 150), p.R.range(10, 150), p.R.range(0.8, 2.2), undefined, 0, 5);
  return `<defs><mask id="${mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160"><rect width="160" height="160" fill="#fff"/><g class="ff-anim" fill="none" stroke="#000" stroke-width="30">${strokes}</g></mask></defs>`
    + tablet + `<g mask="url(#${mid})">${P('M0 0L160 0L160 160L0 160Z', 'a-fs')}${P(dust, 'a-ff')}</g>`;
};
const digStyle = '.ff-brush{stroke-dasharray:1;stroke-dashoffset:1;animation:ff-brush .5s ease-out forwards}@keyframes ff-brush{to{stroke-dashoffset:0}}@media (prefers-reduced-motion: reduce){.ff-brush{animation:none;stroke-dashoffset:0}}';

export const assets = [
  { dir: 'evil-one', file: 'vashtar-hidden', title: 'Vashtar, hidden: a cracked seal with a questioning rune', vb: '0 0 160 160', draw: evilHidden, small: 40 },
  { dir: 'evil-one', file: 'vashtar-revealed', title: 'Vashtar, the Hunger Beneath: a many-jawed shape rising from deep ink', vb: '0 0 320 240', draw: evilRevealed, small: 64 },
  { dir: 'evil-one', file: 'health-bar', title: 'Evil One health-bar frame (scale #evil-one-health-bar-fill)', vb: '0 0 320 40', draw: evilBar, small: 96 },
  { dir: 'frames', file: 'chronicle-page', title: 'Chronicle page frame', vb: '0 0 375 640', draw: pageFrame('chronicle'), small: 48 },
  { dir: 'frames', file: 'library-page', title: 'Library page frame', vb: '0 0 375 640', draw: pageFrame('library'), small: 48 },
  { dir: 'frames', file: 'drop-cap', title: 'Drop-cap box (set the letter over it in IM Fell English)', vb: '0 0 64 64', draw: dropCap, small: 32 },
  { dir: 'frames', file: 'share-card', title: 'Share card (1080×1080): sigil ring, name banner, year plate, myth lines', vb: '0 0 1080 1080', draw: shareCard, small: 64 },
  { dir: 'frames', file: 'omens-panel', title: 'Omens panel (an inked box with a crack across it)', vb: '0 0 340 120', draw: omens, small: 96 },
  { dir: 'logo', file: 'wordmark', title: 'Faithfall', vb: `-2 -84 ${Math.ceil(WM.width + 82)} 116`, draw: wordmark, small: 120 },
  { dir: 'logo', file: 'app-icon', title: 'Faithfall app icon', vb: '0 0 512 512', draw: appIcon, small: 32 },
  { dir: 'animations', file: 'inkwash', title: 'Leap ink-wash (1.2 s sweep)', vb: '0 0 400 220', draw: inkwash, style: inkwashStyle, small: 64 },
  { dir: 'animations', file: 'dig-reveal', title: 'Dig reveal (brush strokes wipe the dust away)', vb: '0 0 160 160', draw: digReveal, style: digStyle, small: 48 },
];
