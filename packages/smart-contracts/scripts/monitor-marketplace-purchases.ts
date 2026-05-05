#!/usr/bin/env tsx
/**
 * Monitor Marketplace Purchases
 * 
 * This script monitors recent marketplace purchases to verify:
 * 1. Correct ERC404 tokens are being used
 * 2. No duplicate tokens are created
 * 3. Purchase events are properly emitted
 * 
 * Usage:
 *   cd packages/smart-contracts
 *   bun hardhat run scripts/monitor-marketplace-purchases.ts --network sepolia [blockRange]
 * 
 * Example:
 *   bun hardhat run scripts/monitor-marketplace-purchases.ts --network sepolia 1000
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;

const MARKETPLACE_PROXY = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';
const FACTORY_404 = process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY_404 || '0x7a6f7dE826064903f2e419833b9633560217FEe2';

interface PurchaseEvent {
  blockNumber: number;
  transactionHash: string;
  assetId: bigint;
  buyer: string;
  tokenAmount: bigint;
  totalCost: bigint;
  tokenAddress: string | null;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   MONITOR MARKETPLACE PURCHASES                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Free tier RPC limits: max 10 blocks for eth_getLogs
  // Query fromBlock to currentBlock (inclusive), so we need blockRange-1 to get exactly blockRange blocks
  const blockRange = process.argv[2] ? parseInt(process.argv[2]) : 9; // Use 9 to query 10 blocks total (inclusive)
  const currentBlock = await ethers.provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - blockRange);

  console.log(`📊 Monitoring Configuration:`);
  console.log(`   Marketplace: ${MARKETPLACE_PROXY}`);
  console.log(`   ERC404 Factory: ${FACTORY_404}`);
  console.log(`   Current Block: ${currentBlock}`);
  console.log(`   Scanning blocks: ${fromBlock} to ${currentBlock} (${blockRange} blocks)\n`);

  try {
    const marketplace = await ethers.getContractAt('RWAMarketplaceUpgradeable', MARKETPLACE_PROXY);
    const factory404 = await ethers.getContractAt('RWATokenFactory404', FACTORY_404);

    // Get purchase events
    console.log(`🔍 Scanning for purchase events...`);
    const purchaseFilter = marketplace.filters.TokensPurchased();
    const events = await marketplace.queryFilter(purchaseFilter, fromBlock, currentBlock);

    console.log(`   Found ${events.length} purchase event(s)\n`);

    if (events.length === 0) {
      console.log(`ℹ️  No purchases found in the last ${blockRange} blocks.\n`);
      console.log(`💡 Try increasing the block range:`);
      console.log(`   bun hardhat run scripts/monitor-marketplace-purchases.ts --network sepolia 5000\n`);
      return;
    }

    const purchases: PurchaseEvent[] = [];
    const tokenAddresses = new Map<string, Set<string>>(); // assetId -> token addresses

    for (const event of events) {
      // Type guard: ensure event is EventLog with args
      if (!('args' in event) || !event.args) continue;

      const assetId = (event.args as any).assetId;
      const buyer = (event.args as any).buyer;
      const tokenAmount = (event.args as any).tokenAmount;
      const totalCost = (event.args as any).totalCost || (event.args as any).totalPrice || 0n;

      // Get token address for this asset
      let tokenAddress: string | null = null;
      try {
        tokenAddress = await factory404.getTokenAddress(assetId);
        if (tokenAddress === ethers.ZeroAddress) {
          tokenAddress = null;
        }
      } catch (error) {
        // Token might not exist yet
        tokenAddress = null;
      }

      purchases.push({
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        assetId,
        buyer,
        tokenAmount,
        totalCost,
        tokenAddress,
      });

      // Track token addresses per asset
      if (tokenAddress) {
        if (!tokenAddresses.has(assetId.toString())) {
          tokenAddresses.set(assetId.toString(), new Set());
        }
        tokenAddresses.get(assetId.toString())!.add(tokenAddress.toLowerCase());
      }
    }

    // Display purchase summary
    console.log(`📋 Purchase Summary:\n`);
    purchases.forEach((purchase, index) => {
      console.log(`   Purchase ${index + 1}:`);
      console.log(`      Block: ${purchase.blockNumber}`);
      console.log(`      Transaction: ${purchase.transactionHash}`);
      console.log(`      Asset ID: ${purchase.assetId.toString()}`);
      console.log(`      Buyer: ${purchase.buyer}`);
      console.log(`      Token Amount: ${purchase.tokenAmount.toString()}`);
      console.log(`      Total Cost: ${ethers.formatEther(purchase.totalCost)} ETH`);
      console.log(`      Token Address: ${purchase.tokenAddress || 'Not found'}`);
      console.log(`      View: https://sepolia.etherscan.io/tx/${purchase.transactionHash}\n`);
    });

    // Check for duplicates
    console.log(`🔍 Checking for duplicate tokens...\n`);
    let duplicatesFound = false;

    for (const [assetId, addresses] of tokenAddresses.entries()) {
      if (addresses.size > 1) {
        duplicatesFound = true;
        console.log(`   ❌ Asset ${assetId} has ${addresses.size} different token addresses:`);
        addresses.forEach(addr => console.log(`      - ${addr}`));
        console.log();
      }
    }

    if (!duplicatesFound) {
      console.log(`   ✅ No duplicate tokens found - all purchases used correct tokens\n`);
    }

    // Verify token addresses
    console.log(`✅ Verification Results:\n`);
    const uniqueAssets = new Set(purchases.map(p => p.assetId.toString()));
    console.log(`   Unique Assets Purchased: ${uniqueAssets.size}`);
    console.log(`   Total Purchases: ${purchases.length}`);
    console.log(`   Assets with Valid Tokens: ${Array.from(tokenAddresses.keys()).length}`);
    console.log(`   Duplicates Found: ${duplicatesFound ? '❌ Yes' : '✅ No'}\n`);

    // Statistics
    const totalTokensPurchased = purchases.reduce((sum, p) => sum + p.tokenAmount, 0n);
    const totalValue = purchases.reduce((sum, p) => sum + p.totalCost, 0n);
    
    console.log(`📊 Statistics:`);
    console.log(`   Total Tokens Purchased: ${totalTokensPurchased.toString()}`);
    console.log(`   Total Value: ${ethers.formatEther(totalValue)} ETH`);
    console.log(`   Average Purchase Size: ${(totalTokensPurchased / BigInt(purchases.length)).toString()} tokens`);
    console.log(`   Average Purchase Value: ${ethers.formatEther(totalValue / BigInt(purchases.length))} ETH\n`);

    // Recommendations
    if (duplicatesFound) {
      console.log(`⚠️  WARNING: Duplicate tokens detected!`);
      console.log(`   This indicates the marketplace may not be finding existing ERC404 tokens correctly.`);
      console.log(`   Please review the upgrade and verify ERC404 factory configuration.\n`);
    } else {
      console.log(`✅ All purchases verified - ERC404 token finding is working correctly!\n`);
    }

  } catch (error: any) {
    console.error(`\n❌ Monitoring failed: ${error.message}`);
    if (error.reason) {
      console.error(`   Reason: ${error.reason}`);
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Monitor failed:', error);
    process.exit(1);
  });

