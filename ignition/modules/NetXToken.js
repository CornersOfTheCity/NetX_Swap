const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("NetXTokenModule", (m) => {
  // Define the initial owner as a parameter, defaulting to the first Hardhat account
  const initialOwner = m.getParameter("initialOwner", process.env.INITIAL_OWNER || m.getAccount(0));

  // Deploy the NetXToken contract with the initial owner
  const netXToken = m.contract("NetXToken", [initialOwner], {});

  return { netXToken };
});