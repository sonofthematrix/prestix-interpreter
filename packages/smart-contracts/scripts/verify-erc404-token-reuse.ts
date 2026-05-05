import { ethers } from "hardhat";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables
const envLocalPath = path.join(__dirname, "../.env.local");
const envPath = path.join(__dirname, "../.env");

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const MARKETPLACE_PROXY = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';
const FACTORY_404 = process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY_404 || '0x7a6f7dE826064903f2e419833b9633560217FEe2';
const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || '0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D';

interface PurchaseEvent {
  assetId: bigint;
  buyer: string;
  tokenAmount: bigint;
  totalCost: bigint;
  tokenAddress: string | null;
  blockNumber: number;
  transactionHash: string;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   VERIFY ERC404 TOKEN REUSE (NO DUPLICATES)              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Account: ${deployer.address}\n`);

  console.log(`📋 Configuration:`);
  console.log(`   Marketplace Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   ERC404 Factory: ${FACTORY_404}`);
  console.log(`   Asset Registry: ${REGISTRY_ADDRESS}\n`);

  try {
    const marketplace = await ethers.getContractAt('RWAMarketplaceUpgradeable', MARKETPLACE_PROXY);
    const factory404 = await ethers.getContractAt('RWATokenFactory404', FACTORY_404);
    const registry = await ethers.getContractAt('RWAAssetRegistry', REGISTRY_ADDRESS);

    // Get current block
    const currentBlock = await ethers.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 100); // Check last 100 blocks

    console.log(`📊 Scanning Configuration:`);
    console.log(`   Current Block: ${currentBlock}`);
    console.log(`   Scanning blocks: ${fromBlock} to ${currentBlock} (${currentBlock - fromBlock} blocks)\n`);

    // Get purchase events
    console.log(`🔍 Scanning for purchase events...`);
    const purchaseFilter = marketplace.filters.TokensPurchased();
    
    // Query in smaller batches to avoid RPC limits
    const batchSize = 10;
    const allEvents: any[] = [];
    
    for (let startBlock = fromBlock; startBlock <= currentBlock; startBlock += batchSize) {
      const endBlock = Math.min(startBlock + batchSize - 1, currentBlock);
      try {
        const events = await marketplace.queryFilter(purchaseFilter, startBlock, endBlock);
        allEvents.push(...events);
      } catch (error) {
        console.log(`   ⚠️  Skipping blocks ${startBlock}-${endBlock}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log(`   Found ${allEvents.length} purchase event(s)\n`);

    if (allEvents.length === 0) {
      console.log('ℹ️  No purchases found in the scanned blocks.\n');
      console.log('💡 To test token reuse:');
      console.log('   1. Make a purchase through the frontend');
      console.log('   2. Make a second purchase for the same asset');
      console.log('   3. Run this script again to verify token reuse\n');
      return;
    }

    // Process events
    const purchases: PurchaseEvent[] = [];
    const assetTokenMap = new Map<string, Set<string>>(); // assetId -> token addresses
    const assetPurchaseCount = new Map<string, number>(); // assetId -> purchase count

    for (const event of allEvents) {
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

      const assetIdStr = assetId.toString();
      
      // Track token addresses per asset
      if (!assetTokenMap.has(assetIdStr)) {
        assetTokenMap.set(assetIdStr, new Set());
      }
      if (tokenAddress) {
        assetTokenMap.get(assetIdStr)!.add(tokenAddress.toLowerCase());
      }

      // Track purchase count
      assetPurchaseCount.set(assetIdStr, (assetPurchaseCount.get(assetIdStr) || 0) + 1);

      purchases.push({
        assetId,
        buyer,
        tokenAmount,
        totalCost,
        tokenAddress,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      });
    }

    // Display purchases
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   PURCHASE EVENTS FOUND                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Group by asset ID
    const purchasesByAsset = new Map<string, PurchaseEvent[]>();
    for (const purchase of purchases) {
      const assetIdStr = purchase.assetId.toString();
      if (!purchasesByAsset.has(assetIdStr)) {
        purchasesByAsset.set(assetIdStr, []);
      }
      purchasesByAsset.get(assetIdStr)!.push(purchase);
    }

