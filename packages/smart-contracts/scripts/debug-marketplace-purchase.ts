#!/usr/bin/env tsx

/**
 * Debug Marketplace Purchase
 * 
 * Investigates why marketplace purchases are failing despite showing available tokens.
 * 
 * Usage:
 *   BUYER_WALLET_1=0x... BUYER_KEY_1=0x... ASSET_ID=1 bun run hardhat run scripts/debug-marketplace-purchase.ts --network sepolia
 */

import 'dotenv/config';
import { ethers } from 'hardhat';
import hre from 'hardhat';

const MARKETPLACE_ADDRESS = '0x0b6a1BFCEf896d004Edd376A798c57F2B797e307';
const REGISTRY_ADDRESS = '0x50f67C0632b74f78094623233aAFf7cc4666576F';

const MARKETPLACE_ABI = [
  'function getActiveListing(uint256 assetId) view returns (address seller, uint256 pricePerToken, uint256 availableTokens)',
  'function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
  'function purchaseTokens(uint256 assetId, uint256 tokenAmount) payable',
  'function getMarketplaceFee() view returns (uint256)',
] as const;

const REGISTRY_ABI = [
  'function getAvailableTokens(uint256 assetId) view returns (uint256)',
  'function getTokenPriceValue(uint256 assetId) view returns (uint256)',
  'function getAssetStatus(uint256 assetId) view returns (uint8)',
] as const;

