const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Proposal", function () {
  let accountA, accountB, accountC, accountD;
  let jurorA, jurorB;
  let proposalCreatorAccount;
  let melonToken, proposalProxy;

  this.beforeEach(async function () {
    [
      accountA,
      accountB,
      accountC,
      accountD,
      jurorA,
      jurorB,
      proposalCreatorAccount,
    ] = await ethers.getSigners();

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
      }
    );

    let proposalImple = await upgrades.erc1967.getImplementationAddress(
      proposalProxy.target
    );

    let adminAddress = await upgrades.erc1967.getAdminAddress(
      proposalProxy.target
    );

    console.log(`proposalProxy: ${proposalProxy.target}`);

    console.log(`proposalImple: ${proposalImple}`);

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

    // Each account deposits 50 tokens into the contract
    await proposalProxy.connect(accountA).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(accountB).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(accountC).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(accountD).deposit(ethers.parseEther("50"));
    await proposalProxy
      .connect(proposalCreatorAccount)
      .deposit(ethers.parseEther("50"));
  });

  // it("proposal settle", async function () {
  //   let balance = await melonToken.balanceOf(proposalProxy.target);
  //   console.log("proposalProxy.balance", ethers.formatEther(balance));

  //   await proposalProxy
  //     .connect(proposalCreatorAccount)
  //     .create(["win", "defeat"]);

  //   // Execute Voting Option 1 A Pledge 7 B Pledge 3
  //   // Option 2 C Pledge 4 D Pledge 6
  //   await proposalProxy.connect(accountA).vote(0n, 0n, ethers.parseEther("7"));
  //   await proposalProxy.connect(accountB).vote(0n, 0n, ethers.parseEther("3"));
  //   await proposalProxy.connect(accountC).vote(0n, 1n, ethers.parseEther("4"));
  //   await proposalProxy.connect(accountD).vote(0n, 1n, ethers.parseEther("6"));

  //   // Check if voting was successful
  //   let details = await proposalProxy.getDetails(0n);
  //   console.log("details:", details);

  //   // Assuming Option 1 wins
  //   await proposalProxy.settle(0n, 0n, [jurorA.address, jurorB.address]);

  //   let proposalCreatorBalance = await proposalProxy.balances(
  //     proposalCreatorAccount.address
  //   );

  //   let accountABalance = await proposalProxy.balances(accountA.address);
  //   let accountBBalance = await proposalProxy.balances(accountB.address);
  //   let accountCBalance = await proposalProxy.balances(accountC.address);
  //   let accountDBalance = await proposalProxy.balances(accountD.address);

  //   console.log(
  //     "proposalCreatorBalance",
  //     ethers.formatEther(proposalCreatorBalance)
  //   );
  //   console.log("accountABalance", ethers.formatEther(accountABalance));
  //   console.log("accountBBalance", ethers.formatEther(accountBBalance));
  //   console.log("accountCBalance", ethers.formatEther(accountCBalance));
  //   console.log("accountDBalance", ethers.formatEther(accountDBalance));

  //   let jurorABalance = await proposalProxy.balances(jurorA.address);
  //   let jurorBBalance = await proposalProxy.balances(jurorB.address);
  //   console.log("jurorABalance", ethers.formatEther(jurorABalance));
  //   console.log("jurorBBalance", ethers.formatEther(jurorBBalance));

  //   // Test query proposal winning option
  //   let winOptionId = await proposalProxy.winningOption(0n);
  //   console.log("winOptionId", winOptionId);

  //   // Test and query the rewards or punishments obtained from user voting settlement
  //   let rewardAmount = await proposalProxy.userProposalResults(
  //     0n,
  //     accountC.address
  //   );
  //   console.log("rewardAmount", ethers.formatEther(rewardAmount));
  // });

  it("add new pledge", async function () {
    await proposalProxy.createPledge(1n, 20n, ethers.parseEther("2"));

    // sleepSync(3000);

    // await proposalProxy.clearPledge(accountA.address);

    let pledges = await proposalProxy.connect(accountA).getPledges();
    console.log("pledges:", pledges);

    let pledgeLock = await proposalProxy.pledgeLock(accountA.address);
    let balances = await proposalProxy.balances(accountA.address);

    console.log("pledgeLock:", pledgeLock);
    console.log("balances:", balances);
  });

  function sleepSync(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) continue;
  }
});
