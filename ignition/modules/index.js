const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const MelonTokenModule = buildModule("MelonTokenModule", (m) => {
  const melonToken = m.contract("MelonToken");
  return { melonToken };
});

const AssessorModule = buildModule("AssessorModule", (m) => {
  const assessor = m.contract("Assessor");
  return { assessor };
});

const MelonNftModule = buildModule("MelonNftModule", (m) => {
  const melonNft = m.contract("MelonNft");
  return { melonNft };
});

const JuryNFTSwapModule = buildModule("JuryNFTSwapModule", (m) => {
  const { melonToken } = m.useModule(MelonTokenModule);
  const { assessor } = m.useModule(AssessorModule);
  const juryNFTSwap = m.contract("JuryNFTSwap", [melonToken, assessor]);
  return { juryNFTSwap };
});

const deployProposalLogicModule = buildModule("ProposalLogicModule", (m) => {
  const { flareToken } = m.useModule(deployFlareTokenModule);

  const proposalLogic = m.contract("ProposalLogic", [flareToken]);

  return { proposalLogic };
});

module.exports = deployProposalLogicModule;
