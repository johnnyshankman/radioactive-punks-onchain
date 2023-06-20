const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("DATA COMPILER TEST", async accounts => {
  let c;

  before(async () => {
   // @dev: already deployed on every network
   const FFlateDataChunk1 = await ethers.getContractFactory("FFlateDataChunk1");
   ff1 = await FFlateDataChunk1.deploy();
   await ff1.deployed();
   const FFlateDataChunk2 = await ethers.getContractFactory("FFlateDataChunk2");
   ff2 = await FFlateDataChunk2.deploy();
   await ff2.deployed();


   // @dev: now setup the compiler
   const DataCompiler = await ethers.getContractFactory("DataCompiler");
   c = await DataCompiler.deploy(ff1.address, ff2.address);
   await c.deployed();
  });

  it('returns fflate correctly which means compileChunks is working', async () => {
    const flate = await c.fflate();
    // TODO: seems like a bug that it includes it's own `data:text/javascript` unescaped
    // i'd expect this to need `encode`'ing
    expect(flate.includes('data:text/javascript;base64,IWZ1bmN0aW9uKGYp')).to.equal(true);
  });

  it('converts uints to strings correctly', async () => {
    expect(await c.uint2str(0)).to.equal("0");
    expect(await c.uint2str(12340567890)).to.equal("12340567890");
  });

  it('converts uints to strings correctly', async () => {
    expect(await c.uint2str(0)).to.equal("0");
    expect(await c.uint2str(12340567890)).to.equal("12340567890");
  });

  it('returns the beginning of the HTML HEAD correctly', async () => {
    const head = await c.HTML_HEAD_START();
    const dcHead = decodeURIComponent(head);
    expect(dcHead).to.contain('data:text/html,%3C%21doctype%20html%3E%3Chtml%20lang%3D%22en%22%3E%3Chead%3E%3Cmeta%20charset%3D%22utf%2D8%22%3E%3Cscript%20src%3D%22');
    expect(decodeURIComponent(dcHead)).to.contain('<!doctype html><html lang="en"><head><meta charset="utf-8"><script src="');
    // after that is the fflate data URL
    expect(dcHead).to.contain(await c.fflate())
    // then at the end...
    expect(dcHead).to.contain('%22%3E%3C%2Fscript%3E');
    expect(decodeURIComponent(dcHead)).to.contain('"></script>');
  });

  it('returns the end of the HTML HEAD correctly', async () => {
    const head = await c.HTML_HEAD_END();
    const dcHead = decodeURIComponent(head);
    expect(dcHead).to.equal('%3C%2Fhead%3E%3Cbody%3E');
    expect(decodeURIComponent(dcHead)).to.equal('</head><body>');
  });

  it('returns the end of the HTML correctly', async () => {
    const head = await c.HTML_FOOT();
    const dcHead = decodeURIComponent(head);
    expect(dcHead).to.equal('%3C%2Fbody%3E%3C%2Fhtml%3E');
    expect(decodeURIComponent(dcHead)).to.equal('</body></html>');
  });

  it('encodes script vars correctly', async () => {
    const response = await c.SCRIPT_VAR('hello', 'world', false);
    expect(response).to.equal('var%2520hello%253D%2522world%2522%253B');

    const response2 = await c.SCRIPT_VAR('hello', 'world', true);
    expect(response2).to.equal('var%2520hello%253Dworld%253B');
  })

  it('encodes metadata vars correctly', async () => {
    let response = await c.BEGIN_METADATA_VAR("artist", true);
    expect(response).to.equal('%22artist%22%3A');
    expect(decodeURIComponent(response)).to.equal('"artist":')

    response = await c.BEGIN_METADATA_VAR("artist", false);
    expect(response).to.equal('%22artist%22%3A%22');
    expect(decodeURIComponent(response)).to.equal('"artist":"')

    response = await c.END_METADATA_VAR(false, false);
    expect(response).to.equal('%22%2C');
    expect(decodeURIComponent(response)).to.equal('",')

    response = await c.END_METADATA_VAR(true, false);
    expect(response).to.equal('%2C');
    expect(decodeURIComponent(response)).to.equal(',')

    response = await c.END_METADATA_VAR(false, true);
    expect(response).to.equal('%22');
    expect(decodeURIComponent(response)).to.equal('"')

    response = await c.END_METADATA_VAR(true, true);
    expect(response).to.equal('');
    expect(decodeURIComponent(response)).to.equal('')
  });

  it('encodes uri components correctly', async () => {
    expect(await c.encodeURI('abcdefghijklmnopqrstuvwxyz world!"#$%&()*+,./')).to.equal('abcdefghijklmnopqrstuvwxyz%20world%21%22%23%24%25%26%28%29%2A%2B%2C%2E%2F');
    expect(decodeURIComponent('abcdefghijklmnopqrstuvwxyz%20world%21%22%23%24%25%26%28%29%2A%2B%2C%2E%2F')).to.equal('abcdefghijklmnopqrstuvwxyz world!"#$%&()*+,./');
  });

  it('decodes uri components correctly', async () => {
    expect(await c.decodeURI('abcdefghijklmnopqrstuvwxyz%20world%21%22%23%24%25%26%28%29%2A%2B%2C%2E%2F')).to.equal('abcdefghijklmnopqrstuvwxyz world!"#$%&()*+,./');
  });

  it('toHex16String', async () => {
    expect(await c.toHex16String('0x20010db8000000000000000000000001')).to.equal('20010DB8000000000000000000000001');
  });

  it('toHex32String', async () => {
    expect(await c.toHex32String('0x20010db800000000000000000000000120010db8000000000000000000000001')).to.equal('20010DB800000000000000000000000120010DB8000000000000000000000001');
  });
});
