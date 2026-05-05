#!/usr/bin/env tsx
/**
 * Verify Assets Visible in Frontend
 * 
 * This script verifies that registered assets are properly configured
 * and can be queried for frontend display.
 * 
 * Usage:
 *   cd smart-contracts
 *   bun run tsx scripts/verify-frontend-assets.ts
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
  console.log('║   VERIFY ASSETS FOR FRONTEND DISPLAY                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const network = await hre.network;
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.config.chainId})\n`);

  const deployed = loadDeployedAddresses();
  const results = loadRegistrationResults();

  if (!deployed || !deployed.addresses) {
    throw new Error('Deployed addresses not found');
  }
  if (!results || !results.results || results.results.length === 0) {
    throw new Error('No registration results found');
  }

  const registryAddress = deployed.addresses.RWAAssetRegistry;
  const marketplaceAddress = deployed.addresses.RWAMarketplace;
  const priceOracleAddress = '0x2dF640767e42136809Fa0Ee787F24A2b92191B02'; // ChainlinkPriceOracle

  console.log(`📋 Contract Addresses:`);
  console.log(`   Registry: ${registryAddress}`);
  console.log(`   Marketplace: ${marketplaceAddress}`);
  console.log(`   Price Oracle: ${priceOracleAddress}\n`);

  const REGISTRY_ABI = [
    'function getAsset(uint256 assetId) view returns (tuple(uint256 id, address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens, uint256 availableTokens, uint256 soldTokens, uint8 status, uint256 createdAt, uint256 updatedAt))',
  ];
  const MARKETPLACE_ABI = [
    'function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
    'function calculatePurchaseCostInPaymentToken(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
    'function paymentToken() view returns (address)',
    'function getPriceOracle() view returns (address)',
  ];

  const registry = await ethers.getContractAt(REGISTRY_ABI, registryAddress);
  const marketplace = await ethers.getContractAt(MARKETPLACE_ABI, marketplaceAddress);

  // Get registered assets from results
  const registeredAssetIds = results.results
    .filter((r: any) => r.success)
    .map((r: any) => r.assetId);
  
  console.log(`🔍 Verifying ${registeredAssetIds.length} registered assets...\n`);

  // Verify each registered asset
  console.log(`📊 Asset Verification:\n`);
  const frontendData: any[] = [];

  for (const result of results.results) {
    if (!result.success) continue;

    const assetId = result.assetId;
    try {
      const asset = await registry.getAsset(assetId);
      const statusValue = Number(asset.status);
      const statusText = statusValue === 1 ? 'ACTIVE' : statusValue === 0 ? 'INACTIVE' : statusValue === 2 ? 'SOLD_OUT' : 'PAUSED';

      // Calculate costs
      const [costEth, feeEth] = await marketplace.calculatePurchaseCost(assetId, 1);
      
      let costUsdc = '0';
      let costEurc = '0';
      try {
        const [costUsdcBigInt, feeUsdcBigInt] = await marketplace.calculatePurchaseCostInPaymentToken(assetId, 1);
        costUsdc = ethers.formatUnits(costUsdcBigInt, 6);
      } catch {
        costUsdc = 'N/A';
      }

      const assetData = {
        assetId: assetId.toString(),
        propertyId: result.propertyId,
        title: asset.title,
        description: asset.description,
        assetType: asset.assetType,
        location: asset.location,
        status: statusText,
        price: {
          eth: ethers.formatEther(asset.price),
          usd: (parseFloat(ethers.formatEther(asset.price)) * 2843.82).toFixed(2), // Approximate
        },
        tokenPrice: {
          eth: ethers.formatEther(asset.tokenPrice),
          usd: (parseFloat(ethers.formatEther(asset.tokenPrice)) * 2843.82).toFixed(6),
        },
        tokens: {
          total: asset.totalTokens.toString(),
          available: asset.availableTokens.toString(),
          sold: asset.soldTokens.toString(),
        },
        purchaseCost: {
          eth: ethers.formatEther(costEth),
          usdc: costUsdc,
        },
        tokenAddress: result.tokenAddress,
        owner: asset.owner,
      };

      frontendData.push(assetData);

      console.log(`   ✅ Asset ${assetId}: ${asset.title}`);
      console.log(`      Status: ${statusText}`);
      console.log(`      Available Tokens: ${asset.availableTokens.toString()}`);
      console.log(`      Token Price: ${ethers.formatEther(asset.tokenPrice)} ETH`);
      console.log(`      Purchase Cost (1 token): ${ethers.formatEther(costEth)} ETH / ${costUsdc} USDC`);
      console.log(`      Token Contract: ${result.tokenAddress}\n`);
    } catch (error: any) {
      console.log(`   ❌ Asset ${assetId}: ${error.message}\n`);
    }
  }

  // Save frontend data
  const frontendDataFile = path.join(__dirname, '../frontend-assets-data.json');
  fs.writeFileSync(frontendDataFile, JSON.stringify(frontendData, null, 2));
  console.log(`💾 Frontend data saved to: ${frontendDataFile}\n`);

  // Verify marketplace configuration
  console.log(`🔧 Marketplace Configuration:`);
  const paymentToken = await marketplace.paymentToken();
  const oracle = await marketplace.getPriceOracle();
  console.log(`   Payment Token: ${paymentToken}`);
  console.log(`   Price Oracle: ${oracle}`);
  console.log(`   Oracle Match: ${oracle.toLowerCase() === priceOracleAddress.toLowerCase() ? '✅' : '❌'}\n`);

  console.log('✅ Frontend verification complete!\n');
  console.log(`📝 Frontend Integration:`);
  console.log(`   1. Use contract addresses from deployed-addresses-proxy.json`);
  console.log(`   2. Query assets using RWAAssetRegistry.getAsset(assetId)`);
  console.log(`   3. Calculate costs using RWAMarketplace.calculatePurchaseCostInPaymentToken()`);
  console.log(`   4. Display assets from frontend-assets-data.json\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });

