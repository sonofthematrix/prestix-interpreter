#!/usr/bin/env tsx
/**
 * Diagnose Marketplace Issue
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;
import fs from 'fs';
import path from 'path';

const DEPLOYED_ADDRESSES_FILE = path.join(__dirname, '../deployed-addresses-proxy.json');

async function main() {
  const deployed = JSON.parse(fs.readFileSync(DEPLOYED_ADDRESSES_FILE, 'utf-8'));
  const registryAddress = deployed.addresses.RWAAssetRegistry;
  const marketplaceAddress = deployed.addresses.RWAMarketplace;
  
  const registryAbiPath = path.join(__dirname, '../abis/sepolia/RWAAssetRegistry.json');
  const marketplaceAbiPath = path.join(__dirname, '../abis/sepolia/RWAMarketplace.json');
  
  const registryABI = JSON.parse(fs.readFileSync(registryAbiPath, 'utf-8')).abi;
  const marketplaceABI = JSON.parse(fs.readFileSync(marketplaceAbiPath, 'utf-8')).abi;
  
  const registry = await ethers.getContractAt(registryABI, registryAddress);
  const marketplace = await ethers.getContractAt(marketplaceABI, marketplaceAddress);
  
  // Check what registry the marketplace is using
  const marketplaceRegistry = await marketplace.assetRegistry();
  console.log('Marketplace registry:', marketplaceRegistry);
  console.log('Expected registry:', registryAddress);
  console.log('Match:', marketplaceRegistry.toLowerCase() === registryAddress.toLowerCase());
  console.log('');
  
  // Check asset IDs 1-4
  console.log('Checking assets in registry:');
  for (let i = 1; i <= 4; i++) {
    try {
      const asset = await registry.getAsset(i);
      console.log(`Asset ${i}: ${asset.title}, Status: ${asset.status}, Owner: ${asset.owner}`);
    } catch (e: any) {
      console.log(`Asset ${i}: Not found (${e.message})`);
    }
  }
  console.log('');
  
  // Try marketplace calculatePurchaseCost for each asset
  console.log('Testing marketplace.calculatePurchaseCost:');
  for (let i = 1; i <= 4; i++) {
    try {
      const [cost, fee] = await marketplace.calculatePurchaseCost(i, 1);
      console.log(`Asset ${i}: Cost = ${ethers.formatEther(cost)} ETH, Fee = ${ethers.formatEther(fee)} ETH`);
    } catch (e: any) {
      console.log(`Asset ${i}: Error - ${e.message}`);
    }
  }
}

main().catch(console.error);

