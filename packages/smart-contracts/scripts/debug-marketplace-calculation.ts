import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;

const MARKETPLACE = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';
const ASSET_ID = BigInt(process.env.ASSET_ID || '11');
const TOKEN_AMOUNT = BigInt(process.env.TOKEN_AMOUNT || '1');

const MARKETPLACE_ABI = [
  'function assetRegistry() view returns (address)',
  'function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
  'function _marketplaceFeePercentage() view returns (uint256)',
  'function BASIS_POINTS() view returns (uint256)',
] as const;

const REGISTRY_ABI = [
  'function getAsset(uint256) view returns (tuple(uint256 id, address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens, uint256 availableTokens, uint256 soldTokens, uint8 status, uint256 createdAt, uint256 updatedAt))',
] as const;

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   DEBUG MARKETPLACE CALCULATION                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const marketplace = await ethers.getContractAt(MARKETPLACE_ABI as any, MARKETPLACE);
  
  // Get registry address from marketplace
  const registryAddress = await marketplace.assetRegistry();
  console.log(`📋 Marketplace Registry: ${registryAddress}\n`);

  // Get asset from registry
  const registry = await ethers.getContractAt(REGISTRY_ABI as any, registryAddress);
  const asset = await registry.getAsset(ASSET_ID);
  
  console.log(`📦 Asset ${ASSET_ID}:`);
  console.log(`   Title: ${asset.title}`);
  console.log(`   Price (total): ${ethers.formatEther(asset.price)} ETH`);
  console.log(`   Token Price: ${ethers.formatEther(asset.tokenPrice)} ETH`);
  console.log(`   Token Price (raw): ${asset.tokenPrice.toString()}`);
  console.log(`   Total Tokens: ${asset.totalTokens.toString()}`);
  console.log(`   Status: ${asset.status}\n`);

  // Get marketplace fee percentage
  try {
    const feePercentage = await marketplace._marketplaceFeePercentage();
    const basisPoints = await marketplace.BASIS_POINTS();
    console.log(`💰 Marketplace Fee:`);
    console.log(`   Fee Percentage: ${feePercentage.toString()}`);
    console.log(`   Basis Points: ${basisPoints.toString()}`);
    console.log(`   Fee Rate: ${(Number(feePercentage) / Number(basisPoints) * 100).toFixed(2)}%\n`);
  } catch (error: any) {
    console.log(`⚠️  Could not read fee percentage: ${error.message}\n`);
  }

  // Calculate manually
  console.log(`🧮 Manual Calculation:`);
  const tokenPrice = asset.tokenPrice;
  const basePrice = TOKEN_AMOUNT * tokenPrice;
  console.log(`   Token Amount: ${TOKEN_AMOUNT.toString()}`);
  console.log(`   Token Price: ${tokenPrice.toString()} wei`);
  console.log(`   Base Price: ${basePrice.toString()} wei`);
  console.log(`   Base Price (ETH): ${ethers.formatEther(basePrice)} ETH\n`);

  // Call marketplace calculation
  console.log(`🔍 Marketplace Calculation:`);
  const [totalCost, marketplaceFee] = await marketplace.calculatePurchaseCost(ASSET_ID, TOKEN_AMOUNT);
  console.log(`   Total Cost (raw): ${totalCost.toString()}`);
  console.log(`   Total Cost (ETH): ${ethers.formatEther(totalCost)} ETH`);
  console.log(`   Marketplace Fee (raw): ${marketplaceFee.toString()}`);
  console.log(`   Marketplace Fee (ETH): ${ethers.formatEther(marketplaceFee)} ETH\n`);

  // Compare
  console.log(`📊 Comparison:`);
  console.log(`   Expected Base Price: ${ethers.formatEther(basePrice)} ETH`);
  console.log(`   Marketplace Total Cost: ${ethers.formatEther(totalCost)} ETH`);
  console.log(`   Difference: ${ethers.formatEther(totalCost - basePrice)} ETH\n`);

  if (totalCost.toString() === basePrice.toString()) {
    console.log(`✅ Calculation matches expected value!\n`);
  } else {
    console.log(`❌ Calculation does NOT match expected value!`);
    console.log(`   This indicates a bug in the marketplace contract.\n`);
  }
}

main().catch(console.error);

