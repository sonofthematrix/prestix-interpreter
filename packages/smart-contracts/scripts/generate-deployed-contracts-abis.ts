/**
 * Generate ABIs for All Deployed Contracts
 * 
 * Generates comprehensive ABI files for all contracts deployed on Sepolia.
 * Uses proxy addresses for frontend integration (as per deployment guide).
 * 
 * Usage: bun hardhat run scripts/generate-deployed-contracts-abis.ts --network sepolia
 */

import "dotenv/config";
import hre from "hardhat";
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

interface DeploymentAddresses {
  network: string;
  addresses: {
    ProxyAdmin: string;
    TigerPalaceToken?: string;
    RWAAssetRegistry: string;
    RWATokenFactory: string;
    RWATokenFactory404?: string;
    RWAMarketplace: string;
    RWAStaking: string;
    RWARewardDistributor: string;
    RWARevenue: string;
    MembershipSystem: string;
    RWAAssetRegistry_Implementation: string;
    RWATokenFactory_Implementation: string;
    RWAMarketplace_Implementation: string;
    RWAStaking_Implementation: string;
    MembershipSystem_Implementation: string;
  };
}

interface ContractABI {
  contractName: string;
  address: string;
  implementationAddress?: string;
  abi: any[];
  network: string;
  chainId: number;
  generatedAt: string;
}

interface EcosystemABI {
  ecosystem: string;
  version: string;
  network: string;
  chainId: number;
  generatedAt: string;
  contracts: {
    [key: string]: ContractABI;
  };
}

