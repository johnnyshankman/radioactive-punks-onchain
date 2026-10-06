const { ethers, artifacts } = require("hardhat");
const { expect } = require("chai");

/**
 * RadioactivePunksJSON uses the CLZ opcode (osaka), which Hardhat 2.14's EVM
 * doesn't support, and it reads from the live V2 renderer. So these tests
 * `eth_call` mainnet with a state override that places the freshly compiled
 * runtime bytecode at a scratch address. Nothing is deployed.
 */
const RPC_URL = process.env.MAINNET_RPC_URL || "https://ethereum-rpc.publicnode.com";
const V2_ADDRESS = "0x3d687421fefb01e69b9aeEc9EA3706D13A7C135F";
const JSON_ADDRESS = "0x000000000000000000000000000000000000150A";

// existing punks with 1, 2, 3 and 4 digit IDs
const TOKEN_IDS = [0, 6, 28, 100, 1000, 2999];

const BAD_PATHS = [
  "",
  ".json",
  "8",
  "8.",
  "8.jso",
  "8.JSON",
  "8.png",
  "a.json",
  "-1.json",
  "+8.json",
  " 8.json",
  "8 .json",
  "8.json ",
  "8.json.json",
  "0x8.json",
  "8/.json",
  "/8.json",
];

describe("RPUNKS JSON TEST", async () => {
  let provider;
  let iface;
  let overrides;

  const call = async (signature, args) => {
    const data = iface.encodeFunctionData(signature, args);
    const result = await provider.send("eth_call", [{ to: JSON_ADDRESS, data }, "latest", overrides]);
    return iface.decodeFunctionResult(signature, result)[0];
  };

  const expectRevert = async (signature, args, error) => {
    let thrown;
    try {
      await call(signature, args);
    } catch (e) {
      thrown = e;
    }
    expect(thrown, `${signature} ${JSON.stringify(args)} should revert`).to.not.equal(undefined);
    if (error) {
      const data = thrown.error?.data?.data || thrown.error?.data || thrown.data;
      expect(data).to.equal(iface.getSighash(error));
    }
  };

  before(async function () {
    this.timeout(60000);
    provider = new ethers.providers.JsonRpcProvider(RPC_URL);

    const artifact = await artifacts.readArtifact("RadioactivePunksJSON");
    iface = new ethers.utils.Interface(artifact.abi);
    overrides = { [JSON_ADDRESS]: { code: artifact.deployedBytecode } };
  });

  it('points at the deployed V2 renderer', async () => {
    expect(await call("RENDERER", [])).to.equal(V2_ADDRESS);
  });

  for (const tokenId of TOKEN_IDS) {
    it(`tokenJSON("${tokenId}.json") matches tokenJSON(${tokenId})`, async function () {
      this.timeout(60000);
      const byId = await call("tokenJSON(uint256)", [tokenId]);
      const byPath = await call("tokenJSON(string)", [`${tokenId}.json`]);

      expect(byPath).to.equal(byId);

      const json = JSON.parse(byPath);
      expect(json.name).to.equal(`Radioactive Punk #${tokenId}`);
      expect(json.attributes).to.have.length(15);
      expect(json.animation_url.startsWith("data:text/html,")).to.equal(true);
      // decoded once from the renderer, so the script is now single-encoded
      expect(json.animation_url).to.include("Math%2Efloor%28e%2F24%29%2A24");
    });
  }

  it('accepts leading zeros', async function () {
    this.timeout(60000);
    expect(await call("tokenJSON(string)", ["006.json"]))
      .to.equal(await call("tokenJSON(uint256)", [6]));
  });

  for (const path of BAD_PATHS) {
    it(`reverts with InvalidTokenPath for ${JSON.stringify(path)}`, async () => {
      await expectRevert("tokenJSON(string)", [path], "InvalidTokenPath");
    });
  }

  it('reverts on token IDs too large for uint256', async () => {
    await expectRevert("tokenJSON(string)", ["9".repeat(80) + ".json"]);
  });

  it('reverts like the renderer for a punk that does not exist', async function () {
    this.timeout(60000);
    await expectRevert("tokenJSON(string)", ["1.json"]);
    await expectRevert("tokenJSON(uint256)", [1]);
  });
});
