#!/usr/bin/env tsx
/**
 * Activate Assets for Trading
 * 
 * This script activates registered assets so they can be purchased on the marketplace.
 * 
 * Usage:
 *   cd smart-contracts
 *   bun hardhat run scripts/activate-assets.ts --network sepolia [assetId1] [assetId2] ...
 * 
 * Or activate all assets from registration results:
 *   bun hardhat run scripts/activate-assets.ts --network sepolia
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;
import fs from 'fs';
import path from 'path';

const DEPLOYED_ADDRESSES_FILE = path.join(__dirname, '../deployed-addresses-proxy.json');
const RESULTS_FILE = path.join(__dirname, '../seed-assets-registration-results.json');

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

function loadRegistrationResults(): any {
  try {
    if (fs.existsSync(RESULTS_FILE)) {
      const data = fs.readFileSync(RESULTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading registration results:', error);
  }
  return null;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   ACTIVATE ASSETS FOR TRADING                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const deployed = loadDeployedAddresses();
  const results = loadRegistrationResults();
  
  if (!deployed || !deployed.addresses) {
    throw new Error('Deployed addresses not found.');
  }
  
  const registryAddress = deployed.addresses.RWAAssetRegistry;
  if (!registryAddress) {
    throw new Error('RWAAssetRegistry address not found.');
  }
  
  // Get asset IDs from env vars or args, or use all from results
  let assetIds: number[] = [];
  
  // Try environment variables first
  if (process.env.ASSET_IDS) {
    assetIds = process.env.ASSET_IDS.split(',').map(id => parseInt(id.trim()));
  } else if (process.argv.length > 2) {
    // Try to parse from process.argv (may not work with Hardhat)
    assetIds = process.argv.slice(2).map(arg => parseInt(arg)).filter(id => !isNaN(id));
  }
  
  // If no asset IDs provided, use all from registration results
  if (assetIds.length === 0 && results && results.results) {
    assetIds = results.results
      .filter((r: any) => r.success)
      .map((r: any) => r.assetId);
  }
  
  if (assetIds.length === 0) {
    console.log('📋 Available Assets:\n');
    if (results && results.results) {
      for (const result of results.results) {
        if (result.success) {
          console.log(`   Asset ID ${result.assetId}: ${result.propertyId}`);
        }
      }
    }
    console.log('\n💡 Usage: ASSET_IDS=3,4 bun hardhat run scripts/activate-assets.ts --network sepolia');
    console.log('   Or: bun hardhat run scripts/activate-assets.ts --network sepolia (activates all)\n');
    return;
  }
  
  const [deployer] = await ethers.getSigners();
  console.log(`📋 Configuration:`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Registry: ${registryAddress}`);
  console.log(`   Assets to activate: ${assetIds.join(', ')}\n`);
  
  // Load ABI
  const registryAbiPath = path.join(__dirname, '../abis/sepolia/RWAAssetRegistry.json');
  let registryABI: any[];
  
  try {
    registryABI = JSON.parse(fs.readFileSync(registryAbiPath, 'utf-8')).abi;
  } catch {
    registryABI = [
      'function getAsset(uint256 assetId) view returns (tuple(uint256 id, address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens, uint256 availableTokens, uint256 soldTokens, uint8 status, uint256 createdAt, uint256 updatedAt))',
      'function updateAssetStatus(uint256 assetId, uint8 newStatus)',
      'function hasRole(bytes32 role, address account) view returns (bool)',
    ];
  }
  
  const registry = await ethers.getContractAt(registryABI, registryAddress);
  
  // Check permissions
  const ASSET_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ASSET_MANAGER_ROLE"));
  const hasRole = await registry.hasRole(ASSET_MANAGER_ROLE, deployer.address);
  
  if (!hasRole) {
    throw new Error(`Deployer ${deployer.address} does not have ASSET_MANAGER_ROLE`);
  }
  
  console.log(`✅ Deployer has ASSET_MANAGER_ROLE\n`);
  
  // Check and activate each asset
  let activated = 0;
  let alreadyActive = 0;
  let failed = 0;
  
  for (const assetId of assetIds) {
    try {
      console.log(`[Asset ID ${assetId}]`);
      
      // Get current asset status
      const asset = await registry.getAsset(assetId);
      console.log(`   Title: ${asset.title}`);
      console.log(`   Current Status: ${asset.status} (${asset.status === 1 ? 'ACTIVE' : asset.status === 0 ? 'INACTIVE' : asset.status === 2 ? 'SOLD_OUT' : 'PAUSED'})`);
      console.log(`   Owner: ${asset.owner}`);
      
      if (asset.status === 1) {
        console.log(`   ✅ Already ACTIVE - skipping\n`);
        alreadyActive++;
        continue;
      }
      
      // Activate asset (status = 1)
      console.log(`   → Activating asset...`);
      const tx = await registry.updateAssetStatus(assetId, 1);
      console.log(`   Transaction: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Activated in block ${receipt.blockNumber}`);
      
      // Verify
      const updatedAsset = await registry.getAsset(assetId);
      if (updatedAsset.status === 1) {
        console.log(`   ✅ Verified: Asset is now ACTIVE\n`);
        activated++;
      } else {
        console.log(`   ⚠️  Status update may have failed (status: ${updatedAsset.status})\n`);
        failed++;
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}\n`);
      failed++;
    }
  }
  
  console.log('======================================================================');
  console.log('📊 ACTIVATION SUMMARY');
  console.log('======================================================================\n');
  console.log(`✅ Activated: ${activated}`);
  console.log(`⏩ Already Active: ${alreadyActive}`);
  console.log(`❌ Failed: ${failed}\n`);
  
  if (activated > 0) {
    console.log('🎉 Assets activated! They can now be purchased on the marketplace.\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Activation failed:', error);
    process.exit(1);
  });

