/**
 * Prototype: a punk as an SVG wrapping a 24x24 bitmap instead of one path per
 * color, so there are no shape edges inside the art for renderers to
 * anti-alias into seams.
 *
 * The base bitmap is fully opaque: every cell holds its color, or the
 * background where nothing is painted. Glow cells hold the background too, and
 * the glow colors go on top, pulsing like RadioactivePunksImage's, so they
 * still fade to the background. Two ways to draw the glow:
 *
 *   paths   one <path> per glow color. Renderers anti-alias path edges at
 *           fractional scales, so glow edges still blend.
 *   image   a second bitmap, transparent outside the glow cells. Both bitmaps
 *           scale with the same nearest-neighbor mapping, so edges line up.
 *
 * Formats, all built by hand the way a contract would build them:
 *   bmp8+paths   indexed BMP: palette + one byte per pixel
 *   bmp24+paths  BMP with 3 bytes per pixel
 *   png+paths    RGB PNG with an uncompressed (stored) deflate stream
 *   bmp+bmp32    bmp8 base, 32-bit BMP (with alpha) glow
 *   png+png      RGB PNG base, RGBA PNG glow
 *   png8+png8    indexed PNGs (palette, one byte per pixel); the glow's
 *                palette starts with a transparent entry for empty cells
 *
 * Usage: node scripts/bitmap-svg.js <tokenId> [format]
 */
const { createReference, BG, GLOW_COLORS, GLOW_STYLE } = require('./reference-svg');

const u16le = (n) => [n & 255, (n >> 8) & 255];
const u32le = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
const u32be = (n) => [(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
const rgbOf = (hex) => [0, 2, 4].map((i) => parseInt(hex.substr(i, 2), 16));

// BMP rows run bottom-up and are padded to 4 bytes; 24-pixel rows of 1, 3 or
// 4 bytes per pixel need no padding. 32-bit BMPs use a V4 header whose masks
// mark the 4th byte as alpha.
function bmp(rows, bitsPerPixel, palette = []) {
  const pixels = rows.slice().reverse().flat();
  const alpha = bitsPerPixel === 32;
  const header = alpha ? 108 : 40;
  const offset = 14 + header + palette.length * 4;
  return Buffer.from([
    0x42, 0x4d, ...u32le(offset + pixels.length), 0, 0, 0, 0, ...u32le(offset),
    ...u32le(header), ...u32le(24), ...u32le(24), ...u16le(1), ...u16le(bitsPerPixel),
    ...u32le(alpha ? 3 : 0), ...u32le(pixels.length), ...u32le(2835), ...u32le(2835),
    ...u32le(palette.length), ...u32le(0),
    ...(alpha ? [
      ...u32le(0x00ff0000), ...u32le(0x0000ff00), ...u32le(0x000000ff), ...u32le(0xff000000),
      ...u32le(0x73524742), ...Array(36 + 12).fill(0),
    ] : []),
    ...palette.flatMap(([r, g, b]) => [b, g, r, 0]),
    ...pixels,
  ]);
}

// null cells are transparent
function bmp32(cells) {
  return bmp(cells.map((row) => row.flatMap((c) => (c === null ? [0, 0, 0, 0] : [...rgbOf(c).reverse(), 255]))), 32);
}

function bmp8(cells) {
  const palette = [...new Set(cells.flat())];
  return bmp(cells.map((row) => row.map((c) => palette.indexOf(c))), 8, palette.map(rgbOf));
}

function bmp24(cells) {
  return bmp(cells.map((row) => row.flatMap((c) => rgbOf(c).reverse())), 24);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function adler32(bytes) {
  let a = 1, b = 0;
  for (const x of bytes) { a = (a + x) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
}
function chunk(type, data) {
  const body = [...Buffer.from(type), ...data];
  return [...u32be(data.length), ...body, ...u32be(crc32(body))];
}

// one stored deflate block: each row is a 0 (no filter) byte then RGB pixels,
// or RGBA with null cells transparent
function png(cells, alpha = false) {
  const px = alpha ? (c) => (c === null ? [0, 0, 0, 0] : [...rgbOf(c), 255]) : rgbOf;
  const raw = cells.flatMap((row) => [0, ...row.flatMap(px)]);
  const zlib = [0x78, 0x01, 0x01, ...u16le(raw.length), ...u16le(~raw.length & 0xffff), ...raw, ...u32be(adler32(raw))];
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunk('IHDR', [...u32be(24), ...u32be(24), 8, alpha ? 6 : 2, 0, 0, 0]),
    ...chunk('IDAT', zlib),
    ...chunk('IEND', []),
  ]);
}

const BMP = 'data:image/bmp;base64,';
const PNG = 'data:image/png;base64,';
// format -> [base encoder, glow encoder or null for glow paths]
// indexed: PLTE holds the colors, tRNS makes null (palette entry 0, when
// present) transparent
function png8(cells) {
  const palette = [...new Set(cells.flat())].sort((a, b) => (a === null ? -1 : b === null ? 1 : 0));
  const raw = cells.flatMap((row) => [0, ...row.map((c) => palette.indexOf(c))]);
  const zlib = [0x78, 0x01, 0x01, ...u16le(raw.length), ...u16le(~raw.length & 0xffff), ...raw, ...u32be(adler32(raw))];
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunk('IHDR', [...u32be(24), ...u32be(24), 8, 3, 0, 0, 0]),
    ...chunk('PLTE', palette.flatMap((c) => (c === null ? [0, 0, 0] : rgbOf(c)))),
    ...(palette[0] === null ? chunk('tRNS', [0]) : []),
    ...chunk('IDAT', zlib),
    ...chunk('IEND', []),
  ]);
}