// Contract mapping: contract name -> artifact path
const CONTRACT_MAPPINGS: { [key: string]: { artifactPath: string; isProxy: boolean } } = {
  ProxyAdmin: {
    artifactPath: "contracts/proxy/ProxyAdmin.sol:ProxyAdmin",
    isProxy: false,
  },
  TigerPalaceToken: {
    artifactPath: "contracts/TigerPalaceToken.sol:TigerPalaceToken",
    isProxy: true,
  },
  RWAAssetRegistry: {
    artifactPath: "contracts/upgradeable/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable",
    isProxy: true,
  },
  RWATokenFactory: {
    artifactPath: "contracts/upgradeable/RWATokenFactoryUpgradeable.sol:RWATokenFactoryUpgradeable",
    isProxy: true,
  },
  RWAMarketplace: {
    artifactPath: "contracts/upgradeable/RWAMarketplaceUpgradeable.sol:RWAMarketplaceUpgradeable",
    isProxy: true,
  },
  RWAStaking: {
    artifactPath: "contracts/upgradeable/RWAStakingUpgradeable.sol:RWAStakingUpgradeable",
    isProxy: true,
  },
  RWARewardDistributor: {
    artifactPath: "contracts/staking/RWARewardDistributor.sol:RWARewardDistributor",
    isProxy: false,
  },
  RWARevenue: {
    artifactPath: "contracts/staking/RWARevenue.sol:RWARevenue",
    isProxy: false,
  },
  MembershipSystem: {
    artifactPath: "contracts/upgradeable/MembershipSystemUpgradeable.sol:MembershipSystemUpgradeable",
    isProxy: true,
  },
};

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   GENERATING ABIs FOR DEPLOYED CONTRACTS                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Load deployment addresses
  const addressesFile = path.join(__dirname, "../deployed-addresses-proxy.json");
  if (!fs.existsSync(addressesFile)) {
    console.log(`❌ Error: Deployment file not found: ${addressesFile}`);
    process.exit(1);
  }

  const deployment: DeploymentAddresses = JSON.parse(fs.readFileSync(addressesFile, "utf-8"));
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  const chainId = Number(network.chainId);

  console.log(`📡 Network: ${networkName} (Chain ID: ${chainId})`);
  console.log(`📋 Deployment Network: ${deployment.network}\n`);

  // Create output directories
  const abisDir = path.join(__dirname, "../abis");
  const frontendDir = path.join(abisDir, "frontend");
  const sepoliaDir = path.join(abisDir, "sepolia");

  [abisDir, frontendDir, sepoliaDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const ecosystemABI: EcosystemABI = {
    ecosystem: "TigerPalace RWA Marketplace Ecosystem",
    version: "2.0.0",
    network: networkName,
    chainId: chainId,
    generatedAt: new Date().toISOString(),
    contracts: {},
  };

  console.log("🔧 Generating ABIs from compiled artifacts...\n");

  // Generate ABIs for each contract
  for (const [contractKey, contractInfo] of Object.entries(CONTRACT_MAPPINGS)) {
    const address = deployment.addresses[contractKey as keyof typeof deployment.addresses];

    if (!address) {
      console.log(`⚠️  No address found for ${contractKey}, skipping...`);
      continue;
    }

    try {
      // Load artifact
      const artifact = await hre.artifacts.readArtifact(contractInfo.artifactPath);

      // Get implementation address if proxy
      let implementationAddress: string | undefined;
      if (contractInfo.isProxy) {
        const implKey = `${contractKey}_Implementation` as keyof typeof deployment.addresses;
        implementationAddress = deployment.addresses[implKey] as string | undefined;
      }

      const contractABI: ContractABI = {
        contractName: contractKey,
        address: address,
        implementationAddress: implementationAddress,
        abi: artifact.abi,
        network: networkName,
        chainId: chainId,
        generatedAt: new Date().toISOString(),
      };

      // Save individual ABI file (full)
      const abiFile = path.join(abisDir, `${contractKey}.json`);
      fs.writeFileSync(abiFile, JSON.stringify(contractABI, null, 2));
      console.log(`✅ Generated ${contractKey}.json`);

      // Save minimal ABI (just the ABI array) for frontend
      const minimalAbiFile = path.join(frontendDir, `${contractKey}.json`);
      const minimalABI = {
        contractName: contractKey,
        address: address,
        implementationAddress: implementationAddress,
        abi: artifact.abi,
        network: networkName,
        chainId: chainId,
      };
      fs.writeFileSync(minimalAbiFile, JSON.stringify(minimalABI, null, 2));
      console.log(`✅ Generated frontend/${contractKey}.json`);

      // Save network-specific ABI
      const networkAbiFile = path.join(sepoliaDir, `${contractKey}.json`);
      fs.writeFileSync(networkAbiFile, JSON.stringify(contractABI, null, 2));

      // Add to ecosystem
      ecosystemABI.contracts[contractKey] = contractABI;
    } catch (error: any) {
      console.log(`❌ Failed to generate ABI for ${contractKey}: ${error.message}`);
    }
  }

  // Save ecosystem ABI
  const ecosystemFile = path.join(abisDir, "TigerPalaceEcosystem.json");
  fs.writeFileSync(ecosystemFile, JSON.stringify(ecosystemABI, null, 2));
  console.log(`\n✅ Generated TigerPalaceEcosystem.json`);

  // Save frontend ecosystem ABI
  const frontendEcosystemFile = path.join(frontendDir, "TigerPalaceEcosystem-Frontend.json");
  fs.writeFileSync(frontendEcosystemFile, JSON.stringify(ecosystemABI, null, 2));
  console.log(`✅ Generated frontend/TigerPalaceEcosystem-Frontend.json`);

  // Generate TypeScript types
  const typesContent = generateTypeScriptTypes(deployment, networkName, chainId);
  const typesFile = path.join(frontendDir, "types.ts");
  fs.writeFileSync(typesFile, typesContent);
  console.log(`✅ Generated frontend/types.ts`);

  // Generate integration example
  const integrationContent = generateIntegrationExample(deployment, networkName);
  const integrationFile = path.join(frontendDir, "integration-example.ts");
  fs.writeFileSync(integrationFile, integrationContent);
  console.log(`✅ Generated frontend/integration-example.ts`);

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📋 SUMMARY");
  console.log("=".repeat(70));
  console.log(`\n✅ Generated ABIs for ${Object.keys(ecosystemABI.contracts).length} contracts`);
  console.log(`📁 Output directories:`);
  console.log(`   - ${abisDir}`);
  console.log(`   - ${frontendDir}`);
  console.log(`   - ${sepoliaDir}`);
  console.log(`\n🔗 Contract Addresses (Use PROXY addresses for frontend):`);
  console.log("=".repeat(70));
  for (const [key, contract] of Object.entries(ecosystemABI.contracts)) {
    const proxyNote = CONTRACT_MAPPINGS[key]?.isProxy ? " (Proxy)" : "";
    console.log(`   ${key}: ${contract.address}${proxyNote}`);
  }
  console.log("\n🎉 ABI generation complete!");
}

