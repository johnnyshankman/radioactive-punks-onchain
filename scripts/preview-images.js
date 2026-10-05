/**
 * Renders a sample of punks through RadioactivePunksImage on a local Hardhat
 * network and writes preview/index.html (git-ignored), a gallery for eyeballing
 * the glow animation the way wallets and marketplaces embed it: as
 * <img src="data:image/svg+xml;base64,...">.
 *
 * Each punk is shown two ways:
 *   static  the contract's SVG with the <style> removed (first frame)
 *   pulse   the contract's SVG as is
 *
 * Usage: npx hardhat run scripts/preview-images.js
 */
const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');
const { createReference, GLOW_STYLE } = require('./reference-svg');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'preview');

const ONE_OF_ONES = [698, 2536, 60, 370, 528, 246, 420, 201, 1360, 878];

function readGlowNames() {
  const src = fs.readFileSync(path.join(ROOT, 'contracts', 'RadioactivePunksRenderer.sol'), 'utf8');
  return src.match(/string\[\] public RADIOACTIVE_GLOW = \[([^\]]*)\]/)[1].match(/'([^']*)'/g).map((s) => s.slice(1, -1));
}

// a few punks for each glow, then punks that show off the other glowing layers
function pickTokens(traits) {
  const ids = Object.keys(traits).map(Number).filter((id) => !ONE_OF_ONES.includes(id));
  const b = (id, i) => parseInt(traits[id].substr(i * 2, 2), 16);
  const glowNames = readGlowNames();
  const picks = [];
  const used = new Set();
  const add = (label, id) => {
    if (id === undefined || used.has(id)) return;
    used.add(id);
    picks.push({ id, label });
  };

  glowNames.forEach((name, g) => {
    const withGlow = ids.filter((id) => b(id, 0) === g);
    add(name, withGlow.find((id) => b(id, 1) === 1));
    add(`${name}, dead`, withGlow.find((id) => b(id, 1) === 0));
  });
  add('horns', ids.find((id) => b(id, 12) !== 0 && b(id, 1) === 1));
  add('horns, dead', ids.find((id) => b(id, 12) !== 0 && b(id, 1) === 0));
  add('glowing beard', ids.find((id) => b(id, 6) === 1));
  add('glowing nose', ids.find((id) => b(id, 10) === 4));
  add('smoke', ids.find((id) => b(id, 13) !== 0 && b(id, 13) !== 12));
  for (const id of [1665, 2792, 1445]) add('rainbow head', id);
  for (const id of ONE_OF_ONES) add('one-of-one', id);
  return picks;
}

const dataURI = (svg) => 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');

function page(cards) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Glow Preview</title>
<style>
  :root { --bg: #15112b; --card: #211b42; --text: #ece9ff; --muted: #a49cd6; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px 16px; background: var(--bg); color: var(--text); font: 14px/1.4 ui-monospace, Menlo, monospace; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { color: var(--muted); margin: 0 0 16px; }
  .controls { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
  button { background: var(--card); color: var(--text); border: 1px solid #3b3272; border-radius: 6px; padding: 6px 10px; font: inherit; cursor: pointer; }
  button[aria-pressed="true"] { background: #473682; border-color: #7a66d9; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, calc(var(--size) * 2 + 40px)), 1fr)); gap: 16px; }
  .card { background: var(--card); border-radius: 10px; padding: 12px; }
  .card h2 { font-size: 13px; margin: 0 0 8px; font-weight: 600; }
  .card h2 span { color: var(--muted); font-weight: 400; }
  .row { display: flex; gap: 8px; }
  figure { margin: 0; text-align: center; color: var(--muted); font-size: 11px; }
  img { display: block; width: var(--size); height: var(--size); image-rendering: pixelated; margin-bottom: 4px; }
</style>
</head>
<body style="--size: 128px">
<h1>Radioactive Punks glow preview</h1>
<p>Rendered by RadioactivePunksImage on a local Hardhat network. "Pulse" is the contract's output; "static" is its first frame, as a still snapshot would show it.</p>
<div class="controls">
  ${[48, 96, 128, 256].map((s) => `<button data-size="${s}" aria-pressed="${s === 128}">${s}px</button>`).join('')}
</div>
<div class="grid">
${cards}
</div>
<script>
  for (const b of document.querySelectorAll('[data-size]')) {
    b.onclick = () => {
      document.body.style.setProperty('--size', b.dataset.size + 'px');
      for (const o of document.querySelectorAll('[data-size]')) o.setAttribute('aria-pressed', o === b);
    };
  }
</script>
</body>
</html>
`;
}

async function main() {
  const deploy = async (name, ...args) => {
    const contract = await (await ethers.getContractFactory(name)).deploy(...args);
    await contract.deployed();
    return contract;
  };
  const traits = await deploy('RadioactivePunksBytesHyperstructure');
  const data1 = await deploy('RadioactivePunksLayerData1');
  const data2 = await deploy('RadioactivePunksLayerData2');
  const image = await deploy('RadioactivePunksImage', traits.address, data1.address, data2.address);

  const picks = pickTokens(createReference().traits);
  const cards = [];
  for (const { id, label } of picks) {
    const svg = await image.tokenSVG(id);
    if (!svg.includes(GLOW_STYLE)) throw new Error(`token ${id}: contract SVG has no glow style`);
    const variants = [
      ['static', svg.replace(GLOW_STYLE, '')],
      ['pulse', svg],
    ];
    cards.push(`<div class="card"><h2>#${id} <span>${label}</span></h2><div class="row">${variants
      .map(([name, s]) => `<figure><img src="${dataURI(s)}" alt="Punk #${id}, ${name}">${name}</figure>`)
      .join('')}</div></div>`);
  }

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'index.html');
  fs.writeFileSync(file, page(cards.join('\n')));
  console.log(`Wrote ${picks.length} punks to ${path.relative(ROOT, file)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
