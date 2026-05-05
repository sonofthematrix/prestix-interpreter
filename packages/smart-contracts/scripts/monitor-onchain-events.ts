#!/usr/bin/env tsx
/**
 * Monitor On-Chain Events
 * 
 * Monitors marketplace events for token purchases and other transactions.
 * Useful for tracking activity and debugging.
 * 
 * Usage:
 *   cd smart-contracts
 *   bun run tsx scripts/monitor-onchain-events.ts [--network sepolia]
 * 
 * Options:
 *   --from-block <number>  Start block number (default: latest - 1000)
 *   --watch                Watch for new events continuously
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
  console.log('║   MONITOR ON-CHAIN EVENTS                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const deployed = loadDeployedAddresses();
  if (!deployed || !deployed.addresses) {
    throw new Error('Deployed addresses not found');
  }

  const marketplaceAddress = deployed.addresses.RWAMarketplace;
  const registryAddress = deployed.addresses.RWAAssetRegistry;

  console.log(`📋 Contract Addresses:`);
  console.log(`   Marketplace: ${marketplaceAddress}`);
  console.log(`   Registry: ${registryAddress}\n`);

  const provider = ethers.provider;
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 1000); // Last 1000 blocks

  console.log(`📊 Block Range:`);
  console.log(`   Current Block: ${currentBlock}`);
  console.log(`   From Block: ${fromBlock}\n`);

  // Marketplace events
  const MARKETPLACE_ABI = [
    'event TokensPurchased(uint256 indexed assetId, address indexed buyer, uint256 tokenAmount, uint256 totalCost, uint256 timestamp)',
    'event TokensPurchasedWithERC20(uint256 indexed assetId, address indexed buyer, address indexed paymentToken, uint256 tokenAmount, uint256 totalCost, uint256 timestamp)',
    'event TokensListed(uint256 indexed listingId, uint256 indexed assetId, address indexed seller, uint256 tokenAmount, uint256 pricePerToken)',
    'event TokensSold(uint256 indexed listingId, uint256 indexed assetId, address indexed seller, address indexed buyer, uint256 tokenAmount, uint256 totalPrice)',
  ];

  const marketplace = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, provider);

  // Registry events
  const REGISTRY_ABI = [
    'event AssetRegistered(uint256 indexed assetId, address indexed owner, string assetType)',
    'event AssetUpdated(uint256 indexed assetId, uint256 newPrice, uint256 newTotalTokens)',
    'event AssetStatusChanged(uint256 indexed assetId, uint8 newStatus)',
  ];

  const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, provider);

  console.log(`🔍 Fetching events...\n`);

  // Fetch marketplace events
  try {
    const purchaseEvents = await marketplace.queryFilter(
      marketplace.filters.TokensPurchased(),
      fromBlock,
      currentBlock
    );
    const erc20PurchaseEvents = await marketplace.queryFilter(
      marketplace.filters.TokensPurchasedWithERC20(),
      fromBlock,
      currentBlock
    );
    const listingEvents = await marketplace.queryFilter(
      marketplace.filters.TokensListed(),
      fromBlock,
      currentBlock
    );

    console.log(`📦 Marketplace Events:`);
    console.log(`   ETH Purchases: ${purchaseEvents.length}`);
    console.log(`   ERC20 Purchases: ${erc20PurchaseEvents.length}`);
    console.log(`   Listings: ${listingEvents.length}\n`);

    if (purchaseEvents.length > 0) {
      console.log(`💰 ETH Token Purchases:`);
      for (const event of purchaseEvents) {
        const args = event.args as any;
        const block = await provider.getBlock(event.blockNumber);
        console.log(`   Block ${event.blockNumber} (${new Date(Number(block.timestamp) * 1000).toLocaleString()}):`);
        console.log(`      Asset ID: ${args.assetId.toString()}`);
        console.log(`      Buyer: ${args.buyer}`);
        console.log(`      Tokens: ${args.tokenAmount.toString()}`);
        console.log(`      Cost: ${ethers.formatEther(args.totalCost)} ETH`);
        console.log(`      TX: ${event.transactionHash}\n`);
      }
    }

    if (erc20PurchaseEvents.length > 0) {
      console.log(`💳 ERC20 Token Purchases:`);
      for (const event of erc20PurchaseEvents) {
        const args = event.args as any;
        const block = await provider.getBlock(event.blockNumber);
        const tokenSymbol = args.paymentToken === '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' ? 'USDC' : 
                           args.paymentToken === '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4' ? 'EURC' : 'Unknown';
        console.log(`   Block ${event.blockNumber} (${new Date(Number(block.timestamp) * 1000).toLocaleString()}):`);
        console.log(`      Asset ID: ${args.assetId.toString()}`);
        console.log(`      Buyer: ${args.buyer}`);
        console.log(`      Payment Token: ${tokenSymbol} (${args.paymentToken})`);
        console.log(`      Tokens: ${args.tokenAmount.toString()}`);
        console.log(`      Cost: ${ethers.formatUnits(args.totalCost, 6)} ${tokenSymbol}`);
        console.log(`      TX: ${event.transactionHash}\n`);
      }
    }

    if (listingEvents.length > 0) {
      console.log(`📋 Listings:`);
      for (const event of listingEvents) {
        const args = event.args as any;
        const block = await provider.getBlock(event.blockNumber);
        console.log(`   Block ${event.blockNumber} (${new Date(Number(block.timestamp) * 1000).toLocaleString()}):`);
        console.log(`      Listing ID: ${args.listingId.toString()}`);
        console.log(`      Asset ID: ${args.assetId.toString()}`);
        console.log(`      Seller: ${args.seller}`);
        console.log(`      Tokens: ${args.tokenAmount.toString()}`);
        console.log(`      Price/Token: ${ethers.formatEther(args.pricePerToken)} ETH`);
        console.log(`      TX: ${event.transactionHash}\n`);
      }
    }
  } catch (error: any) {
    console.error(`   ❌ Error fetching marketplace events: ${error.message}\n`);
  }

  // Fetch registry events
  try {
    const registeredEvents = await registry.queryFilter(
      registry.filters.AssetRegistered(),
      fromBlock,
      currentBlock
    );
    const statusEvents = await registry.queryFilter(
      registry.filters.AssetStatusChanged(),
      fromBlock,
      currentBlock
    );

    console.log(`📝 Registry Events:`);
    console.log(`   Asset Registrations: ${registeredEvents.length}`);
    console.log(`   Status Changes: ${statusEvents.length}\n`);

    if (registeredEvents.length > 0) {
      console.log(`🆕 Asset Registrations:`);
      for (const event of registeredEvents) {
        const args = event.args as any;
        const block = await provider.getBlock(event.blockNumber);
        console.log(`   Block ${event.blockNumber} (${new Date(Number(block.timestamp) * 1000).toLocaleString()}):`);
        console.log(`      Asset ID: ${args.assetId.toString()}`);
        console.log(`      Owner: ${args.owner}`);
        console.log(`      Type: ${args.assetType}`);
        console.log(`      TX: ${event.transactionHash}\n`);
      }
    }
  } catch (error: any) {
    console.error(`   ❌ Error fetching registry events: ${error.message}\n`);
  }

  console.log('✅ Event monitoring complete!\n');
  console.log(`💡 Tip: Use --watch flag to continuously monitor for new events\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Monitoring failed:', error);
    process.exit(1);
  });

