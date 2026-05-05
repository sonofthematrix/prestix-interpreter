#!/usr/bin/env tsx
/**
 * Grant Factory Role to Marketplace
 * 
 * Grants TOKEN_MANAGER_ROLE to marketplace so it can mint tokens during purchases.
 * 
 * Usage:
 *   cd smart-contracts
 *   bun hardhat run scripts/grant-factory-role-to-marketplace.ts --network sepolia
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;
import fs from 'fs';
import path from 'path';

const DEPLOYED_ADDRESSES_FILE = path.join(__dirname, '../deployed-addresses-proxy.json');

function loadDeployedAddresses(): any {
  try {
    if (fs.existsSync(DEPLOYED_ADDRESSES_FILE)) {
      const data = fs.readFileSync(DEPLOYED_ADDRESSES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading deployed addresses:', error);
  }
  return null;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   GRANT TOKEN_MANAGER_ROLE TO MARKETPLACE                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const deployed = loadDeployedAddresses();
  if (!deployed || !deployed.addresses) {
    throw new Error('Deployed addresses not found.');
  }
  
  const factoryAddress = deployed.addresses.RWATokenFactory;
  const marketplaceAddress = deployed.addresses.RWAMarketplace;
  
  if (!factoryAddress || !marketplaceAddress) {
    throw new Error('Required contract addresses not found.');
  }
  
  console.log(`📋 Contract Addresses:`);
  console.log(`   Factory: ${factoryAddress}`);
  console.log(`   Marketplace: ${marketplaceAddress}\n`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`   Deployer: ${deployer.address}\n`);
  
  const FACTORY_ABI = [
    'function grantRole(bytes32 role, address account)',
    'function hasRole(bytes32 role, address account) view returns (bool)',
  ];
  
  const factory = await ethers.getContractAt(FACTORY_ABI, factoryAddress);
  
  const TOKEN_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TOKEN_MANAGER_ROLE"));
  
  console.log(`🔐 Checking role...`);
  const hasRole = await factory.hasRole(TOKEN_MANAGER_ROLE, marketplaceAddress);
  
  if (hasRole) {
    console.log(`   ✅ Marketplace already has TOKEN_MANAGER_ROLE\n`);
    return;
  }
  
  console.log(`🔐 Granting TOKEN_MANAGER_ROLE to marketplace...`);
  const tx = await factory.connect(deployer).grantRole(TOKEN_MANAGER_ROLE, marketplaceAddress);
  await tx.wait();
  console.log(`   Transaction: ${tx.hash}`);
  console.log(`   ✅ Role granted in block ${tx.blockNumber}\n`);
  
  // Verify
  const isGranted = await factory.hasRole(TOKEN_MANAGER_ROLE, marketplaceAddress);
  console.log(`✅ Verification: Marketplace now has TOKEN_MANAGER_ROLE: ${isGranted ? '✅' : '❌'}\n`);
  
  console.log('🎉 Setup complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Role granting failed:', error);
    process.exit(1);
  });

