// Motifs shared by several assets: the Trust coin, rays, flames, invented glyphs, stars.
import { P, S } from './lib.mjs';

/** Trust: a gold coin with a flame-like mark. */
export const coin = (p, cx, cy, r) => {
  const s = r / 16;
  const flame = p.curve([[cx, cy - 9 * s], [cx + 4.5 * s, cy - 2 * s], [cx + 4 * s, cy + 4 * s], [cx, cy + 8 * s], [cx - 4 * s, cy + 4 * s], [cx - 4 * s, cy - 1 * s], [cx - 1.5 * s, cy - 3 * s]], { closed: true, amp: 0.15 * s });
  const inner = p.curve([[cx, cy - 2 * s], [cx + 2 * s, cy + 2 * s], [cx, cy + 5 * s], [cx - 2 * s, cy + 2.5 * s]], { closed: true, amp: 0.1 * s });
  return P(p.circle(cx, cy, r, r, 0.3 * s), `a-fg a-se ${r > 10 ? 'a-w3' : 'a-w2'}`)
    + S(p.circle(cx, cy, r * 0.78, r * 0.78, 0.2 * s), 'a-se a-w1')
    + P(flame, 'a-fe') + P(inner, 'a-fg')
    + (r > 10 ? S(p.line(cx + r * 0.42, cy + r * 0.32, cx + r * 0.22, cy + r * 0.52, 0) + p.line(cx + r * 0.52, cy + r * 0.12, cx + r * 0.12, cy + r * 0.56, 0) + p.line(cx + r * 0.56, cy - r * 0.1, cx - r * 0.02, cy + r * 0.58, 0), 'a-se a-w1') : '');
};

/** Hatched gold rays fanning from a point (no glow, just inked wedges). */
export const rays = (p, cx, cy, r0, r1, count, from = 0, to = Math.PI * 2, w = 0.08) => {
  let d = '';
  let h = '';
  for (let i = 0; i < count; i++) {
    const a = from + ((to - from) * (i + 0.5)) / count;
    const x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0;
    const xa = cx + Math.cos(a - w) * r1, ya = cy + Math.sin(a - w) * r1;
    const xb = cx + Math.cos(a + w) * r1, yb = cy + Math.sin(a + w) * r1;
    d += `M${x0.toFixed(1)} ${y0.toFixed(1)}L${xa.toFixed(1)} ${ya.toFixed(1)}L${xb.toFixed(1)} ${yb.toFixed(1)}Z`;
    const xm = cx + Math.cos(a) * (r0 + (r1 - r0) * 0.4), ym = cy + Math.sin(a) * (r0 + (r1 - r0) * 0.4);
    h += p.line(xm, ym, cx + Math.cos(a) * r1 * 0.96, cy + Math.sin(a) * r1 * 0.96, 0);
  }
  return `<path d="${d}" class="a-fg a-se a-w1"/>` + S(h, 'a-se a-w1');
};

/** A small four-pointed star. */
export const star = (x, y, r, cls = 'a-fg') => {
  const k = r * 0.28;
  return `<path d="M${x} ${y - r}L${x + k} ${y - k}L${x + r} ${y}L${x + k} ${y + k}L${x} ${y + r}L${x - k} ${y + k}L${x - r} ${y}L${x - k} ${y - k}Z" class="${cls}"/>`;
};

/** An invented divine glyph: a ring with three inward ticks and a seed at the centre. */
export const glyph = (p, cx, cy, r, cls = 'a-sg a-w3') => {
  let ticks = '';
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
    ticks += p.line(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cx + Math.cos(a) * r * 0.45, cy + Math.sin(a) * r * 0.45, 0.2);
  }
  return S(p.circle(cx, cy, r, r, 0.4), cls) + S(ticks, cls) + P(p.circle(cx, cy, r * 0.16, r * 0.16, 0.1), 'a-fg a-se a-w1');
};

/** A rubricated (vermilion) diamond knot used as a corner ornament. */
export const knot = (p, x, y, s = 6) =>
  P(`M${x} ${y - s}L${x + s} ${y}L${x} ${y + s}L${x - s} ${y}Z`, 'a-fv a-sk a-w1') + P(p.circle(x, y, s * 0.3, s * 0.3, 0.05, 6), 'a-fp');

/** Ground line with a few tufts. */
export const ground = (p, y, x0, x1) => S(p.curve([[x0, y], [x0 + (x1 - x0) * 0.3, y - 2], [x0 + (x1 - x0) * 0.7, y + 1], [x1, y - 1]], { amp: 0.6 }), 'a-sk a-w2')
  + S(p.line(x0 + 10, y + 6, x0 + 40, y + 6) + p.line(x1 - 60, y + 9, x1 - 20, y + 9), 'a-sf a-w1');

/** A flame (for pyres, forges, the streak). */
export const flame = (p, cx, base, h, w, cls = 'a-fv a-sk a-w2') => {
  const outer = p.curve([[cx, base - h], [cx + w * 0.4, base - h * 0.55], [cx + w * 0.5, base - h * 0.2], [cx + w * 0.2, base], [cx - w * 0.3, base], [cx - w * 0.5, base - h * 0.25], [cx - w * 0.25, base - h * 0.5], [cx - w * 0.1, base - h * 0.35]], { closed: true, amp: w * 0.02 });
  const inner = p.curve([[cx, base - h * 0.55], [cx + w * 0.2, base - h * 0.2], [cx, base - h * 0.02], [cx - w * 0.2, base - h * 0.2]], { closed: true, amp: w * 0.01 });
  return P(outer, cls) + P(inner, 'a-fg');
};

/** A hollow crown: the Old One badge and the bloodline mark (no real-world symbolism). */
export const crown = (p, cx, cy, w, cls = 'a-fg a-se a-w2') => {
  const h = w * 0.55;
  const d = `M${cx - w / 2} ${cy + h / 2}L${cx - w / 2} ${cy - h / 4}L${cx - w / 4} ${cy}L${cx} ${cy - h / 2}L${cx + w / 4} ${cy}L${cx + w / 2} ${cy - h / 4}L${cx + w / 2} ${cy + h / 2}Z`;
  const hole = `M${cx - w / 3} ${cy + h / 2 - w * 0.08}L${cx - w / 3} ${cy + w * 0.06}L${cx + w / 3} ${cy + w * 0.06}L${cx + w / 3} ${cy + h / 2 - w * 0.08}Z`;
  return `<path d="${d}${hole}" class="${cls}" fill-rule="evenodd"/>` + P(p.circle(cx, cy - h / 2 - w * 0.06, w * 0.07) + p.circle(cx - w / 2, cy - h / 4 - w * 0.06, w * 0.06) + p.circle(cx + w / 2, cy - h / 4 - w * 0.06, w * 0.06), 'a-fg a-se a-w1');
};
