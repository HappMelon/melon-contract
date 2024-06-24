const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Test", function () {
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

  async function deployContractsFixture() {
    const [admin, userA, userB] = await ethers.getSigners();

    const pledge = await ethers.deployContract("Pledge");

    const melonToken = await ethers.deployContract("MelonToken");

    const melonNft = await ethers.deployContract("MelonNFT");

    const juryNFTSwap = await ethers.deployContract("JuryNFTSwap", [
      melonNft.target,
      3n,
      2n,
    ]);

    const proposal = await ethers.getContractFactory("Proposal");

    const proposalProxy = await upgrades.deployProxy(
      proposal,
      [melonToken.target, juryNFTSwap.target, pledge.target],
      {
        kind: "uups",
        initializer: "initialize",
      }
    );

    // init 10 nft
    for (let i = 0; i < 5; i++) {
      await melonNft.mint(admin.address, allLinks[i]);
    }

    // approve all nft to juryNFTSwap
    await melonNft.setApprovalForAll(juryNFTSwap.target, true);

    for (let i = 0; i < 5; i++) {
      if (i < 2) {
        await juryNFTSwap.initialNFTHangOut(i, ethers.parseEther("0"));
      } else {
        await juryNFTSwap.initialNFTHangOut(i, ethers.parseEther("10"));
      }
    }

    // Cast 100 tokens per account
    let mintAmount = ethers.parseEther("100");
    await melonToken.mint(userA.address, mintAmount);
    await melonToken.mint(userB.address, mintAmount);

    // approve
    await melonToken
      .connect(userA)
      .approve(proposalProxy.target, ethers.parseEther("100"));
    await melonToken
      .connect(userB)
      .approve(proposalProxy.target, ethers.parseEther("100"));

    await proposalProxy.connect(userA).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(userB).deposit(ethers.parseEther("50"));

    console.log("getAllCommonNFTs: ", await juryNFTSwap.getAllCommonNFTs());
    console.log("getAllStartUpNFTs: ", await juryNFTSwap.getAllStartUpNFTs());


    return {
      admin,
      userA,
      userB,
      juryNFTSwap,
      proposalProxy,
      melonNft,
    };
  }

  it("applyStartUpNFT", async function () {
    const { admin, userA, userB, juryNFTSwap, proposalProxy, melonNft } =
      await loadFixture(deployContractsFixture);

    await juryNFTSwap.connect(userA).applyStartUpNFT(ethers.parseEther("10"));
    await juryNFTSwap.connect(userB).applyStartUpNFT(ethers.parseEther("10"));

    let accountANFTLock = await juryNFTSwap.nftLock(userA.address);
    let applyStartUpNFTInfos = await juryNFTSwap.getApplyStartUpNFTInfos();
    let balances = await proposalProxy.getAvailableBalance(userA.address);
    let userApplyInfo = await juryNFTSwap.getUserApplyStartUpNFTInfos(userA.address);

    console.log("userA userApplyInfo", userApplyInfo);
    console.log("ApplyStartUpNFTInfos:", applyStartUpNFTInfos);
    console.log("accountANFTLock", ethers.formatEther(accountANFTLock));
    console.log("balances", ethers.formatEther(balances));

    console.log("---distribute---");

    await juryNFTSwap
      .connect(admin)
      .distributeStartUpNFT([userA.address, userB.address], [3n, 4n]);
    accountANFTLock = await juryNFTSwap.nftLock(userA.address);
    accountAHolding = await juryNFTSwap.getCommonNFTHolding(userA.address);
    balances = await proposalProxy.getAvailableBalance(userA.address);
    let owner = await melonNft.ownerOf(3n);
    userApplyInfo = await juryNFTSwap.getUserApplyStartUpNFTInfos(userA.address);
    applyStartUpNFTInfos = await juryNFTSwap.getApplyStartUpNFTInfos();
    let totalApplyInfo = await juryNFTSwap.getTotalApplyInfo();


    console.log("userA userApplyInfo", userApplyInfo);
    console.log("ApplyStartUpNFTInfos:", applyStartUpNFTInfos);
    console.log("totalApplyInfo", totalApplyInfo);
    console.log("accountAHolding", accountAHolding);
    console.log("accountANFTLock", ethers.formatEther(accountANFTLock));
    console.log("balances", ethers.formatEther(balances));
    expect(owner).to.equal(userA.address);
  });

  it("Ordinary NFT Purchase and Redemption", async function () {
    const { admin, userA, userB, juryNFTSwap, proposalProxy, melonNft } =
      await loadFixture(deployContractsFixture);

    await juryNFTSwap
      .connect(userA)
      .purchaseCommonNFT(2n, proposalProxy.target);

    let balances = await proposalProxy.getAvailableBalance(userA.address);
    let accountAHolding = await juryNFTSwap.getCommonNFTHolding(userA.address);

    console.log("after accountA balance", ethers.formatEther(balances));

    console.log("getAllCommonNFTs: ", await juryNFTSwap.getAllCommonNFTs());

    console.log("accountAHolding", accountAHolding);

    console.log("---redeem---");

    await melonNft.connect(userA).setApprovalForAll(juryNFTSwap.target, true);

    await juryNFTSwap.connect(userA).redeem(2n, ethers.parseEther("30"), proposalProxy.target);

    balances = await proposalProxy.getAvailableBalance(userA.address);

    console.log("after redeem balances", ethers.formatEther(balances));

    console.log("after redeem", await juryNFTSwap.getAllCommonNFTs());

    accountAHolding = await juryNFTSwap.getCommonNFTHolding(userA.address);

    console.log("accountAHolding", accountAHolding);
  });
});
