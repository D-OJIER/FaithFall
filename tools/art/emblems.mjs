// Domain sigils (96×96, gold on parchment) and species emblems (128×128 medallions, rim by rarity).
import { P, S } from './lib.mjs';
import { crown, flame, star } from './motifs.mjs';

// Gold leaf: flat gold, thin darker edge, a few hatch highlights.
const gold = (p, d, box, angle = 50) => P(d, 'a-fg a-se a-w2') + p.hatch(d, { ...box, angle, gap: 4.5, cls: 'a-se a-w1' });

const roundel = (p) => P(p.circle(48, 48, 45, 45, 0.5), 'a-fp a-sf a-w2') + S(p.circle(48, 48, 40.5, 40.5, 0.4), 'a-sf a-w1');

const sigils = {
  war: ['Domain sigil: War (a spear crossing a round shield)', (p) => {
    const shield = p.circle(42, 54, 22, 22, 0.3);
    const shaft = 'M24 76L74 26L78 30L28 80Z';
    const head = 'M76 24Q76 14 90 6Q84 20 80 28Z';
    return roundel(p) + gold(p, shield, { x: 42, y: 32, w: 22, h: 44 }) + S(p.circle(42, 54, 16, 16, 0.3), 'a-se a-w1') + P(p.circle(42, 54, 5), 'a-fg a-se a-w2')
      + P(shaft, 'a-fg a-se a-w2') + P(head, 'a-fg a-se a-w2') + S(p.line(79, 23, 88, 9, 0), 'a-se a-w1') + P('M70 26L80 36L82 32L74 24Z', 'a-fg a-se a-w1') + P('M21 73L29 81L26 84L18 76Z', 'a-fv a-sk a-w1');
  }],
  harvest: ['Domain sigil: Harvest (a wheat sheaf under a sickle-shaped moon)', (p) => {
    const moon = `M28 26A24 22 0 0 0 68 26A20 14 0 0 1 28 26Z`;
    let stalks = '';
    let grains = '';
    for (let i = -2; i <= 2; i++) {
      stalks += p.curve([[48 + i * 2, 84], [48 + i * 2.5, 64], [48 + i * 7, 44]], { amp: 0.2 });
      for (let k = 0; k < 3; k++) grains += p.circle(48 + i * 7 - 2.2 + k * 0.3, 44 + k * 5, 2, 3.2, 0.1, 6) + p.circle(48 + i * 7 + 2.2 + k * 0.3, 46 + k * 5, 2, 3.2, 0.1, 6);
    }
    return roundel(p) + gold(p, moon, { x: 28, y: 18, w: 40, h: 22 }) + S(stalks, 'a-se a-w3') + S(stalks, 'a-sg a-w1') + P(grains, 'a-fg a-se a-w1')
      + P('M40 68L56 68L57 74L39 74Z', 'a-fv a-sk a-w1');
  }],
  death: ['Domain sigil: Death (a lantern with a moth)', (p) => {
    const body = 'M36 40L60 40L58 76L38 76Z';
    const cap = 'M32 40L48 28L64 40Z';
    const wing = (x, y, s) => p.curve([[x, y], [x + 8 * s, y - 10], [x + 14 * s, y - 6], [x + 9 * s, y + 1], [x + 11 * s, y + 8], [x + 2 * s, y + 5]], { closed: true, amp: 0.2 });
    return roundel(p) + S(p.circle(48, 22, 5, 5, 0.2), 'a-se a-w2') + gold(p, cap, { x: 32, y: 28, w: 32, h: 12 }) + gold(p, body, { x: 50, y: 40, w: 12, h: 36 }, 80)
      + P('M42 46L54 46L53 70L43 70Z', 'a-fp a-se a-w1') + flame(p, 48, 66, 16, 10, 'a-fv a-sk a-w1') + P('M34 76L62 76L60 82L36 82Z', 'a-fg a-se a-w2')
      + P(wing(74, 32, 1) + wing(74, 32, -1), 'a-fg a-se a-w1') + S(p.line(74, 26, 74, 40, 0) + p.line(74, 26, 71, 21, 0) + p.line(74, 26, 77, 21, 0), 'a-sk a-w2') + P(p.circle(82, 30, 1.5) + p.circle(66, 30, 1.5), 'a-fk');
  }],
  sea: ['Domain sigil: Sea (a wave curling around a bell)', (p) => {
    const wave = 'M14 80C12 52 26 26 54 20C74 16 88 30 84 46C81 58 66 60 62 50C59 43 66 38 71 42C70 32 56 30 46 38C34 48 30 64 36 80Z';
    const bell = p.curve([[50, 78], [52, 62], [58, 54], [64, 62], [66, 78], [69, 81], [47, 81]], { closed: true, amp: 0.15 });
    let foam = '';
    for (const [x, y] of [[24, 40], [34, 28], [48, 21], [62, 19], [76, 26]]) foam += p.line(x, y, x + (x - 50) * 0.08, y - 4, 0);
    return roundel(p) + gold(p, wave, { x: 12, y: 16, w: 74, h: 66 }, 40) + S(p.curve([[22, 76], [22, 58], [32, 42], [46, 32]], { amp: 0.2 }), 'a-se a-w1') + S(foam, 'a-se a-w2')
      + gold(p, bell, { x: 58, y: 54, w: 12, h: 28 }, 80) + P(p.circle(58, 84, 3), 'a-fg a-se a-w2') + S(p.line(58, 50, 58, 54, 0), 'a-se a-w2')
      + S(p.line(16, 86, 80, 86, 0.3), 'a-sl a-w2');
  }],
  wisdom: ['Domain sigil: Wisdom (an open eye inside an open book)', (p) => {
    const left = p.curve([[48, 76], [32, 70], [14, 72], [14, 34], [32, 30], [48, 38]], { amp: 0.3 }) + 'Z';
    const right = p.curve([[48, 38], [64, 30], [82, 34], [82, 72], [64, 70], [48, 76]], { amp: 0.3 }) + 'Z';
    const eye = `M28 54Q48 36 68 54Q48 72 28 54Z`;
    return roundel(p) + gold(p, left, { x: 14, y: 30, w: 34, h: 46 }, 30) + gold(p, right, { x: 48, y: 30, w: 34, h: 46 }, 150)
      + P(eye, 'a-fp a-se a-w2') + P(p.circle(48, 54, 7, 7, 0.2), 'a-fl a-sk a-w1') + P(p.circle(48, 54, 2.6), 'a-fk') + star(52, 51, 1.6, 'a-fp')
      + S(p.line(48, 38, 48, 76, 0.2), 'a-se a-w2');
  }],
};

