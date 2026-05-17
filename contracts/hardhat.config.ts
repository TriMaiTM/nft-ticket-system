import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";
const SEPOLIA_RPC_URL =
  process.env.SEPOLIA_RPC_URL ?? "https://sepolia.drpc.org";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY ?? "";

const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts,
      chainId: 11155111,
      gasPrice: 20_000_000_000,
    },
  },
  etherscan: {
    apiKey: { sepolia: ETHERSCAN_API_KEY },
    customChains: [
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",
          browserURL: "https://sepolia.etherscan.io",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
