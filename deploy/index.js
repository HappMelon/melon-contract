const { Wallet } = require("zksync-ethers");
const { Deployer } = require("@matterlabs/hardhat-zksync-deploy");
const hre = require("hardhat");

const dotenv = require("dotenv");
dotenv.config();

var AliPics = [
  "https://ipfs.filebase.io/ipfs/QmRaYSHrPyKyvMbtWGh9WCEQkqbgRtVh3wPezKzwBkMWXL",
  "https://ipfs.filebase.io/ipfs/Qmbs3QcGaKao9pPszzuYqsrUhEKC6nh1sXQrPRYpp2fx3G",
  "https://ipfs.filebase.io/ipfs/QmRs3fNGpwkXfYkcojDrV8inp3NGWAX9Cj41Y1321ZTpoL",
  "https://ipfs.filebase.io/ipfs/QmaFL6iYQ2KvYFsVDEfcAKg3ApdX7Gc1AmfRznuaU6CYPy",
];

var HarshPics = [
  "https://ipfs.filebase.io/ipfs/QmV33JkRRmRJVyx5cMJMsdhjLFmhFqceNNidXQVQ4n59cE",
  "https://ipfs.filebase.io/ipfs/QmTAPAPPuz8x5uDfVAYdqquX8aK1MozKgGyjzYDah3L5sp",
  "https://ipfs.filebase.io/ipfs/QmZNZ9JhSH1Z26sMpMbzCBf3VzPogkDMtuXWWS9ceb5fNx",
  "https://ipfs.filebase.io/ipfs/Qmbj3ztbvQq2PAkCcreVZfBt1699cDSrWwZRN9CVCezfYA",
];

var MyicahelPics = [
  "https://ipfs.filebase.io/ipfs/QmVsuhSmR5BmuaNCghUvX3B397yyKHNkS5PWMKyCbs2maj",
  "https://ipfs.filebase.io/ipfs/QmX4SLs4SAWpk2RStDxw29mzkMZwDkeEjKFxZqEuhoXo9v",
  "https://ipfs.filebase.io/ipfs/QmTh3FT6sTe9KfDVv61Zf3J3Qy9YFP4m69UGZddZ4deKNi",
  "https://ipfs.filebase.io/ipfs/QmPLdY8Me41618WhaqLickpwXrzYx5vPHienELhBbJt9hj",
];

var KietPics = [
  "https://ipfs.filebase.io/ipfs/QmfLV6wQDh8kCZxUM7sYhK8BdVrzJ2fK7GUGfpvHtXxGPA",
  "https://ipfs.filebase.io/ipfs/QmYRdwqFo3p1EEDZuJf9MBQuFNcNHup9zD751WQAaBSSM1",
  "https://ipfs.filebase.io/ipfs/QmSnZT33AkmGuUEyrMf6P8qjFV7N7oubAjSvh2BfEiHVAv",
  "https://ipfs.filebase.io/ipfs/QmYBFkTDRdhk6qHhHPEQvERTd7DAFxp5fecReNXxiEUUs7",
];

var allLinks = AliPics.concat(HarshPics, MyicahelPics, KietPics);

async function deployMelonToken() {
  const melonTokenContract = await hre.deployer.deploy("MelonToken");
  const melonTokenAddr = await melonTokenContract.getAddress();
  console.log("melonTokenContract:", melonTokenAddr);
  return melonTokenAddr;
}

async function upgradeProposal(proposalProxyAddr) {
  const proposalArt = await hre.deployer.deploy("Proposal");
  const proposal = await hre.zkUpgrades.upgradeProxy(
    hre.deployer.zkWallet,
    proposalProxyAddr,
    proposalArt
  );
  await proposal.waitForDeployment();
  const newProposalAddr = await proposal.getAddress();
  console.log("proposalAddr:", newProposalAddr);
  return newProposalAddr;
}

async function deployProposal(deployer, melonTokenAddr, juryNFTSwapAddr, pledgeAddr) {
  
  const proposalArt = await deployer.loadArtifact("Proposal");
  const proposal = await hre.zkUpgrades.deployProxy(
    deployer.zkWallet,
    proposalArt,
    [melonTokenAddr, juryNFTSwapAddr, pledgeAddr],
    { initializer: "initialize" }
  );
  const proposalAddr = await proposal.getAddress();
  console.log("proposalAddr:", proposalAddr);
  return proposalAddr;
}

async function deployJury(proposalAddr) {
  const jury = await hre.zkUpgrades.deployProxy(
    hre.deployer.zkWallet,
    "Jury",
    [proposalAddr],
    { initializer: "initialize" }
  );
  const juryAddr = await jury.getAddress();
  console.log("jury:", juryAddr);
  return juryAddr;
}

async function deployPledge() {
  const pledge = await hre.deployer.deploy("Pledge");
  const pledgeAddr = await pledge.getAddress();
  console.log("pledgeAddr:", pledgeAddr);
  return pledgeAddr;
}

async function deployMelonNFT() {
  const melonNft = await hre.deployer.deploy("MelonNFT");
  const melonNftAddr = await melonNft.getAddress();
  console.log("melonNft:", melonNftAddr);
  return melonNft;
}

async function deployJuryNftSwap(
  melonNFTAddr,
  commonLimitPerUser,
  startUpLimit
) {
  const juryNftSwap = await hre.deployer.deploy("JuryNFTSwap", [
    melonNFTAddr,
    commonLimitPerUser,
    startUpLimit,
  ]);
  const juryNftSwapAddr = await juryNftSwap.getAddress();
  console.log("juryNftSwap:", juryNftSwapAddr);
  return juryNftSwap;
}

async function initJuryNftSwap(mlnNFT, juryNFTSwap) {
  for (let index = 0; index < 15; index++) {
    await mlnNFT.mint(
      "0xc0ee714715108b1a6795391f7e05a044d795ba70",
      allLinks[index]
    );
  }
  const juryNFTSwapAddr = await juryNFTSwap.getAddress();
  await mlnNFT.setApprovalForAll(juryNFTSwapAddr, true);
  for (let i = 0; i < 15; i++) {
    if (i < 5) {
      await juryNFTSwap.initialNFTHangOut(i, ethers.parseEther("0"));
    } else {
      await juryNFTSwap.initialNFTHangOut(i, ethers.parseEther("10"));
    }
  }
}

async function main() {
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  console.log("privateKey:", privateKey);
  const wallet = new Wallet(privateKey);
  const deployer = new Deployer(hre, wallet);

  // let mlnNFT = await deployMelonNFT();
  // const mlnNFTAddr = await mlnNFT.getAddress();
  let juryNftSwap = await deployJuryNftSwap(process.env.MELON_NFT, 3, 5);
  // await initJuryNftSwap(mlnNFT, juryNftSwap);

  // proposal
  // await deployProposal(deployer, process.env.MELON_TOKEN, process.env.JURY_NFT_SWAP, process.env.PLEDGE);

  // let melonNFTAddr = await deployMelonNFT();
  // await deployJuryNftSwap(
  //   process.env.MELON_TOKEN,
  //   process.env.MELON_NFT,
  //   process.env.PROPOSAL_PROXY
  // );

  // await upgradeProposal(process.env.PROPOSAL_PROXY);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
