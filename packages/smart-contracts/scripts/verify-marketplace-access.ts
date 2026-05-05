#!/usr/bin/env tsx
/**
 * Verify Marketplace Access to Assets
 * 
 * This script verifies that the marketplace can access registered assets
 * and calculate purchase costs.
 * 
 * Usage:
 *   cd smart-contracts
 *   bun hardhat run scripts/verify-marketplace-access.ts --network sepolia
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;
import fs from 'fs';
import path from 'path';

const DEPLOYED_ADDRESSES_FILE = path.join(__dirname, '../deployed-addresses-proxy.json');
const RESULTS_FILE = path.join(__dirname, '../seed-assets-registration-results.json');

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   VERIFY MARKETPLACE ACCESS TO ASSETS                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Load deployed addresses
  const deployed = JSON.parse(fs.readFileSync(DEPLOYED_ADDRESSES_FILE, 'utf-8'));
  const registryAddress = deployed.addresses.RWAAssetRegistry;
  const marketplaceAddress = deployed.addresses.RWAMarketplace;
  
  // Load registration results
  let assetIds: number[] = [];
  if (fs.existsSync(RESULTS_FILE)) {
    const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
    assetIds = results.results
      .filter((r: any) => r.success)
      .map((r: any) => r.assetId);
  }
  
  if (assetIds.length === 0) {
    console.log('⚠️  No registered assets found. Please run registration script first.\n');
    return;
  }
  
  console.log(`📋 Contract Addresses:`);
  console.log(`   Registry: ${registryAddress}`);
  console.log(`   Marketplace: ${marketplaceAddress}`);
  console.log(`   Assets to verify: ${assetIds.length}\n`);
  
  const [deployer] = await ethers.getSigners();
  
  // Load ABIs
  const registryAbiPath = path.join(__dirname, '../abis/sepolia/RWAAssetRegistry.json');
  const marketplaceAbiPath = path.join(__dirname, '../abis/sepolia/RWAMarketplace.json');
  
  let registryABI: any[] = [];
  let marketplaceABI: any[] = [];
  
  if (fs.existsSync(registryAbiPath)) {
    const abiData = JSON.parse(fs.readFileSync(registryAbiPath, 'utf-8'));
    registryABI = abiData.abi || abiData;
  }
  
  if (fs.existsSync(marketplaceAbiPath)) {
    const abiData = JSON.parse(fs.readFileSync(marketplaceAbiPath, 'utf-8'));
    marketplaceABI = abiData.abi || abiData;
  }
  
  const registry = await ethers.getContractAt(registryABI, registryAddress);
  const marketplace = await ethers.getContractAt(marketplaceABI, marketplaceAddress);
  
  // Check MARKETPLACE_ROLE
  const MARKETPLACE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MARKETPLACE_ROLE"));
  const hasRole = await registry.hasRole(MARKETPLACE_ROLE, marketplaceAddress);
  
  console.log(`🔐 Role Check:`);
  console.log(`   Marketplace has MARKETPLACE_ROLE: ${hasRole ? '✅' : '❌'}\n`);
  
  if (!hasRole) {
    console.log('❌ Marketplace does not have MARKETPLACE_ROLE. Run grant-marketplace-role.ts first.\n');
    return;
  }
  
  // Verify each asset
  console.log(`🔍 Verifying marketplace access to assets...\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const assetId of assetIds) {
    try {
      // Get asset from registry
      const asset = await registry.getAsset(assetId);
      console.log(`[Asset ID ${assetId}]`);
      console.log(`   Title: ${asset.title}`);
      console.log(`   Status: ${asset.status === 1 ? 'ACTIVE' : 'INACTIVE'}`);
      console.log(`   Available Tokens: ${asset.availableTokens.toString()}`);
      
      // Calculate purchase cost
      const [totalCost, marketplaceFee] = await marketplace.calculatePurchaseCost(assetId, 1);
      console.log(`   Purchase Cost (1 token): ${ethers.formatEther(totalCost)} ETH`);
      console.log(`   Marketplace Fee: ${ethers.formatEther(marketplaceFee)} ETH`);
      console.log(`   ✅ Marketplace can access asset\n`);
      successCount++;
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}\n`);
      failCount++;
    }
  }
  
  console.log('='.repeat(70));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`\n✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}\n`);
  
  if (successCount === assetIds.length) {
    console.log('🎉 All assets are accessible by the marketplace!\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });

