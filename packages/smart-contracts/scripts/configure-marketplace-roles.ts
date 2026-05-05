#!/usr/bin/env ts-node

/**
 * Configure Marketplace Roles and Permissions
 *
 * Grants necessary roles for marketplace operation:
 * - MARKETPLACE_ROLE to marketplace on registry
 * - TOKEN_CREATOR_ROLE to marketplace on factories
 * - REVENUE_MANAGER_ROLE to staking on revenue
 * - REWARD_MANAGER_ROLE to staking on reward distributor
 */

import { ethers } from "hardhat";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  console.log("🔐 Configuring marketplace roles and permissions...\n");

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await deployer.provider!.getBalance(deployer.address))} ETH\n`);

  // Contract addresses from environment
  const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY!;
  const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY!;
  const FACTORY404_ADDRESS = process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY_404!;
  const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_RWA_MARKETPLACE!;

  console.log("📋 Contract addresses:");
  console.log(`   Registry: ${REGISTRY_ADDRESS}`);
  console.log(`   Factory: ${FACTORY_ADDRESS}`);
  console.log(`   Factory404: ${FACTORY404_ADDRESS}`);
  console.log(`   Marketplace: ${MARKETPLACE_ADDRESS}\n`);

  // Initialize contracts
  const registry = await ethers.getContractAt("RWAAssetRegistryUpgradeable", REGISTRY_ADDRESS);
  const factory = await ethers.getContractAt("RWATokenFactoryUpgradeable", FACTORY_ADDRESS);
  const factory404 = await ethers.getContractAt("RWATokenFactory404Fixed", FACTORY404_ADDRESS);
  const marketplace = await ethers.getContractAt("RWAMarketplaceFixedV2", MARKETPLACE_ADDRESS);

  console.log("🔍 Checking current roles...\n");

  // Check MARKETPLACE_ROLE on registry
  const MARKETPLACE_ROLE = await registry.MARKETPLACE_ROLE();
  const hasMarketplaceRole = await registry.hasRole(MARKETPLACE_ROLE, MARKETPLACE_ADDRESS);
  console.log(`📋 MARKETPLACE_ROLE on Registry: ${hasMarketplaceRole ? '✅' : '❌'}`);

  // Check TOKEN_CREATOR_ROLE on factory
  const TOKEN_CREATOR_ROLE = await factory.TOKEN_CREATOR_ROLE();
  const hasTokenCreatorRole = await factory.hasRole(TOKEN_CREATOR_ROLE, MARKETPLACE_ADDRESS);
  console.log(`📋 TOKEN_CREATOR_ROLE on Factory: ${hasTokenCreatorRole ? '✅' : '❌'}`);

  // Check TOKEN_CREATOR_ROLE on factory404
  const TOKEN_CREATOR_ROLE_404 = await factory404.TOKEN_CREATOR_ROLE();
  const hasTokenCreatorRole404 = await factory404.hasRole(TOKEN_CREATOR_ROLE_404, MARKETPLACE_ADDRESS);
  console.log(`📋 TOKEN_CREATOR_ROLE on Factory404: ${hasTokenCreatorRole404 ? '✅' : '❌'}\n`);

  // Grant missing roles
  console.log("🔑 Granting missing roles...\n");

  let rolesGranted = 0;

  // Grant MARKETPLACE_ROLE to marketplace on registry
  if (!hasMarketplaceRole) {
    console.log("📝 Granting MARKETPLACE_ROLE to marketplace on registry...");
    const tx = await registry.grantRole(MARKETPLACE_ROLE, MARKETPLACE_ADDRESS);
    await tx.wait();
    console.log("✅ MARKETPLACE_ROLE granted\n");
    rolesGranted++;
  }

  // Grant TOKEN_CREATOR_ROLE to marketplace on factory
  if (!hasTokenCreatorRole) {
    console.log("📝 Granting TOKEN_CREATOR_ROLE to marketplace on factory...");
    const tx = await factory.grantRole(TOKEN_CREATOR_ROLE, MARKETPLACE_ADDRESS);
    await tx.wait();
    console.log("✅ TOKEN_CREATOR_ROLE granted on factory\n");
    rolesGranted++;
  }

  // Grant TOKEN_CREATOR_ROLE to marketplace on factory404
  if (!hasTokenCreatorRole404) {
    console.log("📝 Granting TOKEN_CREATOR_ROLE to marketplace on factory404...");
    const tx = await factory404.grantRole(TOKEN_CREATOR_ROLE_404, MARKETPLACE_ADDRESS);
    await tx.wait();
    console.log("✅ TOKEN_CREATOR_ROLE granted on factory404\n");
    rolesGranted++;
  }

  // Verify roles were granted
  console.log("🔍 Verifying roles were granted...\n");

  const finalMarketplaceRole = await registry.hasRole(MARKETPLACE_ROLE, MARKETPLACE_ADDRESS);
  const finalTokenCreatorRole = await factory.hasRole(TOKEN_CREATOR_ROLE, MARKETPLACE_ADDRESS);
  const finalTokenCreatorRole404 = await factory404.hasRole(TOKEN_CREATOR_ROLE_404, MARKETPLACE_ADDRESS);

  console.log(`📋 Final MARKETPLACE_ROLE on Registry: ${finalMarketplaceRole ? '✅' : '❌'}`);
  console.log(`📋 Final TOKEN_CREATOR_ROLE on Factory: ${finalTokenCreatorRole ? '✅' : '❌'}`);
  console.log(`📋 Final TOKEN_CREATOR_ROLE on Factory404: ${finalTokenCreatorRole404 ? '✅' : '❌'}\n`);

  if (rolesGranted > 0) {
    console.log(`🎉 Successfully granted ${rolesGranted} roles!`);
  } else {
    console.log("ℹ️  All roles were already properly configured.");
  }

  // Test marketplace functionality
  console.log("🧪 Testing marketplace functionality...\n");

  try {
    // Test marketplace fee
    const fee = await marketplace.getMarketplaceFee();
    console.log(`💰 Marketplace fee: ${fee} basis points (${Number(fee) / 100}%)`);

    // Test registry total assets
    const totalAssets = await registry.getTotalAssets();
    console.log(`📊 Total assets in registry: ${totalAssets}`);

    console.log("\n✅ Marketplace configuration and testing complete!");
  } catch (error) {
    console.error("❌ Error testing marketplace functionality:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Role configuration failed:", error);
    process.exit(1);
  });