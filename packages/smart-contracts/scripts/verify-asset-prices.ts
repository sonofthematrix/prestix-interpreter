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

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || '0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   VERIFY ASSET TOKEN PRICES IN REGISTRY                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Account: ${deployer.address}\n`);

  console.log(`📋 Configuration:`);
  console.log(`   Asset Registry: ${REGISTRY_ADDRESS}\n`);

  try {
    // Load registry ABI - use full ABI from contract
    const registry = await ethers.getContractAt('RWAAssetRegistry', REGISTRY_ADDRESS);

    // Try to query assets starting from ID 1
    // We'll check up to 20 assets (adjust as needed)
    const maxAssetsToCheck = 20;
    const assetIds: bigint[] = [];
    
    console.log(`🔍 Checking for assets (scanning IDs 1-${maxAssetsToCheck})...\n`);
    
    // Find which asset IDs exist
    for (let i = 1; i <= maxAssetsToCheck; i++) {
      try {
        const asset = await registry.getAsset(i);
        // If we get here, asset exists
        if (asset.id === BigInt(i)) {
          assetIds.push(BigInt(i));
        }
      } catch (error) {
        // Asset doesn't exist or error occurred
        // Continue checking other IDs
      }
    }
    
    if (assetIds.length === 0) {
      console.log('ℹ️  No assets found in registry (checked IDs 1-20).\n');
      return;
    }
    
    console.log(`📊 Found ${assetIds.length} asset(s) in registry\n`);

    const issues: Array<{ assetId: bigint; issue: string }> = [];
    const validAssets: Array<{ assetId: bigint; title: string; tokenPrice: string }> = [];

    for (const assetId of assetIds) {
      try {
        const asset = await registry.getAsset(assetId);
        const title = asset.title || `Asset ${assetId}`;
        const tokenPrice = ethers.formatEther(asset.tokenPrice);
        const totalTokens = asset.totalTokens.toString();
        const soldTokens = asset.soldTokens.toString();
        const availableTokens = asset.availableTokens ? asset.availableTokens.toString() : (asset.totalTokens - asset.soldTokens).toString();
        const status = asset.status;

        console.log(`📦 Asset ID: ${assetId}`);
        console.log(`   Title: ${title}`);
        console.log(`   Status: ${status === 1 ? '✅ Active' : status === 0 ? '⏸️  Inactive' : '❓ Unknown'}`);
        console.log(`   Total Tokens: ${totalTokens}`);
        console.log(`   Sold Tokens: ${soldTokens}`);
        console.log(`   Available Tokens: ${availableTokens}`);
        console.log(`   Token Price: ${tokenPrice} ETH`);

        // Validate token price
        const priceInWei = asset.tokenPrice;
        const priceInEth = parseFloat(tokenPrice);

        if (priceInWei === 0n) {
          issues.push({ assetId, issue: 'Token price is zero' });
          console.log(`   ⚠️  WARNING: Token price is zero!\n`);
        } else if (priceInEth > 1000) {
          issues.push({ assetId, issue: `Token price is very high: ${tokenPrice} ETH` });
          console.log(`   ⚠️  WARNING: Token price seems unusually high: ${tokenPrice} ETH\n`);
        } else if (priceInEth < 0.0001) {
          issues.push({ assetId, issue: `Token price is very low: ${tokenPrice} ETH` });
          console.log(`   ⚠️  WARNING: Token price seems unusually low: ${tokenPrice} ETH\n`);
        } else {
          validAssets.push({ assetId, title, tokenPrice });
          console.log(`   ✅ Token price looks reasonable\n`);
        }

        // Check token availability
        if (asset.totalTokens <= asset.soldTokens) {
          issues.push({ assetId, issue: 'All tokens are sold' });
          console.log(`   ⚠️  WARNING: All tokens are sold!\n`);
        }

      } catch (error) {
        console.log(`   ❌ Error fetching asset ${assetId}: ${error instanceof Error ? error.message : String(error)}\n`);
        issues.push({ assetId, issue: `Error fetching asset: ${error instanceof Error ? error.message : String(error)}` });
      }
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   VERIFICATION SUMMARY                                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`✅ Valid Assets: ${validAssets.length}`);
    if (validAssets.length > 0) {
      console.log(`   Assets with reasonable token prices:`);
      validAssets.forEach(({ assetId, title, tokenPrice }) => {
        console.log(`   - Asset ${assetId}: ${title} (${tokenPrice} ETH)`);
      });
      console.log('');
    }

    if (issues.length > 0) {
      console.log(`⚠️  Issues Found: ${issues.length}`);
      issues.forEach(({ assetId, issue }) => {
        console.log(`   - Asset ${assetId}: ${issue}`);
      });
      console.log('');
    } else {
      console.log(`✅ No issues found! All assets have valid token prices.\n`);
    }

    // Recommendations
    if (validAssets.length > 0) {
      console.log('💡 Recommended Test Assets:');
      validAssets.slice(0, 3).forEach(({ assetId, title, tokenPrice }) => {
        console.log(`   - Asset ${assetId}: ${title} (${tokenPrice} ETH per token)`);
      });
      console.log('');
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

