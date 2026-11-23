// Hex terrain tiles (viewBox 0 0 104 120, pointy-top) in the manner of an engraved atlas:
// water-lining, shaded molehill hills, hatched sawtooth mountains, packed tree clumps, stippled sand.
import { P, S, hexD, inPoly } from './lib.mjs';

const HEX = hexD();
const SAFE = hexD(52, 60, 58, 7).pts; // keep motifs inside the tile edge

/** Tile body: flat fill, hand-wobbled straight hex edge, a faint inner rule. */
export const tileBase = (p, fill = 'a-fs') => P(HEX.d, fill) + S(p.poly(hexD(52, 60, 58, 1).pts, 0.3), 'a-sf a-w2');

const inside = (x, y) => inPoly(SAFE, x, y);

// --- motifs -------------------------------------------------------------------
export const tuft = (p, x, y, s = 1, cls = 'a-fk') =>
  P(p.taper(x, y, x - 3.2 * s, y - 5.5 * s, 0.55 * s) + p.taper(x + 0.4 * s, y, x + 0.6 * s, y - 7.5 * s, 0.6 * s) + p.taper(x + 0.8 * s, y, x + 4 * s, y - 5 * s, 0.55 * s), cls);

const hillock = (p, x, y, w, h) => {
  const crest = [x - w * 0.05, y - h];
  const top = p.curve([[x - w / 2, y], [x - w * 0.3, y - h * 0.72], crest, [x + w * 0.22, y - h * 0.8], [x + w / 2, y]], { amp: 0.25 });
  const lee = `M${crest[0]} ${crest[1]}C${x + w * 0.2} ${y - h * 1.02} ${x + w * 0.42} ${y - h * 0.6} ${x + w / 2} ${y}L${x + w * 0.06} ${y}C${x + w * 0.1} ${y - h * 0.4} ${x + w * 0.04} ${y - h * 0.8} ${crest[0]} ${crest[1]}Z`;
  return P(top + 'Z', 'a-fs') + p.hatch(lee, { x: x - w / 2, y: y - h, w, h, angle: 62, gap: 1.9, cls: 'a-sk a-w1', amp: 0.1 })
    + S(top, 'a-sk a-w2');
};

const mountain = (p, x, y, w, h) => {
  const peak = [x + p.R.j(w * 0.05), y - h];
  const left = [[x - w / 2, y], [x - w * 0.3, y - h * 0.45], [x - w * 0.18, y - h * 0.5], peak];
  const right = [peak, [x + w * 0.16, y - h * 0.62], [x + w * 0.24, y - h * 0.5], [x + w / 2, y]];
  const outline = p.curve([...left, ...right.slice(1)], { amp: 0.2 });
  const spur = [peak, [x + w * 0.05, y - h * 0.55], [x - w * 0.02, y - h * 0.25], [x + w * 0.04, y]];
  const shadeClip = `M${peak[0]} ${peak[1]}L${right[1][0]} ${right[1][1]}L${right[2][0]} ${right[2][1]}L${x + w / 2} ${y}L${spur[3][0]} ${y}L${spur[2][0]} ${spur[2][1]}L${spur[1][0]} ${spur[1][1]}Z`;
  return P(outline + 'Z', 'a-fs') + p.hatch(shadeClip, { x: x - w / 2, y: y - h, w, h, angle: 68, gap: 2.9, cls: 'a-sk a-w1', amp: 0.2 })
    + S(p.curve(spur, { amp: 0.2 }), 'a-sk a-w1') + S(outline, 'a-sk a-w2')
    + S(p.line(peak[0] - w * 0.12, peak[1] + h * 0.22, peak[0] - w * 0.05, peak[1] + h * 0.16, 0.1), 'a-sf a-w1');
};

const oak = (p, x, y, s) => {
  const crown = p.curve(p.ringPts(x, y - 8 * s, 6.2 * s, 5.6 * s, 9, 0.9 * s), { closed: true, amp: 0.3 * s });
  const c = p.clip(crown);
  let h = '';
  for (let i = 0; i < 4; i++) h += p.line(x + (1.5 + i * 1.7) * s, y - 14 * s, x + (0.5 + i * 1.7) * s, y - 2 * s, 0);
  return S(p.line(x, y, x, y - 3.5 * s, 0.1), 'a-sk a-w2') + P(crown, 'a-fd') + `<g clip-path="url(#${c})">${S(h, 'a-sk a-w1')}</g>` + S(crown, 'a-sk a-w2');
};

const pine = (p, x, y, s, cls = 'a-fd') => {
  const d = `M${x} ${y - 15 * s}L${x + 3.6 * s} ${y - 8.5 * s}L${x + 2 * s} ${y - 8.5 * s}L${x + 5.4 * s} ${y - 2.5 * s}L${x - 5.4 * s} ${y - 2.5 * s}L${x - 2 * s} ${y - 8.5 * s}L${x - 3.6 * s} ${y - 8.5 * s}Z`;
  return S(p.line(x, y, x, y - 3 * s, 0), 'a-sk a-w2') + P(d, `${cls} a-sk a-w1`) + S(p.line(x + 0.6 * s, y - 13 * s, x + 3.2 * s, y - 3.5 * s, 0.1), 'a-sk a-w1');
};

