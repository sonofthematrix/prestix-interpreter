import fs from "fs";
import path from "path";

interface ContractInfo {
  name: string;
  address: string;
  abi: any[];
}

interface DeploymentInfo {
  network: string;
  chainId: number;
  deployer: string;
  timestamp: string;
  gasUsed: number;
  contracts: {
    tokenizinToken?: string;
    rwaRewardDistributor?: string;
    rwaRevenue?: string;
    TigerStaking?: string;
    proxyAdmin?: string;
  };
}

async function generateFrontendABIs() {
  console.log("🔧 Generating RWA Staking Frontend ABIs...");

  // Create output directories
  const abisDir = path.join(__dirname, "..", "abis", "frontend");
  if (!fs.existsSync(abisDir)) {
    fs.mkdirSync(abisDir, { recursive: true });
  }

  // Load deployment info if available
  let deploymentInfo: DeploymentInfo | null = null;
  const deploymentFile = path.join(__dirname, "..", "rwa-staking-deployment.json");
  
  if (fs.existsSync(deploymentFile)) {
    try {
      const data = fs.readFileSync(deploymentFile, "utf8");
      deploymentInfo = JSON.parse(data);
      console.log("📋 Loaded deployment info from rwa-staking-deployment.json");
    } catch (error) {
      console.log("⚠️  Could not load deployment info, using placeholder addresses");
    }
  }

  // Contract ABIs (these would be loaded from compiled artifacts in a real scenario)
  const contracts: ContractInfo[] = [
    {
      name: "TigerPalaceToken",
      address: deploymentInfo?.contracts.tokenizinToken || "0x0000000000000000000000000000000000000000",
      abi: [
        // ERC20 standard functions
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
        "function transfer(address, uint256) returns (bool)",
        "function transferFrom(address, address, uint256) returns (bool)",
        "function approve(address, uint256) returns (bool)",
        "function allowance(address, address) view returns (uint256)",
        
        // TigerPalaceToken specific functions
        "function buyTax() view returns (uint256)",
        "function sellTax() view returns (uint256)",
        "function treasuryAddress() view returns (address)",
        "function rewardDistributorAddress() view returns (address)",
        "function isExemptFromTax(address) view returns (bool)",
        "function isExemptFromMaxWallet(address) view returns (bool)",
        "function convertPropertyRevenueToRewards(uint256)",
        
        // Events
        "event Transfer(address indexed from, address indexed to, uint256 value)",
        "event Approval(address indexed owner, address indexed spender, uint256 value)",
        "event TaxUpdated(uint256 buyTax, uint256 sellTax)",
        "event RevenueConverted(uint256 amount, address to)"
      ]
    },
    {
      name: "RWARewardDistributor",
      address: deploymentInfo?.contracts.rwaRewardDistributor || "0x0000000000000000000000000000000000000000",
      abi: [
        "function tokenizinToken() view returns (address)",
        "function rwaStakingAddress() view returns (address)",
        "function rwaRevenueAddress() view returns (address)",
        "function treasuryAddress() view returns (address)",
        "function totalRewardPool() view returns (uint256)",
        "function distributedRewards() view returns (uint256)",
        "function pendingRewards() view returns (uint256)",
        "function addRewards(uint256, string)",
        "function distributeRewards(uint256)",
        "function collectMarketplaceFees(uint256)",
        "function collectPropertyDividends(uint256)",
        "function distributePropertyRevenue(uint256)",
        "function getAvailableBalance() view returns (uint256)",
        "function getRewardPoolStats() view returns (uint256, uint256, uint256, uint256, uint256, uint256)",
        "function pause()",
        "function unpause()",
        "function paused() view returns (bool)",
        
        // Events
        "event RewardsAdded(uint256 amount, string source)",
        "event RewardsDistributed(uint256 amount, address to)",
        "event RevenueCollected(uint256 amount, string source)"
      ]
    },
    {
      name: "RWARevenue",
      address: deploymentInfo?.contracts.rwaRevenue || "0x0000000000000000000000000000000000000000",
      abi: [
        "function tokenizinToken() view returns (address)",
        "function rwaStakingAddress() view returns (address)",
        "function rewardDistributorAddress() view returns (address)",
        "function totalRevenueAllocated() view returns (uint256)",
        "function totalRevenueDistributed() view returns (uint256)",
        "function pendingRevenue() view returns (uint256)",
        "function allocateRevenue(uint256, uint256, string)",
        "function distributeRevenue(uint256, uint256)",
        "function receivePropertyDividends(uint256)",
        "function receiveMarketplaceFees(uint256)",
        "function receiveStakingRewards(uint256)",
        "function distributeMarketplaceFees(uint256)",
        "function getPoolRevenueStats(uint256) view returns (uint256, uint256, uint256)",
        "function getRevenueStats() view returns (uint256, uint256, uint256, uint256, uint256, uint256)",
        "function pause()",
        "function unpause()",
        "function paused() view returns (bool)",
        
        // Events
        "event RevenueAllocated(uint256 poolId, uint256 amount, string source)",
        "event RevenueDistributed(uint256 poolId, uint256 amount)",
        "event PropertyDividendsReceived(uint256 amount)",
        "event MarketplaceFeesReceived(uint256 amount)"
      ]
    },
    {
      name: "RWAStaking",
      address: deploymentInfo?.contracts.TigerStaking || "0x0000000000000000000000000000000000000000",
      abi: [
        "function tokenizinToken() view returns (address)",
        "function rwaRevenueAddress() view returns (address)",
        "function rewardDistributorAddress() view returns (address)",
        "function nextPoolId() view returns (uint256)",
        "function totalStaked() view returns (uint256)",
        "function totalRewardsDistributed() view returns (uint256)",
        "function pools(uint256) view returns (uint256, string, uint256, uint256, bool, uint256, uint256)",
        "function userStakes(address, uint256) view returns (uint256, uint256, uint256, uint256, bool, uint256)",
        "function createPool(string, uint256, uint256) returns (uint256)",
        "function stake(uint256, uint256)",
        "function claimRewards(uint256)",
        "function getUserStake(address, uint256) view returns (tuple(uint256, uint256, uint256, uint256, bool, uint256))",
        "function getUserStakes(address) view returns (tuple(uint256, uint256, uint256, uint256, bool, uint256)[])",
        "function getPendingRewards(address, uint256) view returns (uint256)",
        "function getPool(uint256) view returns (tuple(uint256, string, uint256, uint256, bool, uint256, uint256))",
        "function getAllPools() view returns (tuple(uint256, string, uint256, uint256, bool, uint256, uint256)[])",
        "function updatePoolConfig(uint256, bool, uint256)",
        "function distributeRewards(uint256, uint256)",
        "function getStats() view returns (uint256, uint256, uint256)",
        "function pause()",
        "function unpause()",
        "function paused() view returns (bool)",
        
        // Events
        "event PoolCreated(uint256 poolId, string name, uint256 duration, uint256 multiplier)",
        "event StakeCreated(address indexed user, uint256 stakeId, uint256 poolId, uint256 amount, uint256 duration)",
        "event StakeClaimed(address indexed user, uint256 stakeId, uint256 amount, uint256 rewards)",
        "event RewardsDistributed(uint256 poolId, uint256 amount)"
      ]
    }
  ];

  // Generate individual ABI files
  for (const contract of contracts) {
    const abiFile = path.join(abisDir, `${contract.name}.json`);
    const contractData = {
      name: contract.name,
      address: contract.address,
      abi: contract.abi,
      network: deploymentInfo?.network || "unknown",
      chainId: deploymentInfo?.chainId || 0,
      deployedAt: deploymentInfo?.timestamp || new Date().toISOString()
    };
    
    fs.writeFileSync(abiFile, JSON.stringify(contractData, null, 2));
    console.log(`✅ Generated ${contract.name}.json`);
  }

  // Generate combined ecosystem ABI
  const ecosystemABI = {
    name: "RWAStakingEcosystem",
    network: deploymentInfo?.network || "unknown",
    chainId: deploymentInfo?.chainId || 0,
    deployedAt: deploymentInfo?.timestamp || new Date().toISOString(),
    contracts: contracts.map(c => ({
      name: c.name,
      address: c.address,
      abi: c.abi
    }))
  };

  const ecosystemFile = path.join(abisDir, "RWAStakingEcosystem-Frontend.json");
  fs.writeFileSync(ecosystemFile, JSON.stringify(ecosystemABI, null, 2));
  console.log("✅ Generated RWAStakingEcosystem-Frontend.json");

  // Generate TypeScript types
  const typesContent = `// Auto-generated TypeScript types for RWA Staking Ecosystem
// Generated at: ${new Date().toISOString()}

export interface ContractAddresses {
  tokenizinToken: string;
  rwaRewardDistributor: string;
  rwaRevenue: string;
  TigerStaking: string;
}

export interface PoolConfig {
  poolId: number;
  name: string;
  duration: number;
  multiplier: number;
  active: boolean;
  totalStaked: string;
  totalRewards: string;
}

export interface UserStake {
  amount: string;
  startTime: number;
  endTime: number;
  poolId: number;
  claimed: boolean;
  pendingRewards: string;
}

export interface RewardPoolStats {
  totalRewardPool: string;
  distributedRewards: string;
  pendingRewards: string;
  totalRevenueCollected: string;
  marketplaceFeesCollected: string;
  propertyDividendsCollected: string;
}

export interface RevenueStats {
  totalAllocated: string;
  totalDistributed: string;
  pendingRevenue: string;
  propertyDividends: string;
  marketplaceFees: string;
  stakingRewards: string;
}

export interface StakingStats {
  totalStaked: string;
  totalRewardsDistributed: string;
  poolCount: number;
}

// Contract addresses for different networks
export const CONTRACT_ADDRESSES: Record<string, ContractAddresses> = {
  localhost: {
    tokenizinToken: "${deploymentInfo?.contracts.tokenizinToken || "0x0000000000000000000000000000000000000000"}",
    rwaRewardDistributor: "${deploymentInfo?.contracts.rwaRewardDistributor || "0x0000000000000000000000000000000000000000"}",
    rwaRevenue: "${deploymentInfo?.contracts.rwaRevenue || "0x0000000000000000000000000000000000000000"}",
    TigerStaking: "${deploymentInfo?.contracts.TigerStaking || "0x0000000000000000000000000000000000000000"}"
  },
  sepolia: {
    tokenizinToken: "0x0000000000000000000000000000000000000000", // Update after deployment
    rwaRewardDistributor: "0x0000000000000000000000000000000000000000",
    rwaRevenue: "0x0000000000000000000000000000000000000000",
    TigerStaking: "0x0000000000000000000000000000000000000000"
  },
  mainnet: {
    tokenizinToken: "0x0000000000000000000000000000000000000000", // Update after deployment
    rwaRewardDistributor: "0x0000000000000000000000000000000000000000",
    rwaRevenue: "0x0000000000000000000000000000000000000000",
    TigerStaking: "0x0000000000000000000000000000000000000000"
  }
};

// Default contract addresses (will be updated after deployment)
export const DEFAULT_ADDRESSES: ContractAddresses = CONTRACT_ADDRESSES.localhost;
`;

  const typesFile = path.join(abisDir, "types.ts");
  fs.writeFileSync(typesFile, typesContent);
  console.log("✅ Generated types.ts");

  // Generate integration example
  const integrationExample = `// RWA Staking Ecosystem Integration Example
// This file shows how to integrate the RWA staking contracts in your frontend

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ContractAddresses } from './types';

// Contract ABIs (import from generated JSON files)
import TigerPalaceTokenABI from './TigerPalaceToken.json';
import RWARewardDistributorABI from './RWARewardDistributor.json';
import RWARevenueABI from './RWARevenue.json';
import RWAStakingABI from './RWAStaking.json';

export class RWAStakingIntegration {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private contracts: {
    tokenizinToken: ethers.Contract;
    rwaRewardDistributor: ethers.Contract;
    rwaRevenue: ethers.Contract;
    TigerStaking: ethers.Contract;
  };

  constructor(provider: ethers.providers.Provider, signer: ethers.Signer, network: string = 'localhost') {
    this.provider = provider;
    this.signer = signer;
    
    const addresses = CONTRACT_ADDRESSES[network];
    if (!addresses) {
      throw new Error(\`Unsupported network: \${network}\`);
    }

    this.contracts = {
      tokenizinToken: new ethers.Contract(addresses.tokenizinToken, TigerPalaceTokenABI.abi, signer),
      rwaRewardDistributor: new ethers.Contract(addresses.rwaRewardDistributor, RWARewardDistributorABI.abi, signer),
      rwaRevenue: new ethers.Contract(addresses.rwaRevenue, RWARevenueABI.abi, signer),
      TigerStaking: new ethers.Contract(addresses.TigerStaking, RWAStakingABI.abi, signer)
    };
  }

  // Token operations
  async getTokenBalance(address: string): Promise<string> {
    const balance = await this.contracts.tokenizinToken.balanceOf(address);
    return ethers.utils.formatEther(balance);
  }

  async approveStaking(amount: string): Promise<void> {
    const tx = await this.contracts.tokenizinToken.approve(
      this.contracts.TigerStaking.address,
      ethers.utils.parseEther(amount)
    );
    await tx.wait();
  }

  // Staking operations
  async stake(poolId: number, amount: string): Promise<void> {
    const tx = await this.contracts.TigerStaking.stake(
      poolId,
      ethers.utils.parseEther(amount)
    );
    await tx.wait();
  }

  async claimRewards(stakeId: number): Promise<void> {
    const tx = await this.contracts.TigerStaking.claimRewards(stakeId);
    await tx.wait();
  }

  async getUserStakes(address: string): Promise<any[]> {
    return await this.contracts.TigerStaking.getUserStakes(address);
  }

  async getPendingRewards(address: string, stakeId: number): Promise<string> {
    const rewards = await this.contracts.TigerStaking.getPendingRewards(address, stakeId);
    return ethers.utils.formatEther(rewards);
  }

  // Pool operations
  async getAllPools(): Promise<any[]> {
    return await this.contracts.TigerStaking.getAllPools();
  }

  async getPool(poolId: number): Promise<any> {
    return await this.contracts.TigerStaking.getPool(poolId);
  }

  // Revenue operations
  async getRevenueStats(): Promise<any> {
    return await this.contracts.rwaRevenue.getRevenueStats();
  }

  async getPoolRevenueStats(poolId: number): Promise<any> {
    return await this.contracts.rwaRevenue.getPoolRevenueStats(poolId);
  }

  // Reward distributor operations
  async getRewardPoolStats(): Promise<any> {
    return await this.contracts.rwaRewardDistributor.getRewardPoolStats();
  }

  async getAvailableBalance(): Promise<string> {
    const balance = await this.contracts.rwaRewardDistributor.getAvailableBalance();
    return ethers.utils.formatEther(balance);
  }
}

// Usage example:
/*
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const TigerStaking = new RWAStakingIntegration(provider, signer, 'localhost');

// Get user's token balance
const balance = await TigerStaking.getTokenBalance(userAddress);

// Approve staking
await TigerStaking.approveStaking('1000');

// Stake in pool 1 (1-month pool)
await TigerStaking.stake(1, '1000');

// Get user's stakes
const stakes = await TigerStaking.getUserStakes(userAddress);

// Claim rewards for stake 0
await TigerStaking.claimRewards(0);

// Get all available pools
const pools = await TigerStaking.getAllPools();
*/
`;

  const integrationFile = path.join(abisDir, "integration-example.ts");
  fs.writeFileSync(integrationFile, integrationExample);
  console.log("✅ Generated integration-example.ts");

  console.log("\n🎉 RWA Staking Frontend ABIs generated successfully!");
  console.log(`📁 Output directory: ${abisDir}`);
  console.log("\n📋 Generated files:");
  console.log("  - TigerPalaceToken.json");
  console.log("  - RWARewardDistributor.json");
  console.log("  - RWARevenue.json");
  console.log("  - RWAStaking.json");
  console.log("  - RWAStakingEcosystem-Frontend.json");
  console.log("  - types.ts");
  console.log("  - integration-example.ts");
}

generateFrontendABIs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ABI generation failed:", error);
    process.exit(1);
  });