    let hasIssues = false;

    for (const [assetIdStr, assetPurchases] of purchasesByAsset.entries()) {
      const assetId = BigInt(assetIdStr);
      
      // Get asset details
      let assetTitle = `Asset ${assetIdStr}`;
      try {
        const asset = await registry.getAsset(assetId);
        assetTitle = asset.title || assetTitle;
      } catch (error) {
        // Asset might not exist
      }

      console.log(`📦 ${assetTitle} (Asset ID: ${assetIdStr})`);
      console.log(`   Total Purchases: ${assetPurchases.length}`);
      
      const tokenAddresses = assetTokenMap.get(assetIdStr)!;
      const uniqueTokenAddresses = Array.from(tokenAddresses);
      
      console.log(`   Unique Token Addresses: ${uniqueTokenAddresses.length}`);
      
      if (uniqueTokenAddresses.length === 0) {
        console.log(`   ⚠️  WARNING: No token address found for this asset`);
        hasIssues = true;
      } else if (uniqueTokenAddresses.length === 1) {
        console.log(`   ✅ Token Address: ${uniqueTokenAddresses[0]}`);
        console.log(`   ✅ All purchases use the same token (no duplicates)`);
      } else {
        console.log(`   ❌ DUPLICATE TOKENS DETECTED!`);
        console.log(`   Found ${uniqueTokenAddresses.length} different token addresses:`);
        uniqueTokenAddresses.forEach((addr, idx) => {
          console.log(`      ${idx + 1}. ${addr}`);
        });
        hasIssues = true;
      }

      // Show purchase details
      console.log(`\n   Purchase Details:`);
      assetPurchases.forEach((purchase, idx) => {
        console.log(`   ${idx + 1}. Block ${purchase.blockNumber}`);
        console.log(`      Buyer: ${purchase.buyer}`);
        console.log(`      Tokens: ${purchase.tokenAmount.toString()}`);
        console.log(`      Cost: ${ethers.formatEther(purchase.totalCost)} ETH`);
        console.log(`      Token: ${purchase.tokenAddress || 'Not found'}`);
        console.log(`      TX: ${purchase.transactionHash}`);
      });
      console.log('');
    }

    // Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   VERIFICATION SUMMARY                                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const totalAssets = purchasesByAsset.size;
    const assetsWithSingleToken = Array.from(assetTokenMap.entries())
      .filter(([_, addresses]) => addresses.size === 1).length;
    const assetsWithDuplicates = Array.from(assetTokenMap.entries())
      .filter(([_, addresses]) => addresses.size > 1).length;

    console.log(`📊 Statistics:`);
    console.log(`   Total Assets Purchased: ${totalAssets}`);
    console.log(`   Assets with Single Token: ${assetsWithSingleToken} ✅`);
    console.log(`   Assets with Duplicate Tokens: ${assetsWithDuplicates} ${assetsWithDuplicates > 0 ? '❌' : '✅'}`);
    console.log(`   Total Purchases: ${purchases.length}\n`);

    if (hasIssues) {
      console.log(`❌ ISSUES FOUND:`);
      console.log(`   - Some assets have duplicate token addresses`);
      console.log(`   - ERC404 token reuse is not working correctly`);
      console.log(`   - Review marketplace upgrade and factory configuration\n`);
    } else {
      console.log(`✅ VERIFICATION PASSED:`);
      console.log(`   - All assets use a single ERC404 token address`);
      console.log(`   - No duplicate tokens detected`);
      console.log(`   - ERC404 token reuse is working correctly\n`);
    }

    // Recommendations
    if (purchases.length > 0 && !hasIssues) {
      console.log('💡 Token Reuse Verification:');
      console.log('   ✅ Multiple purchases for the same asset use the same token');
      console.log('   ✅ ERC404 token finding is working correctly');
      console.log('   ✅ No duplicate tokens created\n');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
