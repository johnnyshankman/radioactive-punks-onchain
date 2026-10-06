/**
 * JavaScript reference for RadioactivePunksImage.tokenSVG: the same layer
 * selection as the original renderer's JS, stacked into a 24x24 grid and
 * written as one SVG path per color. Tests compare the contract against this
 * byte-for-byte.
 *
 * Usage: node scripts/reference-svg.js <tokenId>
 */
const fs = require('fs');
const path = require('path');
const { parseLayers, readSpritesheet, readTokenOrder } = require('./pack-layer-data');

const BG = '473682';
const ONE_OF_ONES = [698, 2536, 60, 370, 528, 246, 420, 201, 1360, 878];

// the colors the radioactive glow is drawn in: six shared ones, then the own
// glows of one-of-ones 698, 60, 370, 246 and 420
const GLOW_COLORS = [
  '7cff2f', '00f8ff', 'fd8fff', '96ff95', '45ba79', 'ff4830',
  '9aff58', '00d3ff', '00d0ff', '08c3cc', 'ff90fa',
];
const GLOW_STYLE = `<style>${GLOW_COLORS.map((c) => `[fill="#${c}"]`).join(',')}`
  + '{animation:g 2s ease-in-out infinite alternate}@keyframes g{to{opacity:.4}}</style>';

// token ID -> 32 hex chars, from RadioactivePunksBytesHyperstructure's source
function readTraits() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'contracts', 'RadioactivePunksBytesHyperstructure.sol'), 'utf8');
  const all = Buffer.from(src.match(/bytes public constant data = hex'([0-9a-fA-F]*)'/)[1], 'hex');
  const traits = {};
  readTokenOrder().forEach((id, offset) => {
    traits[id] = all.subarray(offset * 15, offset * 15 + 15).toString('hex') + '00';
  });
  return traits;
}

// port of the original renderer's render() layer selection
function layerIds(tokenId, p) {
  if (p === '0'.repeat(32)) return [];
  const b = (i) => parseInt(p.substr(i * 2, 2), 16);
  const s = b(0), a = b(1), d = b(3);
  const ids = [];
  for (let o = 3; o < 16; o++) {
    if (o === 15 || o === 7) continue;
    const n = b(o);
    if (o === 12 && n === 0) continue;
    let e = `${o}-${n}`;
    if (o === 6) {
      const t = b(7);
      if (n === 1) e = `${e}-${t}-${s}`;
      if (n === 2) e = `${e}-${t}`;
    }
    if (o === 13 && n !== 12) e = `${e}-${s}`;
    if (o === 11) e = `${e}-${s}`;
    if (o === 9) e = `${e}-${s}`;
    if (o === 3 && a === 0) e = `${e}-${a}`;
    if (o === 12 && a === 0) e = `${o}-${d}-${a}`;
    else if (o === 12 && a === 1) e = `${o}-${d}`;
    if (o === 10 && n === 4) e = `${e}-${s}`;
    if (o === 14) e = `${o + 1}-${n}`;
    if (ONE_OF_ONES.includes(tokenId)) e = `${tokenId}`;
    ids.push(e);
  }
  return ids;
}

function toSVG(grid) {
  const byColor = new Map();
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24;) {
      const c = grid[y][x];
      let len = 1;
      while (x + len < 24 && grid[y][x + len] === c) len++;
      if (c !== null) byColor.set(c, (byColor.get(c) || '') + `M${x} ${y}h${len}v1h-${len}z`);
      x += len;
    }
  }
  let body = `${GLOW_STYLE}<rect width="24" height="24" fill="#${BG}"/>`;
  for (const [c, d] of byColor) body += `<path fill="#${c}" d="${d}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" shape-rendering="crispEdges">${body}</svg>`;
}

function createReference() {
  const layers = parseLayers(readSpritesheet());
  const traits = readTraits();
  return {
    traits,
    tokenSVG(tokenId) {
      const grid = Array.from({ length: 24 }, () => Array(24).fill(null));
      for (const id of layerIds(tokenId, traits[tokenId])) {
        for (const [k, c] of layers[id] || []) {
          const [x, y] = k.split(',').map(Number);
          grid[y][x] = c;
        }
      }
      return toSVG(grid);
    },
  };
}

module.exports = { createReference, layerIds, GLOW_COLORS, GLOW_STYLE };

if (require.main === module) {
  console.log(createReference().tokenSVG(Number(process.argv[2] || 0)));
}
