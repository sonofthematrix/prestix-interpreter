#!/usr/bin/env tsx
/**
 * COMPLETE FRESH ECOSYSTEM CONFIGURATION
 * 
 * Configures roles and permissions for the deployed ecosystem:
 * - Grant MARKETPLACE_ROLE to marketplace on registry
 * - Grant TOKEN_CREATOR_ROLE to marketplace on both factories
 * - Verify all roles are properly configured
 * 
 * Run this after deploy-complete-fresh-ecosystem.ts completes
 */

import 'dotenv/config';
import { ethers } from "hardhat";
import hre from "hardhat";
import { createClient } from '../../../src/lib/db';

// System user for database operations
const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN' as const,
  name: 'System Admin'
};

const NETWORK_ID = '11155111'; // Sepolia

/**
 * Main execution
 */
async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   COMPLETE FRESH ECOSYSTEM CONFIGURATION                  ║");
  console.log("║   Roles & Permissions Setup                               ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // Load deployed contracts from database
  console.log("📋 Loading deployed contracts from database...\n");
  const db = createClient(systemUser);

  const contracts = await db.deployedContract.findMany({
    where: {
      networkId: NETWORK_ID,
      isActive: true,
    } as any,
    orderBy: { deployedAt: 'desc' },
  });

  // Find contracts by type
  const registry = contracts.find(c => c.contractType === 'REGISTRY');
  const factory = contracts.find(c => c.contractType === 'FACTORY');
  const factory404 = contracts.find(c => c.contractType === 'ERC404_FACTORY');
  const marketplace = contracts.find(c => c.contractType === 'MARKETPLACE');

  if (!registry || !factory || !factory404 || !marketplace) {
    console.error("❌ Missing required contracts in database:");
    console.error(`   Registry: ${registry ? '✅' : '❌'}`);
    console.error(`   Factory: ${factory ? '✅' : '❌'}`);
    console.error(`   Factory404: ${factory404 ? '✅' : '❌'}`);
    console.error(`   Marketplace: ${marketplace ? '✅' : '❌'}`);
    process.exit(1);
  }

  console.log("✅ All contracts found in database:");
  console.log(`   Registry: ${registry.contractAddress}`);
  console.log(`   Factory: ${factory.contractAddress}`);
  console.log(`   Factory404: ${factory404.contractAddress}`);
  console.log(`   Marketplace: ${marketplace.contractAddress}\n`);

  // Load ABIs
  const registryABI = await db.contractABI.findFirst({
    where: { contractAddress: registry.contractAddress } as any,
  });
  const factoryABI = await db.contractABI.findFirst({
    where: { contractAddress: factory.contractAddress } as any,
  });
  const factory404ABI = await db.contractABI.findFirst({
    where: { contractAddress: factory404.contractAddress } as any,
  });

  if (!registryABI || !factoryABI || !factory404ABI) {
    console.error("❌ Missing ABIs in database");
    process.exit(1);
  }

  // Create contract instances
  const registryContract = new ethers.Contract(registry.contractAddress, registryABI.abi as any, deployer);
  const factoryContract = new ethers.Contract(factory.contractAddress, factoryABI.abi as any, deployer);
  const factory404Contract = new ethers.Contract(factory404.contractAddress, factory404ABI.abi as any, deployer);

  // Configure Roles
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   CONFIGURING ROLES AND PERMISSIONS                       ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    // Grant MARKETPLACE_ROLE to marketplace on registry
    console.log("⚙️  Granting MARKETPLACE_ROLE to marketplace on registry...");
    const MARKETPLACE_ROLE = await registryContract.MARKETPLACE_ROLE();
    const hasMarketplaceRole = await registryContract.hasRole(MARKETPLACE_ROLE, marketplace.contractAddress);
    
    if (!hasMarketplaceRole) {
      const grantMarketplaceRoleTx = await registryContract.grantRole(MARKETPLACE_ROLE, marketplace.contractAddress);
      await grantMarketplaceRoleTx.wait();
      console.log("✅ MARKETPLACE_ROLE granted on registry\n");
    } else {
      console.log("ℹ️  MARKETPLACE_ROLE already granted on registry\n");
    }

    // Grant TOKEN_CREATOR_ROLE to marketplace on factory
    console.log("⚙️  Granting TOKEN_CREATOR_ROLE to marketplace on factory...");
    const TOKEN_CREATOR_ROLE = await factoryContract.TOKEN_CREATOR_ROLE();
    const hasTokenCreatorRole = await factoryContract.hasRole(TOKEN_CREATOR_ROLE, marketplace.contractAddress);
    
    if (!hasTokenCreatorRole) {
      const grantTokenCreatorRoleTx = await factoryContract.grantRole(TOKEN_CREATOR_ROLE, marketplace.contractAddress);
      await grantTokenCreatorRoleTx.wait();
      console.log("✅ TOKEN_CREATOR_ROLE granted on factory\n");
    } else {
      console.log("ℹ️  TOKEN_CREATOR_ROLE already granted on factory\n");
    }

    // Grant TOKEN_CREATOR_ROLE to marketplace on factory404
    console.log("⚙️  Granting TOKEN_CREATOR_ROLE to marketplace on factory404...");
    const TOKEN_CREATOR_ROLE_404 = await factory404Contract.TOKEN_CREATOR_ROLE();
    const hasTokenCreatorRole404 = await factory404Contract.hasRole(TOKEN_CREATOR_ROLE_404, marketplace.contractAddress);
    
    if (!hasTokenCreatorRole404) {
      const grantTokenCreatorRole404Tx = await factory404Contract.grantRole(TOKEN_CREATOR_ROLE_404, marketplace.contractAddress);
      await grantTokenCreatorRole404Tx.wait();
      console.log("✅ TOKEN_CREATOR_ROLE granted on factory404\n");
    } else {
      console.log("ℹ️  TOKEN_CREATOR_ROLE already granted on factory404\n");
    }

    console.log("✅ All roles configured successfully!");

  } catch (error: any) {
    console.error("❌ Role configuration failed:", error.message);
    throw error;
  }

  // Verification
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   VERIFYING DEPLOYMENT                                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("📋 Checking deployed contracts...\n");

  // Check registry
  const registryAdmin = await registryContract.hasRole(await registryContract.DEFAULT_ADMIN_ROLE(), deployer.address);
  console.log(`   Registry Admin: ${registryAdmin ? '✅' : '❌'}`);

  // Check factory
  const factoryAdmin = await factoryContract.hasRole(await factoryContract.DEFAULT_ADMIN_ROLE(), deployer.address);
  console.log(`   Factory Admin: ${factoryAdmin ? '✅' : '❌'}`);

  // Check factory404
  const factory404Admin = await factory404Contract.hasRole(await factory404Contract.DEFAULT_ADMIN_ROLE(), deployer.address);
  console.log(`   Factory404 Admin: ${factory404Admin ? '✅' : '❌'}`);

  // Check marketplace roles
  const marketplaceRoleOnRegistry = await registryContract.hasRole(
    await registryContract.MARKETPLACE_ROLE(),
    marketplace.contractAddress
  );
  const tokenCreatorRoleOnFactory = await factoryContract.hasRole(
    await factoryContract.TOKEN_CREATOR_ROLE(),
    marketplace.contractAddress
  );
  const tokenCreatorRoleOnFactory404 = await factory404Contract.hasRole(
    await factory404Contract.TOKEN_CREATOR_ROLE(),
    marketplace.contractAddress
  );

  console.log(`\n   Marketplace Roles:`);
  console.log(`      MARKETPLACE_ROLE on Registry: ${marketplaceRoleOnRegistry ? '✅' : '❌'}`);
  console.log(`      TOKEN_CREATOR_ROLE on Factory: ${tokenCreatorRoleOnFactory ? '✅' : '❌'}`);
  console.log(`      TOKEN_CREATOR_ROLE on Factory404: ${tokenCreatorRoleOnFactory404 ? '✅' : '❌'}`);

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   ✅ CONFIGURATION COMPLETE                               ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("📋 Deployed Contract Addresses:\n");
  console.log(`   Registry (Proxy):    ${registry.contractAddress}`);
  console.log(`   Factory (Proxy):     ${factory.contractAddress}`);
  console.log(`   Factory404:          ${factory404.contractAddress}`);
  console.log(`   Marketplace (Proxy): ${marketplace.contractAddress}\n`);

  console.log("📝 Next Steps:\n");
  console.log("   1. Update .env.local with these addresses");
  console.log("   2. Verify all contracts on Etherscan");
  console.log("   3. Test marketplace functionality");
  console.log("   4. Register test assets\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Configuration failed:", error);
    process.exit(1);
  });
