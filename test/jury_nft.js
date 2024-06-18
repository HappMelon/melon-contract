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
    const [juror, userA, userB, userC] = await ethers.getSigners();

    const melonToken = await ethers.deployContract("MelonToken");

    const melonNft = await ethers.deployContract("MelonNFT");

    const proposalFactory = await ethers.getContractFactory("Proposal");

    const proposalProxy = await upgrades.deployProxy(
      proposalFactory,
      [melonToken.target],
      {
        kind: "uups",
        initializer: "initialize",
      }
    );

    const juryNFTSwap = await ethers.deployContract("JuryNFTSwap", [
      melonToken.target,
      melonNft.target,
      proposalProxy.target,
    ]);

    // init 10 nft
    for (let i = 0; i < 5; i++) {
      await melonNft.mint(juror.address, allLinks[i]);
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
    await melonToken.mint(juror.address, mintAmount);
    await melonToken.mint(userA.address, mintAmount);
    await melonToken.mint(userB.address, mintAmount);
    await melonToken.mint(userC.address, mintAmount);

    // approve
    await melonToken
      .connect(juror)
      .approve(proposalProxy.target, ethers.parseEther("100"));
    await melonToken
      .connect(userA)
      .approve(juryNFTSwap.target, ethers.parseEther("100"));
    await melonToken
      .connect(userB)
      .approve(juryNFTSwap.target, ethers.parseEther("100"));
    await melonToken
      .connect(userC)
      .approve(juryNFTSwap.target, ethers.parseEther("100"));

    await proposalProxy.createPledge((await time.latest()) + 30, 20, 50);

    console.log("before allListing", await juryNFTSwap.getAllListing());

    return {
      juror,
      userA,
      userB,
      userC,
      melonToken,
      juryNFTSwap,
      melonNft,
      proposalProxy,
    };
  }

  it("Beginning NFT Acquisition", async function () {
    const {
      juror,
      userA,
      userB,
      userC,
      melonToken,
      juryNFTSwap,
      melonNft,
      proposalProxy,
    } = await loadFixture(deployContractsFixture);

    await juryNFTSwap.connect(juror).issuanceStartUpNFT(0n, juror.address);

    console.log("0 NFT Owner", await melonNft.ownerOf(0n));
    console.log("after allListing", await juryNFTSwap.getAllListing());
  });

  it("Ordinary NFT Purchase and Redemption", async function () {
    const {
      juror,
      userA,
      userB,
      userC,
      melonToken,
      juryNFTSwap,
      melonNft,
      proposalProxy,
    } = await loadFixture(deployContractsFixture);

    await juryNFTSwap.connect(userA).purchaseCommonNFT(2n);
    expect(await melonNft.ownerOf(2n)).to.equal(userA.address);
    expect(await melonToken.balanceOf(userA.address)).to.equal(
      ethers.parseEther("90")
    );
    console.log("after purchaseCommonNFT", await juryNFTSwap.getAllListing());

    await melonNft.connect(userA).setApprovalForAll(juryNFTSwap.target, true);
    await juryNFTSwap.connect(userA).redeem(2n, ethers.parseEther("10"));
    expect(await melonNft.ownerOf(2n)).to.equal(juryNFTSwap.target);
    expect(await melonToken.balanceOf(userA.address)).to.equal(
      ethers.parseEther("99.8")
    );
    console.log("after redeem", await juryNFTSwap.getAllListing());
  });

  it("Check Purchased NFT Details", async function () {
    const {
      juror,
      userA,
      userB,
      userC,
      melonToken,
      juryNFTSwap,
      melonNft,
      proposalProxy,
    } = await loadFixture(deployContractsFixture);

    await juryNFTSwap.connect(userA).purchaseCommonNFT(2n);
    const purchasedNFTs = await juryNFTSwap.getUserPurchasedNFTDetails(
      userA.address
    );

    expect(purchasedNFTs.length).to.equal(1);
    expect(purchasedNFTs[0].tokenId).to.equal(2);
    expect(purchasedNFTs[0].price).to.equal(ethers.parseEther("10"));
    expect(purchasedNFTs[0].uri).to.equal(
      "https://ipfs.filebase.io/ipfs/QmRs3fNGpwkXfYkcojDrV8inp3NGWAX9Cj41Y1321ZTpoL"
    );

    console.log("Purchased NFT Details for userA", purchasedNFTs);
  });
});
