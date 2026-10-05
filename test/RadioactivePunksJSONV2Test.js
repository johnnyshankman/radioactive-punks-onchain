const { ethers } = require("hardhat");
const { expect } = require("chai");
const { createReference } = require("../scripts/reference-svg");

// RadioactivePunksJSON on mainnet, whose output V2 must match apart from
// `animation_url` -> `image`
const RPC_URL = process.env.MAINNET_RPC_URL || "https://ethereum-rpc.publicnode.com";
const JSON_V1_ADDRESS = "0x5d0CfA6F4F7F0690505dEF6D55EB16cA73f9f134";

const BAD_PATHS = [
  "", ".json", "8", "8.", "8.jso", "8.JSON", "8.png", "a.json", "-1.json", "+8.json",
  " 8.json", "8 .json", "8.json ", "8.json.json", "0x8.json", "8/.json", "/8.json",
];

describe("RPUNKS JSON V2 TEST", async () => {
  let json;
  let reference;
  let tokenIds;

  before(async function () {
    this.timeout(300000);
    reference = createReference();
    tokenIds = Object.keys(reference.traits).map(Number);

    const deploy = async (name, ...args) => {
      const factory = await ethers.getContractFactory(name);
      const contract = await factory.deploy(...args);
      await contract.deployed();
      return contract;
    };

    // a local copy of the original renderer, only for its trait getters
    const renderer = await deploy("RadioactivePunksRenderer");
    const traits = await deploy("RadioactivePunksBytesHyperstructure");
    const data1 = await deploy("RadioactivePunksLayerData1");
    const data2 = await deploy("RadioactivePunksLayerData2");
    const image = await deploy("RadioactivePunksImage", traits.address, data1.address, data2.address);
    json = await deploy("RadioactivePunksJSONV2", renderer.address, image.address);
  });

  const imageOf = (tokenId) =>
    "data:image/svg+xml;base64," + Buffer.from(reference.tokenSVG(tokenId)).toString("base64");

  it('matches mainnet RadioactivePunksJSON exactly, with image instead of animation_url', async function () {
    this.timeout(300000);
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const v1 = new ethers.Contract(JSON_V1_ADDRESS, ["function tokenJSON(uint256) view returns (string)"], provider);

    // alive, dead, one-of-ones, and 1-4 digit IDs
    for (const tokenId of [0, 4, 6, 32, 60, 698, 1000, 2536, 2999]) {
      const old = await v1.tokenJSON(tokenId);
      const cut = old.indexOf(',"animation_url":"');
      expect(cut, `token ${tokenId} animation_url`).to.be.greaterThan(0);
      const expected = old.slice(0, cut) + ',"image":"' + imageOf(tokenId) + '"}';

      expect(await json["tokenJSON(uint256)"](tokenId), `token ${tokenId}`).to.equal(expected);
    }
  });

  it('returns valid JSON with the expected fields for a spread of punks', async function () {
    this.timeout(600000);
    for (const tokenId of tokenIds.filter((_, i) => i % 10 === 0)) {
      const meta = JSON.parse(await json["tokenJSON(uint256)"](tokenId));
      expect(Object.keys(meta)).to.deep.equal(["name", "artist", "technologist", "attributes", "image"]);
      expect(meta.name).to.equal(`Radioactive Punk #${tokenId}`);
      expect(meta.attributes).to.have.length(15);
      expect(meta.image).to.equal(imageOf(tokenId));
    }
  });

  it('tokenJSON("<id>.json") matches tokenJSON(<id>)', async function () {
    this.timeout(120000);
    for (const tokenId of [0, 6, 1000, 2999]) {
      expect(await json["tokenJSON(string)"](`${tokenId}.json`)).to.equal(await json["tokenJSON(uint256)"](tokenId));
    }
    expect(await json["tokenJSON(string)"]("006.json")).to.equal(await json["tokenJSON(uint256)"](6));
  });

  for (const path of BAD_PATHS) {
    it(`reverts with InvalidTokenPath for ${JSON.stringify(path)}`, async () => {
      await expect(json["tokenJSON(string)"](path)).to.be.revertedWithCustomError(json, "InvalidTokenPath");
    });
  }

  it('reverts on token IDs too large for uint256', async () => {
    await expect(json["tokenJSON(string)"]("9".repeat(80) + ".json")).to.be.reverted;
  });

  it('reverts for punks that do not exist', async () => {
    const image = await ethers.getContractAt("RadioactivePunksImage", await json.image());
    await expect(json["tokenJSON(uint256)"](1)).to.be.revertedWithCustomError(image, "TokenDoesNotExist");
    await expect(json["tokenJSON(string)"]("1.json")).to.be.revertedWithCustomError(image, "TokenDoesNotExist");
  });

  it('stays well under eth_call gas caps', async () => {
    const gas = {};
    for (const tokenId of [0, 6, 1000, 2999]) {
      gas[tokenId] = (await json.estimateGas["tokenJSON(string)"](`${tokenId}.json`)).toNumber();
    }
    console.log("      gas:", JSON.stringify(gas));
    for (const g of Object.values(gas)) expect(g).to.be.lessThan(2_000_000);
  });
});