// --- species emblems -------------------------------------------------------------
const RIM = { common: 'k', uncommon: 'd', rare: 'l', epic: 'v' };

const medallion = (p, rarity, scene) => {
  const code = RIM[rarity];
  const field = p.circle(64, 64, 52, 52, 0.3);
  const c = p.clip(field);
  const ring = 'M64 2A62 62 0 1 0 64 126A62 62 0 1 0 64 2ZM64 10A54 54 0 1 1 64 118A54 54 0 1 1 64 10Z';
  let beads = '';
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; beads += p.circle(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58, 1.4, 1.4, 0, 5); }
  return P(field, 'a-fs') + `<g clip-path="url(#${c})">${scene}</g>` + `<path d="${ring}" class="a-f${code}" fill-rule="evenodd"/>`
    + S(p.circle(64, 64, 62, 62, 0.2), 'a-sk a-w2') + S(p.circle(64, 64, 54, 54, 0.2), 'a-sk a-w2') + P(beads, code === 'k' ? 'a-fg' : 'a-fp');
};

const conifer = (p, x, y, h, cls = 'a-fd a-sk a-w1') => P(`M${x} ${y - h}L${x + h * 0.32} ${y - h * 0.45}L${x + h * 0.18} ${y - h * 0.45}L${x + h * 0.4} ${y}L${x - h * 0.4} ${y}L${x - h * 0.18} ${y - h * 0.45}L${x - h * 0.32} ${y - h * 0.45}Z`, cls);

const waves = (p, y0, rows, cls = 'a-sl a-w2') => {
  let d = '';
  for (let r = 0; r < rows; r++) for (let x = 8 + (r % 2) * 8; x < 120; x += 16) d += p.curve([[x, y0 + r * 7], [x + 4, y0 + r * 7 - 3], [x + 8, y0 + r * 7], [x + 12, y0 + r * 7 - 3]], { amp: 0.2 });
  return S(d, cls);
};

