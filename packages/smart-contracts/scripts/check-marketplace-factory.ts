#!/usr/bin/env tsx

/**
 * Check Marketplace Factory Configuration
 *
 * This script checks what factory addresses the marketplace is currently using.
 */

import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🔍 Checking marketplace factory configuration...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);

  // Load deployed addresses
  const addressesPath = path.join(__dirname, '../deployed-addresses-fresh.json');
  const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));

  const marketplaceAddress = addresses.marketplace?.proxy || addresses.marketplace;
  const newFactoryAddress = addresses.RWATokenFactory404.address;

  if (!marketplaceAddress) {
    throw new Error('Marketplace address not found');
  }

  console.log('Marketplace address:', marketplaceAddress);
  console.log('New factory address:', newFactoryAddress);
  console.log();

  // Load marketplace contract
  console.log('📝 Loading marketplace contract...');
  const RWAMarketplace = await ethers.getContractFactory('RWAMarketplaceFixedV2');
  const marketplace = RWAMarketplace.attach(marketplaceAddress);

  // Read the public variables
  console.log('🔍 Reading marketplace factory addresses...');
  try {
    const assetFactory = await marketplace.assetFactory();
    console.log('assetFactory (ERC20):', assetFactory);

    const assetFactory404 = await marketplace.assetFactory404();
    console.log('assetFactory404 (ERC404):', assetFactory404);

    console.log();
    console.log('Current configuration:');
    console.log('ERC20 Factory:', assetFactory);
    console.log('ERC404 Factory:', assetFactory404);
    console.log('New ERC404 Factory:', newFactoryAddress);

    if (assetFactory404.toLowerCase() === newFactoryAddress.toLowerCase()) {
      console.log('✅ Marketplace is already using the new factory');
    } else {
      console.log('❌ Marketplace is using old factory - needs update');
      console.log('Current:', assetFactory404);
      console.log('Needed:', newFactoryAddress);
    }
  } catch (error) {
    console.error('❌ Failed to read factory addresses:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });