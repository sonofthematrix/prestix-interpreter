import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🔧 Generating fresh ABIs for frontend use...");
  
  // Read deployed addresses
  const deployedAddresses = JSON.parse(
    fs.readFileSync("deployed-addresses-proxy.json", "utf8")
  );
  
  // Create fresh abis directory
  const abisDir = "abis/frontend";
  if (!fs.existsSync(abisDir)) {
    fs.mkdirSync(abisDir, { recursive: true });
  }
  
  // Contract artifacts to generate ABIs for
  const contracts = [
    {
      name: "TigerStaking",
      artifact: "TigerStaking",
      proxyAddress: deployedAddresses.addresses.TigerStaking,
      implementationAddress: deployedAddresses.addresses.TigerStaking_Implementation
    },
    {
      name: "TigerRevenue", 
      artifact: "TigerRevenue",
      proxyAddress: deployedAddresses.addresses.TigerRevenue,
      implementationAddress: deployedAddresses.addresses.TigerRevenue_Implementation
    },
    {
      name: "RWARewardDistributor",
      artifact: "RWARewardDistributor", 
      proxyAddress: deployedAddresses.addresses.RewardDistributor,
      implementationAddress: deployedAddresses.addresses.RewardDistributor_Implementation
    },
    {
      name: "TPT",
      artifact: "TPT",
      proxyAddress: deployedAddresses.addresses.TPT,
      implementationAddress: null
    }
  ];
  
  const generatedABIs: any = {
    network: deployedAddresses.network,
    timestamp: new Date().toISOString(),
    deploymentType: "proxy",
    addresses: deployedAddresses.addresses,
    abis: {}
  };
  
  for (const contract of contracts) {
    console.log(`📄 Generating ABI for ${contract.name}...`);
    
    try {
      // Get the contract artifact
      const artifact = await ethers.getContractFactory(contract.artifact);
      const abi = artifact.interface.format("json" as any);
      
      // Save individual ABI file
      const abiPath = path.join(abisDir, `${contract.name}.json`);
      fs.writeFileSync(abiPath, JSON.stringify(JSON.parse(abi as unknown as string), null, 2));
      
      // Add to combined ABIs
      generatedABIs.abis[contract.name] = {
        name: contract.name,
        proxyAddress: contract.proxyAddress,
        implementationAddress: contract.implementationAddress,
        abi: JSON.parse(abi as unknown as string)
      };
      
      console.log(`✅ Generated ${contract.name} ABI`);
      
    } catch (error) {
      console.error(`❌ Failed to generate ABI for ${contract.name}:`, error);
    }
  }
  
  // Save combined ABIs file
  const combinedPath = path.join(abisDir, "KageEcosystem-Frontend.json");
  fs.writeFileSync(combinedPath, JSON.stringify(generatedABIs, null, 2));
  
  // Generate TypeScript types
  const typesContent = generateTypeScriptTypes(generatedABIs);
  const typesPath = path.join(abisDir, "types.ts");
  fs.writeFileSync(typesPath, typesContent);
  
  // Generate frontend integration example
  const integrationContent = generateIntegrationExample(generatedABIs);
  const integrationPath = path.join(abisDir, "integration-example.ts");
  fs.writeFileSync(integrationPath, integrationContent);
  
  console.log("\n🎉 Fresh ABIs generated successfully!");
  console.log(`📁 Output directory: ${abisDir}`);
  console.log(`📄 Combined ABIs: ${combinedPath}`);
  console.log(`📄 TypeScript types: ${typesPath}`);
  console.log(`📄 Integration example: ${integrationPath}`);
  
  // Display proxy addresses for frontend integration
  console.log("\n🔗 Proxy Addresses for Frontend Integration:");
  console.log("=============================================");
  for (const contract of contracts) {
    console.log(`${contract.name}: ${contract.proxyAddress}`);
  }
}

function generateTypeScriptTypes(abis: any): string {
  return `// Auto-generated TypeScript types for TPT Ecosystem
// Generated on: ${new Date().toISOString()}
// Network: ${abis.network}

export interface KageEcosystemAddresses {
  TPT: string;
  Treasury: string;
  ProxyAdmin: string;
  RewardDistributor: string;
 TigerRevenue: string;
 TigerStaking: string;
}

export interface ContractABI {
  name: string;
  proxyAddress: string;
  implementationAddress: string | null;
  abi: any[];
}

export interface KageEcosystemABIs {
  network: string;
  timestamp: string;
  deploymentType: string;
  addresses: KageEcosystemAddresses;
  abis: {
    [key: string]: ContractABI;
  };
}

// Contract-specific types
export interface TigerStakingABI extends ContractABI {
  name: "TigerStaking";
}

export interface TigerRevenueABI extends ContractABI {
  name: "TigerRevenue";
}

export interface RewardDistributorABI extends ContractABI {
  name: "RWARewardDistributor";
}

export interface TIGERPALACEABI extends ContractABI {
  name: "TPT";
}

// Frontend integration helpers
export const CONTRACT_ADDRESSES: KageEcosystemAddresses = ${JSON.stringify(abis.addresses, null, 2)};

export const NETWORK_CONFIG = {
  name: "${abis.network}",
  chainId: ${abis.network === "sepolia" ? "11155111" : "1"},
  rpcUrl: "${abis.network === "sepolia" ? "https://sepolia.infura.io/v3/YOUR_PROJECT_ID" : "https://mainnet.infura.io/v3/YOUR_PROJECT_ID"}",
  blockExplorer: "${abis.network === "sepolia" ? "https://sepolia.etherscan.io" : "https://etherscan.io"}"
};
`;
}

