const { Wallet } = require("zksync-ethers");
const { Deployer } = require("@matterlabs/hardhat-zksync-deploy");

const hre = require("hardhat");
const dotenv = require("dotenv");
dotenv.config();

async function deployMelonToken(deployer) {
  const melonToken = await deployer.loadArtifact("MelonToken");
  const melonTokenContract = await deployer.deploy(melonToken);
  const melonTokenAddr = await melonTokenContract.getAddress();
  console.log("melonTokenContract:", melonTokenAddr);
  return melonTokenAddr;
}

async function upgradeProposal(deployer, proposalProxyAddr) {
  const proposalArt = await deployer.loadArtifact("Proposal");
  const proposal = await hre.zkUpgrades.upgradeProxy(
    deployer.zkWallet,
    proposalProxyAddr,
    proposalArt
  );
  await proposal.waitForDeployment();
  const newProposalAddr = await proposal.getAddress();
  console.log("proposalAddr:", newProposalAddr);
  return newProposalAddr;
}

async function deployProposal(deployer, melonTokenAddr) {
  const proposalArt = await deployer.loadArtifact("Proposal");
  const proposal = await deployer.deployProxy(
    deployer.zkWallet,
    proposalArt,
    [melonTokenAddr],
    { initializer: "initialize" }
  );
  const proposalAddr = await proposal.getAddress();
  console.log("proposalAddr:", proposalAddr);
  return proposalAddr;
}

async function deployJury(deployer, proposalAddr) {
  const juryArt = await deployer.loadArtifact("Jury");
  const jury = await hre.zkUpgrades.deployProxy(
    deployer.zkWallet,
    juryArt,
    [proposalAddr],
    { initializer: "initialize" }
  );
  const juryAddr = await jury.getAddress();
  console.log("jury:", juryAddr);
  return juryAddr;
}

async function deployMelonNft(deployer) {
  const melonNftArt = await deployer.loadArtifact("MelonNft");
  const melonNft = await deployer.deploy(melonNftArt);
  const melonNftAddr = await melonNft.getAddress();
  console.log("melonNft:", melonNftAddr);
  return melonNftAddr;
}

async function deployJuryNftSwap(deployer, melonTokenAddr) {
  const juryNftSwapArt = await deployer.loadArtifact("JuryNFTSwap");
  const juryNftSwap = await deployer.deploy(juryNftSwapArt, [melonTokenAddr]);
  const juryNftSwapAddr = await juryNftSwap.getAddress();
  console.log("juryNftSwap:", juryNftSwapAddr);
  return juryNftSwapAddr;
}

async function main() {
  // Initialize the wallet.
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  console.log("privateKey:", privateKey);
  const wallet = new Wallet(privateKey);
  const deployer = new Deployer(hre, wallet);

  // await deployMelonNft(deployer);
  await deployJuryNftSwap(
    deployer,
    "0xDf77D063Cf7BdBf2D8167B18e511c82b6cE6d1DD"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
