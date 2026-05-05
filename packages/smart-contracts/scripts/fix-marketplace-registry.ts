#!/usr/bin/env tsx
/**
 * Fix Marketplace Registry Address
 * 
 * This script upgrades the marketplace to fix the registry address.
 * Since the marketplace doesn't have a setter, we need to upgrade it
 * with a new implementation that includes setAssetRegistry function.
 * 
 * Usage:
 *   cd smart-contracts
 *   bun hardhat run scripts/fix-marketplace-registry.ts --network sepolia
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;
import fs from 'fs';
import path from 'path';

const DEPLOYED_ADDRESSES_FILE = path.join(__dirname, '../deployed-addresses-proxy.json');

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   FIX MARKETPLACE REGISTRY ADDRESS                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Load deployed addresses
  const deployed = JSON.parse(fs.readFileSync(DEPLOYED_ADDRESSES_FILE, 'utf-8'));
  const proxyAdminAddress = deployed.addresses.ProxyAdmin;
  const marketplaceProxyAddress = deployed.addresses.RWAMarketplace;
  const correctRegistryAddress = deployed.addresses.RWAAssetRegistry;
  
  console.log(`📋 Addresses:`);
  console.log(`   ProxyAdmin: ${proxyAdminAddress}`);
  console.log(`   Marketplace Proxy: ${marketplaceProxyAddress}`);
  console.log(`   Correct Registry: ${correctRegistryAddress}\n`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`   Deployer: ${deployer.address}\n`);
  
  // Check current marketplace registry
  const marketplaceAbiPath = path.join(__dirname, '../abis/sepolia/RWAMarketplace.json');
  const marketplaceABI = JSON.parse(fs.readFileSync(marketplaceAbiPath, 'utf-8')).abi;
  const marketplace = await ethers.getContractAt(marketplaceABI, marketplaceProxyAddress);
  
  const currentRegistry = await marketplace.assetRegistry();
  console.log(`🔍 Current Configuration:`);
  console.log(`   Marketplace Registry: ${currentRegistry}`);
  console.log(`   Expected Registry: ${correctRegistryAddress}`);
  
  if (currentRegistry.toLowerCase() === correctRegistryAddress.toLowerCase()) {
    console.log(`\n✅ Marketplace already points to correct registry!\n`);
    return;
  }
  
  console.log(`\n⚠️  Registry mismatch detected!\n`);
  
  // Check if marketplace uses UUPS (can upgrade itself) or TransparentProxy (needs ProxyAdmin)
  // Try UUPS first - check if deployer has UPGRADER_ROLE
  const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
  const hasUpgraderRole = await marketplace.hasRole(UPGRADER_ROLE, deployer.address);
  
  let upgradeMethod = 'unknown';
  if (hasUpgraderRole) {
    upgradeMethod = 'UUPS';
    console.log(`✅ Marketplace uses UUPS pattern - deployer can upgrade directly\n`);
  } else {
    // Check ProxyAdmin
    const ProxyAdmin = await ethers.getContractAt('ProxyAdmin', proxyAdminAddress);
    const proxyAdminOwner = await ProxyAdmin.owner();
    
    if (proxyAdminOwner.toLowerCase() === deployer.address.toLowerCase()) {
      upgradeMethod = 'TransparentProxy';
      console.log(`✅ Marketplace uses TransparentProxy - upgrading via ProxyAdmin\n`);
    } else {
      throw new Error(`Deployer ${deployer.address} doesn't have upgrade permissions. UPGRADER_ROLE: ${hasUpgraderRole}, ProxyAdmin owner: ${proxyAdminOwner}`);
    }
  }
  
  // Get current implementation
  const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
  const implementationAddress = await ethers.provider.getStorage(marketplaceProxyAddress, implementationSlot);
  const currentImpl = '0x' + implementationAddress.slice(-40);
  console.log(`📦 Current Implementation: ${currentImpl}\n`);
  
  // Deploy new implementation with setAssetRegistry function
  console.log(`🔧 Deploying new marketplace implementation...`);
  const RWAMarketplaceUpgradeable = await ethers.getContractFactory('RWAMarketplaceUpgradeable');
  const newImplementation = await RWAMarketplaceUpgradeable.deploy();
  await newImplementation.waitForDeployment();
  const newImplAddress = await newImplementation.getAddress();
  console.log(`✅ New Implementation: ${newImplAddress}\n`);
  
  // Upgrade the proxy
  console.log(`⬆️  Upgrading marketplace proxy...`);
  let upgradeTx;
  if (upgradeMethod === 'UUPS') {
    upgradeTx = await marketplace.upgradeTo(newImplAddress);
  } else {
    const ProxyAdmin = await ethers.getContractAt('ProxyAdmin', proxyAdminAddress);
    upgradeTx = await ProxyAdmin.upgrade(marketplaceProxyAddress, newImplAddress);
  }
  console.log(`   Transaction: ${upgradeTx.hash}`);
  const upgradeReceipt = await upgradeTx.wait();
  console.log(`   ✅ Upgraded in block ${upgradeReceipt.blockNumber}\n`);
  
  // Get updated marketplace instance (with new ABI that includes setAssetRegistry)
  const updatedMarketplace = await ethers.getContractAt('RWAMarketplaceUpgradeable', marketplaceProxyAddress);
  
  // Call setAssetRegistry on the upgraded contract
  console.log(`🔧 Setting correct registry address...`);
  const setRegistryTx = await updatedMarketplace.setAssetRegistry(correctRegistryAddress);
  console.log(`   Transaction: ${setRegistryTx.hash}`);
  const setRegistryReceipt = await setRegistryTx.wait();
  console.log(`   ✅ Registry updated in block ${setRegistryReceipt.blockNumber}\n`);
  
  // Verify
  const updatedRegistry = await updatedMarketplace.assetRegistry();
  if (updatedRegistry.toLowerCase() === correctRegistryAddress.toLowerCase()) {
    console.log(`✅ Verification: Marketplace now points to correct registry!\n`);
    
    // Test marketplace access
    console.log(`🧪 Testing marketplace access...`);
    try {
      // Try to calculate cost for asset 1
      const [cost, fee] = await updatedMarketplace.calculatePurchaseCost(1, 1);
      console.log(`   ✅ Marketplace can access assets!`);
      console.log(`   Test purchase cost (1 token): ${ethers.formatEther(cost)} ETH\n`);
    } catch (error: any) {
      console.log(`   ⚠️  Marketplace access test failed: ${error.message}\n`);
    }
  } else {
    console.log(`❌ Verification failed: Registry address mismatch\n`);
  }
  
  console.log('🎉 Marketplace registry fix complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });

