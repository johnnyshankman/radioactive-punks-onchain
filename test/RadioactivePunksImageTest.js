const { ethers } = require("hardhat");
const { expect } = require("chai");
const { createReference } = require("../scripts/reference-svg");
const { pack } = require("../scripts/pack-layer-data");

describe("RPUNKS IMAGE TEST", async () => {
  let image;
  let reference;
  let tokenIds;

  before(async function () {
    this.timeout(120000);
    reference = createReference();
    tokenIds = Object.keys(reference.traits).map(Number);

    const deploy = async (name, ...args) => {
      const factory = await ethers.getContractFactory(name);
      const contract = await factory.deploy(...args);
      await contract.deployed();
      return contract;
    };

    const traits = await deploy("RadioactivePunksBytesHyperstructure");
    const data1 = await deploy("RadioactivePunksLayerData1");
    const data2 = await deploy("RadioactivePunksLayerData2");
    image = await deploy("RadioactivePunksImage", traits.address, data1.address, data2.address);
  });

  it('layer data contracts hold exactly what the packer produces', async () => {
    const code1 = await ethers.provider.getCode(await image.layerData1());
    const code2 = await ethers.provider.getCode(await image.layerData2());
    // each chunk's code is a STOP byte followed by its data
    expect(code1.slice(0, 4)).to.equal("0x00");
    expect(code2.slice(0, 4)).to.equal("0x00");
    expect("0x" + code1.slice(4) + code2.slice(4)).to.equal("0x" + pack().blob.toString("hex"));
  });

  it('rejects a traits contract without the expected trait bytes', async () => {
    const factory = await ethers.getContractFactory("RadioactivePunksImage");
    const data1 = await image.layerData1();
    await expect(factory.deploy(data1, data1, await image.layerData2()))
      .to.be.revertedWithCustomError(factory, "WrongTraitsContract");
  });

  it('returns the same trait bytes as the original renderer', async () => {
    for (const tokenId of [0, 6, 28, 1000, 2999]) {
      expect(await image.traitBytes(tokenId)).to.equal("0x" + reference.traits[tokenId]);
    }
  });

  it('renders every punk byte-for-byte like the JS reference', async function () {
    this.timeout(600000);
    const mismatches = [];
    for (const tokenId of tokenIds) {
      const svg = await image.tokenSVG(tokenId);
      if (svg !== reference.tokenSVG(tokenId)) mismatches.push(tokenId);
    }
    expect(mismatches, `mismatched tokens: ${mismatches.slice(0, 20).join(", ")}`).to.have.length(0);
    expect(tokenIds).to.have.length(1614);
  });

  it('wraps the SVG as a base64 data URI', async () => {
    const uri = await image.tokenImage(6);
    const prefix = "data:image/svg+xml;base64,";
    expect(uri.startsWith(prefix)).to.equal(true);
    expect(Buffer.from(uri.slice(prefix.length), "base64").toString()).to.equal(reference.tokenSVG(6));
  });

  it('reverts for punks that do not exist', async () => {
    for (const tokenId of [1, 2, 3, 3000, 99999]) {
      await expect(image.tokenSVG(tokenId)).to.be.revertedWithCustomError(image, "TokenDoesNotExist");
    }
  });

  it('stays well under eth_call gas caps', async () => {
    const gas = {};
    for (const tokenId of [0, 6, 2999, 1000]) {
      gas[tokenId] = {
        svg: (await image.estimateGas.tokenSVG(tokenId)).toNumber(),
        image: (await image.estimateGas.tokenImage(tokenId)).toNumber(),
      };
    }
    console.log("      gas:", JSON.stringify(gas));
    for (const g of Object.values(gas)) expect(g.image).to.be.lessThan(2_000_000);
  });
});