const FORMATS = {
  'bmp8+paths': [(c) => BMP + bmp8(c).toString('base64'), null],
  'bmp24+paths': [(c) => BMP + bmp24(c).toString('base64'), null],
  'png+paths': [(c) => PNG + png(c).toString('base64'), null],
  'bmp+bmp32': [(c) => BMP + bmp8(c).toString('base64'), (c) => BMP + bmp32(c).toString('base64')],
  'png+png': [(c) => PNG + png(c).toString('base64'), (c) => PNG + png(c, true).toString('base64')],
  'png8+png8': [(c) => PNG + png8(c).toString('base64'), (c) => PNG + png8(c).toString('base64')],
};

const IMAGE = '<image width="24" height="24" image-rendering="optimizeSpeed" style="image-rendering:pixelated"';
const IMAGE_GLOW_STYLE = '<style>.g{animation:g 2s ease-in-out infinite alternate}@keyframes g{to{opacity:.4}}</style>';

function toBitmapSVG(grid, format = 'bmp8+paths') {
  const [encodeBase, encodeGlow] = FORMATS[format];
  const isGlow = (c) => GLOW_COLORS.includes(c);
  const base = `${IMAGE} href="${encodeBase(grid.map((row) => row.map((c) => (c === null || isGlow(c) ? BG : c))))}"/>`;

  if (encodeGlow) {
    const glowCells = grid.map((row) => row.map((c) => (isGlow(c) ? c : null)));
    if (!glowCells.flat().some((c) => c)) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${base}</svg>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${IMAGE_GLOW_STYLE}${base}`
      + `${IMAGE} class="g" href="${encodeGlow(glowCells)}"/></svg>`;
  }

  const glow = new Map();
  grid.forEach((row, y) => {
    for (let x = 0; x < 24;) {
      const c = row[x];
      let len = 1;
      while (x + len < 24 && row[x + len] === c) len++;
      if (isGlow(c)) glow.set(c, (glow.get(c) || '') + `M${x} ${y}h${len}v1h-${len}z`);
      x += len;
    }
  });

  let body = `${GLOW_STYLE}${base}`;
  for (const [c, d] of glow) body += `<path fill="#${c}" d="${d}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" shape-rendering="crispEdges">${body}</svg>`;
}

module.exports = { toBitmapSVG, bmp8, bmp24, bmp32, png, png8, FORMATS };

if (require.main === module) {
  const grid = createReference().tokenGrid(Number(process.argv[2] || 0));
  console.log(toBitmapSVG(grid, process.argv[3] || 'png+png'));
}
