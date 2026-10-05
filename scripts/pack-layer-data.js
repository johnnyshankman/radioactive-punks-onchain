/**
 * Packs the Radioactive Punks layer art into compact bytes for
 * RadioactivePunksImage and writes the RadioactivePunksLayerData chunk
 * contracts.
 *
 * Source of truth is the same gzipped SVG spritesheet the on-chain renderer
 * ships (RadioactivePunksSVGChunk1 + 2), so the packed data is derived from
 * what's already on-chain rather than from loose files.
 *
 * Blob layout (all integers big-endian):
 *
 *   u16 colorCount, then colorCount x 3-byte RGB
 *   u16 layerCount, then layerCount x 8-byte index entries sorted by key:
 *       u32 key, u16 firstRun, u16 runCount
 *   u16 tokenCount, then tokenCount x u16 token ID, in hyperstructure order
 *       (position = offset into RadioactivePunksBytesHyperstructure)
 *   runs, 3 bytes each: x:5 | y:5 | length:5 | colorIndex:9
 *
 * A layer key packs the dash-separated parts of a layer id ("9-3-1") into
 * four bytes, 0xFF for missing parts. One-of-one layers (ids that are a
 * token ID, e.g. "698") use 0xFE in the top byte and the token ID below.
 *
 * Usage: node scripts/pack-layer-data.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const CONTRACTS = path.join(ROOT, 'contracts');
const CHUNK_SIZE = 24000; // plus the STOP byte, under the 24,576 byte code size limit

function readSpritesheet() {
  const b64 = ['RadioactivePunksSVGChunk1.sol', 'RadioactivePunksSVGChunk2.sol']
    .map((f) => fs.readFileSync(path.join(CONTRACTS, f), 'utf8').match(/string public constant data = "([^"]*)"/)[1])
    .join('');
  return zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
}

function readTokenOrder() {
  const src = fs.readFileSync(path.join(CONTRACTS, 'RadioactivePunksRenderer.sol'), 'utf8');
  return src.match(/uint16\[1614\] private TOKEN_ID_TO_BYTES_LOOKUP = \[([^\]]*)\]/)[1].match(/\d+/g).map(Number);
}

// The original art's background color. The one-of-one layers paint it as a
// full-canvas rectangle; RadioactivePunksImage draws its own background, so
// that rectangle is skipped.
const ART_BACKGROUND = '1f2e3d';

// id -> Map("x,y" -> "rrggbb"); later paths win, attributes in any order.
// Every closed subpath in the art is an axis-aligned rectangle (1x1 pixels,
// plus the one-of-ones' 24x24 background); each one fills the cells it covers.
function parseLayers(svg) {
  const layers = {};
  const tok = /([MmHhVvZz])|(-?\d+(?:\.\d+)?)/g;
  for (const [, id, body] of svg.matchAll(/<symbol[^>]*id="([^"]+)"[^>]*>(.*?)<\/symbol>/gs)) {
    const px = new Map();
    for (const [tag] of body.matchAll(/<path\b[^>]*>/g)) {
      const fill = (tag.match(/\sfill="([^"]+)"/) || [, '#000'])[1];
      const d = tag.match(/\sd="([^"]+)"/)[1];
      let hex = fill.slice(1).toLowerCase();
      if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
      if (!/^[0-9a-f]{6}$/.test(hex)) throw new Error(`unsupported fill ${fill} in ${id}`);

      const fillRect = (points) => {
        const xs = points.map((p) => p[0]);
        const ys = points.map((p) => p[1]);
        const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        const isRect = points.length === 4
          && points.every(([x, y]) => (x === x0 || x === x1) && (y === y0 || y === y1))
          && new Set(points.map((p) => p.join())).size === 4;
        if (!isRect) throw new Error(`non-rectangular subpath in ${id}: ${JSON.stringify(points)}`);
        if (hex === ART_BACKGROUND && x0 === 0 && y0 === 0 && x1 === 24 && y1 === 24) return;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px.set(`${x},${y}`, hex);
      };

      const toks = [...d.matchAll(tok)].map((m) => m[1] || Number(m[2]));
      let x = 0, y = 0, cmd = null, points = [];
      for (let i = 0; i < toks.length;) {
        if (typeof toks[i] === 'string') cmd = toks[i++];
        if (cmd === 'Z' || cmd === 'z') { fillRect(points); x = points[0][0]; y = points[0][1]; points = []; continue; }
        if (cmd === 'M') { x = toks[i]; y = toks[i + 1]; i += 2; points = [[x, y]]; cmd = 'L'; continue; }
        if (cmd === 'm') { x += toks[i]; y += toks[i + 1]; i += 2; points = [[x, y]]; cmd = 'l'; continue; }
        if (cmd === 'h') x += toks[i++];
        else if (cmd === 'H') x = toks[i++];
        else if (cmd === 'v') y += toks[i++];
        else if (cmd === 'V') y = toks[i++];
        else throw new Error(`unexpected path token ${toks[i]} in ${id}`);
        points.push([x, y]);
      }
      if (points.length > 1) throw new Error(`unclosed subpath in ${id}`);
    }
    layers[id] = px;
  }
  return layers;
}

function layerKey(id) {
  const parts = id.split('-').map(Number);
  if (parts.length === 1) {
    // one-of-one layers are named after their token ID, e.g. "60" or "2536"
    return (0xfe << 24 | parts[0]) >>> 0;
  }
  if (parts.length > 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 0xfd)) {
    throw new Error(`can't key layer id ${id}`);
  }
  while (parts.length < 4) parts.push(0xff);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function pack() {
  const layers = parseLayers(readSpritesheet());
  const tokens = readTokenOrder();

  const colors = [];
  const colorIndex = new Map();
  const entries = [];
  const runs = [];

  for (const [id, px] of Object.entries(layers)) {
    const firstRun = runs.length;
    const cells = [...px].map(([k, c]) => [...k.split(',').map(Number), c]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    for (let i = 0; i < cells.length;) {
      const [x, y, c] = cells[i];
      let len = 1;
      while (i + len < cells.length && cells[i + len][1] === y && cells[i + len][0] === x + len && cells[i + len][2] === c) len++;
      if (!colorIndex.has(c)) { colorIndex.set(c, colors.length); colors.push(c); }
      runs.push({ x, y, len, c: colorIndex.get(c) });
      i += len;
    }
    entries.push({ id, key: layerKey(id), firstRun, runCount: runs.length - firstRun });
  }
  entries.sort((a, b) => a.key - b.key);
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].key === entries[i - 1].key) throw new Error(`duplicate key for ${entries[i].id}`);
  }
  if (colors.length > 511) throw new Error('too many colors for 9-bit indices');
  if (runs.length > 0xffff) throw new Error('too many runs for u16 indices');

  const out = [];
  const u16 = (v) => out.push((v >> 8) & 0xff, v & 0xff);
  u16(colors.length);
  for (const c of colors) out.push(...Buffer.from(c, 'hex'));
  u16(entries.length);
  for (const e of entries) {
    out.push((e.key >>> 24) & 0xff, (e.key >>> 16) & 0xff, (e.key >>> 8) & 0xff, e.key & 0xff);
    u16(e.firstRun);
    u16(e.runCount);
  }
  u16(tokens.length);
  for (const t of tokens) u16(t);
  for (const r of runs) {
    const v = (r.x << 19) | (r.y << 14) | (r.len << 9) | r.c;
    out.push((v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff);
  }

  return { blob: Buffer.from(out), layers, colors, entries, runs, tokens };
}

function writeChunks(blob) {
  const header = fs.readFileSync(path.join(CONTRACTS, 'RadioactivePunksBytesHyperstructure.sol'), 'utf8').split('pragma solidity')[0];
  const files = [];
  for (let i = 0; i * CHUNK_SIZE < blob.length; i++) {
    const name = `RadioactivePunksLayerData${i + 1}`;
    const chunk = blob.subarray(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const src = `${header}pragma solidity ^0.8.20;

/**
 * @dev Generated by scripts/pack-layer-data.js. Do not edit by hand.
 *
 *      Part ${i + 1} of the packed layer art read by RadioactivePunksImage.
 *      The deployed contract's code is the data itself, prefixed with a STOP
 *      (0x00) byte so calling it does nothing. RadioactivePunksImage reads
 *      only the bytes it needs with EXTCODECOPY.
 */
contract ${name} {
  constructor() {
    bytes memory code = hex'00${chunk.toString('hex')}';
    assembly {
      return(add(code, 32), mload(code))
    }
  }
}
`;
    fs.writeFileSync(path.join(CONTRACTS, `${name}.sol`), src);
    files.push({ name, bytes: chunk.length });
  }
  return files;
}

module.exports = { pack, parseLayers, readSpritesheet, readTokenOrder, layerKey };

if (require.main === module) {
  const { blob, colors, entries, runs, tokens } = pack();
  const files = writeChunks(blob);
  console.log(`colors ${colors.length}, layers ${entries.length}, runs ${runs.length}, tokens ${tokens.length}`);
  console.log(`blob ${blob.length} bytes ->`, files.map((f) => `${f.name} (${f.bytes} bytes)`).join(', '));
}
