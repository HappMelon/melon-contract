const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Test", function () {
  let accountA, accountB, accountC, accountD, proposalCreatorAccount;
  let flareContract, proposalLogic, proposalUUPSProxy, proposalLogicTest;
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
      [],
      proposalCreatorAccount
    );
    proposalUUPSProxy = await ethers.deployContract(
      "ProposalUUPSProxy",
      [proposalLogic.target, flareContract.target],
      proposalCreatorAccount
    );
    proposalLogicTest = await ethers.deployContract(
      "ProposalLogicTest",
      [],
      proposalCreatorAccount
    );

    console.log("flareContract: ", flareContract.target);
    console.log("proposalLogic: ", proposalLogic.target);
    console.log("proposalLogicTest: ", proposalLogicTest.target);
    console.log("proposalUUPSProxy: ", proposalUUPSProxy.target);

    // Cast 100 tokens per account
    let mintAmount = ethers.parseEther("100");
    await flareContract.mint(accountA.address, mintAmount);
    await flareContract.mint(accountB.address, mintAmount);
    await flareContract.mint(accountC.address, mintAmount);
    await flareContract.mint(accountD.address, mintAmount);
    await flareContract.mint(proposalCreatorAccount.address, mintAmount);

    // approve
    await flareContract
      .connect(accountA)
      .approve(proposalUUPSProxy.target, ethers.parseEther("100"));
    await flareContract
      .connect(accountB)
      .approve(proposalUUPSProxy.target, ethers.parseEther("100"));
    await flareContract
      .connect(accountC)
      .approve(proposalUUPSProxy.target, ethers.parseEther("100"));
    await flareContract
      .connect(accountD)
      .approve(proposalUUPSProxy.target, ethers.parseEther("100"));
    await flareContract
      .connect(proposalCreatorAccount)
      .approve(proposalUUPSProxy.target, ethers.parseEther("100"));
  });

  it("test proxy and exchange points", async function () {
    await flareContract
      .connect(accountA)
      .approve(proposalUUPSProxy.target, ethers.parseEther("100"));

    // encode data
    const depositCallData = proposalLogic.interface.encodeFunctionData(
      "deposit",
      [ethers.parseEther("8")]
    );
    console.log("depositCallData", depositCallData);

    await accountA.sendTransaction({
      to: proposalUUPSProxy.target,
      data: depositCallData,
    });

    // exchange points
    const exchangePointsCallData = proposalLogic.interface.encodeFunctionData(
      "exchangePoints",
      [ethers.parseEther("1")]
    );

    await accountA.sendTransaction({
      to: proposalUUPSProxy.target,
      data: exchangePointsCallData,
    });

    let accountABalance = await proposalUUPSProxy.balances(accountA.address);
    console.log("accountABalance", ethers.formatEther(accountABalance));

    // change logic contract
    const changeNewLogicCallData = proposalLogic.interface.encodeFunctionData(
      "upgrade",
      [proposalLogicTest.target]
    );

    await accountA.sendTransaction({
      to: proposalUUPSProxy.target,
      data: changeNewLogicCallData,
    });

    let newProxyAddr = await proposalUUPSProxy.logicAddress();
    console.log("newProxyAddr", newProxyAddr);

    //new exchange points
    const newExchangePointsCallData =
      proposalLogicTest.interface.encodeFunctionData("exchangePoints", [
        ethers.parseEther("1"),
      ]);

    await accountA.sendTransaction({
      to: proposalUUPSProxy.target,
      data: newExchangePointsCallData,
    });

    let newAccountABalance = await proposalUUPSProxy.balances(accountA.address);
    console.log("newAccountABalance", ethers.formatEther(newAccountABalance));
  });

  // Options for testing proposal submission and settlement victory
  it("Test proposal settlement victory option logic", async function () {
    // Each account deposits 50 tokens into the contract
    // encode data

    let proposalLogicInterface = proposalLogic.interface;

    const depositCallData = proposalLogicInterface.encodeFunctionData(
      "deposit",
      [ethers.parseEther("50")]
    );
    await accountA.sendTransaction({
      to: proposalUUPSProxy.target,
      data: depositCallData,
    });
    await accountB.sendTransaction({
      to: proposalUUPSProxy.target,
      data: depositCallData,
    });
    await accountC.sendTransaction({
      to: proposalUUPSProxy.target,
      data: depositCallData,
    });
    await accountD.sendTransaction({
      to: proposalUUPSProxy.target,
      data: depositCallData,
    });
    await proposalCreatorAccount.sendTransaction({
      to: proposalUUPSProxy.target,
      data: depositCallData,
    });

    // await proposalLogic.connect(accountA).deposit(ethers.parseEther("50"));
    // await proposalLogic.connect(accountB).deposit(ethers.parseEther("50"));
    // await proposalLogic.connect(accountC).deposit(ethers.parseEther("50"));
    // await proposalLogic.connect(accountD).deposit(ethers.parseEther("50"));
    let balance = await flareContract.balanceOf(proposalUUPSProxy.target);
    console.log("proposalUUPSProxy.balance", ethers.formatEther(balance));

    //  Deadline for creating proposal pledge of 5 tokens: 7 day
    const createProposalCallData = proposalLogicInterface.encodeFunctionData(
      "createProposal",
      [
        proposalCreatorAccount.address,
        ethers.parseEther("5"),
        ["option1", "option2"],
        7n,
      ]
    );
    await proposalCreatorAccount.sendTransaction({
      to: proposalUUPSProxy.target,
      data: createProposalCallData,
    });

    // await proposalLogic
    //   .connect(proposalCreatorAccount)
    //   .createProposal(
    //     accountA.address,
    //     "this a proposal",
    //     ethers.parseEther("5"),
    //     ["option1", "option2"],
    //     7n
    //   );

    // Determine whether the pledge is successful
    let accountADeposit = await proposalUUPSProxy.proposalDeposit(
      accountA.address
    );
    console.log("AccountA Deposit", ethers.formatEther(accountADeposit));

    // Execute Voting Option 1 A Pledge 7 B Pledge 3
    // Option 2 C Pledge 4 D Pledge 6
    await accountA.sendTransaction({
      to: proposalUUPSProxy.target,
      data: proposalLogicInterface.encodeFunctionData("vote", [
        0n,
        0n,
        ethers.parseEther("7"),
      ]),
    });
    await accountB.sendTransaction({
      to: proposalUUPSProxy.target,
      data: proposalLogicInterface.encodeFunctionData("vote", [
        0n,
        0n,
        ethers.parseEther("3"),
      ]),
    });
    await accountC.sendTransaction({
      to: proposalUUPSProxy.target,
      data: proposalLogicInterface.encodeFunctionData("vote", [
        0n,
        1n,
        ethers.parseEther("4"),
      ]),
    });
    await accountD.sendTransaction({
      to: proposalUUPSProxy.target,
      data: proposalLogicInterface.encodeFunctionData("vote", [
        0n,
        1n,
        ethers.parseEther("6"),
      ]),
    });

    // await proposalLogic.connect(accountA).vote(0n, 0n, ethers.parseEther("7"));
    // await proposalLogic.connect(accountB).vote(0n, 0n, ethers.parseEther("3"));
    // await proposalLogic.connect(accountC).vote(0n, 1n, ethers.parseEther("4"));
    // await proposalLogic.connect(accountD).vote(0n, 1n, ethers.parseEther("6"));

    // Check if voting was successful
    let accountDVote = await proposalUUPSProxy
      .connect(accountA)
      .votingDeposit(accountD.address);
    console.log("accountDVote", ethers.formatEther(accountDVote));

    let voteOption1Info = await proposalUUPSProxy.proposalOptions(0n, 0n);
    let voteOption2Info = await proposalUUPSProxy.proposalOptions(0n, 1n);

    console.log(
      "Option 1 Votes Received",
      ethers.formatEther(voteOption1Info.voteCount)
    );
    console.log(
      "Option 2 Votes Received",
      ethers.formatEther(voteOption2Info.voteCount)
    );
    // End proposal
    await accountA.sendTransaction({
      to: proposalUUPSProxy.target,
      data: proposalLogicInterface.encodeFunctionData("deactivateProposal", [
        0n,
      ]),
    });
    // await proposalLogic.deactivateProposal(0n);

    // Assuming Option 1 wins
    await accountA.sendTransaction({
      to: proposalUUPSProxy.target,
      data: proposalLogicInterface.encodeFunctionData("settleRewards", [0n, 0]),
    });
    // await proposalLogic.settleRewards(0n, 0n);
    let proposalCreatorBalance = await proposalUUPSProxy.balances(
      proposalCreatorAccount.address
    );
    let accountABalance = await proposalUUPSProxy.balances(accountA.address);
    let accountBBalance = await proposalUUPSProxy.balances(accountB.address);
    let accountCBalance = await proposalUUPSProxy.balances(accountC.address);
    let accountDBalance = await proposalUUPSProxy.balances(accountD.address);

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
    let winOptionId = await proposalUUPSProxy.winningOptionByProposal(0n);
    console.log("winOptionId", winOptionId);

    // Test and query the rewards or punishments obtained from user voting settlement

    let rewardAmount = await proposalUUPSProxy.rewardOrPenaltyInSettledProposal(
      0n,
      accountC.address
    );
    console.log("rewardAmount", ethers.formatEther(rewardAmount));
  });
});
