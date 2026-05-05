import fs from "fs";
import path from "path";

async function generateAllABIs() {
  console.log("🔧 Generating comprehensive ABI files for TPT ecosystem...");

  const abisDir = path.join(__dirname, "..", "abis");
  const compiledDir = path.join(__dirname, "..", "artifacts", "contracts");

  // Create ABIs directory if it doesn't exist
  if (!fs.existsSync(abisDir)) {
    fs.mkdirSync(abisDir, { recursive: true });
  }

  // Contract definitions with their paths
  const contracts = [
    {
      name: "TigerStaking",
      path: "TigerStaking.sol",
      description: "Main multi-pool staking contract with revenue integration",
    },
    {
      name: "TigerRevenue",
      path: "TigerRevenue.sol",
      description: "Revenue distribution system for proportional sharing",
    },
    {
      name: "TPT",
      path: "TPT.sol",
      description: "ERC20 token with tax mechanisms and trading controls",
    },
    {
      name: "RWARewardDistributor",
      path: "RewardDistributor.sol",
      description: "Centralized reward token distribution manager",
    },
  ];

  // Network addresses for easy reference
  const networkAddresses = {
    sepolia: {
     TigerStaking: "0x7Ed5c7b4Fa8c0E1265AEAe6a6a3426997dF2fb3e",
     TigerRevenue: "0xE92E13D8a6B5b828839513a5e747Ba4344AcFE53",
      TPT: "0x21c7941c0aB4b649685417C4aD2b2B28226343Df",
      RewardDistributor: "0x6d4cEB3d417644f13c180600a90667FEA2B191B4",
      Treasury: "0x55bE25f1cd1e34DaE4476DE2D005Da49dAdE707D",
    },
  };

  console.log("\n📋 Processing contracts...");

  // Generate individual ABI files
  for (const contract of contracts) {
    try {
      const artifactPath = path.join(
        compiledDir,
        contract.path,
        `${contract.name}.json`,
      );

      if (!fs.existsSync(artifactPath)) {
        console.log(
          `⚠️  Artifact not found for ${contract.name} at ${artifactPath}`,
        );
        continue;
      }

      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      const abi = artifact.abi;

      // Create comprehensive contract info
      const contractInfo = {
        contractName: contract.name,
        description: contract.description,
        abi: abi,
        bytecode: artifact.bytecode,
        addresses: {
          sepolia:
            networkAddresses.sepolia[
              contract.name as keyof typeof networkAddresses.sepolia
            ] || null,
        },
        metadata: {
          compiler: artifact.metadata
            ? JSON.parse(artifact.metadata).compiler
            : null,
          version: artifact.metadata
            ? JSON.parse(artifact.metadata).compiler?.version
            : null,
          generated: new Date().toISOString(),
        },
      };

      // Write individual ABI file
      const abiPath = path.join(abisDir, `${contract.name}.json`);
      fs.writeFileSync(abiPath, JSON.stringify(contractInfo, null, 2));
      console.log(`✅ Generated ${contract.name}.json`);

      // Write minimal ABI (just the ABI array)
      const minimalAbiPath = path.join(abisDir, `${contract.name}_ABI.json`);
      fs.writeFileSync(minimalAbiPath, JSON.stringify(abi, null, 2));
      console.log(`✅ Generated ${contract.name}_ABI.json (minimal)`);
    } catch (error) {
      console.error(`❌ Error processing ${contract.name}:`, error);
    }
  }

  // Generate combined ecosystem ABI
  console.log("\n🌐 Generating combined ecosystem ABI...");

  const ecosystemABI = {
    ecosystem: "TPT Staking Platform",
    version: "2.0.0",
    description:
      "Complete TPT staking ecosystem with multi-pool support and revenue distribution",
    networks: {
      sepolia: {
        chainId: 11155111,
        name: "Sepolia Testnet",
        contracts: networkAddresses.sepolia,
      },
    },
    contracts: {},
    generated: new Date().toISOString(),
  };

  // Add each contract's ABI to the ecosystem
  for (const contract of contracts) {
    try {
      const artifactPath = path.join(
        compiledDir,
        contract.path,
        `${contract.name}.json`,
      );

      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
        (ecosystemABI.contracts as any)[contract.name] = {
          description: contract.description,
          abi: artifact.abi,
          address: {
            sepolia:
              networkAddresses.sepolia[
                contract.name as keyof typeof networkAddresses.sepolia
              ] || null,
          },
        };
      }
    } catch (error) {
      console.error(`❌ Error adding ${contract.name} to ecosystem:`, error);
    }
  }

  // Write combined ecosystem ABI
  const ecosystemPath = path.join(abisDir, "KageEcosystem.json");
  fs.writeFileSync(ecosystemPath, JSON.stringify(ecosystemABI, null, 2));
  console.log(`✅ Generated KageEcosystem.json (combined)`);

  // Generate TypeScript definitions
  console.log("\n📝 Generating TypeScript definitions...");

  const tsDefinitions = `// TPT Ecosystem TypeScript Definitions
// Generated: ${new Date().toISOString()}

export interface NetworkConfig {
  chainId: number;
  name: string;
  contracts: {
   TigerStaking: string;
   TigerRevenue: string;
    TPT: string;
    RewardDistributor: string;
    Treasury: string;
  };
}

export interface ContractInfo {
  description: string;
  abi: any[];
  address: {
    sepolia: string | null;
  };
}

export interface KageEcosystem {
  ecosystem: string;
  version: string;
  description: string;
  networks: {
    sepolia: NetworkConfig;
  };
  contracts: {
   TigerStaking: ContractInfo;
   TigerRevenue: ContractInfo;
    TPT: ContractInfo;
    RewardDistributor: ContractInfo;
  };
  generated: string;
}

// Contract addresses by network
export const KAGE_ADDRESSES = {
  sepolia: {
   TigerStaking: "${networkAddresses.sepolia.TigerStaking}",
   TigerRevenue: "${networkAddresses.sepolia.TigerRevenue}",
    TPT: "${networkAddresses.sepolia.TPT}",
    RewardDistributor: "${networkAddresses.sepolia.RewardDistributor}",
    Treasury: "${networkAddresses.sepolia.Treasury}"
  }
} as const;

// Network configurations
export const NETWORKS = {
  sepolia: {
    chainId: 11155111,
    name: "Sepolia Testnet",
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
    blockExplorer: "https://sepolia.etherscan.io"
  }
} as const;

// Pool information types
export interface PoolInfo {
  poolName: string;
  minStaked: string;
  apy: number;
  cap: string;
  lockDuration: number;
  startJoinTime: number;
  endJoinTime: number;
  isActive: boolean;
  penaltyEnabled: boolean;
  pRate: number;
  allowPartialWithdraw: boolean;
}

export interface UserStakingData {
  balance: string;
  joinTime: number;
  lastClaimTime: number;
  tierLevel: number;
  totalRewardsClaimed: string;
}

export interface TierConfig {
  duration: number;
  multBP: number;
  tierName: string;
  isPenalty: boolean;
}

export interface GlobalStatistics {
  totalPools: number;
  totalGlobalStakes: number;
  totalGlobalStakers: number;
  totalGlobalRewards: string;
}

// Event types for frontend integration
export interface StakingEvents {
  KageDeposited: {
    user: string;
    poolId: number;
    amount: string;
    newBalance: string;
    timestamp: number;
  };
  
  KageWithdrawn: {
    user: string;
    poolId: number;
    amount: string;
    rewards: string;
    remainingBalance: string;
  };
  
  PoolCreated: {
    poolId: number;
    poolName: string;
    creator: string;
    timestamp: number;
  };
  
  RevenueAllocated: {
    poolIds: number[];
    amounts: string[];
    timestamp: number;
  };
  
  RevenueClaimed: {
    user: string;
    poolId: number;
    amount: string;
    timestamp: number;
  };
}
`;

  const tsPath = path.join(abisDir, "types.ts");
  fs.writeFileSync(tsPath, tsDefinitions);
  console.log(`✅ Generated types.ts (TypeScript definitions)`);

  // Generate JavaScript integration example
  console.log("\n📱 Generating integration examples...");

  const integrationExample = `// TPT Ecosystem Integration Example
// Generated: ${new Date().toISOString()}

import { ethers } from "ethers";

// Import ABIs (adjust paths as needed)
import TigerStakingABI from "./TigerStaking_ABI.json";
import TigerRevenueABI from "./TigerRevenue_ABI.json";
import TIGERPALACEABI from "./TIGERPALACE_ABI.json";
import RewardDistributorABI from "./RewardDistributor_ABI.json";

// Contract addresses
const ADDRESSES = {
  sepolia: {
   TigerStaking: "${networkAddresses.sepolia.TigerStaking}",
   TigerRevenue: "${networkAddresses.sepolia.TigerRevenue}",
    TPT: "${networkAddresses.sepolia.TPT}",
    RewardDistributor: "${networkAddresses.sepolia.RewardDistributor}"
  }
};

class KageEcosystemClient {
  constructor(provider, signer, network = "sepolia") {
    this.provider = provider;
    this.signer = signer;
    this.network = network;
    
    // Initialize contracts
    this.kageStaking = new ethers.Contract(
      ADDRESSES[network].TigerStaking,
      TigerStakingABI,
      signer
    );
    
    this.kageRevenue = new ethers.Contract(
      ADDRESSES[network].TigerRevenue,
      TigerRevenueABI,
      signer
    );
    
    this.kageToken = new ethers.Contract(
      ADDRESSES[network].TPT,
      TIGERPALACEABI,
      signer
    );
    
    this.rewardDistributor = new ethers.Contract(
      ADDRESSES[network].RewardDistributor,
      RewardDistributorABI,
      signer
    );
  }

  // Staking operations
  async stakeTokens(poolId, amount) {
    const amountWei = ethers.utils.parseEther(amount.toString());
    
    // Approve tokens first
    await this.kageToken.approve(ADDRESSES[this.network].TigerStaking, amountWei);
    
    // Stake tokens
    return await this.kageStaking.kageDeposit(poolId, amountWei);
  }

  async withdrawTokens(poolId, amount) {
    const amountWei = ethers.utils.parseEther(amount.toString());
    return await this.kageStaking.kageWithdraw(poolId, amountWei);
  }

  async emergencyWithdraw(poolId) {
    return await this.kageStaking.kageEmergencyWithdraw(poolId);
  }

  // Pool information
  async getPoolInfo(poolId) {
    return await this.kageStaking.kagePoolInfo(poolId);
  }

  async getPoolCount() {
    return await this.kageStaking.kagePoolLength();
  }

  async getUserStakingData(poolId, userAddress) {
    return await this.kageStaking.kageGetUserStakingData(poolId, userAddress);
  }

  // Revenue operations
  async getPendingRevenue(poolId, userAddress) {
    return await this.kageRevenue.kageGetPendingRevenue(poolId, userAddress);
  }

  async claimRevenue(poolId) {
    return await this.kageRevenue.kageClaimRevenue(poolId);
  }

  // Tier system
  async getTierConfig(tierId) {
    return await this.kageStaking.kageGetTierConfig(tierId);
  }

  async getUserTier(poolId, userAddress) {
    return await this.kageStaking.kageGetUserTier(poolId, userAddress);
  }

  // Global statistics
  async getGlobalStatistics() {
    return await this.kageStaking.kageGetGlobalStatistics();
  }

  // Token operations
  async getTokenBalance(userAddress) {
    return await this.kageToken.balanceOf(userAddress);
  }

  async getTokenAllowance(userAddress, spenderAddress) {
    return await this.kageToken.allowance(userAddress, spenderAddress);
  }

  // Event listeners
  setupEventListeners() {
    // Staking events
    this.kageStaking.on("KageDeposited", (user, poolId, amount, newBalance, timestamp) => {
      console.log(\`User \${user} staked \${ethers.utils.formatEther(amount)} TPT in pool \${poolId}\`);
    });

    this.kageStaking.on("KageWithdrawn", (user, poolId, amount, rewards, remainingBalance) => {
      console.log(\`User \${user} withdrew \${ethers.utils.formatEther(amount)} TPT from pool \${poolId}\`);
    });

    // Revenue events
    this.kageRevenue.on("RevenueAllocated", (poolIds, amounts, timestamp) => {
      console.log(\`Revenue allocated to pools: \${poolIds}\`);
    });

    this.kageRevenue.on("RevenueClaimed", (user, poolId, amount, timestamp) => {
      console.log(\`User \${user} claimed \${ethers.utils.formatEther(amount)} TPT revenue from pool \${poolId}\`);
    });
  }
}

// Usage example
async function initializeKageClient() {
  // Connect to provider (MetaMask, WalletConnect, etc.)
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  
  // Initialize client
  const kageClient = new KageEcosystemClient(provider, signer, "sepolia");
  
  // Setup event listeners
  kageClient.setupEventListeners();
  
  return kageClient;
}

// Export for use in applications
export { KageEcosystemClient, initializeKageClient, ADDRESSES };
`;

  const examplePath = path.join(abisDir, "integration-example.js");
  fs.writeFileSync(examplePath, integrationExample);
  console.log(`✅ Generated integration-example.js`);

  // Generate README for ABIs
  const abiReadme = `# TPT Ecosystem ABIs

This directory contains all the necessary ABI (Application Binary Interface) files for integrating with the TPT staking ecosystem.

## 📁 File Structure

### User Contract ABIs
- \`TigerStaking.json\` - Complete contract info with metadata
- \`TigerStaking_ABI.json\` - Minimal ABI array only
- \`TigerRevenue.json\` - Complete contract info with metadata  
- \`TigerRevenue_ABI.json\` - Minimal ABI array only
- \`TPT.json\` - Complete contract info with metadata
- \`TIGERPALACE_ABI.json\` - Minimal ABI array only
- \`RewardDistributor.json\` - Complete contract info with metadata
- \`RewardDistributor_ABI.json\` - Minimal ABI array only

### Ecosystem Files
- \`KageEcosystem.json\` - Combined ecosystem with all contracts
- \`types.ts\` - TypeScript definitions and types
- \`integration-example.js\` - JavaScript integration example

## 🚀 Quick Start

### Using with ethers.js

\`\`\`javascript
import { ethers } from "ethers";
import TigerStakingABI from "./TigerStaking_ABI.json";

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const kageStaking = new ethers.Contract(
  "${networkAddresses.sepolia.TigerStaking}",
  TigerStakingABI,
  signer
);

// Stake tokens
await kageStaking.kageDeposit(0, ethers.utils.parseEther("1000"));
\`\`\`

### Using with web3.js

\`\`\`javascript
import Web3 from "web3";
import TigerStakingABI from "./TigerStaking_ABI.json";

const web3 = new Web3(window.ethereum);

const kageStaking = new web3.eth.Contract(
  TigerStakingABI,
  "${networkAddresses.sepolia.TigerStaking}"
);

// Get pool information
const poolInfo = await kageStaking.methods.kagePoolInfo(0).call();
\`\`\`

## 📱 Integration Example

See \`integration-example.js\` for a complete client implementation that includes:

- ✅ Contract initialization
- ✅ Staking operations (deposit/withdraw)
- ✅ Revenue claiming
- ✅ Pool management
- ✅ Event listening
- ✅ Error handling

## 🌐 Network Addresses

### Sepolia Testnet
- **TigerStaking**: \`${networkAddresses.sepolia.TigerStaking}\`
- **TigerRevenue**: \`${networkAddresses.sepolia.TigerRevenue}\`
- **TPT**: \`${networkAddresses.sepolia.TPT}\`
- **RewardDistributor**: \`${networkAddresses.sepolia.RewardDistributor}\`
- **Treasury**: \`${networkAddresses.sepolia.Treasury}\`

## 📊 Contract Functions

###TigerStaking
- \`kageDeposit(poolId, amount)\` - Stake tokens
- \`kageWithdraw(poolId, amount)\` - Withdraw tokens
- \`kagePoolInfo(poolId)\` - Get pool information
- \`kageGetUserStakingData(poolId, user)\` - Get user staking data
- \`kageGetGlobalStatistics()\` - Get global statistics

###TigerRevenue  
- \`kageClaimRevenue(poolId)\` - Claim pending revenue
- \`kageGetPendingRevenue(poolId, user)\` - Check pending revenue
- \`kageAllocateRevenue(poolIds, amounts)\` - Allocate revenue (admin)

### TPT
- \`transfer(to, amount)\` - Transfer tokens
- \`approve(spender, amount)\` - Approve token spending
- \`balanceOf(account)\` - Check token balance

### RewardDistributor
- \`approveERC20(token, spender, amount)\` - Approve token spending
- \`withdrawERC20(token, to, amount)\` - Withdraw tokens (admin)

## 🔗 Frontend Integration

For React applications:

\`\`\`jsx
import { useEffect, useState } from 'react';
import { KageEcosystemClient } from './abis/integration-example';

function StakingDashboard() {
  const [kageClient, setKageClient] = useState(null);
  const [pools, setPools] = useState([]);

  useEffect(() => {
    async function init() {
      const client = await initializeKageClient();
      setKageClient(client);
      
      // Load pools
      const poolCount = await client.getPoolCount();
      const poolsData = [];
      for (let i = 0; i < poolCount; i++) {
        const poolInfo = await client.getPoolInfo(i);
        poolsData.push({ id: i, ...poolInfo });
      }
      setPools(poolsData);
    }
    
    init();
  }, []);

  return (
    <div>
      {pools.map(pool => (
        <div key={pool.id}>
          <h3>{pool.poolName}</h3>
          <p>apy: {pool.apy / 100}%</p>
          <p>Min Stake: {ethers.utils.formatEther(pool.minStaked)} TPT</p>
        </div>
      ))}
    </div>
  );
}
\`\`\`

## 📚 Documentation

For complete documentation and examples, see the main README.md in the project root.

## ⚠️ Important Notes

- These are **Sepolia testnet** addresses - do not use in production
- Always verify contract addresses before mainnet deployment
- Test all integrations thoroughly on testnet first
- Keep ABIs updated when contracts are upgraded

Generated: ${new Date().toISOString()}
`;

  const readmePath = path.join(abisDir, "README.md");
  fs.writeFileSync(readmePath, abiReadme);
  console.log(`✅ Generated README.md (documentation)`);

  // Summary
  console.log("\n🎉 ABI Generation Complete!");
  console.log("=====================================");
  console.log(`📁 ABIs Directory: ${abisDir}`);
  console.log("\n📋 Generated Files:");
  console.log("   🔧 User Contract ABIs:");
  console.log("      •TigerStaking.json & _ABI.json");
  console.log("      •TigerRevenue.json & _ABI.json");
  console.log("      • TPT.json & _ABI.json");
  console.log("      • RewardDistributor.json & _ABI.json");
  console.log("\n   🌐 Ecosystem Files:");
  console.log("      • KageEcosystem.json (combined)");
  console.log("      • types.ts (TypeScript definitions)");
  console.log("      • integration-example.js (JavaScript client)");
  console.log("      • README.md (documentation)");

  console.log("\n✅ Ready for frontend integration!");
  console.log(
    "🔗 Use these ABIs to connect your frontend to the TPT ecosystem",
  );
}

// Run the script
generateAllABIs()
  .then(() => {
    console.log("\n🎯 ABI generation successful!");
    process.exit(0);
  })
  .catch(error => {
    console.error("\n❌ ABI generation failed:", error);
    process.exit(1);
  });
