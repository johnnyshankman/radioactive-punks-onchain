// SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.20;

import './ITokenURISupplier.sol';

/**
 * @dev Thin wrapper around the deployed RadioactivePunksRenderer that fixes
 *      seams in the rendered punk.
 *
 *      The V1 script sizes the SVG with `Math.floor(e/12)*12`, but each punk is
 *      a 24x24 grid. At odd multiples of 12 every art pixel is N.5 screen
 *      pixels wide, so every other grid line is anti-aliased and the
 *      background bleeds through between pixel blocks. Snapping to multiples
 *      of 24 makes every art pixel a whole number of CSS pixels, which is
 *      seam-free at 1x, 2x and 3x device pixel ratios.
 *
 *      The script is the last thing in V1's output and identical for every
 *      token, so the bytes to patch always sit a fixed distance from the end.
 *      `12` -> `24` keeps the length unchanged, so we patch four bytes in
 *      place and reuse all of V1 (and the data contracts behind it) as-is.
 */
contract RadioactivePunksRendererV2 is ITokenURISupplier {
  ITokenURISupplier public constant V1 =
    ITokenURISupplier(0x5694010444cC8fbbed96c23a65FbC3714F624A26);

  // "/12)*12" from `Math.floor(e/12)*12`, double URI-encoded by V1
  bytes private constant FIND = "%252F12%2529%252A12";

  // distance from the end of V1's tokenURI to the start of FIND
  uint256 private constant FROM_END = 855;

  function supportsInterface(bytes4 interfaceId) public pure override(IERC165) returns (bool) {
    return interfaceId == type(ITokenURISupplier).interfaceId
      || interfaceId == type(IERC165).interfaceId;
  }

  function tokenURI(uint256 tokenId) external view returns (string memory) {
    bytes memory uri = bytes(V1.tokenURI(tokenId));
    uint256 start = uri.length - FROM_END;

    // if V1's output ever differs from what we expect, serve it unmodified
    for (uint256 i = 0; i < FIND.length; i++) {
      if (uri[start + i] != FIND[i]) {
        return string(uri);
      }
    }

    // e/12 -> e/24
    uri[start + 5] = '2';
    uri[start + 6] = '4';
    // *12 -> *24
    uri[start + 17] = '2';
    uri[start + 18] = '4';

    return string(uri);
  }
}
