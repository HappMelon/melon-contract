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
  // const melonToken = await deployer.loadArtifact("MelonToken");
  // const melonTokenContract = await deployer.deploy(melonToken);
  // const melonTokenAddr = await melonTokenContract.getAddress();
  // console.log("melonTokenContract:", melonTokenAddr);

  const melonTokenAddr = "0xDf77D063Cf7BdBf2D8167B18e511c82b6cE6d1DD";

  // const proposalArt = await deployer.loadArtifact("Proposal");
  // initialize
  // const proposal = await hre.zkUpgrades.deployProxy(
  //   deployer.zkWallet,
  //   proposalArt,
  //   [melonTokenAddr],
  //   { initializer: "initialize" }
  // );
  // update implementation
  // const proposal = await hre.zkUpgrades.upgradeProxy(
  //   deployer.zkWallet,
  //   "0xD27846d59667A7410880fEe153C801Ca41466b20",
  //   proposalArt
  // );

  // await proposal.waitForDeployment();

  // const proposalAddr = await proposal.getAddress();

  // console.log("proposalAddr:", proposalAddr);

  //   // nft
  //   const melonNftArt = await deployer.loadArtifact("MelonNft");
  //   const melonNft = await deployer.deploy(melonNftArt);
  //   const melonNftAddr = await melonNft.getAddress();
  //   console.log("melonNft:", melonNftAddr);


  const proposalAddr = "0x6CD3582FeFa064067D70F2479C97CA7551E5c506";
    // jury
  const juryArt = await deployer.loadArtifact("Jury");

  const jury = await hre.zkUpgrades.deployProxy(
    deployer.zkWallet,
    juryArt,
    [proposalAddr],
    { initializer: "initialize" }
  );
  const juryAddr = await jury.getAddress();
  console.log("jury:", juryAddr);

  //   // JuryNFTSwap
  //   const juryNftSwapArt = await deployer.loadArtifact("JuryNFTSwap");
  //   const juryNftSwap = await deployer.deploy(juryNftSwapArt, [melonTokenAddr, juryAddr]);
  //   console.log("juryNftSwap:", await juryNftSwap.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
