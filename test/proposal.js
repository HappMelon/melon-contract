const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Proposal", function () {
  async function deployContractsFixture() {
    const [
      accountA,
      accountB,
      accountC,
      accountD,
      jurorA,
      jurorB,
      proposalCreatorAccount,
    ] = await ethers.getSigners();

    const melonToken = await ethers.deployContract("MelonToken");
    const pledge = await ethers.deployContract("Pledge");
    const melonNft = await ethers.deployContract("MelonNFT");
    const juryNFTSwap = await ethers.deployContract("JuryNFTSwap", [
      melonNft.target,
      3n,
      2n,
    ]);
    const proposal = await ethers.getContractFactory("Proposal");

    const proposalProxy = await upgrades.deployProxy(
      proposal,
      [melonToken.target, juryNFTSwap.target, pledge.target],
      {
        kind: "uups",
        initializer: "initialize",
      }
    );

    // await proposalProxy.waitForDeployment();

    // console.log(`proposalProxy: ${await proposalProxy.getAddress()}`);

    const mintAmount = ethers.parseEther("100");
    await melonToken.mint(accountA.address, mintAmount);
    await melonToken.mint(accountB.address, mintAmount);
    await melonToken.mint(accountC.address, mintAmount);
    await melonToken.mint(accountD.address, mintAmount);
    await melonToken.mint(proposalCreatorAccount.address, mintAmount);

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

    await proposalProxy.connect(accountA).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(accountB).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(accountC).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(accountD).deposit(ethers.parseEther("50"));
    await proposalProxy
      .connect(proposalCreatorAccount)
      .deposit(ethers.parseEther("50"));

    return {
      accountA,
      accountB,
      accountC,
      accountD,
      jurorA,
      jurorB,
      proposalCreatorAccount,
      melonToken,
      proposalProxy,
    };
  }

  // Uncomment and adapt the following test case if needed
  it("proposal settle", async function () {
    const {
      accountA,
      accountB,
      accountC,
      accountD,
      jurorA,
      jurorB,
      proposalCreatorAccount,
      melonToken,
      proposalProxy,
    } = await loadFixture(deployContractsFixture);

    let balance = await melonToken.balanceOf(proposalProxy.target);
    console.log("proposalProxy.balance", ethers.formatEther(balance));

    await proposalProxy
      .connect(proposalCreatorAccount)
      .create(["win", "defeat"]);

    await proposalProxy.connect(accountA).vote(0n, 0n, ethers.parseEther("7"));
    await proposalProxy.connect(accountB).vote(0n, 0n, ethers.parseEther("3"));
    await proposalProxy.connect(accountC).vote(0n, 1n, ethers.parseEther("4"));
    await proposalProxy.connect(accountD).vote(0n, 1n, ethers.parseEther("6"));

    let details = await proposalProxy.getDetails(0n);
    console.log("details:", details);

    await proposalProxy.settle(0n, 0n, [jurorA.address, jurorB.address]);

    let proposalCreatorBalance = await proposalProxy.balances(
      proposalCreatorAccount.address
    );

    let accountABalance = await proposalProxy.balances(accountA.address);
    let accountBBalance = await proposalProxy.balances(accountB.address);
    let accountCBalance = await proposalProxy.balances(accountC.address);
    let accountDBalance = await proposalProxy.balances(accountD.address);

    console.log(
      "proposalCreatorBalance",
      ethers.formatEther(proposalCreatorBalance)
    );
    console.log("accountABalance", ethers.formatEther(accountABalance));
    console.log("accountBBalance", ethers.formatEther(accountBBalance));
    console.log("accountCBalance", ethers.formatEther(accountCBalance));
    console.log("accountDBalance", ethers.formatEther(accountDBalance));

    let jurorABalance = await proposalProxy.balances(jurorA.address);
    let jurorBBalance = await proposalProxy.balances(jurorB.address);
    console.log("jurorABalance", ethers.formatEther(jurorABalance));
    console.log("jurorBBalance", ethers.formatEther(jurorBBalance));

    let winOptionId = await proposalProxy.winningOption(0n);
    console.log("winOptionId", winOptionId);

    let rewardAmount = await proposalProxy.userProposalResults(
      0n,
      accountC.address
    );
    console.log("rewardAmount", ethers.formatEther(rewardAmount));
  });

  it("should create 5 proposals successfully", async function () {
    const { proposalCreatorAccount, proposalProxy } = await loadFixture(
      deployContractsFixture
    );

    for (let i = 0; i < 5; i++) {
      const tx = await proposalProxy
        .connect(proposalCreatorAccount)
        .create([`option1_${i}`, `option2_${i}`]);
      await tx.wait();
      console.log(`Created proposal ${i}`);
      const info = await proposalProxy.getDetails(i);
      console.log("Total proposals:", info);
    }
  });
});
