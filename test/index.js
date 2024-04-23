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

    // 打印地址
    console.log("flareContract: ", flareContract.target);
    console.log("proposalLogic: ", proposalLogic.target);
    // 铸造100代币
    let mintAmount = ethers.parseEther("100");
    await flareContract.mint(accountA.address, mintAmount);
    await flareContract.mint(accountB.address, mintAmount);
    await flareContract.mint(accountC.address, mintAmount);
    await flareContract.mint(accountD.address, mintAmount);
    await flareContract.mint(proposalCreatorAccount.address, mintAmount);

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
    await flareContract
      .connect(proposalCreatorAccount)
      .approve(proposalLogic.target, ethers.parseEther("100"));
  });
  // 测试积分兑换
  // it("Test redemption of points", async function () {
  //   let points = ethers.parseEther("5");
  //   await proposalLogic.deposit(ethers.parseEther("100"));
  //   await proposalLogic.exchangePoints(points);
  //   let balance = await proposalLogic.balances(accountA.address);
  //   expect(balance).to.equal(points + ethers.parseEther("100"));
  // });
  // 测试提交提案和结算胜利的选项
  it("Test proposal settlement victory option logic", async function () {
    //  创建提案 质押100代币 截止时间1天
    await proposalLogic
      .connect(proposalCreatorAccount)
      .createProposal(
        accountA.address,
        "this a proposal",
        100n,
        ["option1", "option2"],
        7n
      );
    let optionCount = await proposalLogic.getOptionsCount(0n);

    console.log("optionCount", optionCount);

    let proposal = await proposalLogic.proposals(0);
    // console.log("proposal", proposal);
    // 每个账户往合约中存10代币
    await proposalLogic.connect(accountA).deposit(ethers.parseEther("10"));
    await proposalLogic.connect(accountB).deposit(ethers.parseEther("10"));
    await proposalLogic.connect(accountC).deposit(ethers.parseEther("10"));
    await proposalLogic.connect(accountD).deposit(ethers.parseEther("10"));
    let balance = await flareContract.balanceOf(proposalLogic.target);
    console.log("balance", ethers.formatEther(balance));
    // 执行投票 选项1 A质押7 B质押3 选项2 C质押4 D质押6
    await proposalLogic.connect(accountA).vote(0n, 0n, ethers.parseEther("7"));
    await proposalLogic.connect(accountB).vote(0n, 0n, ethers.parseEther("3"));
    await proposalLogic.connect(accountC).vote(0n, 1n, ethers.parseEther("4"));
    await proposalLogic.connect(accountD).vote(0n, 1n, ethers.parseEther("6"));

    // 查询是否投票成功
    let accountDVote = await proposalLogic
      .connect(accountA)
      .getUserVotingRights(accountD.address);
    console.log("accountDVote", ethers.formatEther(accountDVote));

    let voteOption1Info = await proposalLogic.proposalOptions(0n, 0n);
    let voteOption2Info = await proposalLogic.proposalOptions(0n, 1n);

    console.log("选项1得票", ethers.formatEther(voteOption1Info.voteCount));
    console.log("选项2得票", ethers.formatEther(voteOption2Info.voteCount));
    // 结束提案
    await proposalLogic.deactivateProposal(0n);

    // 假设选项1获胜
    await proposalLogic.settleRewards(0n, 0n);
    let proposalCreatorBalance = await proposalLogic.balances(
      proposalCreatorAccount.address
    );
    let accountABalance = await proposalLogic.balances(accountA.address);
    let accountBBalance = await proposalLogic.balances(accountB.address);
    let accountCBalance = await proposalLogic.balances(accountC.address);
    let accountDBalance = await proposalLogic.balances(accountD.address);

    // 提案创建者获得5%的奖励
    console.log(
      "proposalCreatorBalance",
      ethers.formatEther(proposalCreatorBalance)
    );
    console.log("accountABalance", ethers.formatEther(accountABalance));
    console.log("accountBBalance", ethers.formatEther(accountBBalance));
    console.log("accountCBalance", ethers.formatEther(accountCBalance));
    console.log("accountDBalance", ethers.formatEther(accountDBalance));

    // 测试查询提案获胜选项
    let winOptionId = await proposalLogic.winningOptionByProposal(0n);
    console.log("winOptionId", winOptionId);

    // 测试查询用户投票后结算获得的奖励或者惩罚
    let rewardAmount = await proposalLogic
      .connect(accountA)
      .rewardOrPenaltyInSettledProposal(0n, accountC.address);
    console.log("rewardAmount", ethers.formatEther(rewardAmount));
  });
});
