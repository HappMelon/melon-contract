const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Test", function () {
  let accountA, accountB, accountC, accountD, proposalCreatorAccount;
  let melonToken, proposalProxy, proposalImplementationV1;

  this.beforeEach(async function () {
    [accountA, accountB, accountC, accountD, proposalCreatorAccount] =
      await ethers.getSigners();

    // print pre account address
    console.log("accountA: ", accountA.address);
    console.log("accountB: ", accountB.address);
    console.log("accountC: ", accountC.address);
    console.log("accountD: ", accountD.address);
    console.log("proposalCreatorAccount: ", proposalCreatorAccount.address);

    melonToken = await ethers.deployContract(
      "MelonToken",
      [],
      proposalCreatorAccount
    );

    let proposalFactory = await ethers.getContractFactory("Proposal");

    proposalProxy = await upgrades.deployProxy(
      proposalFactory,
      [melonToken.target],
      {
        kind: "uups",
        initializer: "initialize",
        // constructorArgs:[accountA.address]
      }
    );

    // 实现合约地址
    let proposalImplementationV1Addr =
      await upgrades.erc1967.getImplementationAddress(proposalProxy.target);
    // proxyAdmin 合约地址
    let adminAddress = await upgrades.erc1967.getAdminAddress(
      proposalProxy.target
    );
    // 代理合约地址
    console.log(`proposalProxy: ${proposalProxy.target}`);
    console.log(
      `proposalImplementationV1Addr: ${proposalImplementationV1Addr}`
    );
    console.log(`adminAddress: ${adminAddress}`);

    proposalImplementationV1 = await ethers.getContractAt(
      "Proposal",
      proposalImplementationV1Addr
    );
    console.log("proposalImplementationV1: ", proposalImplementationV1.target);

    console.log("proposalProxy.owner: ", await proposalProxy.owner());
    console.log("proposalImplementationV1.owner: ", await proposalImplementationV1.owner());

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

  it("upgradeProxy", async function () {
    await proposalProxy.connect(accountA).deposit(ethers.parseEther("10"));
    // exchange points
    await proposalProxy
      .connect(accountA)
      .exchangePoints(ethers.parseEther("1"));
    let accountABalance = await proposalProxy.balances(accountA.address);
    console.log("accountABalance", ethers.formatEther(accountABalance));

    // change logic contract(exchangePoints get extra 99999 reward)
    // second implementation
    let newProposalFactory = await ethers.getContractFactory("ProposalV2");
    await upgrades.upgradeProxy(proposalProxy, newProposalFactory);

    await proposalProxy
      .connect(accountA)
      .exchangePoints(ethers.parseEther("1"));
    let newAccountABalance = await proposalProxy.balances(accountA.address);
    let newLogicAddress = await proposalProxy.logicAddress();
    console.log("newAccountABalance", ethers.formatEther(newAccountABalance));
    console.log("newLogicAddress", newLogicAddress);
  });

  it("proposal settlement", async function () {
    // Each account deposits 50 tokens into the contract
    await proposalProxy.connect(accountA).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(accountB).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(accountC).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(accountD).deposit(ethers.parseEther("50"));
    await proposalProxy
      .connect(proposalCreatorAccount)
      .deposit(ethers.parseEther("50"));

    let balance = await melonToken.balanceOf(proposalProxy.target);
    console.log("proposalProxy.balance", ethers.formatEther(balance));

    //  Deadline for creating proposal pledge of 5 tokens: 7 day
    await proposalProxy.connect(proposalCreatorAccount).createProposal(
      ethers.parseEther("5"),
      ["option1", "option2"],
      7n
    );

    // Determine whether the pledge is successful
    let proposalCreatorAccountDeposit = await proposalProxy.proposalDeposit(
      proposalCreatorAccount.address
    );
    console.log(
      "proposalCreatorAccountDeposit",
      ethers.formatEther(proposalCreatorAccountDeposit)
    );

    // Execute Voting Option 1 A Pledge 7 B Pledge 3
    // Option 2 C Pledge 4 D Pledge 6
    await proposalProxy.connect(accountA).vote(0n, 0n, ethers.parseEther("7"));
    await proposalProxy.connect(accountB).vote(0n, 0n, ethers.parseEther("3"));
    await proposalProxy.connect(accountC).vote(0n, 1n, ethers.parseEther("4"));
    await proposalProxy.connect(accountD).vote(0n, 1n, ethers.parseEther("6"));

    // Check if voting was successful
    let accountDVote = await proposalProxy.votingDeposit(accountD.address);
    console.log("accountDVote", ethers.formatEther(accountDVote));

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

    // Assuming Option 1 wins
    await proposalProxy.settleRewards(0n, 0n);
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

    // Test query proposal winning option
    let winOptionId = await proposalProxy.winningOptionByProposal(0n);
    console.log("winOptionId", winOptionId);

    // Test and query the rewards or punishments obtained from user voting settlement
    let rewardAmount = await proposalProxy.rewardOrPenaltyInSettledProposal(
      0n,
      accountC.address
    );
    console.log("rewardAmount", ethers.formatEther(rewardAmount));
  });
});
