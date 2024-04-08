const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const deployFlareTokenModule = buildModule("FlareTokenModule", (m) => {
  const flareToken = m.contract("FlareToken");
  return { flareToken };
});

const deployProposalLogicModule = buildModule("ProposalLogicModule", (m) => {
  const { flareToken } = m.useModule(deployFlareTokenModule);

  const proposalLogic = m.contract("ProposalLogic", [flareToken]);

  return { proposalLogic };
});

module.exports = deployProposalLogicModule;
