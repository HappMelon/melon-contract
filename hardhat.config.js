require("@nomicfoundation/hardhat-toolbox");
require("@matterlabs/hardhat-zksync-deploy");
require("@matterlabs/hardhat-zksync-solc");
require("@matterlabs/hardhat-zksync-verify");
require('@openzeppelin/hardhat-upgrades');
require("@matterlabs/hardhat-zksync-upgradable");

const dotenv = require("dotenv");
// Load env file
dotenv.config();



/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      zksync: false,
    },
    zkSyncTestnet: {
      url: "https://sepolia.era.zksync.dev",
      ethNetwork: "sepolia", // or a Sepolia RPC endpoint from Infura/Alchemy/Chainstack etc.
      zksync: true,
      verifyURL: 'https://explorer.sepolia.era.zksync.dev/contract_verification'
    },
    sepoliaTestnet: {
      url: process.env.SEPOLIA_PRC, // Replace <SEPOLIA_RPC_ENDPOINT> with the actual RPC endpoint
      chainId: 11155111, // Replace <SEPOLIA_CHAIN_ID> with the actual chain ID
      accounts:[process.env.WALLET_PRIVATE_KEY]
    },
  },
  defaultNetwork: "zkSyncTestnet",
  zksolc: {
    version: "latest",
    settings: {},
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API
    }
  }
  // configuration continues ....
};



