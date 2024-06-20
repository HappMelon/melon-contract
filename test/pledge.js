const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

describe("Pledge", function () {
  async function deployContractsFixture() {
    const [accountA, accountB] = await ethers.getSigners();

    const melonToken = await ethers.deployContract("MelonToken");
    const melonNFT = await ethers.deployContract("MelonNFT");

    const pledge = await ethers.deployContract("Pledge");
    const juryNFTSwap = await ethers.deployContract("JuryNFTSwap", [
      melonNFT.target,
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

    await proposalProxy.waitForDeployment();

    console.log(`proposalProxy: ${await proposalProxy.getAddress()}`);

    const mintAmount = ethers.parseEther("100");

    await melonToken.mint(accountA.address, mintAmount);
    await melonToken.mint(accountB.address, mintAmount);

    await melonToken
      .connect(accountA)
      .approve(proposalProxy.target, ethers.parseEther("100"));
    await melonToken
      .connect(accountB)
      .approve(proposalProxy.target, ethers.parseEther("100"));

    await proposalProxy.connect(accountA).deposit(ethers.parseEther("50"));
    await proposalProxy.connect(accountB).deposit(ethers.parseEther("50"));

    return {
      accountA,
      accountB,
      proposalProxy,
      pledge,
    };
  }

  it("add new pledge", async function () {
    const { accountA, accountB, proposalProxy, pledge } = await loadFixture(
      deployContractsFixture
    );

    const curTimestamp = await time.latest();

    await pledge
      .connect(accountA)
      .createPledge(curTimestamp + 3, 20n, ethers.parseEther("10"));
    await pledge
      .connect(accountB)
      .createPledge(curTimestamp + 3, 30n, ethers.parseEther("20"));

    const pledges = await pledge.connect(accountA).getPledges();
    console.log("pledges:", pledges);

    const pledgeStats = await pledge.getPledgeStats();
    console.log("pledgeStats:", pledgeStats);

    await delay(5000);
    await pledge.clearPledge(accountA.address, proposalProxy.target);
    const balances = await proposalProxy.getAvailableBalance(accountA.address);

    console.log("balances:", balances);
  });
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
