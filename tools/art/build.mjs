// Builds the Faithfall art kit into art/: node tools/art/build.mjs
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTE, pen, svgDoc } from './lib.mjs';
import { mapAssets } from './map.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'art');
const modules = [mapAssets];
for (const m of ['cards', 'emblems', 'ui', 'scenes']) {
  try {
    modules.push((await import(`./${m}.mjs`)).assets);
  } catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
  }
}
const assets = modules.flat();

const built = [];
const problems = [];
for (const a of assets) {
  const name = `${a.dir === 'terrain' ? 'terrain' : a.dir}-${a.file}`.replace(/[^a-z0-9-]/g, '-');
  const p = pen(name);
  const body = a.draw(p);
  const svg = a.raw ? body : svgDoc(p, a.title, a.vb, body, a.style ?? '');
  const path = join(ROOT, a.dir, `${a.file}.svg`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, svg);
  const kb = Buffer.byteLength(svg) / 1024;
  if (kb > 12.5 && !a.big) problems.push(`${a.dir}/${a.file}.svg is ${kb.toFixed(1)} KB`);
  if (svg.includes('undefined') || svg.includes('NaN')) problems.push(`${a.dir}/${a.file}.svg contains undefined/NaN`);
  for (const m of svg.matchAll(/id="([^"]+)"/g)) if (!m[1].startsWith(name)) problems.push(`${a.dir}/${a.file}.svg id ${m[1]} not prefixed`);
  built.push({ ...a, name, svg, kb });
}

// tokens.css
const tokens = `/* Faithfall palette and type. Change a colour here and every asset follows. */
:root {
${Object.entries(PALETTE).map(([k, v]) => `  --${k}: ${v};`).join('\n')}
  --font-display: 'IM Fell English', 'Palatino Linotype', Georgia, serif;
  --font-body: 'Alegreya', Georgia, serif;
  /* rarity */
  --rarity-common: var(--ink);
  --rarity-uncommon: var(--verdigris);
  --rarity-rare: var(--lapis);
  --rarity-epic: var(--vermilion);
  --rarity-legendary: var(--gold);
}
@font-face { font-family: 'IM Fell English'; src: url('fonts/im-fell-english-regular.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
@font-face { font-family: 'IM Fell English'; src: url('fonts/im-fell-english-italic.woff2') format('woff2'); font-weight: 400; font-style: italic; font-display: swap; }
@font-face { font-family: 'Alegreya'; src: url('fonts/alegreya-variable.woff2') format('woff2'); font-weight: 400 900; font-style: normal; font-display: swap; }
@font-face { font-family: 'Alegreya'; src: url('fonts/alegreya-italic-variable.woff2') format('woff2'); font-weight: 400 900; font-style: italic; font-display: swap; }
`;
writeFileSync(join(ROOT, 'tokens.css'), tokens);

// gallery.html: every asset inlined (so tokens.css drives the colours) at 1x and small size.
const inline = (svg, cls) => svg.replace('<svg ', `<svg class="${cls}" `);
const groups = new Map();
for (const b of built) groups.set(b.dir, [...(groups.get(b.dir) ?? []), b]);
const terrainBase = (b) => built.find((x) => x.dir === 'terrain' && x.file === b.under);
const tile = (b) => {
  const under = b.under ? terrainBase(b) : null;
  const stack = (cls) => under
    ? `<span class="stack ${cls}">${inline(under.svg.replace(/id="([^"]+)"/g, `id="$1-u${cls}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-u${cls})`), 'layer')}${inline(b.svg.replace(/id="([^"]+)"/g, `id="$1-${cls}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${cls})`), 'layer')}</span>`
    : inline(b.svg.replace(/id="([^"]+)"/g, `id="$1-${cls}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${cls})`), cls);
  return `<figure><div class="big">${stack('big')}</div><div class="small" style="--s:${b.small ?? 32}px">${stack('sm')}</div><figcaption>${b.dir}/${b.file}.svg<br><span>${b.kb.toFixed(1)} KB</span></figcaption></figure>`;
};
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Faithfall Art Kit</title>
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="animations/animations.css">
<style>
  body { margin: 0; padding: 16px; background: var(--parchment); color: var(--ink); font-family: var(--font-body); }
  h1 { font-family: var(--font-display); font-weight: 400; font-size: 34px; margin: 0 0 4px; }
  h2 { font-family: var(--font-display); font-weight: 400; font-size: 24px; margin: 28px 0 8px; border-bottom: 1.5px solid var(--ink-faded); }
  h2::first-letter { color: var(--vermilion); }
  .grid { display: flex; flex-wrap: wrap; gap: 14px; }
  figure { margin: 0; width: 180px; display: flex; flex-direction: column; gap: 6px; }
  .big svg, .big .stack { width: 100%; height: auto; max-height: 220px; display: block; }
  .small { height: var(--s); }
  .small svg, .small .stack { width: var(--s); height: var(--s); display: block; }
  .stack { position: relative; display: block; aspect-ratio: 104 / 120; }
  .small .stack { aspect-ratio: auto; }
  .stack .layer { position: absolute; inset: 0; width: 100%; height: 100%; }
  figcaption { font-size: 12px; color: var(--ink-faded); }
  .swatches { display: flex; flex-wrap: wrap; gap: 8px; }
  .sw { width: 120px; font-size: 12px; } .sw div { height: 36px; border: 1px solid var(--ink-faded); }
  .wide figure { width: 340px; }
</style>
</head>
<body>
<h1>Faithfall Art Kit</h1>
<p>Illuminated manuscript map. Every asset is code-drawn SVG; colours come from <code>tokens.css</code>. Each asset is shown at full size and at its small test size.</p>
<h2>Palette</h2>
<div class="swatches">${Object.keys(PALETTE).map((k) => `<div class="sw"><div style="background:var(--${k})"></div>--${k}</div>`).join('')}</div>
<p style="font-family:var(--font-display);font-size:22px">IM Fell English: The Fall of Ostra</p>
<p>Alegreya: In Year 1,240 the Tidefolk of Ostra raised the Drowned Bell, carved with the words “Every shore belongs to the tide.”</p>
${[...groups].map(([dir, list]) => `<h2>${dir}</h2><div class="grid ${['frames', 'evil-one', 'logo', 'animations'].includes(dir) ? 'wide' : ''}">${list.map(tile).join('')}</div>`).join('\n')}
</body>
</html>
`;
writeFileSync(join(ROOT, 'gallery.html'), html);

// Ship the kit with the game: Vite copies public/ into the post bundle (served at /art/...).
const PUBLIC_ART = join(ROOT, '..', 'public', 'art');
rmSync(PUBLIC_ART, { recursive: true, force: true });
cpSync(ROOT, PUBLIC_ART, { recursive: true, filter: (src) => !src.endsWith('gallery.html') && !src.endsWith('.txt') });

console.log(`built ${built.length} assets, total ${built.reduce((a, b) => a + b.kb, 0).toFixed(0)} KB`);
if (problems.length) {
  console.log(problems.join('\n'));
  process.exitCode = 1;
}
void readFileSync;
