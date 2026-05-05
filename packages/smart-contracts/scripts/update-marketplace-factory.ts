#!/usr/bin/env tsx

/**
 * Update Marketplace to Use New Factory
 *
 * This script updates the marketplace contract to use the newly deployed
 * RWATokenFactory404 with the fixed mintTokens function.
 */

import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🔄 Updating marketplace to use new RWATokenFactory404...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);

  // Load deployed addresses
  const addressesPath = path.join(__dirname, '../deployed-addresses-fresh.json');
  const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));

  const marketplaceAddress = addresses.marketplace?.proxy || addresses.marketplace;
  const newFactoryAddress = addresses.RWATokenFactory404.address;

  if (!marketplaceAddress) {
    throw new Error('Marketplace address not found in deployed-addresses-fresh.json');
  }

  if (!newFactoryAddress) {
    throw new Error('New factory address not found in deployed-addresses-fresh.json');
  }

  console.log('Marketplace address:', marketplaceAddress);
  console.log('New factory address:', newFactoryAddress);
  console.log();

  // Load marketplace contract
  console.log('📝 Loading marketplace contract...');
  const RWAMarketplace = await ethers.getContractFactory('RWAMarketplaceFixedV2');
  const marketplace = RWAMarketplace.attach(marketplaceAddress);

  // Check current factory address
  console.log('🔍 Checking current factory address...');
  const currentFactory = await marketplace.getTokenFactory404();
  console.log('Current factory:', currentFactory);
  console.log('New factory:', newFactoryAddress);

  if (currentFactory.toLowerCase() === newFactoryAddress.toLowerCase()) {
    console.log('✅ Marketplace already uses the new factory');
    return;
  }

  // Update factory address
  console.log('🔄 Updating marketplace to use new factory...');
  const tx = await marketplace.setTokenFactory404(newFactoryAddress);
  console.log('⏳ Transaction submitted:', tx.hash);

  await tx.wait();
  console.log('✅ Factory address updated successfully');

  // Verify the update
  const updatedFactory = await marketplace.getTokenFactory404();
  if (updatedFactory.toLowerCase() !== newFactoryAddress.toLowerCase()) {
    throw new Error('Factory address update verification failed');
  }

  console.log('✅ Factory address verified');

  // Grant TOKEN_CREATOR_ROLE to marketplace on new factory
  console.log('🔐 Granting TOKEN_CREATOR_ROLE to marketplace...');
  const RWATokenFactory404 = await ethers.getContractFactory('RWATokenFactory404');
  const factory = RWATokenFactory404.attach(newFactoryAddress);

  const TOKEN_CREATOR_ROLE = await factory.TOKEN_CREATOR_ROLE();
  const tx2 = await factory.grantRole(TOKEN_CREATOR_ROLE, marketplaceAddress);
  console.log('⏳ Role grant transaction submitted:', tx2.hash);

  await tx2.wait();
  console.log('✅ TOKEN_CREATOR_ROLE granted to marketplace');

  // Verify role assignment
  const hasRole = await factory.hasRole(TOKEN_CREATOR_ROLE, marketplaceAddress);
  if (!hasRole) {
    throw new Error('Role assignment verification failed');
  }

  console.log('✅ Role assignment verified');

  console.log('\n🎉 Marketplace factory update completed successfully!');
  console.log('Marketplace address:', marketplaceAddress);
  console.log('New factory address:', newFactoryAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Update failed:', error);
    process.exit(1);
  });