require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");
require("dotenv").config();

// require("./tasks/sendTokensByNetwork.task");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: false,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: false,
            runs: 200,
          },
        },
      },

    ],
    overrides: {
      "contracts/TRIAS.sol": {
        version: "0.8.26",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      }
    }
  },

  networks: {
    hardhat: {
      hardhat: {
        chainId: 97, // 设置为所需的链 ID
      },
    },
    bsc: {
      url: `https://bsc-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 56,
    },
    bscTestnet: {
      url: `https://bsc-testnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 97,
    },
  },
  etherscan: {
    apiKey: {
      bsc: process.env.BSCERSCAN_API_KEY,
      bscTestnet: process.env.BSCERSCAN_API_KEY,
    },
  },
};