async function main() {
  console.log('🔍 Debugging Marketplace Purchase');
  console.log('════════════════════════════════════════════════════════════\n');

  const assetId = parseInt(process.env.ASSET_ID || '1');
  const buyerWallet = process.env.BUYER_WALLET_1;
  const buyerKey = process.env.BUYER_KEY_1;

  if (!buyerWallet || !buyerKey) {
    console.error('❌ BUYER_WALLET_1 and BUYER_KEY_1 environment variables required');
    process.exit(1);
  }

  const provider = hre.ethers.provider;
  const buyerSigner = new ethers.Wallet(buyerKey, provider);
  const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
  const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);

  console.log(`Asset ID: ${assetId}`);
  console.log(`Buyer: ${buyerWallet}\n`);

  try {
    // Check marketplace listing
    console.log('📋 Checking marketplace listing...');
    const listing = await marketplace.getActiveListing(assetId);
    console.log(`   Seller: ${listing.seller}`);
    console.log(`   Price per token: ${ethers.formatEther(listing.pricePerToken)} ETH`);
    console.log(`   Available tokens: ${ethers.formatEther(listing.availableTokens)} tokens\n`);

    // Check registry asset data using helper functions
    console.log('📊 Checking registry asset data...');
    const [registryAvailable, tokenPrice, status] = await Promise.all([
      registry.getAvailableTokens(assetId),
      registry.getTokenPriceValue(assetId),
      registry.getAssetStatus(assetId),
    ]);
    console.log(`   Available tokens: ${ethers.formatEther(registryAvailable)} tokens`);
    console.log(`   Token price: ${ethers.formatEther(tokenPrice)} ETH`);
    console.log(`   Status: ${status} (1=ACTIVE, 2=SOLD_OUT, 3=PAUSED, 0=INACTIVE)\n`);

    // Compare available tokens
    const marketplaceAvailable = listing.availableTokens;
    
    console.log('🔍 Comparison:');
    console.log(`   Marketplace available: ${ethers.formatEther(marketplaceAvailable)} tokens`);
    console.log(`   Registry available: ${ethers.formatEther(registryAvailable)} tokens`);
    
    if (marketplaceAvailable !== registryAvailable) {
      console.log(`   ⚠️  MISMATCH: Marketplace and registry show different available tokens!`);
      const diff = marketplaceAvailable > registryAvailable 
        ? marketplaceAvailable - registryAvailable
        : registryAvailable - marketplaceAvailable;
      console.log(`   Difference: ${ethers.formatEther(diff)} tokens`);
    } else {
      console.log(`   ✅ Match: Both show same available tokens`);
    }
    console.log('');

    // Check marketplace fee
    console.log('💰 Checking marketplace fee...');
    const marketplaceFee = await marketplace.getMarketplaceFee();
    console.log(`   Fee: ${marketplaceFee.toString()} basis points (${Number(marketplaceFee) / 100}%)\n`);

    // Try to calculate purchase cost
    const testAmount = ethers.parseEther('10');
    console.log(`🧮 Calculating cost for ${ethers.formatEther(testAmount)} tokens...`);
    
    try {
      const [totalCost, fee] = await marketplace.calculatePurchaseCost(assetId, testAmount);
      console.log(`   Total cost: ${ethers.formatEther(totalCost)} ETH`);
      console.log(`   Marketplace fee: ${ethers.formatEther(fee)} ETH\n`);
    } catch (error: any) {
      console.log(`   ❌ Error calculating cost: ${error.message}\n`);
    }

    // Check buyer balance
    const buyerBalance = await provider.getBalance(buyerWallet);
    console.log(`💵 Buyer ETH balance: ${ethers.formatEther(buyerBalance)} ETH\n`);

    // Try a dry-run purchase (estimate gas)
    console.log('🧪 Attempting dry-run purchase (gas estimation)...');
    const marketplaceWithBuyer = marketplace.connect(buyerSigner);
    
    try {
      const gasEstimate = await marketplaceWithBuyer.purchaseTokens.estimateGas(
        assetId,
        testAmount,
        { value: ethers.parseEther('0.0001') } // Small test value
      );
      console.log(`   ✅ Gas estimate: ${gasEstimate.toString()}\n`);
    } catch (error: any) {
      console.log(`   ❌ Gas estimation failed: ${error.message}`);
      if (error.reason) {
        console.log(`      Reason: ${error.reason}`);
      }
      if (error.data) {
        console.log(`      Data: ${error.data}`);
      }
      console.log('');
    }

    // Check if seller has tokens
    if (listing.seller && listing.seller !== ethers.ZeroAddress) {
      console.log(`🔍 Checking seller token balance...`);
      
      // Get token address from factory
      const FIXED_FACTORY_ADDRESS = '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b';
      const FACTORY_ABI = ['function getTokenAddress(uint256 assetId) view returns (address)'];
      const factory = new ethers.Contract(FIXED_FACTORY_ADDRESS, FACTORY_ABI, provider);
      const tokenAddress = await factory.getTokenAddress(assetId);
      
      if (tokenAddress && tokenAddress !== ethers.ZeroAddress) {
        const TOKEN_ABI = ['function balanceOf(address) view returns (uint256)'];
        const token = new ethers.Contract(tokenAddress, TOKEN_ABI, provider);
        const sellerBalance = await token.balanceOf(listing.seller);
        console.log(`   Seller (${listing.seller}): ${ethers.formatEther(sellerBalance)} tokens\n`);
        
        if (sellerBalance < testAmount) {
          console.log(`   ⚠️  Seller doesn't have enough tokens for purchase!`);
        }
      }
    }

    // Check seller address validity
    console.log('🔍 Seller Address Analysis:');
    const sellerAddress = listing.seller;
    const isValidAddress = ethers.isAddress(sellerAddress) && sellerAddress !== ethers.ZeroAddress;
    console.log(`   Seller: ${sellerAddress}`);
    console.log(`   Valid address: ${isValidAddress ? '✅' : '❌'}`);
    
    if (!isValidAddress) {
      console.log(`   ⚠️  CORRUPTED SELLER ADDRESS! This is likely causing purchase failures.`);
      console.log(`   Expected: Valid Ethereum address (0x followed by 40 hex chars)`);
      console.log(`   Got: ${sellerAddress} (looks corrupted)\n`);
    } else {
      console.log(`   ✅ Seller address is valid\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Summary:');
    console.log(`   Marketplace available: ${ethers.formatEther(marketplaceAvailable)} tokens`);
    console.log(`   Registry available: ${ethers.formatEther(registryAvailable)} tokens`);
    console.log(`   Seller address valid: ${isValidAddress ? 'Yes' : 'No (CORRUPTED)'}`);
    console.log(`   Buyer balance: ${ethers.formatEther(buyerBalance)} ETH`);
    console.log(`   Purchase amount: ${ethers.formatEther(testAmount)} tokens`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.reason) {
      console.error(`   Reason: ${error.reason}`);
    }
    if (error.data) {
      console.error(`   Data: ${error.data}`);
    }
    console.error('\nStack:', error.stack);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
