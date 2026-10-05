// SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.31;

/**
 * @dev ERC-4804 (web3://) metadata endpoint for Radioactive Punks.
 *
 *      Reuses the already-deployed RadioactivePunksRenderer for all data and
 *      rendering. The renderer returns `data:application/json,<uri-encoded
 *      JSON>`; this contract strips the data URI prefix and URI-decodes the
 *      payload once, yielding raw JSON. The nested `animation_url` is
 *      double-encoded by the renderer, so after one decode it remains a valid
 *      `data:text/html,...` URI inside the JSON string.
 *
 *      Uses the CLZ opcode (EIP-7939), so compile with `evmVersion: osaka`.
 *
 *      e.g. web3://<this address>/tokenJSON/0
 *
 *      The original RPUNK contract builds token URIs as
 *      `<API_BASE_URL><tokenId>.json`. With the base URL set to
 *      `web3://<this address>/tokenJSON/string!`, token URIs become
 *      `web3://<this address>/tokenJSON/string!8.json`, which ERC-4804 routes
 *      to `tokenJSON(string)` and serves as `application/json` based on the
 *      `.json` suffix of the last argument.
 */
contract RadioactivePunksJSON {
  address public constant RENDERER = 0x3d687421fefb01e69b9aeEc9EA3706D13A7C135F;

  // length of "data:application/json,"
  uint256 private constant PREFIX_LENGTH = 22;

  error InvalidTokenPath();

  function tokenJSON(uint256 tokenId) external view returns (string memory) {
    _tokenJSON(tokenId);
  }

  /**
   * @dev Accepts `<tokenId>.json`, e.g. `8.json` or `9999.json`. Reverts with
   *      InvalidTokenPath unless the input is one or more ASCII digits
   *      followed by exactly `.json`.
   */
  function tokenJSON(string calldata path) external view returns (string memory) {
    bytes calldata b = bytes(path);
    uint256 digits = b.length;
    if (digits < 6 || bytes5(b[digits - 5:]) != ".json") revert InvalidTokenPath();
    digits -= 5;

    uint256 tokenId;
    for (uint256 i = 0; i < digits; i++) {
      uint8 c = uint8(b[i]);
      if (c < 48 || c > 57) revert InvalidTokenPath();
      tokenId = tokenId * 10 + (c - 48);
    }

    _tokenJSON(tokenId);
  }

  /**
   * @dev Writes the ABI-encoded JSON string as return data and ends the call.
   */
  function _tokenJSON(uint256 tokenId) private view {
    assembly {
      function hexValue(c) -> v {
        v := sub(c, 48)
        if gt(c, 64) { v := sub(and(c, 0xdf), 55) }
      }

      // tokenURI(uint256)
      mstore(0x00, shl(224, 0xc87b56dd))
      mstore(0x04, tokenId)
      if iszero(staticcall(gas(), RENDERER, 0x00, 0x24, 0x00, 0x00)) {
        returndatacopy(0x00, 0x00, returndatasize())
        revert(0x00, returndatasize())
      }

      // Copy the ABI-encoded string once and decode it into a separate
      // output buffer right after it, laid out as an ABI-encoded string.
      let ptr := mload(0x40)
      returndatacopy(ptr, 0x00, returndatasize())
      let lenPtr := add(ptr, mload(ptr))
      let start := add(lenPtr, 32)
      let end := add(start, mload(lenPtr))
      let src := add(start, PREFIX_LENGTH)
      let out := add(ptr, returndatasize())
      let dst := add(out, 64)

      for {} lt(src, end) {} {
        // Mark each byte equal to '%' (0x25) with its high bit, exactly (no
        // carries between bytes). Bytes past `end` are zero, never '%'.
        let w := mload(src)
        let x := xor(w, 0x2525252525252525252525252525252525252525252525252525252525252525)
        let t := not(or(
          add(and(x, 0x7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f),
              0x7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f),
          or(x, 0x7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f)
        ))

        // Copy the word. If it has no '%', advance a full word.
        mstore(dst, w)
        if iszero(t) {
          dst := add(dst, 32)
          src := add(src, 32)
          continue
        }

        // Otherwise keep the bytes before the first '%' and decode it.
        let k := shr(3, clz(t))
        src := add(src, k)
        dst := add(dst, k)
        mstore8(dst, or(
          shl(4, hexValue(byte(0, mload(add(src, 1))))),
          hexValue(byte(0, mload(add(src, 2))))
        ))
        dst := add(dst, 1)
        src := add(src, 3)
      }

      // The last full-word copy may overshoot `end`; dst overshot equally.
      let len := sub(sub(dst, add(out, 64)), sub(src, end))
      mstore(add(add(out, 64), len), 0)
      mstore(out, 0x20)
      mstore(add(out, 32), len)
      return(out, add(64, and(add(len, 31), not(31))))
    }
  }
}
