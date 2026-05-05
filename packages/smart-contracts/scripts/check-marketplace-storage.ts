import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;

const MARKETPLACE = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';

const MARKETPLACE_ABI = [
  'function getMarketplaceFee() view returns (uint256)',
  'function BASIS_POINTS() view returns (uint256)',
  'function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
  'function assetRegistry() view returns (address)',
] as const;

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   CHECK MARKETPLACE STORAGE                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const marketplace = await ethers.getContractAt(MARKETPLACE_ABI as any, MARKETPLACE);

  // Try to read BASIS_POINTS (should be constant)
  try {
    const basisPoints = await marketplace.BASIS_POINTS();
    console.log(`✅ BASIS_POINTS: ${basisPoints.toString()}\n`);
  } catch (error: any) {
    console.log(`❌ Could not read BASIS_POINTS: ${error.message}\n`);
  }

  // Try to read marketplace fee through getter
  try {
    const feePercentage = await marketplace.getMarketplaceFee();
    console.log(`✅ Marketplace Fee Percentage: ${feePercentage.toString()}`);
    console.log(`   Fee Rate: ${(Number(feePercentage) / 10000 * 100).toFixed(2)}%\n`);
  } catch (error: any) {
    console.log(`❌ Could not read marketplace fee: ${error.message}`);
    console.log(`   This suggests the getter function doesn't exist or storage is corrupted\n`);
  }

  // Test calculation with asset 11, 1 token
  console.log(`🧮 Testing calculation with Asset 11, 1 token:`);
  try {
    const [totalCost, marketplaceFee] = await marketplace.calculatePurchaseCost(11n, 1n);
    console.log(`   Total Cost: ${totalCost.toString()}`);
    console.log(`   Total Cost (ETH): ${ethers.formatEther(totalCost)} ETH`);
    console.log(`   Marketplace Fee: ${marketplaceFee.toString()}`);
    console.log(`   Marketplace Fee (ETH): ${ethers.formatEther(marketplaceFee)} ETH\n`);

    // Try to reverse engineer what _marketplaceFeePercentage might be
    // If basePrice = 0.001 ETH = 1000000000000000 wei
    // And marketplaceFee = basePrice * feePercentage / BASIS_POINTS
    // Then feePercentage = marketplaceFee * BASIS_POINTS / basePrice
    const expectedBasePrice = ethers.parseEther('0.001');
    const basisPoints = 10000n;
    const calculatedFeePercentage = (marketplaceFee * basisPoints) / expectedBasePrice;
    console.log(`   Reverse-engineered fee percentage: ${calculatedFeePercentage.toString()}`);
    console.log(`   (This is what _marketplaceFeePercentage appears to be)\n`);
  } catch (error: any) {
    console.log(`❌ Calculation failed: ${error.message}\n`);
  }

  // Check asset registry
  try {
    const registryAddress = await marketplace.assetRegistry();
    console.log(`📋 Asset Registry: ${registryAddress}\n`);
  } catch (error: any) {
    console.log(`❌ Could not read asset registry: ${error.message}\n`);
  }
}

main().catch(console.error);