const waterLines = (p, rows, x0, x1, gap = 3.4, from = 0) => {
  let d = '';
  for (let i = 0; i < rows; i++) {
    const y = from + i * gap;
    const xs = Math.max(x0, x0 + p.R.j(3)), xe = Math.min(x1, x1 + p.R.j(3));
    d += p.line(xs, y + p.R.j(0.3), xe, y + p.R.j(0.3), 0.15);
  }
  return d;
};

const crest = (p, x, y, w = 8) => P(p.taper(x - w / 2, y, x + w / 2, y, 1.1, -1.4), 'a-fl');

// --- tiles ----------------------------------------------------------------------
export const terrain = {
  plains: ['Plains tile', (p) => {
    const field = [[56, 62], [84, 58], [88, 78], [60, 82]];
    let furrows = '';
    for (let i = 1; i < 6; i++) { const t = i / 6; furrows += p.line(56 + 4 * t, 62 + 20 * t, 84 + 4 * t, 58 + 20 * t, 0.25); }
    const tufts = [[26, 44, 1.3], [40, 36, 1], [64, 32, 1.15], [78, 42, 0.95], [22, 68, 1.2], [38, 60, 0.9], [34, 84, 1.25], [52, 94, 1.05], [70, 96, 1.2], [84, 88, 0.9], [46, 72, 1], [60, 46, 0.85]];
    const path = p.curve([[12, 74], [30, 70], [44, 78], [52, 104]], { amp: 0.4 });
    return tileBase(p) + P(p.poly(field, 0.3), 'a-fp') + S(furrows, 'a-sf a-w1') + S(p.poly(field, 0.3), 'a-sk a-w1')
      + `<g stroke-dasharray="1.5 2.5">${S(path, 'a-sf a-w2')}</g>`
      + tufts.map(([x, y, s]) => tuft(p, x, y, s)).join('')
      + S(p.stipple(p.scatter(26, [14, 18, 90, 104], inside)), 'a-sf a-w2');
  }],
  forest: ['Forest tile', (p) => {
    const trees = [];
    for (const [x, y] of [[38, 32], [58, 28], [74, 38], [28, 48], [46, 46], [64, 50], [82, 58], [24, 68], [40, 66], [58, 70], [76, 76], [34, 86], [52, 88], [68, 94]]) {
      trees.push([x + p.R.j(1.5), y + p.R.j(1.5), p.R.next() < 0.4 ? 'pine' : 'oak', 1.05 + p.R.next() * 0.25]);
    }
    trees.sort((a, b) => a[1] - b[1]);
    return tileBase(p) + trees.map(([x, y, kind, s]) => (kind === 'pine' ? pine(p, x, y + 6, s * 1.05) : oak(p, x, y + 6, s))).join('');
  }],
  hills: ['Hills tile', (p) => {
    const hs = [[34, 44, 24, 13], [64, 40, 26, 14], [24, 66, 20, 10], [52, 64, 30, 16], [80, 70, 20, 11], [36, 88, 28, 15], [66, 92, 26, 13]];
    return tileBase(p) + hs.map(([x, y, w, h]) => hillock(p, x, y, w, h)).join('') + tuft(p, 50, 102, 0.8) + tuft(p, 20, 80, 0.7) + tuft(p, 86, 52, 0.7);
  }],
  mountain: ['Mountain tile', (p) => tileBase(p) + mountain(p, 34, 56, 30, 30) + mountain(p, 70, 54, 32, 34) + mountain(p, 52, 80, 44, 48)
    + mountain(p, 28, 92, 26, 22) + mountain(p, 78, 94, 28, 24) + hillock(p, 52, 106, 18, 6)],
  desert: ['Desert tile', (p) => {
    const dune = (x, y, w, h) => {
      const q = (t) => [x - w / 2 + w * t, y - h * Math.sin(Math.PI * Math.pow(t, 0.8))];
      const crestPts = [0, 0.2, 0.4, 0.6, 0.8, 1].map(q);
      const dots = [];
      for (let i = 0; i < w * 1.1; i++) {
        const t = 0.25 + p.R.next() * 0.75;
        const [cx, cy] = q(t);
        const band = h * 0.9 * (1 - Math.abs(t - 0.62) * 1.2);
        dots.push([cx + p.R.j(0.8), cy + 1.2 + Math.pow(p.R.next(), 1.8) * Math.max(1, band)]);
      }
      return S(p.stipple(dots), 'a-sk a-w2') + S(p.curve(crestPts, { amp: 0.25 }), 'a-sk a-w2');
    };
    return tileBase(p) + dune(38, 48, 34, 12) + dune(70, 60, 36, 13) + dune(30, 80, 32, 11) + dune(62, 98, 40, 13) + dune(84, 84, 18, 7)
      + S(p.stipple(p.scatter(40, [14, 18, 90, 104], inside)), 'a-sf a-w2');
  }],
  coast: ['Coast tile', (p) => {
    const shorePts = [[0, 66], [18, 60], [34, 66], [50, 58], [68, 64], [86, 56], [104, 62]];
    const shore = p.curve(shorePts, { amp: 0.4 });
    const c = p.clip(HEX.d);
    let lining = '';
    // water-lining: lines following the shore, spreading apart as they go out to sea
    [2.4, 5.4, 9, 13.5, 19].forEach((off) => { lining += p.curve(shorePts.map(([x, y]) => [x, y + off]), { amp: 0.3 }); });
    const sea = shore.replace(/^M/, 'M') + 'L104 120L0 120Z';
    return tileBase(p) + `<g clip-path="url(#${c})">${P(sea, 'a-fp')}${S(lining, 'a-sl a-w1')}${S(waterLines(p, 6, 10, 94, 4, 88), 'a-sl a-w1')}${S(shore, 'a-sk a-w2')}</g>`
      + crest(p, 34, 98) + crest(p, 64, 104, 7)
      + tuft(p, 30, 44, 1) + tuft(p, 54, 38, 0.9) + tuft(p, 74, 44, 1.05) + tuft(p, 42, 30, 0.8)
      + S(p.stipple(p.scatter(14, [16, 20, 88, 52], inside)), 'a-sf a-w2');
  }],
  water: ['Water tile', (p) => {
    const c = p.clip(HEX.d);
    return tileBase(p, 'a-fp') + `<g clip-path="url(#${c})">${S(waterLines(p, 30, 2, 102, 3.6, 8), 'a-sl a-w1')}</g>`
      + crest(p, 30, 40) + crest(p, 64, 52, 9) + crest(p, 40, 74) + crest(p, 72, 88, 7) + crest(p, 50, 100, 8);
  }],
  swamp: ['Swamp tile', (p) => {
    const pool = (cx, cy, rx, ry) => {
      const d = p.curve(p.ringPts(cx, cy, rx, ry, 10, 1.2), { closed: true, amp: 0.4 });
      const c = p.clip(d);
      return P(d, 'a-fp') + `<g clip-path="url(#${c})">${S(waterLines(p, Math.ceil((ry * 2) / 2.6), cx - rx - 2, cx + rx + 2, 2.6, cy - ry + 1), 'a-sl a-w1')}</g>` + S(d, 'a-sk a-w1');
    };
    const reeds = (x, y, n = 4) => {
      let d = '';
      let heads = '';
      for (let i = 0; i < n; i++) {
        const dx = (i - n / 2) * 1.8, h = 9 + p.R.next() * 6;
        d += p.taper(x + dx, y, x + dx * 1.6 + p.R.j(1), y - h, 0.5);
        if (i % 2 === 0) heads += p.circle(x + dx * 1.6, y - h - 1.5, 0.9, 2.2, 0.05, 6);
      }
      return P(d, 'a-fk') + P(heads, 'a-fk');
    };
    return tileBase(p) + pool(36, 50, 13, 6) + pool(66, 70, 16, 7) + pool(38, 90, 12, 5.5) + pool(74, 98, 8, 4)
      + reeds(24, 54) + reeds(48, 46, 3) + reeds(52, 74, 5) + reeds(82, 66, 3) + reeds(26, 92) + reeds(52, 94, 3) + reeds(64, 104, 3)
      + tuft(p, 70, 40, 0.8, 'a-fd') + tuft(p, 84, 84, 0.8, 'a-fd') + tuft(p, 20, 74, 0.7, 'a-fd');
  }],
  tundra: ['Tundra tile', (p) => {
    let drifts = '';
    for (const [x, y, w] of [[24, 46, 16], [56, 38, 14], [70, 56, 18], [32, 68, 14], [54, 80, 20], [24, 92, 12], [70, 100, 14], [80, 78, 10]]) drifts += p.curve([[x, y], [x + w * 0.4, y - 2.2], [x + w, y]], { amp: 0.2 });
    return tileBase(p, 'a-fp') + S(drifts, 'a-sf a-w2') + pine(p, 44, 58, 0.75, 'a-fs') + pine(p, 50, 60, 0.6, 'a-fs') + pine(p, 78, 94, 0.7, 'a-fs')
      + tuft(p, 34, 48, 0.7, 'a-ff') + tuft(p, 64, 66, 0.7, 'a-ff') + tuft(p, 38, 96, 0.7, 'a-ff') + tuft(p, 66, 40, 0.6, 'a-ff')
      + S(p.stipple(p.scatter(30, [14, 18, 90, 104], inside)), 'a-sf a-w2');
  }],
};
