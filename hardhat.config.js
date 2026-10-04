// hardhat.config.js
require('@nomiclabs/hardhat-ethers');
require("@nomicfoundation/hardhat-verify");
require('solidity-coverage');
require('hardhat-contract-sizer');
require('hardhat-gas-reporter');
require("@nomicfoundation/hardhat-chai-matchers")
// import config before anything else
require("dotenv").config();

const fs = require('fs');
const path = require('path');
const { subtask } = require('hardhat/config');
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require('hardhat/builtin-tasks/task-names');

// Hardhat 2.14 resolves 0.8.31 to the 0.8.31-pre.1 nightly build, which
// rejects `pragma ^0.8.31`. Pin the official release (wasm build) instead.
const SOLC_0_8_31 = 'soljson-v0.8.31+commit.fd3a2265.js';

subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async ({ solcVersion }, hre, runSuper) => {
  if (solcVersion !== '0.8.31') {
    return runSuper();
  }

  const compilerPath = path.join(hre.config.paths.cache, 'solc', SOLC_0_8_31);
  if (!fs.existsSync(compilerPath)) {
    const res = await fetch(`https://binaries.soliditylang.org/wasm/${SOLC_0_8_31}`);
    if (!res.ok) {
      throw new Error(`Failed to download ${SOLC_0_8_31}: ${res.status}`);
    }
    fs.mkdirSync(path.dirname(compilerPath), { recursive: true });
    fs.writeFileSync(compilerPath, Buffer.from(await res.arrayBuffer()));
  }

  return {
    compilerPath,
    isSolcJs: true,
    version: '0.8.31',
    longVersion: '0.8.31+commit.fd3a2265'
  };
});

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
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ],
    overrides: {
      // uses the CLZ opcode (EIP-7939)
      "contracts/RadioactivePunksJSON.sol": {
        version: "0.8.31",
        settings: {
          evmVersion: "osaka",
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    }
  }
};