function generateTypeScriptTypes(
  deployment: DeploymentAddresses,
  network: string,
  chainId: number
): string {
  return `// Auto-generated TypeScript types for TigerPalace RWA Marketplace Ecosystem
// Generated at: ${new Date().toISOString()}
// Network: ${network} (Chain ID: ${chainId})

export interface ContractAddresses {
  ProxyAdmin: string;
  TigerPalaceToken: string;
  RWAAssetRegistry: string;
  RWATokenFactory: string;
  RWAMarketplace: string;
  RWAStaking: string;
  RWARewardDistributor: string;
  RWARevenue: string;
  MembershipSystem: string;
}

export const CONTRACT_ADDRESSES: ContractAddresses = {
  ProxyAdmin: "${deployment.addresses.ProxyAdmin}",
  TigerPalaceToken: "${deployment.addresses.TigerPalaceToken || ""}",
  RWAAssetRegistry: "${deployment.addresses.RWAAssetRegistry}",
  RWATokenFactory: "${deployment.addresses.RWATokenFactory}",
  RWAMarketplace: "${deployment.addresses.RWAMarketplace}",
  RWAStaking: "${deployment.addresses.RWAStaking}",
  RWARewardDistributor: "${deployment.addresses.RWARewardDistributor}",
  RWARevenue: "${deployment.addresses.RWARevenue}",
  MembershipSystem: "${deployment.addresses.MembershipSystem}",
};

export const NETWORK_CONFIG = {
  name: "${network}",
  chainId: ${chainId},
};

// Export contract addresses by network
export const NETWORK_ADDRESSES: Record<string, ContractAddresses> = {
  ${network}: CONTRACT_ADDRESSES,
};
`;
}

