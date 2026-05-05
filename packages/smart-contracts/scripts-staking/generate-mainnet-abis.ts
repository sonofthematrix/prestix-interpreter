#!/usr/bin/env ts-node

/**
 * Generate Mainnet ABIs
 * 
 * This script generates mainnet-specific ABIs and frontend integration files
 * with mainnet contract addresses and configuration.
 */

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

const MAINNET_ADDRESSES_FILE = "deployments/mainnet/addresses.json";
const MAINNET_ABI_DIR = "abis/mainnet";
const MAINNET_FRONTEND_DIR = "abis/mainnet/frontend";

async function main() {
  console.log("🔧 Generating Mainnet ABIs...");
  
  // Ensure directories exist
  if (!fs.existsSync(MAINNET_ABI_DIR)) {
    fs.mkdirSync(MAINNET_ABI_DIR, { recursive: true });
  }
  if (!fs.existsSync(MAINNET_FRONTEND_DIR)) {
    fs.mkdirSync(MAINNET_FRONTEND_DIR, { recursive: true });
  }
  
  // Load mainnet addresses
  if (!fs.existsSync(MAINNET_ADDRESSES_FILE)) {
    throw new Error("Mainnet addresses file not found. Deploy to mainnet first.");
  }
  
  const addresses = JSON.parse(fs.readFileSync(MAINNET_ADDRESSES_FILE, "utf8"));
  
  // Generate ABIs for each contract
  const contracts = [
    "RWARewardDistributor",
    "TigerRevenue", 
    "TigerStaking"
  ];
  
  const abiData: any = {
    network: "mainnet",
    chainId: 1,
    addresses: {},
    abis: {},
    timestamp: new Date().toISOString()
  };
  
  for (const contract of contracts) {
    console.log(`📋 Generating ABI for ${contract}...`);
    
    // Get contract factory
    const contractFactory = await ethers.getContractFactory(contract);
    const abi = contractFactory.interface.format();
    
    // Save individual ABI
    const abiFile = path.join(MAINNET_ABI_DIR, `${contract}.json`);
    fs.writeFileSync(abiFile, JSON.stringify({ abi, address: addresses.addresses[contract] }, null, 2));
    
    // Add to combined data
    abiData.addresses[contract] = addresses.addresses[contract];
    abiData.abis[contract] = abi;
  }
  
  // Save combined ABI file
  const combinedAbiFile = path.join(MAINNET_ABI_DIR, "KageEcosystem-Mainnet.json");
  fs.writeFileSync(combinedAbiFile, JSON.stringify(abiData, null, 2));
  
  // Generate frontend integration file
  const frontendIntegration = generateFrontendIntegration(abiData);
  const frontendFile = path.join(MAINNET_FRONTEND_DIR, "integration-mainnet.ts");
  fs.writeFileSync(frontendFile, frontendIntegration);
  
  // Generate types file
  const typesFile = path.join(MAINNET_FRONTEND_DIR, "types-mainnet.ts");
  fs.writeFileSync(typesFile, generateTypesFile(abiData));
  
  console.log("✅ Mainnet ABIs generated successfully!");
  console.log(`📁 Files created:`);
  console.log(`   - ${combinedAbiFile}`);
  console.log(`   - ${frontendFile}`);
  console.log(`   - ${typesFile}`);
}

function generateFrontendIntegration(abiData: any): string {
  return `// TPT Staking Ecosystem - Mainnet Integration
// Generated on: ${abiData.timestamp}

import { ethers } from 'ethers';

export const MAINNET_CONFIG = {
  network: "mainnet",
  chainId: 1,
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
  blockExplorer: "https://etherscan.io",
  addresses: ${JSON.stringify(abiData.addresses, null, 2)},
  abis: ${JSON.stringify(abiData.abis, null, 2)}
};

export class KageMainnetIntegration {
  private provider: ethers.providers.Provider;
  private signer?: ethers.Signer;
  
  constructor(provider: ethers.providers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }
  
  // Contract instances
  get rewardDistributor() {
    return new ethers.Contract(
      MAINNET_CONFIG.addresses.RewardDistributor,
      MAINNET_CONFIG.abis.RewardDistributor,
      this.signer || this.provider
    );
  }
  
  get kageRevenue() {
    return new ethers.Contract(
      MAINNET_CONFIG.addresses.TigerRevenue,
      MAINNET_CONFIG.abis.TigerRevenue,
      this.signer || this.provider
    );
  }
  
  get kageUnifiedStaking() {
    return new ethers.Contract(
      MAINNET_CONFIG.addresses.TigerStaking,
      MAINNET_CONFIG.abis.TigerStaking,
      this.signer || this.provider
    );
  }
  
  // Helper methods
  async getStakingInfo() {
    return {
      totalStaked: await this.kageUnifiedStaking.totalStaked(),
      totalStakers: await this.kageUnifiedStaking.totalStakers(),
      totalRewards: await this.rewardDistributor.totalRewards()
    };
  }
  
  async getUserStake(userAddress: string) {
    return await this.kageUnifiedStaking.getUserStake(userAddress);
  }
  
  async getRevenueInfo() {
    return {
      totalRevenue: await this.kageRevenue.totalRevenue(),
      totalDistributed: await this.kageRevenue.totalDistributed()
    };
  }
}

export default KageMainnetIntegration;
`;
}

function generateTypesFile(abiData: any): string {
  return `// TPT Staking Ecosystem - Mainnet Types
// Generated on: ${abiData.timestamp}

export interface MainnetAddresses {
  RewardDistributor: string;
 TigerRevenue: string;
 TigerStaking: string;
}

export interface MainnetConfig {
  network: "mainnet";
  chainId: 1;
  rpcUrl: string;
  blockExplorer: string;
  addresses: MainnetAddresses;
  abis: Record<string, any[]>;
}

export interface StakingInfo {
  totalStaked: string;
  totalStakers: string;
  totalRewards: string;
}

export interface UserStake {
  amount: string;
  timestamp: number;
  tier: number;
}

export interface RevenueInfo {
  totalRevenue: string;
  totalDistributed: string;
}

export const MAINNET_ADDRESSES: MainnetAddresses = ${JSON.stringify(abiData.addresses, null, 2)};
`;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Failed to generate mainnet ABIs:", error);
      process.exit(1);
    });
}
