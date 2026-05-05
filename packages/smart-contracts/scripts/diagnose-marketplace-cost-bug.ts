import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;

// Use environment variable or fallback to Sepolia proxy addresses
// Default to the main marketplace proxy that was just upgraded
const MARKETPLACE_PROXY = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0x5295d340a0B06A2552C2169E5D238849550ea9Fe';
const REGISTRY_PROXY = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || '0xA1fb017a8c89cCB76F63d2244C4a228964B50D80';
// Default to asset 11 if not specified (common test asset)
// User can override with ASSET_ID env var
const ASSET_ID = process.env.ASSET_ID ? BigInt(process.env.ASSET_ID) : null;
const TOKEN_AMOUNT = BigInt(process.env.TOKEN_AMOUNT || '1');

const MARKETPLACE_ABI = [
  'function assetRegistry() view returns (address)',
  'function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
  'function getMarketplaceFee() view returns (uint256)',
] as const;

const REGISTRY_ABI = [
  'function getAsset(uint256) view returns (tuple(uint256 id, address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens, uint256 availableTokens, uint256 soldTokens, uint8 status, uint256 createdAt, uint256 updatedAt))',
  'function getActiveAssets() view returns (uint256[])',
] as const;

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   DIAGNOSE MARKETPLACE COST CALCULATION BUG                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const marketplace = await ethers.getContractAt(MARKETPLACE_ABI as any, MARKETPLACE_PROXY);
  
  // Get registry address from marketplace (this is the correct one)
  const registryAddressFromMarketplace = await marketplace.assetRegistry();
  console.log(`📋 Contracts:`);
  console.log(`   Marketplace Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   Registry from Marketplace: ${registryAddressFromMarketplace}`);
  console.log(`   Registry from ENV: ${REGISTRY_PROXY}`);
  
  // Use the registry address from marketplace (most reliable)
  const registryAddress = registryAddressFromMarketplace.toLowerCase() === REGISTRY_PROXY.toLowerCase() 
    ? REGISTRY_PROXY 
    : registryAddressFromMarketplace;
  
  console.log(`   Using Registry: ${registryAddress}\n`);
  
  const registry = await ethers.getContractAt(REGISTRY_ABI as any, registryAddress);

  // Determine which asset ID to use
  let assetIdToTest = ASSET_ID;
  
  // If no asset ID specified, try to find an available one
  if (assetIdToTest === null) {
    try {
      const activeAssets = await registry.getActiveAssets();
      if (activeAssets && activeAssets.length > 0) {
        // Use the first available asset
        assetIdToTest = BigInt(activeAssets[0].toString());
        console.log(`ℹ️  No ASSET_ID specified, using first available asset: ${assetIdToTest}\n`);
      } else {
        console.log(`❌ No active assets found in registry`);
        process.exit(1);
      }
    } catch (e: any) {
      console.log(`❌ Could not get active assets: ${e.message}`);
      console.log(`💡 Please specify ASSET_ID environment variable\n`);
      process.exit(1);
    }
  }

  // Get asset from registry directly
  console.log(`📦 Reading Asset ${assetIdToTest} from Registry:`);
  let asset;
  try {
    asset = await registry.getAsset(assetIdToTest);
  } catch (error: any) {
    if (error.message.includes('asset not found')) {
      console.log(`❌ Asset ${assetIdToTest} not found in registry ${registryAddress}`);
      
      // Try to list available assets
      try {
        const activeAssets = await registry.getActiveAssets();
        if (activeAssets && activeAssets.length > 0) {
          console.log(`\n📋 Available active assets: ${activeAssets.slice(0, 20).join(', ')}${activeAssets.length > 20 ? '...' : ''}`);
          console.log(`   Total active assets: ${activeAssets.length}`);
          console.log(`\n💡 Example: ASSET_ID=${activeAssets[0]} bun hardhat run scripts/diagnose-marketplace-cost-bug.ts --network sepolia\n`);
        }
      } catch (e) {
        // Ignore if getActiveAssets fails
      }
      
      process.exit(1);
    }
    throw error;
  }
  
  console.log(`   ID: ${asset.id.toString()}`);
  console.log(`   Title: ${asset.title}`);
  console.log(`   Owner: ${asset.owner}`);
  console.log(`   Price (total): ${ethers.formatEther(asset.price)} ETH`);
  console.log(`   Token Price (raw): ${asset.tokenPrice.toString()}`);
  console.log(`   Token Price (ETH): ${ethers.formatEther(asset.tokenPrice)} ETH`);
  console.log(`   Total Tokens: ${asset.totalTokens.toString()}`);
  console.log(`   Available Tokens: ${asset.availableTokens.toString()}`);
  console.log(`   Status: ${asset.status}\n`);

  // Get marketplace fee
  try {
    const feePercentage = await marketplace.getMarketplaceFee();
    console.log(`💰 Marketplace Fee Percentage: ${feePercentage.toString()} (${(Number(feePercentage) / 10000 * 100).toFixed(2)}%)\n`);
  } catch (error: any) {
    console.log(`⚠️  Could not read marketplace fee: ${error.message}\n`);
  }

  // Manual calculation
  console.log(`🧮 Manual Calculation:`);
  const tokenPrice = asset.tokenPrice;
  const basePrice = TOKEN_AMOUNT * tokenPrice;
  const expectedFee = (basePrice * 250n) / 10000n; // Assuming 2.5% fee
  const expectedTotal = basePrice + expectedFee;
  
  console.log(`   Token Amount: ${TOKEN_AMOUNT.toString()}`);
  console.log(`   Token Price: ${tokenPrice.toString()} wei`);
  console.log(`   Base Price: ${basePrice.toString()} wei`);
  console.log(`   Base Price (ETH): ${ethers.formatEther(basePrice)} ETH`);
  console.log(`   Expected Fee (2.5%): ${ethers.formatEther(expectedFee)} ETH`);
  console.log(`   Expected Total: ${ethers.formatEther(expectedTotal)} ETH\n`);

  // Call marketplace calculation
  console.log(`🔍 Marketplace Calculation:`);
  let calculationWorked = false;
  let calculationMatches = false;
  
  try {
    const [totalCost, marketplaceFee] = await marketplace.calculatePurchaseCost(assetIdToTest, TOKEN_AMOUNT);
    calculationWorked = true;
    
    console.log(`   Total Cost (raw): ${totalCost.toString()}`);
    console.log(`   Total Cost (ETH): ${ethers.formatEther(totalCost)} ETH`);
    console.log(`   Marketplace Fee (raw): ${marketplaceFee.toString()}`);
    console.log(`   Marketplace Fee (ETH): ${ethers.formatEther(marketplaceFee)} ETH\n`);

    // Compare
    console.log(`📊 Comparison:`);
    console.log(`   Expected Base Price: ${ethers.formatEther(basePrice)} ETH`);
    console.log(`   Marketplace Total Cost: ${ethers.formatEther(totalCost)} ETH`);
    const difference = totalCost > basePrice ? totalCost - basePrice : basePrice - totalCost;
    console.log(`   Difference: ${ethers.formatEther(difference)} ETH`);
    
    if (totalCost.toString() === expectedTotal.toString()) {
      calculationMatches = true;
      console.log(`\n✅ Calculation matches expected value!\n`);
    } else {
      console.log(`\n❌ Calculation does NOT match expected value!`);
      console.log(`   Expected: ${ethers.formatEther(expectedTotal)} ETH`);
      console.log(`   Got: ${ethers.formatEther(totalCost)} ETH`);
      console.log(`   Ratio: ${(Number(totalCost) / Number(expectedTotal)).toFixed(2)}x\n`);
      
      // Check if it's a struct reading issue
      if (totalCost > basePrice * 1000n) {
        console.log(`⚠️  ERROR: Value is ${(Number(totalCost) / Number(basePrice)).toFixed(0)}x larger than expected!`);
        console.log(`   This suggests a struct field misalignment or storage corruption.\n`);
        console.log(`   The validation checks in the contract should catch this and revert.\n`);
        console.log(`   If you see this, the contract may need to be upgraded.\n`);
      }
    }
  } catch (error: any) {
    console.log(`❌ Error calling calculatePurchaseCost: ${error.message}\n`);
    
    // Check if it's the validation we added
    if (error.message.includes('invalid token price') || 
        error.message.includes('price calculation overflow')) {
      console.log(`\n⚠️  The contract validation caught a corrupted value!`);
      console.log(`   This confirms the bug exists for asset ${assetIdToTest}.`);
      console.log(`   The contract will now revert instead of returning wrong values.\n`);
      console.log(`   Next steps:`);
      console.log(`   1. Investigate why tokenPrice is corrupted for this asset`);
      console.log(`   2. Check if the registry struct is being read correctly`);
      console.log(`   3. Consider upgrading the marketplace contract with the fix\n`);
    }
  }
  
  // If testing a single asset and it worked, suggest testing more
  if (ASSET_ID !== null && calculationWorked && calculationMatches) {
    console.log(`💡 Tip: To test more assets, run:`);
    console.log(`   ASSET_ID=<id> TOKEN_AMOUNT=1 bun hardhat run scripts/diagnose-marketplace-cost-bug.ts --network sepolia\n`);
  }
}

main().catch(console.error);

