// Drawing primitives for the Faithfall art kit: seeded "hand" irregularity, ink strokes, hatching.
// Every asset is emitted as clean SVG whose colours resolve to the palette CSS variables.

export const PALETTE = {
  parchment: '#F3E9D2',
  'parchment-shade': '#E6D5B0',
  ink: '#2B2118',
  'ink-faded': '#6B5A45',
  gold: '#C9A227',
  'gold-edge': '#8C6D12',
  vermilion: '#A8322D',
  verdigris: '#4E7D6B',
  lapis: '#2E4A7D',
  corruption: '#4B1D52',
  'corruption-bright': '#8E3FA0',
};

// Short colour codes used in class names: a-s<code> = stroke, a-f<code> = fill.
const CODES = {
  p: 'parchment', s: 'parchment-shade', k: 'ink', f: 'ink-faded', g: 'gold', e: 'gold-edge',
  v: 'vermilion', d: 'verdigris', l: 'lapis', c: 'corruption', b: 'corruption-bright',
};

const classCss = (cls) => {
  let m = /^a-s([a-z])$/.exec(cls);
  if (m && CODES[m[1]]) return `.${cls}{stroke:var(--${CODES[m[1]]},${PALETTE[CODES[m[1]]]})}`;
  m = /^a-f([a-z])$/.exec(cls);
  if (m && CODES[m[1]]) return `.${cls}{fill:var(--${CODES[m[1]]},${PALETTE[CODES[m[1]]]})}`;
  if (cls === 'a-n') return '.a-n{fill:none}';
  if (cls === 'a-w1') return '.a-w1{stroke-width:1}';
  if (cls === 'a-w2') return '.a-w2{stroke-width:1.5}';
  if (cls === 'a-w3') return '.a-w3{stroke-width:2.5}';
  if (cls === 'a-w4') return '.a-w4{stroke-width:4}';
  return null;
};

/** Seeded random generator (mulberry32) so a file always redraws the same. */
export const rng = (seed) => {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let s = h >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, j: (a) => (next() * 2 - 1) * a, pick: (arr) => arr[Math.floor(next() * arr.length)], range: (a, b) => a + next() * (b - a) };
};

const n = (v) => (Math.round(v * 10) / 10).toString();

