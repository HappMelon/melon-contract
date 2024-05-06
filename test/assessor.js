const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Test", function () {
  let accountA, accountB, accountC, accountD, proposalCreatorAccount;
  let juryMembersA, juryMembersB, juryMembersC, juryMembersD;
  let flareContract, proposalProxy, assessor;

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

    flareContract = await ethers.deployContract("FlareToken");

    let proposalFactory = await ethers.getContractFactory("Proposal");

    proposalProxy = await upgrades.deployProxy(
      proposalFactory,
      [flareContract.target],
      {
        kind: "uups",
        initializer: "initialize",
      }
    );

    assessor = await ethers.deployContract("Assessor", [proposalProxy.target]);

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
      .approve(proposalProxy.target, ethers.parseEther("100"));
    await flareContract
      .connect(accountB)
      .approve(proposalProxy.target, ethers.parseEther("100"));
    await flareContract
      .connect(accountC)
      .approve(proposalProxy.target, ethers.parseEther("100"));
    await flareContract
      .connect(accountD)
      .approve(proposalProxy.target, ethers.parseEther("100"));
    await flareContract
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
});
