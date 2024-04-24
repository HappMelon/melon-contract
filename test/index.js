const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Test", function () {
  let accountA, accountB, accountC, accountD, proposalCreatorAccount;
  let flareContract, proposalLogic;
  this.beforeEach(async function () {
    [accountA, accountB, accountC, accountD, proposalCreatorAccount] =
      await ethers.getSigners();

    flareContract = await ethers.deployContract(
      "FlareToken",
      [],
      proposalCreatorAccount
    );
    proposalLogic = await ethers.deployContract(
      "ProposalLogic",
      [flareContract.target],
      proposalCreatorAccount
    );

    console.log("flareContract: ", flareContract.target);
    console.log("proposalLogic: ", proposalLogic.target);
    // Cast 100 tokens per account
    let mintAmount = ethers.parseEther("100");
    await flareContract.mint(accountA.address, mintAmount);
    await flareContract.mint(accountB.address, mintAmount);
    await flareContract.mint(accountC.address, mintAmount);
    await flareContract.mint(accountD.address, mintAmount);
    await flareContract.mint(proposalCreatorAccount.address, mintAmount);

    await flareContract
      .connect(accountA)
      .approve(proposalLogic.target, ethers.parseEther("100"));
    await flareContract
      .connect(accountB)
      .approve(proposalLogic.target, ethers.parseEther("100"));
    await flareContract
      .connect(accountC)
      .approve(proposalLogic.target, ethers.parseEther("100"));
    await flareContract
      .connect(accountD)
      .approve(proposalLogic.target, ethers.parseEther("100"));
    await flareContract
      .connect(proposalCreatorAccount)
      .approve(proposalLogic.target, ethers.parseEther("100"));
  });

  // Test point redemption
  it("Test redemption of points", async function () {
    let points = ethers.parseEther("5");
    await proposalLogic.connect(accountA).deposit(ethers.parseEther("100"));
    await proposalLogic.connect(accountA).exchangePoints(points);
    let balance = await proposalLogic.balances(accountA.address);
    expect(balance).to.equal(points + ethers.parseEther("100"));
  });

  // Options for testing proposal submission and settlement victory
  it("Test proposal settlement victory option logic", async function () {
    // Each account deposits 50 tokens into the contract
    await proposalLogic.connect(accountA).deposit(ethers.parseEther("50"));
    await proposalLogic.connect(accountB).deposit(ethers.parseEther("50"));
    await proposalLogic.connect(accountC).deposit(ethers.parseEther("50"));
    await proposalLogic.connect(accountD).deposit(ethers.parseEther("50"));
    let balance = await flareContract.balanceOf(proposalLogic.target);
    console.log("balance", ethers.formatEther(balance));
    //  Deadline for creating proposal pledge of 5 tokens: 7 day
    await proposalLogic
      .connect(proposalCreatorAccount)
      .createProposal(
        accountA.address,
        "this a proposal",
        ethers.parseEther("5"),
        ["option1", "option2"],
        7n
      );
    // Determine whether the pledge is successful
    let proposalDepositAccountA = await proposalLogic.proposalDeposit(
      accountA.address
    );
    console.log(
      "proposalDepositAccountA",
      ethers.formatEther(proposalDepositAccountA)
    );

    // Execute Voting Option 1 A Pledge 7 B Pledge 3
    // Option 2 C Pledge 4 D Pledge 6
    await proposalLogic.connect(accountA).vote(0n, 0n, ethers.parseEther("7"));
    await proposalLogic.connect(accountB).vote(0n, 0n, ethers.parseEther("3"));
    await proposalLogic.connect(accountC).vote(0n, 1n, ethers.parseEther("4"));
    await proposalLogic.connect(accountD).vote(0n, 1n, ethers.parseEther("6"));

    // Check if voting was successful
    let accountDVote = await proposalLogic
      .connect(accountA)
      .votingDeposit(accountD.address);
    console.log("accountDVote", ethers.formatEther(accountDVote));

    let voteOption1Info = await proposalLogic.proposalOptions(0n, 0n);
    let voteOption2Info = await proposalLogic.proposalOptions(0n, 1n);

    console.log("选项1得票", ethers.formatEther(voteOption1Info.voteCount));
    console.log("选项2得票", ethers.formatEther(voteOption2Info.voteCount));
    // End proposal
    await proposalLogic.deactivateProposal(0n);

    // Assuming Option 1 wins
    await proposalLogic.settleRewards(0n, 0n);
    let proposalCreatorBalance = await proposalLogic.balances(
      proposalCreatorAccount.address
    );
    let accountABalance = await proposalLogic.balances(accountA.address);
    let accountBBalance = await proposalLogic.balances(accountB.address);
    let accountCBalance = await proposalLogic.balances(accountC.address);
    let accountDBalance = await proposalLogic.balances(accountD.address);

    // Proposal creators receive a 5% reward
    console.log(
      "proposalCreatorBalance",
      ethers.formatEther(proposalCreatorBalance)
    );
    console.log("accountABalance", ethers.formatEther(accountABalance));
    console.log("accountBBalance", ethers.formatEther(accountBBalance));
    console.log("accountCBalance", ethers.formatEther(accountCBalance));
    console.log("accountDBalance", ethers.formatEther(accountDBalance));

    // Test query proposal winning option
    let winOptionId = await proposalLogic.winningOptionByProposal(0n);
    console.log("winOptionId", winOptionId);

    // Test and query the rewards or punishments obtained from user voting settlement
    let rewardAmount = await proposalLogic
      .connect(accountA)
      .rewardOrPenaltyInSettledProposal(0n, accountC.address);
    console.log("rewardAmount", ethers.formatEther(rewardAmount));
  });
});