/** A drawing context bound to one file: unique id prefix and its own seeded hand. */
export const pen = (name) => {
  const R = rng(name);
  let idc = 0;
  const defs = [];
  const id = (k) => `${name}-${k}-${++idc}`;

  /** Smooth path through points (Catmull-Rom → cubic), optionally closed, with hand jitter. */
  const curve = (pts, { closed = false, amp = 0.6 } = {}) => {
    const p = pts.map(([x, y]) => [x + R.j(amp), y + R.j(amp)]);
    if (p.length < 2) return '';
    const get = (i) => (closed ? p[(i + p.length) % p.length] : p[Math.max(0, Math.min(p.length - 1, i))]);
    let d = `M${n(p[0][0])} ${n(p[0][1])}`;
    const last = closed ? p.length : p.length - 1;
    for (let i = 0; i < last; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`;
    }
    return closed ? d + 'Z' : d;
  };

  /** A slightly wobbling straight line. */
  const line = (x1, y1, x2, y2, amp = 0.5) => {
    if (amp === 0) return `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const segs = Math.max(1, Math.round(len / 14));
    const nx = -(y2 - y1) / (len || 1), ny = (x2 - x1) / (len || 1);
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const w = i === 0 || i === segs ? 0 : R.j(amp);
      pts.push([x1 + (x2 - x1) * t + nx * w, y1 + (y2 - y1) * t + ny * w]);
    }
    return segs === 1 ? `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}` : curve(pts, { amp: 0 });
  };

  /** Points of a hand-drawn closed ring. */
  const ringPts = (cx, cy, rx, ry = rx, count = 14, amp = 0.8, rot = 0) => {
    const pts = [];
    for (let i = 0; i < count; i++) {
      const a = rot + (i / count) * Math.PI * 2;
      const k = 1 + R.j(amp / Math.max(rx, 1));
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return pts;
  };
  const circle = (cx, cy, rx, ry = rx, amp = 0.6, count) => {
    // small circles: a plain two-arc ellipse (tiny, crisp); larger ones get the hand wobble
    if (rx <= 4.5 && ry <= 4.5) {
      const kx = rx * (1 + R.j(0.04)), ky = ry * (1 + R.j(0.04));
      return `M${n(cx - kx)} ${n(cy)}a${n(kx)} ${n(ky)} 0 1 0 ${n(kx * 2)} 0a${n(kx)} ${n(ky)} 0 1 0 ${n(-kx * 2)} 0Z`;
    }
    return curve(ringPts(cx, cy, rx, ry, count ?? Math.max(8, Math.round(rx / 2.5)), amp), { closed: true, amp: 0 });
  };

  /** A tapered ink stroke drawn as a filled lens (thick in the middle, fine at the ends). */
  const taper = (x1, y1, x2, y2, w = 1.4, bend = 0) => {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
    const b = bend + R.j(0.4);
    return `M${n(x1)} ${n(y1)}Q${n(mx + nx * (w + b))} ${n(my + ny * (w + b))} ${n(x2)} ${n(y2)}Q${n(mx + nx * (-w + b))} ${n(my + ny * (-w + b))} ${n(x1)} ${n(y1)}Z`;
  };

  /** A closed polygon with hand-wobbled straight edges (keeps its corners). */
  const poly = (pts, amp = 0.5) => {
    let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      d += line(a[0], a[1], b[0], b[1], amp).replace(/^M[^LC]+/, '');
    }
    return d + 'Z';
  };

  /** Stipple dots as zero-length round-capped strokes (cheap): pass [x, y] points. */
  const stipple = (pts) => pts.map(([x, y]) => `M${n(x)} ${n(y)}h.1`).join('');

  /** Random points inside a polygon (rejection sampling), optionally denser toward a side. */
  const scatter = (count, box, inside = () => true) => {
    const out = [];
    for (let tries = 0; out.length < count && tries < count * 40; tries++) {
      const x = box[0] + R.next() * (box[2] - box[0]), y = box[1] + R.next() * (box[3] - box[1]);
      if (inside(x, y)) out.push([x, y]);
    }
    return out;
  };

  /** Register a clip path; returns its id. */
  const clip = (d) => {
    const cid = id('clip');
    defs.push(`<clipPath id="${cid}"><path d="${d}"/></clipPath>`);
    return cid;
  };

  /** Parallel hatching lines across a box, clipped to a path. */
  const hatch = (clipD, { x = 0, y = 0, w = 100, h = 100, angle = 45, gap = 4, cls = 'a-sk a-w1', amp = 0.4 } = {}) => {
    const cid = clip(clipD);
    const a = (angle * Math.PI) / 180;
    const cx = x + w / 2, cy = y + h / 2;
    const L = Math.hypot(w, h);
    const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
    let d = '';
    for (let o = -L / 2; o <= L / 2; o += gap) {
      const sx = cx + vx * o - ux * L / 2, sy = cy + vy * o - uy * L / 2;
      const k = amp ? R.j(amp) : 0;
      d += `M${n(sx)} ${n(sy + k)}L${n(sx + ux * L)} ${n(sy + uy * L - k)}`;
    }
    return `<g clip-path="url(#${cid})"><path d="${d}" class="${cls} a-n"/></g>`;
  };

  return { R, id, curve, line, ringPts, circle, taper, clip, hatch, defs, poly, stipple, scatter };
};

export const P = (d, cls) => `<path d="${d}" class="${cls}"/>`;
export const S = (d, cls = 'a-sk a-w2') => `<path d="${d}" class="${cls} a-n"/>`;

/** Pointy-top hexagon points for the 104×120 tile. */
export const hexD = (cx = 52, cy = 60, r = 58, inset = 0) => {
  const rr = r - inset;
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return { pts, d: 'M' + pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L') + 'Z' };
};

/** Wrap drawing into a standalone SVG document with only the palette classes it uses. */
export const svgDoc = (pn, title, viewBox, body, extraStyle = '') => {
  const classes = new Set();
  for (const m of body.matchAll(/class="([^"]+)"/g)) m[1].split(/\s+/).forEach((c) => classes.add(c));
  const css = [...classes].map(classCss).filter(Boolean).sort().join('');
  const defs = pn.defs.length ? `<defs>${pn.defs.join('')}</defs>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" stroke-linecap="round" stroke-linejoin="round" role="img"><title>${title}</title><style>${css}${extraStyle}</style>${defs}${body}</svg>\n`;
};

export const fmt = n;

/** Is (x, y) inside a convex/simple polygon? */
export const inPoly = (pts, x, y) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
