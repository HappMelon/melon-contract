const { Wallet } = require("zksync-ethers");
const { Deployer } = require("@matterlabs/hardhat-zksync-deploy");

const hre = require("hardhat");
const dotenv = require("dotenv");
dotenv.config();

async function main() {
  // Initialize the wallet.
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  console.log("privateKey:", privateKey);
  const wallet = new Wallet(privateKey);
  const deployer = new Deployer(hre, wallet);
  // melonToken
  const melonToken = await deployer.loadArtifact("MelonToken");
  const melonTokenContract = await deployer.deploy(melonToken);
  const melonTokenAddr = await melonTokenContract.getAddress();
  console.log("melonTokenContract:", melonTokenAddr);

  // const melonTokenAddr = "0x24c306FBcbEb6055e95D2405CAb625C18232bDc4"

  const proposalArt = await deployer.loadArtifact("Proposal");
  const proposal = await hre.zkUpgrades.deployProxy(
    deployer.zkWallet,
    proposalArt,
    [melonTokenAddr],
    { initializer: "initialize" }
  );
  await proposal.waitForDeployment();
  const proposalAddr = await proposal.getAddress();
  console.log("proposalAddr:", proposalAddr);
  // nft
  const melonNftArt = await deployer.loadArtifact("MelonNft");
  const melonNft = await deployer.deploy(melonNftArt);
  const melonNftAddr = await melonNft.getAddress();
  console.log("melonNft:", melonNftAddr);
  // jury
  const assessorArt = await deployer.loadArtifact("Assessor");
  const assessor = await deployer.deploy(assessorArt, [proposalAddr])
 const assessorAddr = await assessor.getAddress()
  console.log("assessor:", assessorAddr);
  // JuryNFTSwap
  const juryNftSwapArt = await deployer.loadArtifact("JuryNFTSwap");
  const juryNftSwap = await deployer.deploy(juryNftSwapArt, [melonTokenAddr, assessorAddr]);
  console.log("juryNftSwap:", await juryNftSwap.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
