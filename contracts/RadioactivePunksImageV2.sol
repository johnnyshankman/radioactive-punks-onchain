// SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.20;

import '@openzeppelin/contracts/utils/Base64.sol';

/**
 * @dev Renders a Radioactive Punk as an SVG wrapping two 24x24 PNGs, fully
 *      on-chain.
 *
 *      Same data, layer selection and stacking as RadioactivePunksImage, but
 *      instead of one SVG path per color it writes the stacked grid as
 *      bitmaps: renderers anti-alias the edges between paths at sizes that
 *      aren't a multiple of 24, letting the background show through as thin
 *      lines between colors. Bitmaps scaled with `image-rendering: pixelated`
 *      have no such edges.
 *
 *        base  every cell, opaque. Empty and glow cells are the background.
 *        glow  only the glow cells, transparent elsewhere. Pulses like
 *              RadioactivePunksImage's glow, fading to the base beneath.
 *
 *      Both are indexed (palette) PNGs with an uncompressed deflate stream.
 *      Layer art comes from the RadioactivePunksLayerData chunks, generated
 *      by scripts/pack-layer-data.js from the original renderer's SVG
 *      spritesheet (see that script for the byte layout).
 *
 *      Data is read straight from contract code with EXTCODECOPY, copying
 *      only the index and the ~11 layers a punk uses.
 *
 *      tokenSVG(id)   -> <svg ...><image .../><image .../></svg>
 *      tokenImage(id) -> data:image/svg+xml;base64,...
 */
