// SPDX-License-Identifier: Unlicense
// @author: whitelights.eth

pragma solidity ^0.8.20;

///////////////////////////////////////////////////////////////////////////////////////
//                                                                                   //
//                                                                                   //
//                                        ╓                                          //
//                             └⌐        ▓▌  ,▓¬        ,▄▓                          //
//                ²▄,        ╫⌐ ▓ ▌    ╒J▓⌐ ▓▓¬    ╓▄▄▓▓▓▓▀         ,▄▄▓▀            //
//                 ▐▓▌ ▓     ▓▄▓▓ ▓⌐   j▓▓ ▓▓▌ ▄▓▓▓▓▓▓▓▀▐▄▌▓▓▓▓▓▓▓▓▓▓▓▓              //
//                 ▐▓▓ ▓    ▓▓▓▓▓ ▓▓   ▓▓▓ ▓▓▌▐▓▀▀▀▓▓▓ ▐▓▓▓▓▓█▀▀╙¬¬└▀▓               //
//                 ▓▓▓▓▓   ▓▓▓▓▓ ▐▓▓  ▐▓▓▌ ▓▓▌▐▌   j▓▓ ▓▓▓▓▀                         //
//                ▐▓▓▓▓▓   ▓▓▓▓▓ ▓▓▓  ▐▓▓▓ ▓▓▌     ]▓▓ ▓▓▓▌    ▄▄                    //
//                 ▓▓▓▓▓  ▄▓▓▓▓▓ ╫▓▓▓▓▓▓▓▌ ▓▓▌     ▓▓▓ ▐▓▓µ ,▓▓▓                     //
//                  ▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▀▓▓▓▌ ▓▓▌    ▄▓▓▓ ▐▓▓▓▓█▀▀Γ                     //
//                  ▀▓▓▓▓▓▓▓▓▓▓  ▓▓▓▄ ▐▓▓▌ ▓▓▌   ▀▓▓▓▌ ╫▓▓▀                          //
//                   ▓▓▓▓▓▓▓█▓▓  ▀▓▓b ▐▓▓▓ ▓▓▌    ▓▓▓  ▓▓▓       ╓▌                  //
//                   ▐▓▓▌╙¬¬ j▓▌  ▓▓   ▓▓▓ ▓▓▄   ▐▓▓  ▐▓▓▓   ▓▓▓▓▓                   //
//                  ,▓▓█`   ,▓█` ▄▓▀  ▄▓▓▀▄▓▀   ╓▓█¬ ▄▓▓▓▀ ,▓▓▓▓▓▀                   //
//                 ▓▓▓     ▓▓  ▄▓╙  ▄▓▓`▄▓▀   ╒▓▓  ╓▓▓▓▀  ▓▓▓▓▓▀                     //
//                 ▀▓▓▄    ▀▓▄ ╙▓▄  ╙█▓▄╙▓▓µ   ▀▓▄  ▀▓▓▌⌐ ▀▓▓▓▓▌                     //
//                  ▐▓█▌    ▀▓  ▐▓    ▓▓ ╫▓▀   ▐▓¬  ▐▓▓▓▓▓▓▓▓▓▓▓                     //
//                   ▓ ▀     ▀  ▐     ▀▌ ▓▌    ▓¬   ▀▀¬ ▐▓▓▓█▀▀                      //
//                   ▓                ▐▓ ▓⌐   ▐▓         ▓\                          //
//                   ▐                 ▓ ▓    ▐¬        '▌                           //
//                                   ▓∩.         ]▄                                  //
//       ▓µ             ╓▌         ▄▓▓▓ ▓       ▄▐▓              ╓▄Æ            µ    //
//       ▓▓▓           ▓▓       ,▄▓▓▓▓▓ ▓▓     ▄▓▓▌  ,▄▄▄▄▄▄▄▓▓▓▓▓▓         ,▄▓▓     //
//     ▄▓▓▓▓▄          ▓▓    ▄▓▓▓▓▓▓▓▓  ▓▓▌    ▓▓▓ ]▓▓▓███▓▓▓▓▓█▓▓▓ ▄▓▓▓▓▓▓▓▓▓▓      //
//     █▀▓▓▓           ▓▓µ  ▓▓▓▓▀▀╙¬   ▐▓▓▓    ▓▓▓ ▓▓█    ▐▓▓▓  ▓▓ ▓▓▓▓▓█▀▀▀▀`       //
//      ╓▓▓▓           ▓▓▌ ▓▓▓▀     ▄▓⌐j▓▓▓▄▄╓▄▓▓▌ ▓      ▓▓▓b  ` ▐▓▓▓▓,             //
//     ▄▓▓▓▓          ]▓▓▌ ▓▓▓   ▓▓▓▓▓µ ▓▓▓▓▓▓▓▓▓▌       .▓▓▓    , ▀▓▓▓▓▓▓▄,         //
//    ╚`  ▓▓▌       ╫▄▐▓▓ ╫▓▓▓▌     ▓▓▌ ▓▓▓█▀╙▀▓▓▓       j▓▓▓    ▐▓   ▀▀▓▓▓▓▓▄       //
//       j▓▓▌       ▓▌.▓▓ ▐▓▓▓▓▓   ▐▓▓▓ ▐▓▓    ╫▓▓        ▓▓▌    ▐▓▓     ▓▓▓▓▓       //
//        ▓▓▓       ▓▓ ▓▓ ▐▓▓▓▓▓µ  └▓▓▓ ▐▓▓    ▐▓▓µ       ▓▓▓    ▐▓▓     ▓▓▓▓▓       //
//       ▓▓▓╙      ▄▓,▓▓▀,▓▓▓▓▓█   ▓▓▓▀,▓▓▀   ,▓▓█       ▄▓▓"   ,▓▓▀    ╓▓▓▓▓▀       //
//     ▄▓▓▀      ╓▓▀▄▓▀,▓▓▓▓▓█¬  ▄▓▓▀.▓▓▀    ▓▓█¬      ▄▓▓▀    ▓▓▀    ,▓▓▓▓▀         //
//     ╙▀▓▓▄     ╙╙▀▓▀█▌▀▀▓▓▓▓▄ç ▀▀▓▓▄▀▀▓▄  ¬▀▀▓▄µ     ╙▀▓▓▄  ¬▀▀▓▄   ╙▀█▓▓▓▄        //
//       ▐▓▓▄     ▄▓▓b▐▓▌ ▐▓▓▓▓▓▓▓▓▓▓▓▌ ▓▓▌    ▓▓▓       j▓▓∩   ,▓▓▓▓     ▓▓▓▌       //
//       └▓▓▓▓▓▓▓▓▓█▀ ▐▓▌   █▓▓▓▓▓▓▓▓▓▌ ▓▓▓    ▓▓▓        ▓▓⌐    └▀▓▓▓▓▓▓▓▓▓▓        //
//        ▓▓▓▓█▀▀¬    j▓▌      ¬    ▓▓▓ ▓▓▓    ▀▓▓        ▓▓        ╙▓▓▓▓▓▓¬         //
//        ▓▓▀          ▓▌           ▓▓▀ ╫▓▓     ▓▌       j▓▌          ▓▓▓█▀          //
//       .▓            ▓            ▓   ╫▓      ▓▌       ▓▀           ╫▓             //
//       Å             ▀            ▓   ▓       ▓       ▓▀            ▓¬             //
//                                              ▌      ▐▀                            //
//                                                                                   //
//                                                                                   //
//                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////
//
// May this server your on-chain art needs well.
//
// A swiss army knife for compiling tokenUri data on the fly.
// Thanks dom.eth for the inspiration.

