/**
 * Writes preview/bitmap.html (git-ignored): the current path-based SVG next to
 * the bitmap prototypes from scripts/bitmap-svg.js, embedded the way wallets
 * and marketplaces embed them (<img src="data:image/svg+xml;base64,...">), at
 * sizes that are not multiples of 24 so seams and scaling blur show up.
 *
 * Usage: node scripts/preview-bitmap.js
 */
const fs = require('fs');
const path = require('path');
const { createReference, layerIds } = require('./reference-svg');
const { toBitmapSVG, FORMATS } = require('./bitmap-svg');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'preview');
const ONE_OF_ONES = [698, 2536, 60, 370, 528, 246, 420, 201, 1360, 878];

function pickTokens(ref) {
  const ids = Object.keys(ref.traits).map(Number).filter((id) => !ONE_OF_ONES.includes(id));
  const has = (id, f) => layerIds(id, ref.traits[id]).some(f);
  const picks = [];
  const add = (label, list, n) => {
    for (const id of list.filter((i) => !picks.some((p) => p.id === i)).slice(0, n)) picks.push({ id, label });
  };
  add('red head, clown nose', ids.filter((id) => has(id, (l) => l === '10-0') && has(id, (l) => l.startsWith('3-6'))), 4);
  add('clown nose', ids.filter((id) => has(id, (l) => l === '10-0')), 4);
  add('red head', ids.filter((id) => has(id, (l) => l.startsWith('3-6'))), 2);
  add('glowing nose', ids.filter((id) => has(id, (l) => /^10-4-/.test(l))), 1);
  add('smoke', ids.filter((id) => has(id, (l) => /^13-/.test(l))), 1);
  add('rainbow head', [1665, 2792], 2);
  for (const id of [698, 528, 420]) picks.push({ id, label: 'one-of-one' });
  return picks;
}

const dataURI = (svg) => 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');

function page(cards) {
  const sizes = [50, 97, 133, 177, 250, 301];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bitmap Prototype</title>
<style>
  :root { --bg: #15112b; --card: #211b42; --text: #ece9ff; --muted: #a49cd6; --edge: #3b3272; }
  body.light { --bg: #ffffff; --card: #f1f0f6; --text: #1b1733; --muted: #5d5880; --edge: #cfcbe3; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px 16px; background: var(--bg); color: var(--text); font: 14px/1.4 ui-monospace, Menlo, monospace; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { color: var(--muted); margin: 0 0 16px; max-width: 80ch; }
  .controls { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 20px; }
  button { background: var(--card); color: var(--text); border: 1px solid var(--edge); border-radius: 6px; padding: 6px 10px; font: inherit; cursor: pointer; }
  button[aria-pressed="true"] { background: #473682; border-color: #7a66d9; color: #fff; }
  label { display: flex; gap: 6px; align-items: center; color: var(--muted); }
  .card { background: var(--card); border-radius: 10px; padding: 12px; margin-bottom: 16px; overflow-x: auto; }
  .card h2 { font-size: 13px; margin: 0 0 8px; font-weight: 600; }
  .card h2 span { color: var(--muted); font-weight: 400; }
  .row { display: flex; gap: 12px; }
  figure { margin: 0; text-align: center; color: var(--muted); font-size: 11px; }
  img { display: block; width: var(--size); height: var(--size); margin-bottom: 4px; }
</style>
</head>
<body style="--size: 133px">
<h1>Bitmap prototype</h1>
<p>"paths" is the current RadioactivePunksImage output. The others wrap a 24x24 bitmap, with the glow drawn on top either as paths or as a second, transparent bitmap. Sizes are deliberately not multiples of 24. Look for purple lines at the ear lobe and clown nose, and for blur.</p>
<div class="controls">
  ${sizes.map((s) => `<button data-size="${s}" aria-pressed="${s === 133}">${s}px</button>`).join('')}
  <label>custom <input id="custom" type="range" min="24" max="480" value="133"><span id="customValue">133</span></label>
  <button id="freeze" aria-pressed="false">freeze glow</button>
  <button id="light" aria-pressed="false">light page</button>
</div>
${cards}
<script>
  const setSize = (s) => {
    document.body.style.setProperty('--size', s + 'px');
    for (const o of document.querySelectorAll('[data-size]')) o.setAttribute('aria-pressed', o.dataset.size == s);
    custom.value = s; customValue.textContent = s;
  };
  for (const b of document.querySelectorAll('[data-size]')) b.onclick = () => setSize(b.dataset.size);
  custom.oninput = () => setSize(custom.value);
  const toggle = (b, fn) => { b.onclick = () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); fn(on); }; };
  toggle(freeze, (on) => { for (const i of document.querySelectorAll('img')) i.src = on ? i.dataset.static : i.dataset.pulse; });
  toggle(light, (on) => document.body.classList.toggle('light', on));
</script>
</body>
</html>
`;
}

function main() {
  const ref = createReference();
  const picks = pickTokens(ref);
  const totals = {};
  const cards = picks.map(({ id, label }) => {
    const grid = ref.tokenGrid(id);
    const variants = [['paths', ref.tokenSVG(id)], ...Object.keys(FORMATS).map((f) => [f, toBitmapSVG(grid, f)])];
    return `<div class="card"><h2>#${id} <span>${label}</span></h2><div class="row">${variants.map(([name, svg]) => {
      (totals[name] = totals[name] || []).push(svg.length);
      return `<figure><img src="${dataURI(svg)}" data-pulse="${dataURI(svg)}" data-static="${dataURI(svg.replace(/<style>.*?<\/style>/, ''))}" alt="Punk #${id}, ${name}">${name} · ${svg.length} B</figure>`;
    }).join('')}</div></div>`;
  });

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'bitmap.html');
  fs.writeFileSync(file, page(cards.join('\n')));
  console.log(`Wrote ${picks.length} punks to ${path.relative(ROOT, file)}`);
  for (const [name, lens] of Object.entries(totals)) {
    console.log(`  ${name.padEnd(6)} avg ${Math.round(lens.reduce((a, b) => a + b) / lens.length)} B, max ${Math.max(...lens)} B`);
  }
}

main();
