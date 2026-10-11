# Radioactive Punks On-Chain

The punks that survived the cryptopocalypse, now on-chain.

<img width="504" alt="RPUNKS" src="https://i.seadn.io/gae/HeTVDgjX_Q_LB7OYL-rWnKWFggBcLurUoiOidQXzYhsc1RggxbNW3lzqy3saxrUL0A_14F8iBG8GYeC-U43Hb59Bl908VjxZYPO2?auto=format&dpr=1&w=1920">

## At a Glance

- **Every punk's metadata and image are on-chain.** The NFT contract's `tokenURI` returns an [ERC-4804](https://eips.ethereum.org/EIPS/eip-4804) `web3://` URL, e.g. `web3://0x17F358A4F231D4538Dfed0466FAd1316655EdEe2/tokenJSON/string!6.json` for RPunk #6.
- **The image is an SVG drawn by a contract**, with the radioactive glow pulsing. It's sharp at any size in Chrome and Safari (image renderer V3).
- **The original interactive renderer** (2023) is still live too. It returns an HTML page that unzips the art and stacks it in the browser.
- **Full technical details** of the image renderer are in [image-renderer.md](image-renderer.md).

## Where To Find Them

The contracts are [live on Mainnet](https://etherscan.io/address/0x5694010444cc8fbbed96c23a65fbc3714f624a26#code) and can be played with on Etherscan.

You may use the [Radioactive Punks Operating System Website](https://radioactivepunks.xyz) to view any punk's image and attributes stored on-chain with our PUNK LOOKUP dApp.

![Screen Shot 2023-06-20 at 5 19 10 PM](https://github.com/johnnyshankman/radioactive-punks-onchain/assets/6632701/290d5d91-b502-45a4-85a1-262eb5cc5853)

Radioactive Punks can be bought on [our site](https://radioactivepunks.xyz) and on [OpenSea](https://opensea.io/collection/radioactive-punks) etc.

The original data on Arweave can be found by appending the token ID to the base URL `https://arweave.net/it_O6PjeIBWhQUg2TdGTf5vtCZvGcyOcxvkVYgKuNBQ/<token_id>.json`, for example [RPunk #6 on Arweave](https://arweave.net/it_O6PjeIBWhQUg2TdGTf5vtCZvGcyOcxvkVYgKuNBQ/6.json).

## How Metadata Is Served Today

```
NFT contract  0x073c…0f84
  tokenURI(id) → web3://0x17F3…dEe2/tokenJSON/string!<id>.json
        │
        ▼
RadioactivePunksJSONV2  0x17F3…dEe2           name, artist, attributes, image
  ├── trait names and values ← RadioactivePunksRenderer  0x5694…4A26
  └── image                  ← RadioactivePunksImageV3   0xa708…F651
                                 ├── trait bytes ← RadioactivePunksBytesHyperstructure  0x60de…3E99
                                 └── layer art   ← RadioactivePunksLayerData1 + 2       0x4398…162f, 0xAB65…c0F2
```

The NFT contract's owner, a Safe (`0x780Bf192F272e935985b614Db9Dee1027606b93c`), picks where metadata comes from with `setAPIBaseURL`. Its history:

| Base URL | Serves | Set in |
|---|---|---|
| `https://arweave.net/it_O6PjeIBWhQUg2TdGTf5vtCZvGcyOcxvkVYgKuNBQ/` | Arweave JSON and images | original mint |
| `web3://0xC36C3b966e227F7a68C49512b4bdb4Ca7643c5c3/tokenJSON/string!` | on-chain SVG paths (`RadioactivePunksImage`) | [`0x6f24…cd26`](https://etherscan.io/tx/0x6f244952d440c886de3281007c75e925cd3422bf0f63a54d5d9d2ce447e3cd26) |
| **`web3://0x17F358A4F231D4538Dfed0466FAd1316655EdEe2/tokenJSON/string!`** | **on-chain SVG, sharp (`RadioactivePunksImageV3`), live** | [`0xc8ac…b373`](https://etherscan.io/tx/0xc8acf516b2410e7aa65db821f499e6b01260d98ba995d95724cef04db06eb373) |

Every earlier option is still deployed, so rolling back is a single `setAPIBaseURL` call with one of the earlier base URLs above. Marketplaces show any change after a metadata refresh.

## Contracts on Mainnet

### Live metadata

The contracts in the diagram above.

| Contract | Address | What it does | Deploy cost |
|---|---|---|---|
| `RadioactivePunksJSONV2` | [`0x17F358A4F231D4538Dfed0466FAd1316655EdEe2`](https://etherscan.io/address/0x17F358A4F231D4538Dfed0466FAd1316655EdEe2) | `tokenJSON` for `web3://` URLs, with the V3 image | 0.0000474 ETH ([tx](https://etherscan.io/tx/0x69d4981529879b9d287b54ad2b7021b1f00cc337ba8f87ed9f353d7bec2e6f50)) |
| `RadioactivePunksImageV3` | [`0xa70882d8dc8C3ba853F00f3e8B300916d88FF651`](https://etherscan.io/address/0xa70882d8dc8C3ba853F00f3e8B300916d88FF651) | the image: SVG paths with PNG bitmaps on top | 0.0001008 ETH ([tx](https://etherscan.io/tx/0xd08141bba04c0440181c40e4248f0314bc242a88b018cd3b284e65979adeb8cd)) |
| `RadioactivePunksLayerData1` | [`0x43989D03dC1B2F6CBA55B7B21F3Ba7883d30162f`](https://etherscan.io/address/0x43989D03dC1B2F6CBA55B7B21F3Ba7883d30162f) | packed layer art, part 1 | 0.000817 ETH at 0.156 gwei ([tx](https://etherscan.io/tx/0x624dbbf15c3226f41295348ff7fee71e3d3c55a519d6af4a84a186bdcb25e7bc)) |
| `RadioactivePunksLayerData2` | [`0xAB657a842266A9F5c3b18288BD27eb03da00c0F2`](https://etherscan.io/address/0xAB657a842266A9F5c3b18288BD27eb03da00c0F2) | packed layer art, part 2 | 0.000675 ETH at 0.176 gwei ([tx](https://etherscan.io/tx/0x96f9a31529362f810e1a2b4d5237bc965a715513a6509dcfa463c224f6dd279e)) |
| `RadioactivePunksRenderer` | [`0x5694010444cC8fbbed96c23a65FbC3714F624A26`](https://etherscan.io/address/0x5694010444cC8fbbed96c23a65FbC3714F624A26) | the original renderer; its trait name getters are reused | see below |
| `RadioactivePunksBytesHyperstructure` | [`0x60de3cD89Bc8042A1CaD6375fBCc11ea29c43E99`](https://etherscan.io/address/0x60de3cD89Bc8042A1CaD6375fBCc11ea29c43E99) | every punk's trait bytes | see below |

### Original on-chain renderer

| Contract | Address | What it does | Deploy cost |
|---|---|---|---|
| `RadioactivePunksRenderer` | [`0x5694010444cC8fbbed96c23a65FbC3714F624A26`](https://etherscan.io/address/0x5694010444cC8fbbed96c23a65FbC3714F624A26) | `tokenURI` with an interactive `animation_url` page | 0.16157843 ETH at 13 gwei ([tx](https://etherscan.io/tx/0xea7806d3943a14c162dc35ad3c720574f3e937934721f096fa7b9f21c722e669)) |
| `RadioactivePunksSVGChunk1` | [`0xe80Dc3c529c9B73a118EaEc2092d95F5F6EF912E`](https://etherscan.io/address/0xe80Dc3c529c9B73a118EaEc2092d95F5F6EF912E) | gzipped SVG layer art, part 1 | 0.10311358 ETH at 19.27 gwei ([tx](https://etherscan.io/tx/0x59b98eb7bdf3a834965e8680d082ed2be6f4b7fa567042aae59c8209dbdd00ee)) |
| `RadioactivePunksSVGChunk2` | [`0x44A75ffB472F927CE195FE27383a91D7c3474Ba3`](https://etherscan.io/address/0x44A75ffB472F927CE195FE27383a91D7c3474Ba3) | gzipped SVG layer art, part 2 | 0.04247287 ETH at 19 gwei ([tx](https://etherscan.io/tx/0xbfbab49e347f052ed4433f87cac17bf102006583a83c200a580e6c4af6a6158b)) |
| `RadioactivePunksBytesHyperstructure` | [`0x60de3cD89Bc8042A1CaD6375fBCc11ea29c43E99`](https://etherscan.io/address/0x60de3cD89Bc8042A1CaD6375fBCc11ea29c43E99) | every punk's trait bytes, in groups of 15 | 0.10353022 ETH at 20 gwei ([tx](https://etherscan.io/tx/0xa90ec73a34f0855aa986c0e18dd17b250fdd0f72eb8a2bd472aa002989074657)) |
| `DataCompiler` | [`0xc458129ECA3a3857E50E426107C631f0e99F211c`](https://etherscan.io/address/0xc458129ECA3a3857E50E426107C631f0e99F211c) | helpers for building data URIs | 0.03490544 ETH at 20 gwei ([tx](https://etherscan.io/tx/0xcbb0d7f7f7647318435e6aa08912318804352da122300461ad6ff88dc3d6922c)) |
| `RadioactivePunksRendererV2` | [`0x3d687421fefb01e69b9aeEc9EA3706D13A7C135F`](https://etherscan.io/address/0x3d687421fefb01e69b9aeEc9EA3706D13A7C135F) | wrapper fixing a minor rendering bug | [tx](https://etherscan.io/tx/0x7a4b7f2813ab4419364934a3de9d1a268e900d6cfb0ed655bfa494a1b9158127) |
| `RadioactivePunksJSON` | [`0x5d0CfA6F4F7F0690505dEF6D55EB16cA73f9f134`](https://etherscan.io/address/0x5d0CfA6F4F7F0690505dEF6D55EB16cA73f9f134) | ERC-4804 `tokenJSON` with the `animation_url` | [tx](https://etherscan.io/tx/0x03caec478fa74e2d87e9383d39623b68662445580ef522e4f164298ffe47b8a1) |

The first five were deployed in 2023 and cost about **0.4456 ETH** together. `RadioactivePunksRendererV2` and `RadioactivePunksJSON` were added as wrappers in October 2026.

### Earlier image renderers

Still deployed, but no longer used by the NFT contract.

| Contract | Address | Status | Deploy cost |
|---|---|---|---|
| `RadioactivePunksImage` | [`0x91Bb63799C7eb09a2b54dBA4b745E7452eE7bc73`](https://etherscan.io/address/0x91Bb63799C7eb09a2b54dBA4b745E7452eE7bc73) | SVG paths. Thin seams between colors in Chrome. | 0.000302 ETH at 0.291 gwei ([tx](https://etherscan.io/tx/0xd7cdec82416375863d5c67d5a04a33d53cab8be23cf58fdffd2ea47bd705ac00)) |
| `RadioactivePunksJSONV2` | [`0xC36C3b966e227F7a68C49512b4bdb4Ca7643c5c3`](https://etherscan.io/address/0xC36C3b966e227F7a68C49512b4bdb4Ca7643c5c3) | its JSON; the rollback target | 0.000146 ETH at 0.207 gwei ([tx](https://etherscan.io/tx/0xdfd523511345adbed9f6374019ba8ffc884ec4a3c28353c8e196a237649aed81)) |
| `RadioactivePunksImageV2` | [`0x3b23042cC1E018914B315cAeC2801D357cE5B36e`](https://etherscan.io/address/0x3b23042cC1E018914B315cAeC2801D357cE5B36e) | PNG bitmaps only. Blurry in Safari, never used. | 0.0000926 ETH ([tx](https://etherscan.io/tx/0x0d03700b51ca59b3a7f3b774502b65b25fb2f797b66705ad9d0b0ebb44ef2ea5)) |
| `RadioactivePunksJSONV2` | [`0xB7ca6E7905641b0b49E5F6a5c9f1C527AC1cd4e7`](https://etherscan.io/address/0xB7ca6E7905641b0b49E5F6a5c9f1C527AC1cd4e7) | its JSON, never used | 0.0000466 ETH ([tx](https://etherscan.io/tx/0xe26208fe87d77e38143bdb5e067dccada5054a86633f68eee6c8927bc0489fc3)) |
| `RadioactivePunksImage` | [`0x4262F8e727601FA0AE7E4820712108B08b9752E7`](https://etherscan.io/address/0x4262F8e727601FA0AE7E4820712108B08b9752E7) | a second copy, deployed by mistake, never used | 0.0000639 ETH ([tx](https://etherscan.io/tx/0x44e775d2e054e0bed6a41c320ab19ea7cb823c6a9f2c7005d4909b86a66a7da3)) |

### External contracts

FFLate on Mainnet:
1. `0xa942F946A35545F50792DA1Ea1ADf0c3b619b921`
2. `0xF10EeDb5ACE715d78e0f89eCd1Dfc3E5874f6e3c`

FFLate on Goerli:
1. `0x86A477028841854D9d02a5BD4fd6936216510A0f`
2. `0xB948057bdd71835b19Ff90aEa03FAd3Ebb66E870`

## How the Punks Render

**The original renderer (`animation_url`).** The JS inflates the SVG layers and then appends them into the DOM, hidden. The JS has the encoded punk data injected into it as a string. The JS then uses that encoded data to selectively unhide the correct layers to render that punk. You now have a responsive SVG representation of your punk.

If you'd like to download your punk, right clicking anywhere on the page will trigger a 4k PNG download. It converts the SVG into a 4K PNG without any loss in quality.

**The image renderer (`image`).** The contract picks a punk's layers with the same rules as the original JS, stacks them into a 24×24 grid and writes it out as an SVG. V3 draws it twice:
- **SVG paths**, one per color, for any renderer.
- **PNG bitmaps on top as HTML images**, which browsers draw. Browsers would otherwise show thin seams between colors at some sizes.

See [image-renderer.md](image-renderer.md) for how it works, why each version exists and how each was verified.

<img width="504" alt="Screen Shot 2023-06-19 at 5 42 20 PM" src="https://github.com/johnnyshankman/radioactive-punks-onchain/assets/6632701/8f080d3c-a998-4507-93fd-eeba276bd14b">

## Design

This is not an ERC-721 token, it is a `ITokenURISupplier` and therefore contains a `tokenURI` method similar to an ERC-721. It returns the on-chain metadata and image renderer for a given Radioactive Punks Token ID. We use this on the original contract for its `METADATA_PROVENANCE_HASH`.

Deployment is modular. The components:

| Contract | Role |
|---|---|
| `RadioactivePunksRenderer` / `RadioactivePunksRendererV2` | JSON data URL with the interactive `animation_url` |
| `RadioactivePunksJSON` | ERC-4804 `tokenJSON()` with the `animation_url`, for `web3://` URLs |
| `RadioactivePunksJSONV2` | ERC-4804 `tokenJSON()` with an on-chain `image` instead |
| `RadioactivePunksImageV3` | the live image: SVG paths with PNG bitmaps on top |
| `RadioactivePunksImage`, `RadioactivePunksImageV2` | earlier images: paths only, bitmaps only |
| `RadioactivePunksLayerData1` / `2` | the layer art, packed for the image renderers |
| `RadioactivePunksBytesHyperstructure` | the encoded trait data of every punk as bytes in groups of 15 |
| `RadioactivePunksSVGChunk1` / `2` | gzipped SVG layer data for the original renderer |
| `DataCompiler` | helpful functions for concatenating data into valid Data URI formats |

Why no use of "SSTORE2" in the original contracts, you may ask? Well once you fill up the entire contract with bytes or string data there is no efficiency to be gained on deployment by using SSTORE2: either way you pay 200 gas per byte of code, and SSTORE2 adds a little overhead.

Where SSTORE2 does pay off is reading only part of the data. The original renderer sends every layer to the browser, so it reads each chunk whole through its `data()` getter. The image renderers only need the ~11 layers a single punk uses, so the `RadioactivePunksLayerData` chunks store their data as contract code, SSTORE2-style, and the renderers copy just the bytes they need with `EXTCODECOPY`. That cut the gas to load a punk's data from about 544K (through `data()` getters) to about 39K.

## Setting Up

```bash
# Install hardhat and dev dependencies
yarn

# Compile the contracts
yarn compile

# Run every test, including comparing metadata of every punk
yarn test

# Run tests and keep coverage tabs
yarn coverage
```

Check the [package.json](package.json) to see all available commands.

Useful scripts for the image renderer:

| Command | What it does |
|---|---|
| `npx hardhat test test/RadioactivePunksImageV3Test.js` | renders all 1,614 punks through V3 and compares them byte-for-byte with the JS reference (about 13 minutes) |
| `node scripts/bitmap-svg.js <id> paths+html` | prints a punk's V3 SVG from the JS reference |
| `node scripts/preview-bitmap.js` | writes `preview/bitmap.html`, comparing every image format at awkward sizes |
| `npx hardhat run scripts/preview-images.js` | writes `preview/index.html`, a gallery of the glow animation |
| `npm run deploy-page` | serves the wallet deploy page at http://localhost:5173 (**Full deploy** and **V3 upgrade** tabs) |

## How do you know it's a perfect copy of the real Radioactive Punks metadata?

Every metadata JSON file's attributes are checked individually.

The image renderers are tested byte-for-byte against JavaScript references for all 1,614 punks. The reference for the paths was checked pixel by pixel against the original renderer's stacked layers, and V3 draws the same grid as bitmaps. See [image-renderer.md](image-renderer.md#testing).

Every image from the original renderer was checked manually by eye.

## Getting this Data from an RPC

Here's an example of getting the data of Punk #0 from the original renderer, through the Cloudflare Public Ethereum RPC:
```
curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0", "id":1, "method":"eth_call", "params":[{"to":"0x5694010444cC8fbbed96c23a65FbC3714F624A26", "data":"0xc87b56dd0000000000000000000000000000000000000000000000000000000000000000"},"latest"]}' https://cloudflare-eth.com/
```

The live metadata comes from `tokenJSON(uint256)` on `0x17F358A4F231D4538Dfed0466FAd1316655EdEe2`, or through any `web3://` client.

Want to create an API that serves a chained punk or your own similar on chain `ITokenURISupplier` contract? Deploy a TokenURI Proxy Server using a free Heroku node and Public RPC Node!
* https://github.com/johnnyshankman/tokenuri-proxy-server

## Improvements and Oversights

1. Had I reordered the BytesHyperstructure to use the same indexing as the original NFT contract, I could've avoided the need for the entire `TOKEN_ID_TO_BYTES_LOOKUP` data structure, saving quite a lot of gas on deployment.
2. I probably could've used SSTORE2 for a few minor strings to save minor amounts of gas upon deployment of the `RadioactivePunksRenderer.sol` file. The newer image renderers do use SSTORE2-style storage for their layer data, for cheaper reads rather than cheaper deployment (see Design above).
3. ~~Maybe use [EIP-681](https://eips.ethereum.org/EIPS/eip-681) or [EIP-4804](https://eips.ethereum.org/EIPS/eip-4804) on the original NFT contract's `tokenURI` though the contract haphazardly appends `.json` at the end of every returned URI so that may never be a feasible thing for us.~~ Solved with [ERC-4804](https://eips.ethereum.org/EIPS/eip-4804). The original contract builds token URIs as `<API_BASE_URL><tokenId>.json`, and a bare `8.json` argument in a `web3://` URL is treated as a domain name. ERC-4804's explicit `string!` argument type works around that: with the base URL set to `web3://<JSON contract>/tokenJSON/string!`, token URIs become `web3://<JSON contract>/tokenJSON/string!8.json`. That calls `tokenJSON(string)`, which reads the token ID from `"8.json"`, and the `.json` suffix makes ERC-4804 clients serve the result as `application/json`. `RadioactivePunksJSON` and `RadioactivePunksJSONV2` both support it, see [image-renderer.md](image-renderer.md).

## Shoutouts

This would not have been possible if I was not standing upon the shoulders of these giants:
* [CryptoadzChained by Wattysart](https://github.com/wattsyart/cryptoadz-chained)
* [Roses by Dom.eth](https://etherscan.io/address/0x3e743377417cd7ca70dcc9bf08fac55664ed3181)
* [Crypto Coaster by Xtremetom](https://opensea.io/collection/crypto-coaster-3d)
* [Forgotten Runes Wizard Cult On Chain Migration](https://www.forgottenrunes.com/posts/on-chain)
* [Chaos Roads by Chain Leftist](https://twitter.com/ChainLeftist)
* [JPEG On Chain Curation](https://jpg.space/canons/onchain/pending)
* [Why on chain? by 0xmons](https://blog.0xmons.xyz/79081566310)

Please support their projects, art, and personal social media accounts.
