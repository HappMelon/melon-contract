const { utils, Wallet } = require("zksync-ethers");
const ethers = require("ethers");
const { HardhatRuntimeEnvironment } = require("hardhat/types");
const { Deployer } = require("@matterlabs/hardhat-zksync-deploy");
const dotenv = require("dotenv");
// Load env file
dotenv.config();

// An example of a deploy script that will deploy and call a simple contract.
module.exports = async function (hre) {
  console.log(`Running deploy script`);

  // Initialize the wallet.
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  console.log("privateKey", privateKey);
  const wallet = new Wallet(privateKey);

  // Create deployer object and load the artifact of the contract we want to deploy.
  const deployer = new Deployer(hre, wallet);
  // Load contract
  const flareToken = await deployer.loadArtifact("FlareToken");
  const proposalLogic = await deployer.loadArtifact("ProposalLogic");

  // Deploy this contract. The returned object will be of a `Contract` type,
  // similar to the ones in `ethers`.
  const flareTokenContract = await deployer.deploy(flareToken);
  const toeknAddr = await flareTokenContract.getAddress();
  const proposalLogicContract = await deployer.deploy(proposalLogic, [
    toeknAddr,
  ]);

  // Show the contract info.
  console.log(`flareTokenContract was deployed to ${toeknAddr}`);
  console.log(
    `proposalLogicContract was deployed to ${await proposalLogicContract.getAddress()}`
  );
};