import './IBytesChunk.sol';
import './IStringChunk.sol';
import './IDataCompiler.sol';

contract DataCompiler is IDataCompiler {
  address public immutable owner;

  /**
   * @dev The addresses of the fflate chunks. These chunks when put together
   * create a valid data:text/javascript;base64, script that is the fflate
   * library production code, which can then be used to inflate compressed data.
   */
  address[2] private fflateAddresses = [
    address(0),
    address(0)
  ];

  /**
   * @notice These constants are pre-URI-encoded to save gas and time. Some
   * are single encoded, some are double encoded. Just depends on where they
   * end up in the final tokenUri.
   */
  string public constant BEGIN_JSON =
    "data:application/json,%7B"; // data:application/json,{
  string public constant END_JSON =
    "%7D"; // }
  string public constant BEGIN_SCRIPT =
    "%253Cscript%253E"; // <script>
  string public constant END_SCRIPT =
    "%253C%252Fscript%253E"; // </script>
  string public constant BEGIN_SCRIPT_DATA_COMPRESSED =
    "%253Cscript%253Econst%2520b%253DUint8Array.from(atob(%2522";
  string public constant END_SCRIPT_DATA_COMPRESSED =
    "%2522)%252Ce%253D%253Ee.charCodeAt(0))%253B";
  string public constant HTML_HEAD_END =
    "%253C%252Fhead%253E%253Cbody%253E"; // </head><body>

  /**
   * @notice These should be combined with BEGIN_SCRIPT_DATA_COMPRESSED
   * and END_SCRIPT_DATA_COMPRESSED. They are double URI encoded.
   */
  string public constant END_SCRIPT_JS_DATA_COMPRESSED =
    "var%2520ugz%253Dfflate.gunzipSync(b)%252Ct%253Dfflate.strFromU8(ugz)%252Cs%253Ddocument.createElement(%2522script%2522)%253Bs.type%253D%2522text%252Fjavascript%2522%252Cs.text%253Dt%252Cdocument.head.appendChild(s)%253B%253C%252Fscript%253E";
  string public constant END_SCRIPT_SVG_DATA_COMPRESSED =
    "var%2520ugz%253Dfflate.gunzipSync(b)%252Ct%253Dfflate.strFromU8(ugz)%253Bconst%2520c%253Ddocument.createElementNS(%2522http%253A%252F%252Fwww.w3.org%252F2000%252Fsvg%2522%252C%2522svg%2522)%253Bc.setAttribute(%2522class%2522%252C%2522c%2522)%253Bvar%2520s%253Ddocument.createElementNS(%2522http%253A%252F%252Fwww.w3.org%252F2000%252Fsvg%2522%252C%2522svg%2522)%253Bs.setAttribute(%2522width%2522%252C%25220%2522)%252Cs.setAttribute(%2522height%2522%252C%25220%2522)%252Cs.classList.add(%2522hidden%2522)%252Cs.innerHTML%253Dt%252Cc.appendChild(s)%252Cdocument.body.appendChild(c)%253B%253C%252Fscript%253E";

  constructor(address chunk1, address chunk2) {
    owner = msg.sender;
    // 0x86A477028841854D9d02a5BD4fd6936216510A0f, // goerli
    // 0xB948057bdd71835b19Ff90aEa03FAd3Ebb66E870 // goerli
    // 0xa942F946A35545F50792DA1Ea1ADf0c3b619b921, // mainnet
    // 0xF10EeDb5ACE715d78e0f89eCd1Dfc3E5874f6e3c // mainnet
    fflateAddresses[0] = chunk1;
    fflateAddresses[1] = chunk2;
  }

  /**
   * @dev FFlate script is the actual entire script as a URL so this
   * returns the full `data:text/javascript:base64,blah"` URL
   * no need to decompress, just set `src=`
   */
  function fflate() public view returns (string memory) {
    address[] memory fflateChunks = new address[](2);
    fflateChunks[0] = fflateAddresses[0];
    fflateChunks[1] = fflateAddresses[1];
    return compileDataChunks(fflateChunks);
  }

  /**
   * @dev Returns a string which encodes the beginning of the HTML Data URI (data:text/html) and then
   * inserts an fflate <script> inside of the opening <head>. It then closes the <head>, and opens
   * the body of the HTML for you to concatenate and then cap off with HTML_FOOT().
   * Why do this instead of opening the <head> and leaving that open? Because this way any <script>
   * tag put into the DOM will have access to document.body, which is not available until the <body>
   * tag is opened. Everything will have access to fflate.
   */
  function HTML_HEAD_START() public view returns (string memory) {
    return
      string(
        abi.encodePacked(
          // single URI encoded because it just shows up in the raw JSON URI
          encodeURI("data:text/html,"),
          // double encoded because its inside the animation URI (1x) which lies inside of the URI-encoded JSON object (2x)
          encodeURI(
            encodeURI(
              '<!doctype html><html lang="en"><head><meta charset="utf-8"><script src="'
            )
          ),
          fflate(),
          encodeURI(encodeURI('"></script>'))
        )
      );
  }

  /**
   * @dev Returns a double encoded string of the end HTML <body> and <html> tags
   */
  function HTML_FOOT() public pure returns (string memory) {
    return encodeURI(encodeURI("</body></html>"));
  }

  function SCRIPT_VAR(
    string memory name,
    string memory value,
    bool omitQuotes
  ) public pure returns (string memory) {
    return
      string(
        abi.encodePacked(
          encodeURI(encodeURI('var ')),
          encodeURI(encodeURI(name)),
          encodeURI(encodeURI("=")),
          encodeURI(encodeURI(omitQuotes ? "" : '"')),
          encodeURI(encodeURI(value)),
          encodeURI(encodeURI(omitQuotes ? ";" : '";'))
        )
      );
  }

  function BEGIN_METADATA_VAR(
    string memory name,
    bool omitQuotes
  ) public pure returns (string memory) {
    return
      string(
        abi.encodePacked(
          encodeURI('"'),
          encodeURI(name),
          encodeURI(omitQuotes ? '":' : '":"')
        )
      );
  }

  function END_METADATA_VAR(
    bool omitQuotes,
    bool last
  ) public pure returns (string memory) {
    return encodeURI(omitQuotes ? last ? "" : "," : last ? '"' : '",');
  }

  /**
   * @dev Compile an array of addresses leading to IStringChunk contracts.
   * Returns a string concatenating all of data into a giant string.
   */
  function compileDataChunks(address[] memory chunks) public pure returns (string memory) {
    string memory result = "";
    for (uint256 i; i < chunks.length; i++) {
      IStringChunk data = IStringChunk(chunks[i]);
      result = string(abi.encodePacked(result, data.data()));
    }

    return result;
  }

  /**
   * @dev Compile an array of addresses leading to IBytesChunk contracts.
   * Returns bytes with all of data concatenated together in order.
   */
  function compileBytesChunks(address[] memory chunks) public pure returns (bytes memory) {
    bytes memory result = "";
    for (uint256 i; i < chunks.length; i++) {
      IBytesChunk data = IBytesChunk(chunks[i]);
      result = abi.encodePacked(result, data.data());
    }

    return result;
  }

  /**
   * @dev URI Encoding/Decoding Hex Table
   */
  bytes internal constant TABLE = "0123456789ABCDEF";

  /**
   * @dev URI encodes the provided string. Gas optimized like crazy.
   */
  function encodeURI(string memory str) public pure returns (string memory) {
      bytes memory input = bytes(str);
      uint256 inputLength = input.length;
      uint256 outputLength = 0;

      for (uint256 i = 0; i < inputLength; i++) {
          bytes1 b = input[i];

          if (
              (b >= 0x30 && b <= 0x39) ||
              (b >= 0x41 && b <= 0x5a) ||
              (b >= 0x61 && b <= 0x7a)
          ) {
              outputLength++;
          } else {
              outputLength += 3;
          }
      }

      bytes memory output = new bytes(outputLength);
      uint256 j = 0;

      for (uint256 i = 0; i < inputLength; i++) {
          bytes1 b = input[i];

          if (
              (b >= 0x30 && b <= 0x39) ||
              (b >= 0x41 && b <= 0x5a) ||
              (b >= 0x61 && b <= 0x7a)
          ) {
              output[j++] = b;
          } else {
              bytes1 b1 = TABLE[uint8(b) / 16];
              bytes1 b2 = TABLE[uint8(b) % 16];
              output[j++] = 0x25; // '%'
              output[j++] = b1;
              output[j++] = b2;
          }
      }

      return string(output);
  }

  /**
   * @dev URI decodes the provided string. Strings which are incorrectly
   *      encoded and cannot be parsed will usually revert. It expects
   *      that all URI encoded characters use capitals (ex: < is %3E not %3e)
   */
  function decodeURI(string memory str) public pure returns (string memory) {
    string memory result = "";
    uint256 bytelength = bytes(str).length;

    for (uint256 i = 0; i < bytelength; i++) {
      bytes1 b = bytes(str)[i];
      // check if that character (as a byte1) is the "%" sign delimiter
      if (b == bytes1("%")) {
        // parse the two characters following the % delimiter
        uint8 byteU8_1 = uint8(bytes(str)[++i]);
        uint8 byteU8_2 = uint8(bytes(str)[++i]);

        // ensure they are characters 0-9 or A-F and therefore hexidecimal
        require(
          ((byteU8_1 >= 48 && byteU8_1 <= 57) ||
              (byteU8_1 >= 65 && byteU8_1 <= 70)),
          "invalid encoded string"
        );
        require(
          ((byteU8_2 >= 48 && byteU8_2 <= 57) ||
              (byteU8_2 >= 65 && byteU8_2 <= 70)),
          "invalid encoded string"
        );

        // convert the 1st char representing a hexidecimal to decimal (ex: A = 10)
        uint8 hexCharAsDecimal;
        if (byteU8_1 >= 48 && byteU8_1 <= 57) {
          // 0-9
          hexCharAsDecimal = byteU8_1 - 48;
        } else {
          // A-F
          hexCharAsDecimal = byteU8_1 - 55;
        }

        // convert the 2nd char representing a hexidecimal to decimal (ex: F = 15)
        uint8 hexCharAsDecimal2;
        if (byteU8_2 >= 48 && byteU8_2 <= 57) {
          // 0-9
          hexCharAsDecimal2 = byteU8_2 - 48;
        } else {
          // A-F
          hexCharAsDecimal2 = byteU8_2 - 55;
        }

        // 1st hex-char is a number words to move over
        // 2nd hex-char is byte offset from there
        // ex: %3E we move (3 * 16) + 14 bytes over
        result = string(
          abi.encodePacked(
            result,
            bytes1((hexCharAsDecimal * 16) + hexCharAsDecimal2)
          )
        );
      } else {
        result = string(
          abi.encodePacked(result, string(abi.encodePacked(b)))
        );
      }
    }

    return result;
  }

  /**
   * @dev Converts any uint256 into its string representation
   */
  function uint2str(uint256 _i) public pure returns (string memory _uintAsString) {
    if (_i == 0) {
      return "0";
    }
    uint256 j = _i;
    uint256 len;
    while (j != 0) {
      len++;
      j /= 10;
    }
    bytes memory bstr = new bytes(len);
    uint256 k = len;
    while (_i != 0) {
      k = k - 1;
      uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
      bytes1 b1 = bytes1(temp);
      bstr[k] = b1;
      _i /= 10;
    }
    return string(bstr);
  }

  // function uint2str(uint256 value) public pure returns (string memory str) {
  //   /// @solidity memory-safe-assembly
  //   assembly {
  //     // The maximum value of a uint256 contains 78 digits (1 byte per digit), but we allocate 160 bytes
  //     // to keep the free memory pointer word aligned. We'll need 1 word for the length, 1 word for the
  //     // trailing zeros padding, and 3 other words for a max of 78 digits. In total: 5 * 32 = 160 bytes.
  //     let newFreeMemoryPointer := add(mload(0x40), 160)

  //     // Update the free memory pointer to avoid overriding our string.
  //     mstore(0x40, newFreeMemoryPointer)

  //     // Assign str to the end of the zone of newly allocated memory.
  //     str := sub(newFreeMemoryPointer, 32)

  //     // Clean the last word of memory it may not be overwritten.
  //     mstore(str, 0)

  //     // Cache the end of the memory to calculate the length later.
  //     let end := str

  //     // We write the string from rightmost digit to leftmost digit.
  //     // The following is essentially a do-while loop that also handles the zero case.
  //     // prettier-ignore
  //     for { let temp := value } 1 {} {
  //       // Move the pointer 1 byte to the left.
  //       str := sub(str, 1)

  //       // Write the character to the pointer.
  //       // The ASCII index of the '0' character is 48.
  //       mstore8(str, add(48, mod(temp, 10)))

  //       // Keep dividing temp until zero.
  //       temp := div(temp, 10)

  //       // prettier-ignore
  //       if iszero(temp) { break }
  //     }

  //     // Compute and cache the final total length of the string.
  //     let length := sub(end, str)

  //     // Move the pointer 32 bytes leftwards to make room for the length.
  //     str := sub(str, 32)

  //     // Store the string's length at the start of memory allocated for our string.
  //     mstore(str, length)
  //   }
  // }


  /**
   * @dev Converts any bytes16 into its string representation
   */
  function toHex16String (bytes16 data) public pure returns (string memory) {
    return string (abi.encodePacked (toHex16 (data)));
  }

  /**
   * @dev Converts any bytes32 into its string representation
   */
  function toHex32String (bytes32 data) public pure returns (string memory) {
    return string (abi.encodePacked (toHex16 (bytes16 (data)), toHex16 (bytes16 (data << 128))));
  }

  function toHex16 (bytes16 data) internal pure returns (bytes32 result) {
    result = bytes32 (data) & 0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000 |
      (bytes32 (data) & 0x0000000000000000FFFFFFFFFFFFFFFF00000000000000000000000000000000) >> 64;
    result = result & 0xFFFFFFFF000000000000000000000000FFFFFFFF000000000000000000000000 |
      (result & 0x00000000FFFFFFFF000000000000000000000000FFFFFFFF0000000000000000) >> 32;
    result = result & 0xFFFF000000000000FFFF000000000000FFFF000000000000FFFF000000000000 |
      (result & 0x0000FFFF000000000000FFFF000000000000FFFF000000000000FFFF00000000) >> 16;
    result = result & 0xFF000000FF000000FF000000FF000000FF000000FF000000FF000000FF000000 |
      (result & 0x00FF000000FF000000FF000000FF000000FF000000FF000000FF000000FF0000) >> 8;
    result = (result & 0xF000F000F000F000F000F000F000F000F000F000F000F000F000F000F000F000) >> 4 |
      (result & 0x0F000F000F000F000F000F000F000F000F000F000F000F000F000F000F000F00) >> 8;
    result = bytes32 (0x3030303030303030303030303030303030303030303030303030303030303030 +
      uint256 (result) +
      (uint256 (result) + 0x0606060606060606060606060606060606060606060606060606060606060606 >> 4 &
      0x0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F) * 7);
  }
}
