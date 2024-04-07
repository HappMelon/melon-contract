const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Test", function () {
  let accountA, accountB, accountC, accountD;
  let flareContract, proposalLogic;
  this.beforeEach(async function () {
    [accountA, accountB, accountC, accountD] = await ethers.getSigners();

    flareContract = await ethers.deployContract("FlareToken", [], accountA);
    proposalLogic = await ethers.deployContract(
      "ProposalLogic",
      [flareContract.target],
      accountA
    );
    // 铸造1000代币
    await flareContract.mint(accountA.address, 100n);
    await flareContract.mint(accountB.address, 100n);
    await flareContract.mint(accountC.address, 100n);
    await flareContract.mint(accountD.address, 100n);
    // 授权
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
  });

  // it("Test proposal for successful grades", async function () {
  //   // 创建提案
  //   let index = await proposalLogic.createProposalWithOptions(
  //     "this a proposal",
  //     ["option1", "option2"],
  //     ethers.parseEther("70"),
  //     ethers.parseEther("1")
  //   );
  //   let proposal = await proposalLogic.proposals(0);
  //   console.log("index: ", index, "proposal", proposal);
  //   expect(proposal).not.null;
  // });

  it("Test proposal settlement victory option logic", async function () {
    // A 创建提案
    await proposalLogic.createProposalWithOptions(
      "this a proposal",
      ["option1", "option2"],
      ethers.parseEther("100"),
      ethers.parseEther("1")
    );
    let proposal = await proposalLogic.proposals(0);
    // console.log("proposal", proposal);
    // 每个账户质押10代币
    await proposalLogic.connect(accountA).deposit(ethers.parseEther("10"));
    await proposalLogic.connect(accountB).deposit(ethers.parseEther("10"));
    await proposalLogic.connect(accountC).deposit(ethers.parseEther("10"));
    await proposalLogic.connect(accountD).deposit(ethers.parseEther("10"));
    let balance = await flareContract.balanceOf(proposalLogic.target);
    console.log("balance", ethers.formatEther(balance));
    // 执行投票 A质押7 B质押3 C4 D6
    await proposalLogic.connect(accountA).vote(0n, 0n, ethers.parseEther("7"));
    await proposalLogic.connect(accountB).vote(0n, 0n, ethers.parseEther("3"));
    await proposalLogic.connect(accountC).vote(0n, 1n, ethers.parseEther("4"));
    await proposalLogic.connect(accountD).vote(0n, 1n, ethers.parseEther("6"));

    let voteOption1Info = await proposalLogic.proposalOptions(0n, 0n);
    let voteOption2Info = await proposalLogic.proposalOptions(0n, 1n);

    console.log("选项1得票", ethers.formatEther(voteOption1Info.voteCount));
    console.log("选项2得票", ethers.formatEther(voteOption2Info.voteCount));
    // 结束提案
    await proposalLogic.deactivateProposal(0n);
    
    // 假设选项1获胜
    await proposalLogic.settleRewards(0n, 0n);

    let accountABalance = await proposalLogic.balances(accountA.address);
    let accountBBalance = await proposalLogic.balances(accountB.address);
    let accountCBalance = await proposalLogic.balances(accountC.address);
    let accountDBalance = await proposalLogic.balances(accountD.address);
    console.log("accountABalance", ethers.formatEther(accountABalance));
    console.log("accountBBalance", ethers.formatEther(accountBBalance));
    console.log("accountCBalance", ethers.formatEther(accountCBalance));
    console.log("accountDBalance", ethers.formatEther(accountDBalance));


  });
});
