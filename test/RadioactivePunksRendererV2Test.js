const { ethers, artifacts } = require("hardhat");
const { expect } = require("chai");

/**
 * V2 wraps the live mainnet renderer, so these tests run against mainnet.
 *
 * Hardhat 2.14 can't fork current mainnet (blocks no longer carry
 * `totalDifficulty`), so instead we `eth_call` with a state override that
 * places V2's runtime bytecode at a scratch address. Nothing is deployed.
 */
const RPC_URL = process.env.MAINNET_RPC_URL || "https://ethereum-rpc.publicnode.com";
const V1_ADDRESS = "0x5694010444cC8fbbed96c23a65FbC3714F624A26";
const V2_ADDRESS = "0x00000000000000000000000000000000000Da7a2";

const FIND = "%252F12%2529%252A12";
const REPLACE = "%252F24%2529%252A24";
const FROM_END = 855;

// a sample of token IDs that exist
const TOKEN_IDS = [0, 4, 5, 6, 9, 10, 11, 15, 16, 17, 21, 22, 23, 26, 27, 28];

describe("RPUNKS RENDERER V2 TEST", async () => {
  let provider;
  let iface;
  let overrides;

  const call = async (to, method, args, state) => {
    const data = iface.encodeFunctionData(method, args);
    const params = [{ to, data }, "latest"];
    if (state) params.push(state);
    const result = await provider.send("eth_call", params);
    return iface.decodeFunctionResult(method, result)[0];
  };

  const v1 = (method, args = []) => call(V1_ADDRESS, method, args);
  const v2 = (method, args = []) => call(V2_ADDRESS, method, args, overrides);

  before(async function () {
    this.timeout(60000);
    provider = new ethers.providers.JsonRpcProvider(RPC_URL);

    const artifact = await artifacts.readArtifact("RadioactivePunksRendererV2");
    iface = new ethers.utils.Interface(artifact.abi);
    overrides = { [V2_ADDRESS]: { code: artifact.deployedBytecode } };
  });

  it('points at the deployed V1 renderer', async () => {
    expect(await v2("V1")).to.equal(V1_ADDRESS);
  });

  it('supports the ITokenURISupplier and IERC165 interfaces', async () => {
    // ITokenURISupplier: tokenURI(uint256)
    expect(await v2("supportsInterface", ["0xc87b56dd"])).to.equal(true);
    // IERC165
    expect(await v2("supportsInterface", ["0x01ffc9a7"])).to.equal(true);
  });

  it('does not support unknown interfaces', async () => {
    expect(await v2("supportsInterface", ["0xffffffff"])).to.equal(false);
  });

  for (const tokenId of TOKEN_IDS) {
    it(`patches only the resize snap for token ${tokenId}`, async function () {
      this.timeout(60000);
      const original = await v1("tokenURI", [tokenId]);
      const patched = await v2("tokenURI", [tokenId]);

      expect(patched.length).to.equal(original.length);

      const start = original.length - FROM_END;
      expect(original.slice(start, start + FIND.length)).to.equal(FIND);
      expect(patched.slice(start, start + REPLACE.length)).to.equal(REPLACE);

      // everything outside the patched bytes is identical
      expect(patched.slice(0, start)).to.equal(original.slice(0, start));
      expect(patched.slice(start + FIND.length)).to.equal(original.slice(start + FIND.length));

      // the script now snaps the SVG size to the 24x24 grid
      expect(patched).to.include("Math%252Efloor%2528e%252F24%2529%252A24");
      expect(patched).to.not.include("Math%252Efloor%2528e%252F12%2529%252A12");
    });
  }

  it('reverts like V1 for a punk that does not exist', async function () {
    this.timeout(60000);
    let v1Error;
    let v2Error;
    try { await v1("tokenURI", [1]); } catch (e) { v1Error = e; }
    try { await v2("tokenURI", [1]); } catch (e) { v2Error = e; }
    expect(v1Error).to.not.equal(undefined);
    expect(v2Error).to.not.equal(undefined);
  });
});
