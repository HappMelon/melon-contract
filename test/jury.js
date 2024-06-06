const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

function getFutureTime() {
  // 获取当前时间
  const now = new Date();

  // 计算未来一天的时间
  const future = new Date(now.getTime());

  // 获取时间戳，以毫秒为单位
  const futureTimestampMillis = future.getTime();

  // 将时间戳转换为秒为单位，并转换为 bigint 类型
  const futureTimestampSecondsBigInt = BigInt(
    Math.floor(futureTimestampMillis / 1000) + 10
  );

  console.log(futureTimestampSecondsBigInt);
  return futureTimestampSecondsBigInt;
}

describe("Test", function () {
  let accountA, accountB, accountC, accountD, proposalCreatorAccount;
  let juryMembersA, juryMembersB, juryMembersC, juryMembersD;
  let melonToken, proposalProxy, juryProxy;

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

    let proposalFactory = await ethers.getContractFactory("Proposal");

    proposalProxy = await upgrades.deployProxy(
      proposalFactory,
      [melonToken.target],
      {
        kind: "uups",
        initializer: "initialize",
      }
    );

    let juryFactory = await ethers.getContractFactory("Jury");

    juryProxy = await upgrades.deployProxy(
      juryFactory,
      [proposalProxy.target],
      {
        kind: "uups",
        initializer: "initialize",
      }
    );

    proposalProxy.on("Settle", (proposalId, winningOptionId, jurors) => {
      console.log("Settle event received:");
      console.log("Proposal ID:", proposalId);
      console.log("Winning Option ID:", winningOptionId);
      console.log("Jurors:", jurors);
    });

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

  it("create juryProxy and vote", async function () {
    await proposalProxy.connect(accountA).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(accountB).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(accountC).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(accountD).deposit(ethers.parseEther("50"));
    await proposalProxy
      .connect(proposalCreatorAccount)
      .deposit(ethers.parseEther("50"));

    await proposalProxy
      .connect(proposalCreatorAccount)
      .create(["win", "defeat"]);

    // user vote option1 win
    await proposalProxy.connect(accountA).vote(0n, 0n, ethers.parseEther("7"));
    await proposalProxy.connect(accountB).vote(0n, 0n, ethers.parseEther("3"));
    await proposalProxy.connect(accountC).vote(0n, 1n, ethers.parseEther("3"));
    await proposalProxy.connect(accountD).vote(0n, 1n, ethers.parseEther("2"));

    let proposalDetail = await proposalProxy.getDetails(0n);
    console.log("proposalDetail", proposalDetail);

    let option1voting = await proposalProxy.getVoting(0n, 0n);
    console.log("option1voting:", option1voting);

    await juryProxy.create(0n, 0n, 1717412117n);
    //  vote juryProxy
    await juryProxy.connect(juryMembersA).vote(0n, 0n);
    await juryProxy.connect(juryMembersB).vote(0n, 0n);
    await juryProxy.connect(juryMembersC).vote(0n, 0n);
    await juryProxy.connect(juryMembersD).vote(0n, 0n);

    let detail = await juryProxy.getDetail(0n);

    console.log("juryProxy detail", detail);

    await juryProxy.handleResult(0n);

    let jurorABalance = await proposalProxy.balances(juryMembersA.address);
    let jurorBBalance = await proposalProxy.balances(juryMembersB.address);
    let jurorCBalance = await proposalProxy.balances(juryMembersC.address);
    let jurorDBalance = await proposalProxy.balances(juryMembersD.address);

    console.log("jurorABalance", ethers.formatEther(jurorABalance));
    console.log("jurorBBalance", ethers.formatEther(jurorBBalance));
    console.log("jurorCBalance", ethers.formatEther(jurorCBalance));
    console.log("jurorDBalance", ethers.formatEther(jurorDBalance));

    let accountABalance = await proposalProxy.balances(accountA.address);
    let accountBBalance = await proposalProxy.balances(accountB.address);
    let accountCBalance = await proposalProxy.balances(accountC.address);
    let accountDBalance = await proposalProxy.balances(accountD.address);

    console.log("accountABalance", ethers.formatEther(accountABalance));
    console.log("accountBBalance", ethers.formatEther(accountBBalance));
    console.log("accountCBalance", ethers.formatEther(accountCBalance));
    console.log("accountDBalance", ethers.formatEther(accountDBalance));
  });
});
