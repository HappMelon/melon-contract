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

  let juryMembersA, juryMembersB, juryMembersC, juryMembersD;
  let melonToken, juryNFTSwap, melonNft;

  this.beforeEach(async function () {
    [juryMembersA, juryMembersB, juryMembersC, juryMembersD] =
      await ethers.getSigners();

    melonToken = await ethers.deployContract("MelonToken");

    melonNft = await ethers.deployContract("MelonNft");

    let proposalFactory = await ethers.getContractFactory("Proposal");

    proposalProxy = await upgrades.deployProxy(
      proposalFactory,
      [melonToken.target],
      {
        kind: "uups",
        initializer: "initialize",
      }
    );

   

    juryNFTSwap = await ethers.deployContract("JuryNFTSwap", [
      melonToken.target
    ]);

    // init 10 nft
    for (let i = 0; i < 3; i++) {
      await melonNft.mint(juryMembersA.address, allLinks[i]);
    }

    // apove all nft to juryNFTSwap
    await melonNft.setApprovalForAll(juryNFTSwap.target, true);

    for (let i = 0; i < 3; i++) {
      await juryNFTSwap.hangOut(melonNft.target, i, ethers.parseEther("10"));
    }

    // Cast 100 tokens per account
    let mintAmount = ethers.parseEther("100");
    await melonToken.mint(juryMembersA.address, mintAmount);
    await melonToken.mint(juryMembersB.address, mintAmount);
    await melonToken.mint(juryMembersC.address, mintAmount);
    await melonToken.mint(juryMembersD.address, mintAmount);

    // approve
    await melonToken
      .connect(juryMembersA)
      .approve(juryNFTSwap.target, ethers.parseEther("100"));
    await melonToken
      .connect(juryMembersB)
      .approve(juryNFTSwap.target, ethers.parseEther("100"));
    await melonToken
      .connect(juryMembersC)
      .approve(juryNFTSwap.target, ethers.parseEther("100"));
    await melonToken
      .connect(juryMembersD)
      .approve(juryNFTSwap.target, ethers.parseEther("100"));
  });

  it("hangOut", async function () {
    // B buy
    await juryNFTSwap.connect(juryMembersB).buy(melonNft.target, 1n);
    console.log(
      "B_NFT_Balance",
      await melonNft.balanceOf(juryMembersB.address)
    );
    console.log(
      "B_Balance",
      ethers.formatEther(await melonToken.balanceOf(juryMembersB.address))
    );
    console.log("allListing", await juryNFTSwap.getAllListing());

    await melonNft
      .connect(juryMembersB)
      .setApprovalForAll(juryNFTSwap.target, true);
    console.log("begin redeem");
    // B redeem
    await juryNFTSwap
      .connect(juryMembersB)
      .redeem(melonNft.target, 1n, ethers.parseEther("10"));
    console.log(
      "B_NFT_Balance",
      await melonNft.balanceOf(juryMembersB.address)
    );
    console.log(
      "B_Balance",
      ethers.formatEther(await melonToken.balanceOf(juryMembersB.address))
    );
  });
});