contract RadioactivePunksImageV2 {
  address public immutable traits;
  address public immutable layerData1;
  address public immutable layerData2;

  // layer data bytes held by layerData1 (its code minus the STOP byte)
  uint256 private immutable split;

  // RadioactivePunksBytesHyperstructure keeps its trait bytes as one block
  // starting at this byte of its runtime code
  uint256 private constant TRAITS_CODE_OFFSET = 182;
  bytes15 private constant TOKEN_0_TRAITS = 0x010100000400000003000200000000;

  error TokenDoesNotExist();
  error WrongTraitsContract();

  // trait byte positions, see RadioactivePunksRenderer's LOOKUP TABLE
  uint256 private constant GLOW = 0;
  uint256 private constant MORTALITY = 1;
  uint256 private constant HEAD = 3;

  // pulses the glow image; full opacity at the start keeps static snapshots
  // unchanged
  bytes private constant SVG_GLOW_START =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><style>'
    '.g{animation:g 2s ease-in-out infinite alternate}@keyframes g{to{opacity:.4}}</style>';
  bytes private constant SVG_START = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">';
  // optimizeSpeed for renderers that predate the CSS pixelated value
  bytes private constant IMAGE_START =
    '<image width="24" height="24" image-rendering="optimizeSpeed" style="image-rendering:pixelated"';
  uint256 private constant BACKGROUND = 0x473682;

  // signature, then the IHDR chunk: 24x24, 8-bit indexed color
  bytes private constant PNG_START =
    hex'89504e470d0a1a0a'
    hex'0000000d4948445200000018000000180803000000d7a9cdca';
  // tRNS chunk making palette entry 0 transparent
  bytes private constant PNG_TRANSPARENT = hex'0000000174524e530040e6d866';
  bytes private constant PNG_END = hex'0000000049454e44ae426082';
  // zlib header, then a single final stored deflate block of 600 bytes
  bytes private constant ZLIB_START = hex'7801015802a7fd';
  // CRC-32 of each nibble value, 4 bytes each
  bytes private constant CRC_TABLE =
    hex'000000001db710643b6e20c826d930ac76dc41906b6b51f44db261585005713c'
    hex'edb88320f00f9344d6d6a3e8cb61b38c9b64c2b086d3d2d4a00ae278bdbdf21c';

  constructor(address traits_, address layerData1_, address layerData2_) {
    traits = traits_;
    layerData1 = layerData1_;
    layerData2 = layerData2_;
    split = layerData1_.code.length - 1;
    if (bytes15(_traitsAt(traits_, 0)) != TOKEN_0_TRAITS) revert WrongTraitsContract();
  }

  function tokenImage(uint256 tokenId) external view returns (string memory) {
    return string.concat('data:image/svg+xml;base64,', Base64.encode(bytes(tokenSVG(tokenId))));
  }

  function tokenSVG(uint256 tokenId) public view returns (string memory) {
    (bytes memory head, Layout memory l) = _head();
    bytes16 punk = _traitBytes(head, l, tokenId);

    uint256[576] memory grid;
    uint32[11] memory keys = _layerKeys(tokenId, punk);
    for (uint256 i = 0; i < keys.length; i++) {
      if (keys[i] != 0) _draw(head, l, keys[i], grid);
    }

    (bytes memory base, bytes memory glow) = _bitmaps(head, l.palette, grid);
    bytes memory baseImage = abi.encodePacked(IMAGE_START, ' href="data:image/png;base64,', Base64.encode(base), '"/>');
    if (glow.length == 0) return string(abi.encodePacked(SVG_START, baseImage, '</svg>'));
    return string(abi.encodePacked(
      SVG_GLOW_START, baseImage,
      IMAGE_START, ' class="g" href="data:image/png;base64,', Base64.encode(glow), '"/></svg>'
    ));
  }

  /**
   * @dev The 16 trait bytes for a token, as RadioactivePunksRenderer's
   *      getPunkDataAtOffset returns them.
   */
  function traitBytes(uint256 tokenId) external view returns (bytes16) {
    (bytes memory head, Layout memory l) = _head();
    return _traitBytes(head, l, tokenId);
  }

  struct Layout {
    uint256 palette;     // start of 3-byte RGB colors
    uint256 index;       // start of 8-byte layer index entries
    uint256 layerCount;
    uint256 tokens;      // start of u16 token IDs
    uint256 tokenCount;
    uint256 runs;        // start of 3-byte runs (end of `head`)
  }

  /**
   * @dev Copies everything before the runs (palette, layer index, token IDs)
   *      into memory and returns where each part starts.
   */
  function _head() private view returns (bytes memory head, Layout memory l) {
    uint256 colorCount = _u16(_read(0, 2), 0);
    l.palette = 2;
    l.index = l.palette + colorCount * 3 + 2;
    l.layerCount = _u16(_read(l.index - 2, 2), 0);
    l.tokens = l.index + l.layerCount * 8 + 2;
    l.tokenCount = _u16(_read(l.tokens - 2, 2), 0);
    l.runs = l.tokens + l.tokenCount * 2;
    head = _read(0, l.runs);
  }

  /**
   * @dev Copies `len` bytes starting at `from` of the packed layer data,
   *      which is split across layerData1 and layerData2.
   */
  function _read(uint256 from, uint256 len) private view returns (bytes memory out) {
    out = new bytes(len);
    uint256 first = from >= split ? 0 : (len < split - from ? len : split - from);
    address data1 = layerData1;
    address data2 = layerData2;
    uint256 boundary = split;
    assembly {
      // +1 skips each chunk's leading STOP byte
      if first { extcodecopy(data1, add(out, 32), add(from, 1), first) }
      if lt(first, len) {
        extcodecopy(data2, add(add(out, 32), first), add(sub(add(from, first), boundary), 1), sub(len, first))
      }
    }
  }

  function _traitsAt(address traits_, uint256 offset) private view returns (bytes32 word) {
    assembly {
      extcodecopy(traits_, 0, add(TRAITS_CODE_OFFSET, mul(offset, 15)), 15)
      word := and(mload(0), not(0xffffffffffffffffffffffffffffffffff))
    }
  }

  function _traitBytes(bytes memory head, Layout memory l, uint256 tokenId) private view returns (bytes16) {
    // token IDs are stored sorted, in the same order as the hyperstructure
    uint256 lo = 0;
    uint256 hi = l.tokenCount;
    while (lo < hi) {
      uint256 mid = (lo + hi) / 2;
      uint256 id = _u16(head, l.tokens + mid * 2);
      if (id == tokenId) return bytes16(_traitsAt(traits, mid));
      if (id < tokenId) lo = mid + 1;
      else hi = mid;
    }
    revert TokenDoesNotExist();
  }

  /**
   * @dev Port of the original renderer's JS layer selection. Returns layer
   *      keys in draw order; 0 means no layer.
   */
  function _layerKeys(uint256 tokenId, bytes16 punk) private pure returns (uint32[11] memory keys) {
    if (punk == bytes16(0)) return keys;

    uint256 glow = uint8(punk[GLOW]);
    uint256 mortality = uint8(punk[MORTALITY]);
    uint256 head = uint8(punk[HEAD]);
    bool oneOfOne = _isOneOfOne(tokenId);

    uint256 k = 0;
    for (uint256 o = 3; o < 15; o++) {
      if (o == 7) continue;
      uint256 n = uint8(punk[o]);
      if (o == 12 && n == 0) continue;

      uint256[4] memory parts = [o, n, 0xff, 0xff];
      if (o == 6) {
        uint256 color = uint8(punk[7]);
        if (n == 1) { parts[2] = color; parts[3] = glow; }
        if (n == 2) { parts[2] = color; }
      }
      if ((o == 13 && n != 12) || o == 11 || o == 9 || (o == 10 && n == 4)) parts[2] = glow;
      if (o == 3 && mortality == 0) parts[2] = 0;
      if (o == 12) { parts[1] = head; if (mortality == 0) parts[2] = 0; }
      if (o == 14) parts[0] = 15;

      keys[k++] = oneOfOne
        ? uint32(0xfe000000 | tokenId)
        : uint32((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]);
    }
  }

  function _isOneOfOne(uint256 tokenId) private pure returns (bool) {
    return tokenId == 698 || tokenId == 2536 || tokenId == 60 || tokenId == 370 || tokenId == 528
      || tokenId == 246 || tokenId == 420 || tokenId == 201 || tokenId == 1360 || tokenId == 878;
  }

  /**
   * @dev Paints a layer's runs into the grid. Grid cells hold color index + 1
   *      (0 = background). Layers with no art draw nothing, matching a
   *      `<use>` of a missing symbol in the original renderer.
   */
  function _draw(bytes memory head, Layout memory l, uint32 key, uint256[576] memory grid) private view {
    uint256 lo = 0;
    uint256 hi = l.layerCount;
    while (lo < hi) {
      uint256 mid = (lo + hi) / 2;
      uint256 entry = l.index + mid * 8;
      uint256 midKey = (_u16(head, entry) << 16) | _u16(head, entry + 2);
      if (midKey == key) {
        bytes memory runs = _read(l.runs + _u16(head, entry + 4) * 3, _u16(head, entry + 6) * 3);
        _paint(runs, 0, runs.length, grid);
        return;
      }
      if (midKey < key) lo = mid + 1;
      else hi = mid;
    }
  }

  // runs are 3 bytes: x:5 | y:5 | length:5 | colorIndex:9
  function _paint(bytes memory runs, uint256 from, uint256 to, uint256[576] memory grid) private pure {
    assembly {
      let data := add(runs, 32)
      for { let p := from } lt(p, to) { p := add(p, 3) } {
        let v := shr(232, mload(add(data, p)))
        let cell := add(mul(and(shr(14, v), 31), 24), shr(19, v))
        let end := add(cell, and(shr(9, v), 31))
        let color := add(and(v, 511), 1)
        for {} lt(cell, end) { cell := add(cell, 1) } {
          mstore(add(grid, shl(5, cell)), color)
        }
      }
    }
  }

  // one PNG being built
  struct Bitmap {
    bytes rows;      // 24 rows, each a 0 (no filter) byte then 24 palette indexes
    bytes colors;    // 3-byte RGB palette entries
    uint256 count;   // palette entries used
  }

  /**
   * @dev Splits the grid into the base and glow PNGs; `glow` is empty when
   *      the punk has no glow cells. Each PNG's palette lists its colors in
   *      order of first appearance (row-major), after the glow PNG's
   *      transparent entry 0.
   */
  function _bitmaps(bytes memory head, uint256 palette, uint256[576] memory grid)
    private
    pure
    returns (bytes memory base, bytes memory glow)
  {
    Bitmap memory b = Bitmap(new bytes(600), new bytes(768), 0);
    // entry 0 stays zero: transparent black
    Bitmap memory g = Bitmap(new bytes(600), new bytes(768), 1);
    // per grid color (0 = background): bit 0 once looked up, bit 1 if it's
    // a glow color, then its palette index + 1 in the base (bits 8-17) and
    // in the glow (bits 18 up)
    uint256[] memory seen = new uint256[](513);

    assembly {
      let colors := add(add(head, 32), palette)
      for { let i := 0 } lt(i, 576) { i := add(i, 1) } {
        let c := mload(add(grid, shl(5, i)))
        let at := add(add(i, div(i, 24)), 1)
        let slot := add(add(seen, 32), shl(5, c))
        let s := mload(slot)
        let rgb := BACKGROUND
        if c {
          rgb := shr(232, mload(add(colors, mul(sub(c, 1), 3))))
          if iszero(and(s, 1)) { s := or(s, or(1, shl(1, isGlow(rgb)))) }
        }
        if and(s, 2) {
          s := or(and(s, 0x3ffff), shl(18, put(g, at, shr(18, s), rgb)))
          mstore(slot, s)
          // the base shows the background beneath the glow
          slot := add(seen, 32)
          s := mload(slot)
          rgb := BACKGROUND
        }
        mstore(slot, or(and(s, not(0x3ff00)), shl(8, put(b, at, and(shr(8, s), 0x3ff), rgb))))
      }

      // writes palette index (index1 - 1) at `at`, first adding rgb to the
      // palette if index1 is 0; returns the index + 1
      function put(bitmap, at, index1, rgb) -> next {
        next := index1
        if iszero(next) {
          let count := mload(add(bitmap, 64))
          let p := add(add(mload(add(bitmap, 32)), 32), mul(count, 3))
          mstore8(p, shr(16, rgb))
          mstore8(add(p, 1), shr(8, rgb))
          mstore8(add(p, 2), rgb)
          next := add(count, 1)
          mstore(add(bitmap, 64), next)
        }
        mstore8(add(add(mload(bitmap), 32), at), sub(next, 1))
      }

      // The glow is drawn in its own colors: six shared ones (head outlines,
      // glowing hair, hats, smoke, beards, noses and horns, plus the
      // one-of-ones that reuse them) and one each for the one-of-ones 698,
      // 60, 370, 246 and 420. None is used for anything else.
      function isGlow(rgb) -> r {
        r := or(or(or(eq(rgb, 0x7cff2f), eq(rgb, 0x00f8ff)), or(eq(rgb, 0xfd8fff), eq(rgb, 0x96ff95))),
          or(or(or(eq(rgb, 0x45ba79), eq(rgb, 0xff4830)), or(eq(rgb, 0x9aff58), eq(rgb, 0x00d3ff))),
            or(or(eq(rgb, 0x00d0ff), eq(rgb, 0x08c3cc)), eq(rgb, 0xff90fa))))
      }
    }

    base = _png(b, false);
    if (g.count > 1) glow = _png(g, true);
  }

  function _png(Bitmap memory bitmap, bool transparent) private pure returns (bytes memory) {
    bytes memory rows = bitmap.rows;
    bytes memory colors = bitmap.colors;
    uint256 used = bitmap.count * 3;
    // trim the palette to the colors used
    assembly {
      mstore(colors, used)
    }
    return abi.encodePacked(
      PNG_START,
      _chunk('PLTE', colors),
      transparent ? PNG_TRANSPARENT : bytes(''),
      _chunk('IDAT', abi.encodePacked(ZLIB_START, rows, uint32(_adler32(rows)))),
      PNG_END
    );
  }

  // length, type, data, then the CRC-32 of type and data
  function _chunk(bytes4 kind, bytes memory data) private pure returns (bytes memory) {
    bytes memory typed = abi.encodePacked(kind, data);
    return abi.encodePacked(uint32(data.length), typed, uint32(_crc32(typed)));
  }

  // a nibble at a time, with CRC_TABLE
  function _crc32(bytes memory data) private pure returns (uint256 crc) {
    bytes memory table = CRC_TABLE;
    assembly {
      let t := add(table, 32)
      let p := add(data, 32)
      let end := add(p, mload(data))
      crc := 0xffffffff
      for {} lt(p, end) { p := add(p, 1) } {
        crc := xor(crc, byte(0, mload(p)))
        crc := xor(shr(4, crc), shr(224, mload(add(t, shl(2, and(crc, 15))))))
        crc := xor(shr(4, crc), shr(224, mload(add(t, shl(2, and(crc, 15))))))
      }
      crc := xor(crc, 0xffffffff)
    }
  }

  // 600 bytes can't overflow the sums, so they're reduced once at the end
  function _adler32(bytes memory data) private pure returns (uint256) {
    uint256 a = 1;
    uint256 b = 0;
    assembly {
      let p := add(data, 32)
      let end := add(p, mload(data))
      for {} lt(p, end) { p := add(p, 1) } {
        a := add(a, byte(0, mload(p)))
        b := add(b, a)
      }
    }
    return ((b % 65521) << 16) | (a % 65521);
  }

  function _u16(bytes memory b, uint256 at) private pure returns (uint256) {
    return (uint256(uint8(b[at])) << 8) | uint8(b[at + 1]);
  }
}
