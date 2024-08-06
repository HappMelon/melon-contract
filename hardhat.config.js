require("@nomicfoundation/hardhat-toolbox");
require("@matterlabs/hardhat-zksync-deploy");
require("@matterlabs/hardhat-zksync-solc");
require("@matterlabs/hardhat-zksync-verify");
require("@openzeppelin/hardhat-upgrades");
require("@matterlabs/hardhat-zksync-upgradable");

const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  solidity: "0.8.24",
  defaultNetwork: "zk_test",
  networks: {
    zk_test: {
      url: "https://sepolia.era.zksync.dev",
      ethNetwork: "sepolia",
      zksync: true,
      verifyURL:
        "https://explorer.sepolia.era.zksync.dev/contract_verification",
    },
  },
  zksolc: {
    version: "latest",
    settings: {},
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API,
    },
  },
};
