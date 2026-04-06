require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: "0.8.20",
  networks: {
    kite_testnet: {
      url: process.env.KITE_RPC_URL || "https://rpc-testnet.kite.ai",
      accounts: [process.env.KITE_AGENT_PRIVATE_KEY],
      chainId: parseInt(process.env.KITE_CHAIN_ID || "2368"),
    },
  },
};
