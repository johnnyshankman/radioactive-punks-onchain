const hre = require("hardhat");

console.log(hre.ethers);

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const RadioactivePunksRenderer = await ethers.getContractFactory('RadioactivePunksRenderer')


  console.log("Deploying contracts with the account:", deployer.address);

  const token = await RadioactivePunksRenderer.deploy();

  console.log("Token address:", token);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
