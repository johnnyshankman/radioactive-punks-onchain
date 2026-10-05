# On-Chain Image Renderer

`RadioactivePunksImage` renders every Radioactive Punk as a static SVG entirely on-chain, and `RadioactivePunksJSONV2` serves ERC-4804 (`web3://`) metadata with that SVG as a standard `image` field:

```json
{
  "name": "Radioactive Punk #6",
  "artist": "Pixantle",
  "technologist": "White Lights",
  "attributes": [{ "trait_type": "Radioactive Glow", "value": "Radioactive Green" }, ...],
  "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0i..."
}
```

This replaces the interactive `animation_url` HTML page served by `RadioactivePunksJSON` with a plain image that marketplaces can show directly in thumbnails and grids.

## Why

Marketplaces use `image` for thumbnails, collection grids and previews. The original on-chain metadata only has an `animation_url`: an HTML page that unzips the art in the browser and stacks it with JavaScript. Without an `image`, punks may show up blank in grids.

The art already on-chain can't be used directly from Solidity. `RadioactivePunksSVGChunk1` + `2` hold the whole spritesheet as one gzipped blob, and unzipping 617 KB on-chain would cost far more than any RPC's read limit. So the art is stored again in a compact form built for on-chain rendering.

## Contracts

| Contract | Size | Purpose |
|---|---|---|
| `RadioactivePunksLayerData1` | 24.0 KB | Packed layer art, part 1 (generated) |
| `RadioactivePunksLayerData2` | 17.5 KB | Packed layer art, part 2 (generated) |
| `RadioactivePunksImage` | 4.1 KB | `tokenSVG(id)`, `tokenImage(id)`, `traitBytes(id)` |
| `RadioactivePunksJSONV2` | 2.9 KB | `tokenJSON(uint256)`, `tokenJSON(string)` |

Reused from the existing deployment (nothing to redeploy):

- `RadioactivePunksBytesHyperstructure` (`0x60de3cd89bc8042a1cad6375fbcc11ea29c43e99`) for each punk's trait bytes.
- `RadioactivePunksRenderer` (`0x5694010444cC8fbbed96c23a65FbC3714F624A26`) for trait names and values, through its public getters (`TRAIT_NAMES`, `HEAD`, `EYES`, ...). Its expensive `tokenURI` is never called.

### `RadioactivePunksImage`

