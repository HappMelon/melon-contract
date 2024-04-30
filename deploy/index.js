const { Wallet } = require("zksync-ethers");
const { Deployer } = require("@matterlabs/hardhat-zksync-deploy");

const hre = require("hardhat");
const dotenv = require("dotenv");
// Load env file
dotenv.config();

async function main() {
  // Initialize the wallet.
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  console.log("privateKey----------", privateKey);
  const wallet = new Wallet(privateKey);

  const deployer = new Deployer(hre, wallet);
  const flareToken = await deployer.loadArtifact("FlareToken");
  const flareTokenContract = await deployer.deploy(flareToken);
  const toeknAddr = await flareTokenContract.getAddress();
  console.log("flareTokenContract----------", toeknAddr);
  // const toeknAddr = "0x24c306FBcbEb6055e95D2405CAb625C18232bDc4"

  const proposal = await deployer.loadArtifact("Proposal");
  const tx = await hre.zkUpgrades.deployProxy(deployer.zkWallet, proposal, [toeknAddr], { initializer: "initialize" });

  await tx.waitForDeployment();
  console.log("deployed to:", await tx.getAddress());


}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
