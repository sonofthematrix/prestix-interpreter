#!/usr/bin/env tsx
/**
 * Test Token Purchase with USDC/EURC on Marketplace
 * 
 * This script tests purchasing tokens using USDC or EURC payment tokens.
 * 
 * Usage:
 *   cd smart-contracts
 *   ASSET_ID=<id> TOKEN_AMOUNT=<amount> PAYMENT_TOKEN=USDC bun hardhat run scripts/test-purchase-usdc-eurc.ts --network sepolia
 *   ASSET_ID=<id> TOKEN_AMOUNT=<amount> PAYMENT_TOKEN=EURC bun hardhat run scripts/test-purchase-usdc-eurc.ts --network sepolia
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;
import fs from 'fs';
import path from 'path';

const DEPLOYED_ADDRESSES_FILE = path.join(__dirname, '../deployed-addresses-proxy.json');
const RESULTS_FILE = path.join(__dirname, '../seed-assets-registration-results.json');

// Sepolia payment token addresses
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const EURC_ADDRESS = process.env.NEXT_PUBLIC_EURC_ADDRESS || '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4';

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
  console.log('║   TEST TOKEN PURCHASE WITH USDC/EURC                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const deployed = loadDeployedAddresses();
  const results = loadRegistrationResults();

  if (!deployed || !deployed.addresses) {
    throw new Error('Deployed addresses not found. Please deploy contracts first.');
  }

  const marketplaceAddress = deployed.addresses.RWAMarketplace;
  const registryAddress = deployed.addresses.RWAAssetRegistry;

  if (!marketplaceAddress || !registryAddress) {
    throw new Error('Required contract addresses not found');
  }

  // Get parameters
  const assetId = process.env.ASSET_ID ? parseInt(process.env.ASSET_ID) : null;
  const tokenAmount = process.env.TOKEN_AMOUNT ? parseInt(process.env.TOKEN_AMOUNT) : 1;
  const paymentTokenType = (process.env.PAYMENT_TOKEN || 'USDC').toUpperCase();

  if (!assetId) {
    console.log('📋 Available Assets:\n');
    if (results && results.results) {
      results.results.forEach((r: any) => {
        console.log(`   Asset ID ${r.assetId}: ${r.propertyId}`);
      });
    }
    console.log('\n⚠️  Please provide ASSET_ID environment variable');
    console.log('   Example: ASSET_ID=5 TOKEN_AMOUNT=10 PAYMENT_TOKEN=USDC bun hardhat run scripts/test-purchase-usdc-eurc.ts --network sepolia\n');
    process.exit(1);
  }

  const paymentTokenAddress = paymentTokenType === 'USDC' ? USDC_ADDRESS : EURC_ADDRESS;

  console.log(`📋 Configuration:`);
  console.log(`   Asset ID: ${assetId}`);
  console.log(`   Token Amount: ${tokenAmount}`);
  console.log(`   Payment Token: ${paymentTokenType} (${paymentTokenAddress})`);
  console.log(`   Marketplace: ${marketplaceAddress}\n`);

  const [buyer] = await ethers.getSigners();
  console.log(`👤 Buyer: ${buyer.address}\n`);

  // Load ABIs
  const REGISTRY_ABI = [
    'function getAsset(uint256 assetId) view returns (tuple(uint256 id, address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens, uint256 availableTokens, uint256 soldTokens, uint8 status, uint256 createdAt, uint256 updatedAt))',
  ];

  const MARKETPLACE_ABI = [
    'function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
    'function calculatePurchaseCostInPaymentToken(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
    'function purchaseTokens(uint256 assetId, uint256 tokenAmount) payable',
    'function purchaseTokensWithERC20(uint256 assetId, uint256 tokenAmount)',
    'function paymentToken() view returns (address)',
    'function getPriceOracle() view returns (address)',
  ];

  const ERC20_ABI = [
    'function balanceOf(address account) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
  ];

  const registry = await ethers.getContractAt(REGISTRY_ABI, registryAddress);
  const marketplace = await ethers.getContractAt(MARKETPLACE_ABI, marketplaceAddress);
  const paymentToken = await ethers.getContractAt(ERC20_ABI, paymentTokenAddress);

  // Check asset status
  console.log(`🔍 Fetching asset details...`);
  const asset = await registry.getAsset(assetId);
  const statusValue = Number(asset.status);
  const statusText = statusValue === 1 ? 'ACTIVE' : statusValue === 0 ? 'INACTIVE' : statusValue === 2 ? 'SOLD_OUT' : 'PAUSED';
  
  console.log(`   Title: ${asset.title}`);
  console.log(`   Status: ${statusText}`);
  console.log(`   Available Tokens: ${asset.availableTokens.toString()}`);
  console.log(`   Token Price: ${ethers.formatEther(asset.tokenPrice)} ETH\n`);
  
  if (statusValue !== 1) {
    throw new Error(`Asset ${assetId} is not ACTIVE (status: ${statusText})`);
  }

  // Get token info first
  const tokenDecimals = await paymentToken.decimals();
  const tokenSymbol = await paymentToken.symbol();
  
  // Calculate purchase cost in ETH
  const [totalCostEth, marketplaceFeeEth] = await marketplace.calculatePurchaseCost(assetId, tokenAmount);
  
  // Try to get cost in payment token (if oracle is configured)
  let totalCostInPaymentToken: bigint;
  let marketplaceFeeInPaymentToken: bigint;
  
  try {
    const costInPaymentToken = await marketplace.calculatePurchaseCostInPaymentToken(assetId, tokenAmount);
    totalCostInPaymentToken = costInPaymentToken[0];
    marketplaceFeeInPaymentToken = costInPaymentToken[1];
    console.log(`💰 Purchase Cost (using price oracle):`);
  } catch (error: any) {
    // Fallback if function doesn't exist or oracle not set
    console.log(`💰 Purchase Cost (fallback conversion):`);
    totalCostInPaymentToken = totalCostEth / 10n**12n; // Convert 18 decimals to 6 decimals
    marketplaceFeeInPaymentToken = marketplaceFeeEth / 10n**12n;
  }
  
  console.log(`   Total Cost: ${ethers.formatEther(totalCostEth)} ETH`);
  console.log(`   Total Cost: ${ethers.formatUnits(totalCostInPaymentToken, tokenDecimals)} ${tokenSymbol}`);
  console.log(`   Marketplace Fee: ${ethers.formatEther(marketplaceFeeEth)} ETH`);
  console.log(`   Marketplace Fee: ${ethers.formatUnits(marketplaceFeeInPaymentToken, tokenDecimals)} ${tokenSymbol}\n`);

  // Check payment token configuration
  const configuredPaymentToken = await marketplace.paymentToken();
  console.log(`💳 Payment Token Configuration:`);
  console.log(`   Marketplace Payment Token: ${configuredPaymentToken}`);
  console.log(`   Requested Payment Token: ${paymentTokenAddress}\n`);

  if (configuredPaymentToken.toLowerCase() !== paymentTokenAddress.toLowerCase()) {
    console.log(`⚠️  Warning: Marketplace payment token doesn't match requested token`);
    console.log(`   The marketplace may need to be configured with ${paymentTokenType} address\n`);
  }

  // Check buyer's token balance and allowance
  const buyerBalance = await paymentToken.balanceOf(buyer.address);
  const buyerAllowance = await paymentToken.allowance(buyer.address, marketplaceAddress);

  console.log(`💵 Buyer ${paymentTokenType} Balance:`);
  console.log(`   Balance: ${ethers.formatUnits(buyerBalance, tokenDecimals)} ${tokenSymbol}`);
  console.log(`   Required: ${ethers.formatUnits(totalCostInPaymentToken, tokenDecimals)} ${tokenSymbol}`);
  console.log(`   Allowance: ${ethers.formatUnits(buyerAllowance, tokenDecimals)} ${tokenSymbol}\n`);

  if (buyerBalance < totalCostInPaymentToken) {
    throw new Error(`Insufficient ${paymentTokenType} balance. Need ${ethers.formatUnits(totalCostInPaymentToken, tokenDecimals)} ${tokenSymbol}, have ${ethers.formatUnits(buyerBalance, tokenDecimals)} ${tokenSymbol}`);
  }

  // Approve if needed
  if (buyerAllowance < totalCostInPaymentToken) {
    console.log(`🔐 Approving marketplace to spend ${paymentTokenType}...`);
    const approveTx = await paymentToken.approve(marketplaceAddress, totalCostInPaymentToken);
    await approveTx.wait();
    console.log(`   ✅ Approved: ${approveTx.hash}\n`);
  }

  // Check if marketplace supports ERC20 payments
  try {
    // Try to call purchaseTokensWithERC20
    console.log(`🛒 Purchasing ${tokenAmount} token(s) with ${paymentTokenType}...`);
    const purchaseTx = await marketplace.purchaseTokensWithERC20(assetId, tokenAmount);
    console.log(`   Transaction: ${purchaseTx.hash}`);
    const receipt = await purchaseTx.wait();
    console.log(`   ✅ Purchase successful in block ${receipt.blockNumber}\n`);

    // Verify purchase
    const updatedAsset = await registry.getAsset(assetId);
    console.log(`📊 Post-Purchase Status:`);
    console.log(`   Available Tokens: ${updatedAsset.availableTokens.toString()}`);
    console.log(`   Sold Tokens: ${updatedAsset.soldTokens.toString()}\n`);

  } catch (error: any) {
    if (error.message.includes('purchaseTokensWithERC20') || error.message.includes('not found')) {
      console.log(`❌ Error: Marketplace doesn't support ERC20 payments yet`);
      console.log(`   The marketplace contract needs to be upgraded with purchaseTokensWithERC20 function\n`);
      console.log(`💡 Alternative: Use ETH payment instead:`);
      console.log(`   bun hardhat run scripts/test-token-purchase.ts --network sepolia\n`);
    } else {
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Purchase test failed:', error);
    process.exit(1);
  });