function generateIntegrationExample(deployment: DeploymentAddresses, network: string): string {
  return `// TigerPalace RWA Marketplace Ecosystem Integration Example
// This file shows how to integrate the RWA contracts in your frontend
// Generated at: ${new Date().toISOString()}

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ContractAddresses } from './types';

// Import contract ABIs
import ProxyAdminABI from './ProxyAdmin.json';
import TigerPalaceTokenABI from './TigerPalaceToken.json';
import RWAAssetRegistryABI from './RWAAssetRegistry.json';
import RWATokenFactoryABI from './RWATokenFactory.json';
import RWAMarketplaceABI from './RWAMarketplace.json';
import RWAStakingABI from './RWAStaking.json';
import RWARewardDistributorABI from './RWARewardDistributor.json';
import RWARevenueABI from './RWARevenue.json';
import MembershipSystemABI from './MembershipSystem.json';

export class TigerPalaceRWAIntegration {
  private provider: ethers.Provider;
  private signer: ethers.Signer | null;
  private contracts: {
    proxyAdmin: ethers.Contract;
    tokenizinToken: ethers.Contract;
    rwaAssetRegistry: ethers.Contract;
    rwaTokenFactory: ethers.Contract;
    rwaMarketplace: ethers.Contract;
    rwaStaking: ethers.Contract;
    rwaRewardDistributor: ethers.Contract;
    rwaRevenue: ethers.Contract;
    membershipSystem: ethers.Contract;
  };

  constructor(provider: ethers.Provider, signer: ethers.Signer | null = null) {
    this.provider = provider;
    this.signer = signer;

    // Initialize contracts with proxy addresses (for frontend integration)
    this.contracts = {
      proxyAdmin: new ethers.Contract(
        CONTRACT_ADDRESSES.ProxyAdmin,
        ProxyAdminABI.abi,
        signer || provider
      ),
      tokenizinToken: new ethers.Contract(
        CONTRACT_ADDRESSES.TigerPalaceToken,
        TigerPalaceTokenABI.abi,
        signer || provider
      ),
      rwaAssetRegistry: new ethers.Contract(
        CONTRACT_ADDRESSES.RWAAssetRegistry,
        RWAAssetRegistryABI.abi,
        signer || provider
      ),
      rwaTokenFactory: new ethers.Contract(
        CONTRACT_ADDRESSES.RWATokenFactory,
        RWATokenFactoryABI.abi,
        signer || provider
      ),
      rwaMarketplace: new ethers.Contract(
        CONTRACT_ADDRESSES.RWAMarketplace,
        RWAMarketplaceABI.abi,
        signer || provider
      ),
      rwaStaking: new ethers.Contract(
        CONTRACT_ADDRESSES.RWAStaking,
        RWAStakingABI.abi,
        signer || provider
      ),
      rwaRewardDistributor: new ethers.Contract(
        CONTRACT_ADDRESSES.RWARewardDistributor,
        RWARewardDistributorABI.abi,
        signer || provider
      ),
      rwaRevenue: new ethers.Contract(
        CONTRACT_ADDRESSES.RWARevenue,
        RWARevenueABI.abi,
        signer || provider
      ),
      membershipSystem: new ethers.Contract(
        CONTRACT_ADDRESSES.MembershipSystem,
        MembershipSystemABI.abi,
        signer || provider
      ),
    };
  }

  // Token operations
  async getTokenBalance(address: string): Promise<string> {
    const balance = await this.contracts.tokenizinToken.balanceOf(address);
    return ethers.formatEther(balance);
  }

  async approveToken(spender: string, amount: string): Promise<void> {
    if (!this.signer) throw new Error("Signer required for transactions");
    const tx = await this.contracts.tokenizinToken.approve(
      spender,
      ethers.parseEther(amount)
    );
    await tx.wait();
  }

  // Asset Registry operations
  async getAsset(assetId: number): Promise<any> {
    return await this.contracts.rwaAssetRegistry.getAsset(assetId);
  }

  async getAllAssets(): Promise<any[]> {
    return await this.contracts.rwaAssetRegistry.getAllAssets();
  }

  // Marketplace operations
  async purchaseTokens(assetId: number, tokenAmount: string, options?: { value?: string }): Promise<void> {
    if (!this.signer) throw new Error("Signer required for transactions");
    const tx = await this.contracts.rwaMarketplace.purchaseTokens(
      assetId,
      ethers.parseEther(tokenAmount),
      { value: options?.value ? ethers.parseEther(options.value) : undefined }
    );
    await tx.wait();
  }

  // Staking operations
  async stake(poolId: number, amount: string): Promise<void> {
    if (!this.signer) throw new Error("Signer required for transactions");
    const tx = await this.contracts.rwaStaking.stake(
      poolId,
      ethers.parseEther(amount)
    );
    await tx.wait();
  }

  async claimRewards(stakeId: number): Promise<void> {
    if (!this.signer) throw new Error("Signer required for transactions");
    const tx = await this.contracts.rwaStaking.claimRewards(stakeId);
    await tx.wait();
  }

  async getUserStakes(address: string): Promise<any[]> {
    return await this.contracts.rwaStaking.getUserStakes(address);
  }

  async getPendingRewards(address: string, stakeId: number): Promise<string> {
    const rewards = await this.contracts.rwaStaking.getPendingRewards(address, stakeId);
    return ethers.formatEther(rewards);
  }

  // Revenue operations
  async getRevenueStats(): Promise<any> {
    return await this.contracts.rwaRevenue.getRevenueStats();
  }

  // Reward Distributor operations
  async getRewardPoolStats(): Promise<any> {
    return await this.contracts.rwaRewardDistributor.getRewardPoolStats();
  }

  // Membership operations
  async getMembershipLevel(address: string): Promise<any> {
    return await this.contracts.membershipSystem.getMembershipLevel(address);
  }
}

// Usage example:
/*
// In a React component or frontend app:
import { ethers } from 'ethers';
import { TigerPalaceRWAIntegration } from './integration-example';

// Initialize provider and signer
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const rwa = new TigerPalaceRWAIntegration(provider, signer);

// Get user's token balance
const balance = await rwa.getTokenBalance(userAddress);

// Approve token spending
await rwa.approveToken(CONTRACT_ADDRESSES.RWAStaking, '1000');

// Stake tokens
await rwa.stake(1, '1000');

// Get user's stakes
const stakes = await rwa.getUserStakes(userAddress);

// Claim rewards
await rwa.claimRewards(0);
*/
`;
}

main().catch((error) => {
  console.error("❌ ABI generation failed:", error);
  process.exit(1);
});

