// SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.20;

interface IRadioactivePunksImage {
  function traitBytes(uint256 tokenId) external view returns (bytes16);
  function tokenImage(uint256 tokenId) external view returns (string memory);
}

/**
 * @dev ERC-4804 (web3://) metadata endpoint for Radioactive Punks, with a
 *      static on-chain `image` instead of RadioactivePunksJSON's interactive
 *      `animation_url`.
 *
 *      Builds the same JSON as RadioactivePunksJSON (name, artist,
 *      technologist, attributes) but skips the original renderer's tokenURI
 *      entirely: trait names and values come from the original
 *      RadioactivePunksRenderer's public getters, trait bytes and the
 *      `data:image/svg+xml;base64,...` image from RadioactivePunksImage.
 *
 *      Two equivalent ways to request a punk's JSON:
 *
 *        web3://<this address>/tokenJSON/string!8.json  -> tokenJSON(string)
 *        web3://<this address>/tokenJSON/8              -> tokenJSON(uint256)
 *
 *      The first is what the original RPUNK contract produces. It builds token
 *      URIs as `<API_BASE_URL><tokenId>.json`, so set its base URL to
 *      `web3://<this address>/tokenJSON/string!`. ERC-4804 needs the explicit
 *      `string!` type because it treats a bare `8.json` argument as a domain
 *      name. The `.json` suffix of the last argument also tells ERC-4804
 *      clients to serve the result as `application/json`.
 */
contract RadioactivePunksJSONV2 {
  address public immutable renderer;
  IRadioactivePunksImage public immutable image;

  error InvalidTokenPath();

  // TRAIT_NAMES(uint256) on the original renderer
  bytes4 private constant TRAIT_NAMES = 0x09bd3468;

  constructor(address renderer_, address image_) {
    renderer = renderer_;
    image = IRadioactivePunksImage(image_);
  }

  /**
   * @dev e.g. web3://<this address>/tokenJSON/8
   */
  function tokenJSON(uint256 tokenId) public view returns (string memory) {
    bytes16 punk = image.traitBytes(tokenId);

    // the original renderer's trait value getters, in trait byte order
    bytes4[15] memory valueGetters = [
      bytes4(0x44897262), // RADIOACTIVE_GLOW(uint256)
      0x0d47fa54,         // MORTALITY(uint256)
      0x45b793ee,         // CLONE(uint256)
      0xe8053e92,         // HEAD(uint256)
      0xef966149,         // EYES(uint256)
      0x60e18a0d,         // GLASSES(uint256)
      0xbf63542e,         // BEARD(uint256)
      0xb2f200cd,         // BEARD_COLOR(uint256)
      0x289bba33,         // MOUTH(uint256)
      0x68cf4d74,         // SMOKE(uint256)
      0xf6fcdc30,         // NOSE(uint256)
      0x06c2d86d,         // HAIR(uint256)
      0x2a651d91,         // HORNS(uint256)
      0x14886c3a,         // HAT(uint256)
      0x3e1add09          // GUN(uint256)
    ];

    string memory attributes = '';
    for (uint256 i = 0; i < 15; i++) {
      attributes = string.concat(
        attributes,
        '{"trait_type":"', _get(TRAIT_NAMES, i),
        '","value":"', _get(valueGetters[i], uint8(punk[i])),
        i == 14 ? '"}' : '"},'
      );
    }

    return string.concat(
      '{"name":"Radioactive Punk #', _toString(tokenId),
      '","artist":"Pixantle","technologist":"White Lights","attributes":[', attributes,
      '],"image":"', image.tokenImage(tokenId),
      '"}'
    );
  }

  /**
   * @dev e.g. web3://<this address>/tokenJSON/string!8.json
   *
   *      Accepts `<tokenId>.json`, e.g. `8.json` or `9999.json`. Reverts with
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

    return tokenJSON(tokenId);
  }

  // calls `getter(index)` on the original renderer, which returns a string
  function _get(bytes4 getter, uint256 index) private view returns (string memory) {
    (bool ok, bytes memory result) = renderer.staticcall(abi.encodeWithSelector(getter, index));
    require(ok);
    return abi.decode(result, (string));
  }

  function _toString(uint256 n) private pure returns (string memory) {
    if (n == 0) return '0';
    uint256 len;
    for (uint256 m = n; m != 0; m /= 10) len++;
    bytes memory s = new bytes(len);
    for (; n != 0; n /= 10) s[--len] = bytes1(uint8(48 + n % 10));
    return string(s);
  }
}
