#!/usr/bin/env tsx
/**
 * Test Token Purchase on Marketplace
 * 
 * This script tests purchasing tokens from the marketplace using ETH.
 * 
 * Usage:
 *   cd smart-contracts
 *   bun hardhat run scripts/test-token-purchase.ts --network sepolia [assetId] [tokenAmount]
 * 
 * Example:
 *   bun hardhat run scripts/test-token-purchase.ts --network sepolia 3 10
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
  console.log('║   TEST TOKEN PURCHASE ON MARKETPLACE                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const deployed = loadDeployedAddresses();
  const results = loadRegistrationResults();
  
  if (!deployed || !deployed.addresses) {
    throw new Error('Deployed addresses not found. Please deploy contracts first.');
  }
  
  const marketplaceAddress = deployed.addresses.RWAMarketplace;
  const registryAddress = deployed.addresses.RWAAssetRegistry;
  
  if (!marketplaceAddress || !registryAddress) {
    throw new Error('Required contract addresses not found.');
  }
  
  // Get asset ID and token amount from environment variables or args
  // Hardhat doesn't pass positional args directly, so we use env vars
  const assetId = process.env.ASSET_ID ? parseInt(process.env.ASSET_ID) : 
                  (process.argv[2] ? parseInt(process.argv[2]) : null);
  const tokenAmount = process.env.TOKEN_AMOUNT ? parseInt(process.env.TOKEN_AMOUNT) :
                      (process.argv[3] ? parseInt(process.argv[3]) : 1);
  
  // If no asset ID provided, show available assets
  if (!assetId && results && results.results) {
    console.log('📋 Available Assets:\n');
    for (const result of results.results) {
      if (result.success) {
        console.log(`   Asset ID ${result.assetId}: ${result.propertyId}`);
        console.log(`   Token: ${result.tokenAddress}\n`);
      }
    }
    console.log('💡 Usage: bun hardhat run scripts/test-token-purchase.ts --network sepolia [assetId] [tokenAmount]');
    console.log('   Example: bun hardhat run scripts/test-token-purchase.ts --network sepolia 3 10\n');
    return;
  }
  
  if (!assetId) {
    throw new Error('Asset ID required. Run without arguments to see available assets.');
  }
  
  const [buyer] = await ethers.getSigners();
  console.log(`📋 Configuration:`);
  console.log(`   Buyer: ${buyer.address}`);
  console.log(`   Asset ID: ${assetId}`);
  console.log(`   Token Amount: ${tokenAmount}`);
  console.log(`   Marketplace: ${marketplaceAddress}\n`);
  
  // Check buyer balance
  const balance = await ethers.provider.getBalance(buyer.address);
  console.log(`💰 Buyer Balance: ${ethers.formatEther(balance)} ETH\n`);
  
  // Load ABIs
  const marketplaceAbiPath = path.join(__dirname, '../abis/sepolia/RWAMarketplace.json');
  const registryAbiPath = path.join(__dirname, '../abis/sepolia/RWAAssetRegistry.json');
  
  let marketplaceABI: any[];
  let registryABI: any[];
  
  try {
    marketplaceABI = JSON.parse(fs.readFileSync(marketplaceAbiPath, 'utf-8')).abi;
  } catch {
    marketplaceABI = [
      'function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
      'function purchaseTokens(uint256 assetId, uint256 tokenAmount) payable',
      'function assetRegistry() view returns (address)',
    ];
  }
  
  try {
    registryABI = JSON.parse(fs.readFileSync(registryAbiPath, 'utf-8')).abi;
  } catch {
    registryABI = [
      'function getAsset(uint256 assetId) view returns (tuple(uint256 id, address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens, uint256 availableTokens, uint256 soldTokens, uint8 status, uint256 createdAt, uint256 updatedAt))',
    ];
  }
  
  const marketplace = await ethers.getContractAt(marketplaceABI, marketplaceAddress);
  const registry = await ethers.getContractAt(registryABI, registryAddress);
  
  // Get asset details
  console.log(`🔍 Fetching asset details...`);
  const asset = await registry.getAsset(assetId);
  const statusValue = Number(asset.status);
  const statusText = statusValue === 1 ? 'ACTIVE' : statusValue === 0 ? 'INACTIVE' : statusValue === 2 ? 'SOLD_OUT' : 'PAUSED';
  
  console.log(`   Title: ${asset.title}`);
  console.log(`   Status: ${statusValue} (${statusText})`);
  console.log(`   Available Tokens: ${asset.availableTokens.toString()}`);
  console.log(`   Token Price: ${ethers.formatEther(asset.tokenPrice)} ETH\n`);
  
  if (statusValue !== 1) {
    throw new Error(`Asset ${assetId} is not ACTIVE (status: ${statusValue} - ${statusText})`);
  }
  
  if (BigInt(asset.availableTokens) < BigInt(tokenAmount)) {
    throw new Error(`Insufficient tokens available. Requested: ${tokenAmount}, Available: ${asset.availableTokens}`);
  }
  
  // Calculate purchase cost
  console.log(`💵 Calculating purchase cost...`);
  const [totalCost, marketplaceFee] = await marketplace.calculatePurchaseCost(assetId, tokenAmount);
  console.log(`   Total Cost: ${ethers.formatEther(totalCost)} ETH`);
  console.log(`   Marketplace Fee: ${ethers.formatEther(marketplaceFee)} ETH`);
  console.log(`   Net to Asset: ${ethers.formatEther(totalCost - marketplaceFee)} ETH\n`);
  
  if (balance < totalCost) {
    throw new Error(`Insufficient balance. Required: ${ethers.formatEther(totalCost)} ETH, Have: ${ethers.formatEther(balance)} ETH`);
  }
  
  // Confirm purchase
  console.log(`🛒 Purchasing ${tokenAmount} token(s) from asset ${assetId}...`);
  console.log(`   This will cost ${ethers.formatEther(totalCost)} ETH\n`);
  
  try {
    const tx = await marketplace.purchaseTokens(assetId, tokenAmount, { value: totalCost });
    console.log(`   Transaction: ${tx.hash}`);
    console.log(`   Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ Purchase confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}\n`);
    
    // Check token balance (if token contract exists)
    const tokenAddress = results?.results?.find((r: any) => r.assetId === assetId)?.tokenAddress;
    if (tokenAddress) {
      try {
        const tokenABI = ['function balanceOf(address account) view returns (uint256)'];
        const token = await ethers.getContractAt(tokenABI, tokenAddress);
        const code = await ethers.provider.getCode(tokenAddress);
        if (code !== '0x') {
          const tokenBalance = await token.balanceOf(buyer.address);
          console.log(`📊 Post-Purchase Status:`);
          console.log(`   Token Balance: ${ethers.formatEther(tokenBalance)} tokens`);
        }
      } catch (error: any) {
        // Token contract might not be fully deployed yet - this is okay
        console.log(`📊 Post-Purchase Status:`);
        console.log(`   ⚠️  Token balance check skipped (token contract may not be fully deployed)`);
      }
      console.log(`   Buyer ETH Balance: ${ethers.formatEther(await ethers.provider.getBalance(buyer.address))} ETH\n`);
    }
    
    console.log('🎉 Purchase successful!\n');
    console.log(`📝 View transaction on Etherscan:`);
    console.log(`   https://sepolia.etherscan.io/tx/${tx.hash}\n`);
    
  } catch (error: any) {
    console.error(`\n❌ Purchase failed: ${error.message}`);
    if (error.reason) {
      console.error(`   Reason: ${error.reason}`);
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