function generateIntegrationExample(abis: any): string {
  return `// Frontend integration example for TPT Ecosystem
// Generated on: ${new Date().toISOString()}
// Network: ${abis.network}

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from './types';

// Example: Initialize contracts for frontend use
export class KageEcosystemClient {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  
  public kageUnifiedStaking: ethers.Contract;
  public kageRevenue: ethers.Contract;
  public rewardDistributor: ethers.Contract;
  public kageToken: ethers.Contract;
  
  constructor(provider: ethers.providers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer || provider.getSigner();
    
    // Initialize contracts with proxy addresses
    this.kageUnifiedStaking = new ethers.Contract(
      CONTRACT_ADDRESSES.TigerStaking,
      require('./TigerStaking.json'),
      this.signer
    );
    
    this.kageRevenue = new ethers.Contract(
      CONTRACT_ADDRESSES.TigerRevenue,
      require('./TigerRevenue.json'),
      this.signer
    );
    
    this.rewardDistributor = new ethers.Contract(
      CONTRACT_ADDRESSES.RewardDistributor,
      require('./RewardDistributor.json'),
      this.signer
    );
    
    this.kageToken = new ethers.Contract(
      CONTRACT_ADDRESSES.TPT,
      require('./TPT.json'),
      this.signer
    );
  }
  
  // Example: Get user's staking information
  async getUserStakingInfo(userAddress: string) {
    try {
      const [stakeCount, totalStaked, rewards] = await Promise.all([
        this.kageUnifiedStaking.kageGetUserStakeCount(userAddress),
        this.kageUnifiedStaking.kageGetUserTotalStaked(userAddress),
        this.kageRevenue.kageGetUserRewards(userAddress)
      ]);
      
      return {
        stakeCount: stakeCount.toNumber(),
        totalStaked: ethers.utils.formatEther(totalStaked),
        rewards: ethers.utils.formatEther(rewards)
      };
    } catch (error) {
      console.error('Error fetching user staking info:', error);
      throw error;
    }
  }
  
  // Example: Get pool information
  async getPoolInfo(poolId: number) {
    try {
      const poolInfo = await this.kageUnifiedStaking.kageGetPoolInfo(poolId);
      return {
        poolId: poolId,
        minStake: ethers.utils.formatEther(poolInfo.minStake),
        apy: poolInfo.apy.toNumber(),
        isActive: poolInfo.isActive,
        penaltyRate: poolInfo.penaltyRate.toNumber(),
        totalStaked: ethers.utils.formatEther(poolInfo.totalStaked),
        stakerCount: poolInfo.stakerCount.toNumber()
      };
    } catch (error) {
      console.error('Error fetching pool info:', error);
      throw error;
    }
  }
  
  // Example: Stake tokens
  async stake(poolId: number, amount: string) {
    try {
      const amountWei = ethers.utils.parseEther(amount);
      
      // First approve the staking contract
      const approveTx = await this.kageToken.approve(
        CONTRACT_ADDRESSES.TigerStaking,
        amountWei
      );
      await approveTx.wait();
      
      // Then stake
      const stakeTx = await this.kageUnifiedStaking.kageStake(poolId, amountWei);
      const receipt = await stakeTx.wait();
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Error staking:', error);
      throw error;
    }
  }
  
  // Example: Claim rewards
  async claimRewards() {
    try {
      const tx = await this.kageRevenue.kageClaimRewards();
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Error claiming rewards:', error);
      throw error;
    }
  }
}

// Usage example:
/*
import { ethers } from 'ethers';
import { KageEcosystemClient } from './integration-example';

// Initialize provider (e.g., MetaMask)
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// Create client
const kageClient = new KageEcosystemClient(provider, signer);

// Use the client
async function example() {
  const userInfo = await kageClient.getUserStakingInfo('0x...');
  console.log('User staking info:', userInfo);
  
  const poolInfo = await kageClient.getPoolInfo(0);
  console.log('Pool info:', poolInfo);
}
*/
`;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