const species = {
  humans: ['common', 'Humans: a walled town on a plain', (p) => {
    let crenel = '';
    for (let x = 30; x < 98; x += 8) crenel += `M${x} 70L${x} 64L${x + 4} 64L${x + 4} 70`;
    return P('M8 96L120 96L120 128L8 128Z', 'a-fp') + S(p.curve([[6, 96], [40, 94], [80, 97], [122, 95]], { amp: 0.4 }), 'a-sk a-w2')
      + P('M30 96L30 70L98 70L98 96Z', 'a-fp a-sk a-w2') + S(crenel, 'a-sk a-w2') + P('M22 96L22 56L36 56L36 96Z' + 'M92 96L92 56L106 56L106 96Z', 'a-fp a-sk a-w2')
      + P('M20 56L29 44L38 56Z' + 'M90 56L99 44L108 56Z', 'a-fv a-sk a-w2') + P('M56 96L56 84Q64 74 72 84L72 96Z', 'a-fk')
      + P('M52 70L64 56L76 70Z', 'a-fs a-sk a-w2') + P(p.circle(64, 50, 3), 'a-fg a-se a-w1')
      + S(p.line(12, 108, 40, 108) + p.line(70, 112, 110, 112) + p.line(20, 118, 60, 118), 'a-sf a-w1');
  }],
  tidefolk: ['common', 'Tidefolk: a stilt house over waves, with a bell', (p) => P('M0 82L128 82L128 128L0 128Z', 'a-fp') + waves(p, 86, 5)
    + S(p.line(42, 60, 42, 104, 0.3) + p.line(58, 60, 58, 106, 0.3) + p.line(78, 60, 78, 104, 0.3) + p.line(42, 90, 58, 80, 0.2) + p.line(58, 80, 78, 92, 0.2), 'a-sk a-w2')
    + P('M36 60L36 44L84 44L84 60Z', 'a-fp a-sk a-w2') + P(p.curve([[30, 46], [60, 22], [90, 46]], { amp: 0.4 }) + 'Z', 'a-fs a-sk a-w2')
    + p.hatch(p.curve([[30, 46], [60, 22], [90, 46]], { amp: 0 }) + 'Z', { x: 60, y: 22, w: 30, h: 24, angle: 60, gap: 4 })
    + S(p.line(90, 46, 100, 46, 0), 'a-sk a-w2') + P(p.curve([[94, 62], [95, 52], [100, 48], [105, 52], [106, 62]], { amp: 0.1 }) + 'Z', 'a-fg a-se a-w2') + P(p.circle(100, 64, 2.4), 'a-fg a-se a-w1')
    + P('M54 60L54 52L62 52L62 60Z', 'a-fk')],
  emberkin: ['common', 'Emberkin: a forge flame over dunes', (p) => P('M0 88L128 88L128 128L0 128Z', 'a-fp')
    + S(p.curve([[0, 92], [30, 82], [60, 90], [90, 80], [128, 90]], { amp: 0.5 }) + p.curve([[10, 106], [40, 98], [70, 106], [110, 98]], { amp: 0.5 }), 'a-sk a-w2')
    + P('M40 86L44 74L84 74L88 86Z', 'a-fk') + P('M34 74L94 74L90 66L38 66Z', 'a-ff a-sk a-w2') + flame(p, 64, 66, 48, 36) + star(96, 30, 4) + star(30, 36, 3)],
  duskwings: ['common', 'Duskwings: patterned moth wings around a crescent', (p) => {
    const wing = (s) => p.curve([[64, 64], [64 + 20 * s, 30], [64 + 46 * s, 26], [64 + 50 * s, 50], [64 + 34 * s, 66], [64 + 46 * s, 84], [64 + 36 * s, 104], [64 + 14 * s, 92]], { closed: true, amp: 0.4 });
    const spots = (s) => p.circle(64 + 34 * s, 46, 7, 7, 0.3) + p.circle(64 + 32 * s, 88, 5, 5, 0.3);
    const moon = 'M58 50A15 15 0 1 0 72 76A12 12 0 1 1 58 50Z';
    return P('M0 0L128 0L128 128L0 128Z', 'a-ff') + S(p.line(10, 20, 14, 24, 0) + p.line(110, 110, 114, 114, 0), 'a-sp a-w1') + star(20, 108, 3, 'a-fp') + star(108, 18, 3, 'a-fp')
      + P(wing(1) + wing(-1), 'a-fs a-sk a-w2') + P(spots(1) + spots(-1), 'a-fv a-sk a-w1') + P(p.circle(98, 46, 2.5) + p.circle(30, 46, 2.5), 'a-fk')
      + S(p.curve([[70, 60], [92, 40], [110, 34]], { amp: 0.3 }) + p.curve([[58, 60], [36, 40], [18, 34]], { amp: 0.3 }), 'a-sf a-w1') + P(moon, 'a-fg a-se a-w2');
  }],
  burrowkin: ['common', 'Burrowkin: a round tunnel door with roots', (p) => {
    const hill = p.curve([[0, 60], [30, 44], [70, 38], [100, 44], [128, 56]], { amp: 0.5 });
    let planks = '';
    for (let x = 50; x <= 78; x += 7) planks += p.line(x, 66, x, 106, 0.2);
    return P(hill + 'L128 128L0 128Z', 'a-fp') + S(hill, 'a-sk a-w2') + p.hatch(hill + 'L128 128L0 128Z', { x: 0, y: 40, w: 128, h: 90, angle: 20, gap: 7, cls: 'a-sf a-w1' })
      + P(p.circle(64, 86, 24, 24, 0.4), 'a-fd a-sk a-w3') + S(planks, 'a-sk a-w1') + P(p.circle(74, 88, 3), 'a-fg a-se a-w1')
      + S(p.curve([[30, 54], [26, 66], [32, 78], [24, 90]], { amp: 0.6 }) + p.curve([[98, 52], [104, 64], [98, 74]], { amp: 0.6 }) + p.curve([[52, 40], [48, 50], [54, 58]], { amp: 0.5 }), 'a-sk a-w2')
      + P(p.taper(56, 30, 44, 22, 3) + p.taper(70, 30, 80, 20, 3), 'a-fd a-sk a-w1');
  }],
  fangkin: ['common', 'Fangkin: a wolf-headed totem in a snowy forest', (p) => {
    const head = 'M50 46L46 26L56 36L72 36L82 26L78 46L74 58L64 66L54 58Z';
    let snow = '';
    for (let i = 0; i < 18; i++) snow += p.circle(p.R.range(10, 118), p.R.range(10, 100), 1, 1, 0, 5);
    return conifer(p, 22, 104, 44, 'a-ff a-sk a-w1') + conifer(p, 104, 104, 48, 'a-ff a-sk a-w1') + conifer(p, 36, 112, 30) + conifer(p, 94, 112, 32)
      + P('M0 108L128 108L128 128L0 128Z', 'a-fp') + S(p.curve([[0, 108], [60, 106], [128, 109]], { amp: 0.4 }), 'a-sk a-w2')
      + P('M58 64L58 112L70 112L70 64Z', 'a-ff a-sk a-w2') + S(p.line(58, 80, 70, 80, 0) + p.line(58, 94, 70, 94, 0), 'a-sk a-w1')
      + P(head, 'a-fs a-sk a-w2') + P(p.circle(57, 46, 2) + p.circle(71, 46, 2) + 'M61 56L67 56L64 60Z', 'a-fk') + P('M55 40L50 30L58 36Z' + 'M73 40L78 30L70 36Z', 'a-fv')
      + P(snow, 'a-fp a-sf a-w1');
  }],
  stonebound: ['uncommon', 'Stonebound: a carved hall door in a mountain face, with invented runes', (p) => {
    const mtn = p.curve([[0, 120], [20, 70], [44, 30], [64, 14], [84, 32], [108, 66], [128, 112]], { amp: 0.5 });
    const runes = p.line(46, 52, 50, 46, 0) + p.line(50, 46, 54, 52, 0) + p.line(60, 46, 60, 54, 0) + p.line(60, 50, 64, 46, 0) + p.line(70, 46, 74, 54, 0) + p.line(74, 46, 70, 54, 0) + p.line(78, 50, 82, 50, 0);
    return P(mtn + 'L128 128L0 128Z', 'a-fs') + S(mtn, 'a-sk a-w2') + p.hatch(mtn + 'L128 128L0 128Z', { x: 64, y: 14, w: 64, h: 114, angle: 60, gap: 5 })
      + P('M44 116L44 70Q64 52 84 70L84 116Z', 'a-ff a-sk a-w3') + S(p.line(64, 62, 64, 116, 0.2), 'a-sk a-w2') + S(runes, 'a-sg a-w2')
      + P('M38 116L90 116L92 122L36 122Z', 'a-fp a-sk a-w2') + P(p.circle(58, 92, 2) + p.circle(70, 92, 2), 'a-fg');
  }],
  mirefolk: ['uncommon', 'Mirefolk: a reed temple in a swamp', (p) => {
    let reeds = '';
    for (const x of [14, 20, 104, 112, 118]) reeds += p.curve([[x, 112], [x + p.R.j(2), 90], [x + p.R.j(3), 70]], { amp: 0.3 });
    return P('M0 96L128 96L128 128L0 128Z', 'a-fp') + S(p.line(6, 102, 40, 102) + p.line(60, 108, 100, 108) + p.line(20, 116, 70, 116) + p.line(84, 120, 122, 120), 'a-sl a-w2')
      + S(p.line(44, 76, 42, 104, 0.2) + p.line(84, 76, 86, 104, 0.2) + p.line(64, 76, 64, 106, 0.2), 'a-sk a-w2') + P('M38 76L38 62L90 62L90 76Z', 'a-fp a-sk a-w2')
      + P(p.curve([[32, 64], [50, 40], [64, 14], [78, 40], [96, 64]], { amp: 0.4 }) + 'Z', 'a-fs a-sk a-w2')
      + p.hatch('M32 64L64 14L96 64Z', { x: 30, y: 14, w: 68, h: 52, angle: 90, gap: 5 }) + P('M58 76L58 66L70 66L70 76Z', 'a-fk')
      + S(reeds, 'a-sd a-w2') + P(p.circle(14, 68, 1.6, 4) + p.circle(112, 68, 1.6, 4), 'a-fk') + P(p.curve([[92, 98], [104, 94], [116, 98], [104, 100]], { closed: true, amp: 0.2 }), 'a-fd a-sk a-w1');
  }],
  sylvan: ['rare', 'Sylvan: a living tree-temple', (p) => {
    const canopy = p.curve(p.ringPts(64, 42, 46, 30, 14, 5), { closed: true, amp: 0.8 });
    const trunk = 'M44 120Q50 90 50 60L78 60Q78 90 84 120Z';
    return P(canopy, 'a-fd a-sk a-w2') + p.hatch(canopy, { x: 64, y: 10, w: 50, h: 64, angle: 50, gap: 5 })
      + P('M0 116L128 116L128 128L0 128Z', 'a-fp') + P(trunk, 'a-fs a-sk a-w2') + p.hatch(trunk, { x: 64, y: 60, w: 22, h: 60, angle: 80, gap: 4 })
      + P('M56 120L56 94Q64 82 72 94L72 120Z', 'a-fk') + S(p.curve([[44, 120], [30, 122], [20, 118]], { amp: 0.4 }) + p.curve([[84, 120], [98, 123], [110, 118]], { amp: 0.4 }), 'a-sk a-w2')
      + star(40, 40, 3.5) + star(88, 32, 3) + star(64, 22, 4) + star(76, 52, 2.5);
  }],
  ashborne: ['epic', 'Ashborne: a phoenix-like bird rising from a pyre', (p) => {
    const wing = (s) => p.curve([[64, 58], [64 + 16 * s, 42], [64 + 36 * s, 26], [64 + 50 * s, 22], [64 + 44 * s, 34], [64 + 48 * s, 40], [64 + 36 * s, 48], [64 + 38 * s, 56], [64 + 20 * s, 62]], { closed: true, amp: 0.4 });
    const body = p.curve([[64, 30], [70, 40], [70, 62], [66, 76], [64, 84], [62, 76], [58, 62], [58, 40]], { closed: true, amp: 0.2 });
    const tail = p.curve([[60, 74], [52, 90], [56, 96], [64, 86], [72, 96], [76, 90], [68, 74]], { closed: true, amp: 0.3 });
    return flame(p, 64, 112, 34, 52) + P('M30 112L98 104L100 110L32 118Z' + 'M30 104L98 112L96 118L28 110Z', 'a-ff a-sk a-w2')
      + P(wing(1) + wing(-1), 'a-fg a-se a-w2') + S(p.line(82, 40, 100, 30, 0.2) + p.line(46, 40, 28, 30, 0.2) + p.line(84, 50, 100, 44, 0.2) + p.line(44, 50, 28, 44, 0.2), 'a-se a-w1')
      + P(tail, 'a-fv a-sk a-w1') + P(body, 'a-fv a-sk a-w2') + P('M64 30L70 24L68 32Z', 'a-fg a-se a-w1') + P(p.circle(65, 36, 1.4), 'a-fk');
  }],
};

export const assets = [
  ...Object.entries(sigils).map(([k, [t, f]]) => ({ dir: 'sigils', file: k, title: t, vb: '0 0 96 96', draw: f, small: 32 })),
  ...Object.entries(species).map(([k, [rarity, t, scene]]) => ({ dir: 'species', file: k, title: `Species emblem: ${t}`, vb: '0 0 128 128', draw: (p) => medallion(p, rarity, scene(p)), small: 32 })),
];
void crown;
