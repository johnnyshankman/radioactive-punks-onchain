// hardhat.config.js
require('@nomiclabs/hardhat-ethers');
require("@nomicfoundation/hardhat-verify");
require('solidity-coverage');
require('hardhat-contract-sizer');
require('hardhat-gas-reporter');
require("@nomicfoundation/hardhat-chai-matchers")
// import config before anything else
require("dotenv").config();

const TEST_MNEMONIC = process.env.MNEMONIC;

console.log(TEST_MNEMONIC);

module.exports = {
  networks: {
    hardhat: {
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      allowUnlimitedContractSize: true,
      timeout: 1800000
    },
  },

  gasReporter: {
    token: "ETH",
    enabled: true,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    gasPrice: 20
  },

  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true
  },

  mocha: {
    timeout: 20000,
  },

  etherscan: {
  },

  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
};
