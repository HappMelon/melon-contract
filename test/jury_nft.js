const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Test", function () {
  // Original JavaScript code
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
  let accountA, accountB, accountC, accountD, proposalCreatorAccount;
  let juryMembersA, juryMembersB, juryMembersC, juryMembersD;
  let melonToken, proposalProxy, assessor, juryNFTSwap, melonNft;

  this.beforeEach(async function () {
    [
      accountA,
      accountB,
      accountC,
      accountD,
      proposalCreatorAccount,
      juryMembersA,
      juryMembersB,
      juryMembersC,
      juryMembersD,
    ] = await ethers.getSigners();

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

    assessor = await ethers.deployContract("Assessor", [proposalProxy.target]);
    juryNFTSwap = await ethers.deployContract("JuryNFTSwap", [
      melonToken.target,
      assessor.target,
    ]);

    // init 10 nft
    for (let i = 0; i < 16; i++) {
      await melonNft.mint(allLinks[i]);
    }
    // apove all nft to juryNFTSwap
    await melonNft.setApprovalForAll(juryNFTSwap.target, true);

    let proposalImplementationV1Addr =
      await upgrades.erc1967.getImplementationAddress(proposalProxy.target);
    let adminAddress = await upgrades.erc1967.getAdminAddress(
      proposalProxy.target
    );
    console.log(`proposalProxy: ${proposalProxy.target}`);
    console.log(
      `proposalImplementationV1Addr: ${proposalImplementationV1Addr}`
    );
    console.log(`adminAddress: ${adminAddress}`);
    // Cast 100 tokens per account
    let mintAmount = ethers.parseEther("100");
    await melonToken.mint(accountA.address, mintAmount);
    await melonToken.mint(accountB.address, mintAmount);
    await melonToken.mint(accountC.address, mintAmount);
    await melonToken.mint(accountD.address, mintAmount);
    await melonToken.mint(proposalCreatorAccount.address, mintAmount);

    // approve
    await melonToken
      .connect(accountA)
      .approve(proposalProxy.target, ethers.parseEther("100"));
    await melonToken
      .connect(accountB)
      .approve(proposalProxy.target, ethers.parseEther("100"));
    await melonToken
      .connect(accountC)
      .approve(proposalProxy.target, ethers.parseEther("100"));
    await melonToken
      .connect(accountD)
      .approve(proposalProxy.target, ethers.parseEther("100"));
    await melonToken
      .connect(proposalCreatorAccount)
      .approve(proposalProxy.target, ethers.parseEther("100"));
  });

  it("create assessor and vote", async function () {
    await proposalProxy.connect(accountA).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(accountB).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(accountC).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(accountD).deposit(ethers.parseEther("50"));
    await proposalProxy
      .connect(proposalCreatorAccount)
      .deposit(ethers.parseEther("50"));

    await proposalProxy
      .connect(proposalCreatorAccount)
      .createProposal(ethers.parseEther("5"), ["option1", "option2"], 7n);

    // user vote option1 win
    await proposalProxy.connect(accountA).vote(0n, 0n, ethers.parseEther("7"));
    await proposalProxy.connect(accountB).vote(0n, 0n, ethers.parseEther("3"));
    await proposalProxy.connect(accountC).vote(0n, 1n, ethers.parseEther("3"));
    await proposalProxy.connect(accountD).vote(0n, 1n, ethers.parseEther("2"));

    let voteOption1Info = await proposalProxy.proposalOptions(0n, 0n);
    let voteOption2Info = await proposalProxy.proposalOptions(0n, 1n);
    console.log(
      "Option 1 Votes Received",
      ethers.formatEther(voteOption1Info.voteCount)
    );
    console.log(
      "Option 2 Votes Received",
      ethers.formatEther(voteOption2Info.voteCount)
    );

    // End proposal
    await proposalProxy.deactivateProposal(0n);

    //  create assessor
    await assessor.connect(juryMembersA).updateJurorStatus(true);
    await assessor.connect(juryMembersB).updateJurorStatus(true);
    await assessor.connect(juryMembersC).updateJurorStatus(true);
    await assessor.connect(juryMembersD).updateJurorStatus(true);
    await assessor.createProposalJury(0n, 3n, 0n, [
      juryMembersA.address,
      juryMembersB.address,
      juryMembersC.address,
      juryMembersD.address,
    ]);

    //  vote assessor
    await assessor.connect(juryMembersA).vote(0n, 0n);
    await assessor.connect(juryMembersB).vote(0n, 0n);
    await assessor.connect(juryMembersC).vote(0n, 0n);
    await assessor.connect(juryMembersD).vote(0n, 0n);
    let assessorVoteInfo = await assessor.proposalJuries(0n);
    let assessorVotes = await assessor.getVoters(0n);
    let juryMembersAIsVoted = await assessor.isVoted(0n, juryMembersA.address);

    console.log("Assessor Votes Received", assessorVoteInfo);
    console.log("Assessor Votes", assessorVotes);
    console.log("juryMembersAIsVoted", juryMembersAIsVoted);

    let proposalCreatorBalance = await proposalProxy.balances(
      proposalCreatorAccount.address
    );
    let accountABalance = await proposalProxy.balances(accountA.address);
    let accountBBalance = await proposalProxy.balances(accountB.address);
    let accountCBalance = await proposalProxy.balances(accountC.address);
    let accountDBalance = await proposalProxy.balances(accountD.address);

    // Proposal creators receive a 5% reward
    console.log(
      "proposalCreatorBalance",
      ethers.formatEther(proposalCreatorBalance)
    );
    console.log("accountABalance", ethers.formatEther(accountABalance));
    console.log("accountBBalance", ethers.formatEther(accountBBalance));
    console.log("accountCBalance", ethers.formatEther(accountCBalance));
    console.log("accountDBalance", ethers.formatEther(accountDBalance));
  });

  it("hangOut", async function () {

    for (let index = 0; index < 3; index++) {
      await juryNFTSwap.hangOut(melonNft.target, index + 1, ethers.parseEther("10"));
    }

    console.log("allListing", await juryNFTSwap.getAllListing());

    // approve
    await melonToken.connect(accountB).approve(juryNFTSwap.target, ethers.parseEther("100"));
    await juryNFTSwap.connect(accountB).buy(melonNft.target, 1n);
    // check whether the Account B is jury member
    console.log("B isJuryMember", await assessor.juryMembers(accountB.address));
    console.log("allListing after buy", await juryNFTSwap.getAllListing());


    await melonNft.connect(accountB).setApprovalForAll(juryNFTSwap.target, true);

    // wait 5 seconds
    await new Promise((r) => setTimeout(r, 5000));

    await juryNFTSwap.connect(accountB).redeem(melonNft.target, 1n, ethers.parseEther("5"));
    console.log("B isJuryMember", await assessor.juryMembers(accountB.address));
    console.log("allListing after redeem", await juryNFTSwap.getAllListing());


    let accountBBalance = await melonToken.balanceOf(accountB.address);
    let juryNFTSwapBalance = await melonToken.balanceOf(juryNFTSwap.target);
    console.log("accountBBalance", ethers.formatEther(accountBBalance));
    console.log("juryNFTSwapBalance", ethers.formatEther(juryNFTSwapBalance));
  });
});
