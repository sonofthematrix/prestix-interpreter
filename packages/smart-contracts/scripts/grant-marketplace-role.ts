#!/usr/bin/env tsx
/**
 * Grant MARKETPLACE_ROLE to Marketplace Contract
 * 
 * This script grants the MARKETPLACE_ROLE to the marketplace contract
 * so it can interact with assets in the registry.
 * 
 * Usage:
 *   cd smart-contracts
 *   bun hardhat run scripts/grant-marketplace-role.ts --network sepolia
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers, network } = hre;
import fs from 'fs';
import path from 'path';

const DEPLOYED_ADDRESSES_FILE = path.join(__dirname, '../deployed-addresses-proxy.json');

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   GRANT MARKETPLACE_ROLE TO MARKETPLACE                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Load deployed addresses
  const deployed = JSON.parse(fs.readFileSync(DEPLOYED_ADDRESSES_FILE, 'utf-8'));
  const registryAddress = deployed.addresses.RWAAssetRegistry;
  const marketplaceAddress = deployed.addresses.RWAMarketplace;
  
  if (!registryAddress || !marketplaceAddress) {
    throw new Error('Required contract addresses not found');
  }
  
  console.log(`📋 Contract Addresses:`);
  console.log(`   Registry: ${registryAddress}`);
  console.log(`   Marketplace: ${marketplaceAddress}\n`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`   Deployer: ${deployer.address}\n`);
  
  // Load ABI
  const registryAbiPath = path.join(__dirname, '../abis/sepolia/RWAAssetRegistry.json');
  let registryABI: any[] = [];
  
  if (fs.existsSync(registryAbiPath)) {
    const abiData = JSON.parse(fs.readFileSync(registryAbiPath, 'utf-8'));
    registryABI = abiData.abi || abiData;
  } else {
    // Fallback minimal ABI
    registryABI = [
      'function grantRole(bytes32 role, address account)',
      'function hasRole(bytes32 role, address account) view returns (bool)',
      'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
    ];
  }
  
  const registry = await ethers.getContractAt(registryABI, registryAddress);
  
  // Compute role hash
  const MARKETPLACE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MARKETPLACE_ROLE"));
  
  // Check if marketplace already has the role
  const hasRole = await registry.hasRole(MARKETPLACE_ROLE, marketplaceAddress);
  
  if (hasRole) {
    console.log(`✅ Marketplace already has MARKETPLACE_ROLE\n`);
    return;
  }
  
  // Check if deployer has admin role
  const DEFAULT_ADMIN_ROLE = await registry.DEFAULT_ADMIN_ROLE();
  const deployerHasAdmin = await registry.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  
  if (!deployerHasAdmin) {
    throw new Error(`Deployer ${deployer.address} does not have DEFAULT_ADMIN_ROLE`);
  }
  
  console.log(`🔐 Granting MARKETPLACE_ROLE to marketplace...`);
  const tx = await registry.grantRole(MARKETPLACE_ROLE, marketplaceAddress);
  console.log(`   Transaction: ${tx.hash}`);
  
  const receipt = await tx.wait();
  console.log(`   ✅ Role granted in block ${receipt.blockNumber}\n`);
  
  // Verify
  const verified = await registry.hasRole(MARKETPLACE_ROLE, marketplaceAddress);
  if (verified) {
    console.log(`✅ Verification: Marketplace now has MARKETPLACE_ROLE\n`);
  } else {
    console.log(`❌ Verification failed: Marketplace does not have MARKETPLACE_ROLE\n`);
  }
  
  console.log('🎉 Setup complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });

