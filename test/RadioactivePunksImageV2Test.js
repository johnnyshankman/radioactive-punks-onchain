const zlib = require("zlib");
const { ethers } = require("hardhat");
const { expect } = require("chai");
const { createReference, BG, GLOW_COLORS } = require("../scripts/reference-svg");
const { toBitmapSVG } = require("../scripts/bitmap-svg");

// each PNG's chunks as { type, data }, checking every CRC with Node's zlib
function readPNG(png) {
  expect(png.subarray(0, 8).toString("hex")).to.equal("89504e470d0a1a0a");
  const chunks = [];
  for (let p = 8; p < png.length;) {
    const length = png.readUInt32BE(p);
    const typed = png.subarray(p + 4, p + 8 + length);
    expect(png.readUInt32BE(p + 8 + length), "chunk CRC").to.equal(zlib.crc32(typed));
    chunks.push({ type: typed.subarray(0, 4).toString(), data: typed.subarray(4) });
    p += 12 + length;
  }
  return chunks;
}

// decodes an indexed 24x24 PNG to rows of "rrggbb", null where transparent
function decodePNG(png) {
  const chunks = readPNG(png);
  const get = (type) => chunks.find((c) => c.type === type)?.data;
  expect(chunks.map((c) => c.type).filter((t) => t !== "tRNS")).to.deep.equal(["IHDR", "PLTE", "IDAT", "IEND"]);
  expect(get("IHDR").toString("hex")).to.equal("00000018000000180803000000");
  const plte = get("PLTE");
  const alpha = get("tRNS") || Buffer.alloc(0);
  const raw = zlib.inflateSync(get("IDAT"));
  expect(raw.length).to.equal(24 * 25);
  return Array.from({ length: 24 }, (_, y) => {
    expect(raw[y * 25], "row filter").to.equal(0);
    return Array.from({ length: 24 }, (_, x) => {
      const i = raw[y * 25 + 1 + x];
      return i < alpha.length && alpha[i] === 0 ? null : plte.subarray(i * 3, i * 3 + 3).toString("hex");
    });
  });
}

const pngsOf = (svg) => [...svg.matchAll(/href="data:image\/png;base64,([^"]+)"/g)].map((m) => Buffer.from(m[1], "base64"));

describe("RPUNKS IMAGE V2 TEST", async () => {
  let image;
  let reference;
  let tokenIds;
  let deploy;
  let traits;

  const referenceSVG = (tokenId) => toBitmapSVG(reference.tokenGrid(tokenId), "png8+png8");

  before(async function () {
    this.timeout(120000);
    reference = createReference();
    tokenIds = Object.keys(reference.traits).map(Number);

    deploy = async (name, ...args) => {
      const factory = await ethers.getContractFactory(name);
      const contract = await factory.deploy(...args);
      await contract.deployed();
      return contract;
    };

    traits = await deploy("RadioactivePunksBytesHyperstructure");
    const data1 = await deploy("RadioactivePunksLayerData1");
    const data2 = await deploy("RadioactivePunksLayerData2");
    image = await deploy("RadioactivePunksImageV2", traits.address, data1.address, data2.address);
  });

  it('rejects a traits contract without the expected trait bytes', async () => {
    const factory = await ethers.getContractFactory("RadioactivePunksImageV2");
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
    this.timeout(1800000);
    const mismatches = [];
    for (const tokenId of tokenIds) {
      const svg = await image.tokenSVG(tokenId);
      if (svg !== referenceSVG(tokenId)) mismatches.push(tokenId);
    }
    expect(mismatches, `mismatched tokens: ${mismatches.slice(0, 20).join(", ")}`).to.have.length(0);
    expect(tokenIds).to.have.length(1614);
  });

  it('draws valid PNGs holding exactly the punk\'s pixels', async function () {
    this.timeout(120000);
    // alive, dead, one-of-ones (each with its own glow color), rainbow head
    for (const tokenId of [0, 6, 38, 1000, 2999, 698, 60, 370, 246, 420, 528, 1665]) {
      const svg = await image.tokenSVG(tokenId);
      const [base, glow] = pngsOf(svg).map(decodePNG);
      expect(svg).to.include('<image width="24" height="24" image-rendering="optimizeSpeed" style="image-rendering:pixelated" class="g" href=');

      const grid = reference.tokenGrid(tokenId);
      const isGlow = (c) => GLOW_COLORS.includes(c);
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 24; x++) {
          const c = grid[y][x];
          expect(base[y][x], `#${tokenId} base ${x},${y}`).to.equal(c === null || isGlow(c) ? BG : c);
          expect(glow[y][x], `#${tokenId} glow ${x},${y}`).to.equal(isGlow(c) ? c : null);
        }
      }
    }
  });

  it('wraps the SVG as a base64 data URI', async () => {
    const uri = await image.tokenImage(6);
    const prefix = "data:image/svg+xml;base64,";
    expect(uri.startsWith(prefix)).to.equal(true);
    expect(Buffer.from(uri.slice(prefix.length), "base64").toString()).to.equal(referenceSVG(6));
  });

  it('reverts for punks that do not exist', async () => {
    for (const tokenId of [1, 2, 3, 3000, 99999]) {
      await expect(image.tokenSVG(tokenId)).to.be.revertedWithCustomError(image, "TokenDoesNotExist");
    }
  });

  it('works as RadioactivePunksJSONV2\'s image renderer', async function () {
    this.timeout(120000);
    const renderer = await deploy("RadioactivePunksRenderer");
    const json = await deploy("RadioactivePunksJSONV2", renderer.address, image.address);
    for (const tokenId of [6, 698]) {
      const meta = JSON.parse(await json["tokenJSON(string)"](`${tokenId}.json`));
      expect(meta.name).to.equal(`Radioactive Punk #${tokenId}`);
      expect(meta.image).to.equal(await image.tokenImage(tokenId));
    }
  });

  it('stays well under eth_call gas caps', async () => {
    const gas = {};
    for (const tokenId of [0, 6, 2999, 1000, 698]) {
      gas[tokenId] = {
        svg: (await image.estimateGas.tokenSVG(tokenId)).toNumber(),
        image: (await image.estimateGas.tokenImage(tokenId)).toNumber(),
      };
    }
    console.log("      gas:", JSON.stringify(gas));
    for (const g of Object.values(gas)) expect(g.image).to.be.lessThan(2_000_000);
  });
});
