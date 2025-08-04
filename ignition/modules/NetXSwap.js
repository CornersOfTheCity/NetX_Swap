const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("NetXSwapModule", (m) => {
  // Define the initial owner as a parameter, defaulting to the first Hardhat account
  const initialOwner = m.getParameter("initialOwner", process.env.INITIAL_OWNER || m.getAccount(0));
  const netXToken = m.getParameter("netXToken", process.env.NETX_TOKEN || m.getAccount(0));

  // Deploy the NetXSwap contract with the initial owner
  const netXSwap = m.contract("NetXSwap", [initialOwner,netXToken], {});

  return { netXSwap };
});