- `tokenSVG(uint256)` returns the raw `<svg ...>...</svg>`.
- `tokenImage(uint256)` returns it as `data:image/svg+xml;base64,...`.
- `traitBytes(uint256)` returns the 16 trait bytes, the same as `RadioactivePunksRenderer.getPunkDataAtOffset`.
- Reverts with `TokenDoesNotExist()` for IDs that aren't Radioactive Punks.
- The constructor reverts with `WrongTraitsContract()` unless the traits address holds the expected trait data (it checks token 0's bytes).

### `RadioactivePunksJSONV2`

Same interface as `RadioactivePunksJSON`:

```
web3://<address>/tokenJSON/string!8.json  -> tokenJSON(string)
web3://<address>/tokenJSON/8              -> tokenJSON(uint256)
```

The first form is what the original RPUNK contract produces with its base URL set to `web3://<address>/tokenJSON/string!`, since it builds token URIs as `<API_BASE_URL><tokenId>.json`. ERC-4804 needs the explicit `string!` type because it treats a bare `8.json` argument as a domain name. The `.json` suffix of the last argument tells ERC-4804 clients to serve the result as `application/json`.

`tokenJSON(string)` accepts one or more digits followed by exactly `.json` (`8.json`, `9999.json`, `006.json`). Anything else reverts with `InvalidTokenPath()`.

Apart from `animation_url` becoming `image`, the JSON is identical to `RadioactivePunksJSON`'s.

## How it renders

1. **Find the punk.** The packed data includes the sorted list of token IDs, in the same order as the hyperstructure. A binary search gives the punk's position, and its 15 trait bytes are copied straight out of the hyperstructure's code.
2. **Pick layers.** This is a direct port of the original renderer's JavaScript `render()`:
   - Layers are drawn in trait byte order 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14. Byte 7 (beard color) is skipped, and so is byte 12 (horns) when it's 0.
   - Each layer is the symbol `"<byte>-<value>"`, with the original's special cases:
     - the beard folds in its color and the glow color
     - smoke, hair, most hats and nose 4 add the glow color
     - dead heads add `-0`
     - horns use the head value plus dead/alive
     - byte 14 maps to the gun's `15-<value>`
   - The 10 one-of-one tokens (698, 2536, 60, 370, 528, 246, 420, 201, 1360, 878) draw their own single image.
   - IDs with no art (e.g. `6-0`, "no beard") draw nothing, just like the original's `<use>` of a missing symbol.
3. **Stack.** Each layer's color runs are painted into a 24×24 grid, later layers covering earlier ones.
4. **Write SVG.** The grid becomes horizontal runs, with one `<path>` per color in order of first appearance, on a `#473682` purple background:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" shape-rendering="crispEdges"><rect width="24" height="24" fill="#473682"/><path fill="#7cff2f" d="M5 2h3v1h-3z..."/>...</svg>
```

Output is 1.6 to 4.1 KB of SVG per punk (about 2.5 KB on average), roughly 2.5× smaller than the Arweave versions.

### Background

Every punk gets a `#473682` purple background. The original renderer and the Arweave images use `#1f2e3d` navy, so this is the one intentional change from the original art: every pixel that was background is now purple, and nothing else changes.

The original art paints its background color in one place: each of the 10 one-of-ones starts with a full-canvas `#1f2e3d` rectangle (`M0 0h24v24H0z`). The packer skips exactly that rectangle, since the renderer draws its own background, so the one-of-ones get the purple background like every other punk. No other art uses `#1f2e3d`.

Because the layers are flattened into a single grid, nothing overlaps. That also avoids the background seams that appear between stacked layers at fractional pixel sizes.

### Dead punks

515 of the 1,614 punks are dead. They use the "simple rot" heads that the existing on-chain renderer uses (`img/dead-heads-simple`), so the image matches today's on-chain art exactly. The Arweave images use unique per-punk rot (`img/dead-heads`), so dead punks differ from Arweave in their rot texture. Apart from the background color, alive punks match Arweave exactly.

## Packed data format

`scripts/pack-layer-data.js` builds the data from the repo's own `RadioactivePunksSVGChunk1` + `2` sources: base64-decoded and gunzipped, byte-identical to the 616,755-byte spritesheet the browser unzips. It writes `RadioactivePunksLayerData1.sol` and `RadioactivePunksLayerData2.sol`.

```
node scripts/pack-layer-data.js
```

Layout of the 41,473-byte blob (big-endian):

| Section | Format |
|---|---|
| Palette | `u16 count`, then 3-byte RGB colors (273) |
| Layer index | `u16 count`, then 8-byte entries sorted by key: `u32 key, u16 firstRun, u16 runCount` (242) |
| Token IDs | `u16 count`, then `u16` token IDs in hyperstructure order (1,614) |
| Runs | 3 bytes each, `x:5 \| y:5 \| length:5 \| colorIndex:9` (11,828) |

A layer key packs the parts of a layer ID such as `9-3-1` into four bytes, with `0xFF` for missing parts. One-of-one layers use `0xFE` in the top byte and the token ID below it.

Each data contract's code is a STOP byte (`0x00`) followed by its part of the blob, so calling it does nothing. `RadioactivePunksImage` reads only the bytes it needs with `EXTCODECOPY`: the palette, index and token list, then just the ~11 layers a punk uses. The trait bytes start at byte 182 of the hyperstructure's code on mainnet. The constructor's token 0 check guards that offset.

Every shape in the art is an axis-aligned rectangle: 23,789 single pixels plus the ten 24×24 one-of-one backgrounds. The packer fills each rectangle's cells and fails if it ever finds a shape that isn't a rectangle.

One quirk in the art: two white eye pixels in layer `4-3` ("Cute" eyes) carry an extra `xmlns` attribute. The packer reads path attributes in any order, so they're kept. Missing them caused a 2-pixel difference on 138 punks in early testing.

## Gas

Read gas (`eth_estimateGas`):

| Call | Gas |
|---|---|
| `RadioactivePunksJSON.tokenJSON` (existing, `animation_url`) | 12.2M to 13.0M |
| `RadioactivePunksJSONV2.tokenJSON` | **0.74M to 1.23M** |
| `RadioactivePunksImage.tokenImage` | 0.50M to 0.97M |
| `RadioactivePunksImage.tokenSVG` | 0.37M to 0.69M |

These are far below the default `eth_call` caps (Geth, Erigon and Reth 50M; Nethermind 100M; Alchemy 550M). Most of the savings come from two things:

- the grid painting and SVG writing are in inline assembly
- the art is read directly from contract code rather than through `data()` getters, which copy whole 17 to 24 KB chunks through ABI encoding

## Deploying

Deploy in this order:

1. `RadioactivePunksLayerData1` (no arguments)
2. `RadioactivePunksLayerData2` (no arguments)
3. `RadioactivePunksImage(0x60de3cd89bc8042a1cad6375fbcc11ea29c43e99, <LayerData1>, <LayerData2>)`
4. `RadioactivePunksJSONV2(0x5694010444cC8fbbed96c23a65FbC3714F624A26, <Image>)`

### With the deploy page

```
npm run deploy-page
```

This does a clean compile, packages the tested bytecode for the page, and serves it at http://localhost:5173. Wallet extensions don't connect to pages opened straight from disk, so it needs the local server.

1. **Connect your wallet.** Wallets are found through EIP-6963, with Rainbow listed first. If you're not on mainnet, the page warns you and offers to switch.
2. **Deploy each contract in order.** On mainnet, the trait data and original renderer addresses are pre-filled, and each step's address fills into the later steps automatically.
3. **Check the deployment.** Render any punk through the new `RadioactivePunksJSONV2`, then copy the exact `setAPIBaseURL` value.

The page checks your inputs before anything is sent:

- Every address field is checked on-chain. The layer data and image fields must match the tested contracts exactly, so wrong or swapped addresses are flagged.
- Each deploy's gas and cost are estimated at the live gas price.
- A deploy that would revert shows why, e.g. `Reverted with WrongTraitsContract()`.

After each deploy:

- The new contract's code is compared with the tested build, ignoring the constructor's address values.
- Addresses and transactions are saved in your browser, per chain, so a reload doesn't lose progress.

The page deploys bytecode from solc 0.8.20 with 200 optimizer runs and the default EVM version (Shanghai), the same build the tests run against. `scripts/build-deploy-page.js` refuses to package anything else. To verify the contracts on Etherscan, use those settings and the page's **Download Standard-JSON input** link, which covers all four contracts.

Files:

- `deploy/index.html`, `deploy/app.js`: the page, using [viem](https://viem.sh) 2.57.3.
- `scripts/build-deploy-page.js`: writes `deploy/contracts.js` (ABIs, bytecode and expected code) and `deploy/standard-input.json`. Both are generated and git-ignored.
- `scripts/serve-deploy-page.js`: the local server.

Measured deploy gas, priced at 0.078 gwei and $2,700 per ETH:

| Contract | Gas | ETH | USD |
|---|---|---|---|
| `RadioactivePunksLayerData1` | 5,238,855 | 0.000409 | $1.10 |
| `RadioactivePunksLayerData2` | 3,833,302 | 0.000299 | $0.81 |
| `RadioactivePunksImage` | 976,906 | 0.000076 | $0.21 |
| `RadioactivePunksJSONV2` | 703,387 | 0.000055 | $0.15 |
| **Total** | **10,752,450** | **0.000839** | **$2.26** |

- Nearly all of the cost is the 200 gas per byte of deployed code for the 41.5 KB of art.
- The EIP-7623 calldata floor doesn't apply to any of these deploys.
- The largest deploy (5.24M gas) is well under mainnet's 16.78M per-transaction gas cap.
- Expect a little more in practice for the priority fee.

To point the original contract at it, call `setAPIBaseURL` on `0x073ca28e04719c05a5a48c1d992091b4075a0f84` from its owner with:

```
web3://<RadioactivePunksJSONV2 address>/tokenJSON/string!
```

Check how OpenSea and other marketplaces display `web3://` metadata before doing this on mainnet. The base URL can be changed back as long as the contract isn't frozen. The current Arweave base URL is `https://arweave.net/it_O6PjeIBWhQUg2TdGTf5vtCZvGcyOcxvkVYgKuNBQ/`.

## Testing

```
npx hardhat test test/RadioactivePunksImageTest.js test/RadioactivePunksJSONV2Test.js
```

Both suites deploy everything locally, including a copy of the trait data and of the original renderer for its getters.

**`RadioactivePunksImageTest.js`** (about 5 minutes):

- Renders every one of the 1,614 punks and requires the SVG to be byte-for-byte identical to the JavaScript reference in `scripts/reference-svg.js`.
- Checks that the data contracts hold exactly what the packer produces.
- Checks trait bytes, the base64 data URI, nonexistent tokens, the constructor's traits check, and gas.

**`RadioactivePunksJSONV2Test.js`** (about 1 minute):

- For 9 punks (alive, dead, one-of-ones, 1 to 4 digit IDs), requires the JSON to equal the live mainnet `RadioactivePunksJSON` output exactly, with `animation_url` replaced by `image`. Set `MAINNET_RPC_URL` to use a different RPC than the default public one.
- Checks the JSON shape for every 10th punk.
- Checks `"<id>.json"` handling, 17 malformed paths, overflow, nonexistent tokens and gas.

The JavaScript reference itself was checked in headless Chrome:

- For all 1,614 punks, every pixel matches the original renderer's stacked `<use>` layers, except pixels that were the old `#1f2e3d` background, which are now `#473682`. No `#1f2e3d` remains in any image.
- Before the background change, it matched the Arweave `image` exactly for a sample of alive punks, including one-of-ones.

```
node scripts/reference-svg.js 6   # prints token 6's SVG
```

The tests run on solc 0.8.20, the repo's default compiler. Hardhat 2.14 can't run newer EVM instructions locally, so building with a newer compiler for deployment produces different bytecode than what was tested here, even though the source is the same.
