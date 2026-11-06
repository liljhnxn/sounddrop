require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const rawKey = (process.env.PRIVATE_KEY || "").trim();
const PRIVATE_KEY = rawKey
  ? (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`)
  : "0x0000000000000000000000000000000000000000000000000000000000000001";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    botchain: {
      url: process.env.BOTCHAIN_RPC_URL || "https://rpc.bohr.life",
      chainId: 968,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      botchain: "anykey",
    },
    customChains: [
      {
        network: "botchain",
        chainId: 968,
        urls: {
          apiURL: "https://scan.bohr.life/api",
          browserURL: "https://scan.bohr.life",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
