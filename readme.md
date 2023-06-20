# Radioactive Punks On-Chain

The punks that survived the cryptopocalypse, let's get sludgy on-chain.

<img width="504" alt="RPUNKS" src="https://i.seadn.io/gae/HeTVDgjX_Q_LB7OYL-rWnKWFggBcLurUoiOidQXzYhsc1RggxbNW3lzqy3saxrUL0A_14F8iBG8GYeC-U43Hb59Bl908VjxZYPO2?auto=format&dpr=1&w=1920">

## Where To Find It?

The contracts are [live on Mainnet](https://etherscan.io/address/0x5694010444cc8fbbed96c23a65fbc3714f624a26#code).

You can use the [Radioactive Punks OS site](https://radioactivepunks.xyz) to view any punk's image and attributes stored on-chain with the Photo Album "app"

Radioactive Punks can be bought and explore on [our site](https://radioactivepunks.xyz) and on [OpenSea](https://opensea.io/collection/radioactive-punks) etc.

## Setting Up

```bash

# Install hardhat and dev dependencies
yarn

# Compile the contracts
yarn compile

# Run tests comparing metadata of every punk
yarn test

# Run tests and keep coverage tabs
yarn coverage
```

Check the [package.json](package.json) to see all available commands.

## How do you know it's a perfect copy of the real Radioactive Punks metadata?

Every metadata JSON file's attributes are checked individually.

Every image was checked manually by eye. I will write an image checker eventually but I'd have to spin up Selenium to properly do that and I'm too lazy to do that right now.

## Design

This is not an ERC-721 token, it is a `ITokenURISupplier` and therefore contains a `tokenURI` method similar to an ERC-721. It returns the on-chain metadata and image renderer for a given Radioactive Punks Token ID. We use this on the original contract for its `METADATA_PROVENANCE_HASH`.

Deployment is modular and split across five main components:

`RadioactivePunksRenderer`: responsible producing an on-chain `tokenURI`

`RadioactivePunksBytesHyperstructure`: the encoded trait data of every punk as bytes in groups of 15

`RadioactivePunksSVGChunk1`: gzipped SVG layer data for all punks

`RadioactivePunksSVGChunk2`: gzipped SVG layer data for all punks

`DataCompiler`: helpful functions for concatenating data into valid Data URI formats

## How does the punk render?

The JS inflates the SVG layers and then appends them into the DOM, hidden. The JS has the encoded punk data injected into it as a string. The JS then uses that encoded data to selectively unhide the correct layers to render that punk. You now have a responsive SVG representation of your punk.

If you'd like to download your punk, right clicking anywhere on the page will trigger a 4k PNG download. It converts the SVG into a 4K PNG without any loss in quality.

## What was the deployment cost?

Approximately `0.44560054 Ether` for all contracts combined.

## Contracts Deployed

### RadioactivePunksRenderer.sol
* 13 gwei
* 0.16157843 ETH
* https://etherscan.io/tx/0xea7806d3943a14c162dc35ad3c720574f3e937934721f096fa7b9f21c722e669

### RadioactivePunksSVGChunk1.sol
* 19.27 gwei
* 0.103113579422061603 ETH
* https://etherscan.io/tx/0x59b98eb7bdf3a834965e8680d082ed2be6f4b7fa567042aae59c8209dbdd00ee

### RadioactivePunksSVGChunk2.sol
* 19 gwei
* 0.042472866 ETH
* https://etherscan.io/tx/0xbfbab49e347f052ed4433f87cac17bf102006583a83c200a580e6c4af6a6158b

### RadioactivePunksSVGHyperstructure.sol
* 20 gwei
* 0.10353022 ETH
* https://etherscan.io/tx/0xa90ec73a34f0855aa986c0e18dd17b250fdd0f72eb8a2bd472aa002989074657

### DataCompiler.sol
* 20 gwei
* 0.03490544 ETH
* https://etherscan.io/tx/0xcbb0d7f7f7647318435e6aa08912318804352da122300461ad6ff88dc3d6922c

## External Contracts

FFLate Mainnet
1. `0xa942F946A35545F50792DA1Ea1ADf0c3b619b921`
2. `0xF10EeDb5ACE715d78e0f89eCd1Dfc3E5874f6e3c`

Goerli
1. `0x86A477028841854D9d02a5BD4fd6936216510A0f`
2. `0xB948057bdd71835b19Ff90aEa03FAd3Ebb66E870`

## The Results

<img width="504" alt="Screen Shot 2023-06-19 at 5 42 20 PM" src="https://github.com/johnnyshankman/radioactive-punks-onchain/assets/6632701/8f080d3c-a998-4507-93fd-eeba276bd14b">
