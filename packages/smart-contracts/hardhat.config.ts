import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import dotenv from "dotenv";
import fs from "fs";
import "hardhat-gas-reporter";
import { HardhatUserConfig } from "hardhat/config";
import path from "path";
import "solidity-coverage";

// Load environment variables from both .env.local and .env
// .env.local takes precedence and overrides .env values
const envLocalPath = path.join(__dirname, ".env.local");
const envPath = path.join(__dirname, ".env");

// Load .env first (base values)
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Load .env.local second (overrides .env values)
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

/**
 * Get accounts configuration for deployment
 * Priority: TGR_DEPLOY_PRVT_KEY > TGR_DEPLOY_SEED_PHRASE > PRIVATE_KEY
 */
function getAccounts() {
  if (process.env.TGR_DEPLOY_PRVT_KEY) {
    return [process.env.TGR_DEPLOY_PRVT_KEY];
  }
  if (process.env.TGR_DEPLOY_SEED_PHRASE) {
    return {
      mnemonic: process.env.TGR_DEPLOY_SEED_PHRASE,
      path: "m/44'/60'/0'/0",
      initialIndex: 0,
      count: 1,
    };
  }
  if (process.env.PRIVATE_KEY) {
    return [process.env.PRIVATE_KEY];
  }
  return [];
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.23",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1, // Maximum size optimization for deployment
          },
        },
      },
      {
        version: "0.8.19",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1, // Maximum size optimization for deployment
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      chainId: 31337,
      // Ensure fresh network state for tests
      allowUnlimitedContractSize: true,
      blockGasLimit: 30000000,
      gas: 30000000,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: (() => {
        // Priority: SEPOLIA_URL > SEPOLIA_RPC_URL > NEXT_PUBLIC_SEPOLIA_RPC_URL > Construct from API keys > Public RPC
        if (process.env.SEPOLIA_URL) {
          return process.env.SEPOLIA_URL.trim();
        }
        if (process.env.SEPOLIA_RPC_URL) {
          return process.env.SEPOLIA_RPC_URL.trim();
        }
        if (process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL) {
          return process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL.trim();
        }
        if (process.env.INFURA_API_KEY) {
          return `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`;
        }
        if (process.env.NEXT_PUBLIC_INFURA_API_KEY) {
          return `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`;
        }
        if (process.env.ALCHEMY_API_KEY) {
          return `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
        }
        if (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
          return `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
        }
        // Public RPC fallback
        return 'https://ethereum-sepolia-rpc.publicnode.com';
      })(),
      accounts: getAccounts(),
      chainId: 11155111,
      timeout: 300000, // 5 minutes timeout
      gas: "auto",
      gasPrice: "auto",
      httpHeaders: {},
    },
    mainnet: {
      url: process.env.MAINNET_URL || "",
      accounts: getAccounts(),
      chainId: 1,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    // Etherscan API V2 uses a single API key (not per-network)
    apiKey: process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  // Exclude v2 USDC contracts that require missing v1 contracts
  // These are not needed when using existing Sepolia USDC or MockUSDC
  // Uncomment if you have the full Circle USDC v1 source code
  // soliditySources: {
  //   exclude: ["contracts/usdc/v2/**/*.sol", "contracts/usdc/v2/**"]
  // },
  typechain: {
    target: "ethers-v6",
    outDir: "typechain-types",
  },
};

export default config;
