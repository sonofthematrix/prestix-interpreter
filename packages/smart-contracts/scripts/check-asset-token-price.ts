import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;

const REGISTRY = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || '0xA1fb017a8c89cCB76F63d2244C4a228964B50D80';
const MARKETPLACE = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';

async function main() {
  const registry = await ethers.getContractAt([
    'function getAsset(uint256) view returns (tuple(uint256 id, address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens, uint256 availableTokens, uint256 soldTokens, uint8 status, uint256 createdAt, uint256 updatedAt))'
  ], REGISTRY);
  
  const marketplace = await ethers.getContractAt([
    'function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
    'function calculatePurchaseCostInPaymentToken(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
  ], MARKETPLACE);
  
  const assetId = 11;
  const tokenAmount = 1n;
  
  const asset = await registry.getAsset(assetId);
  console.log(`Asset ${assetId}:`);
  console.log(`  Title: ${asset.title}`);
  console.log(`  Token Price (raw): ${asset.tokenPrice.toString()}`);
  console.log(`  Token Price (ETH): ${ethers.formatEther(asset.tokenPrice)} ETH`);
  console.log(`  Status: ${asset.status}`);
  console.log('');
  
  const [totalCostEth, feeEth] = await marketplace.calculatePurchaseCost(assetId, tokenAmount);
  console.log(`calculatePurchaseCost(${assetId}, ${tokenAmount}):`);
  console.log(`  Total Cost (raw): ${totalCostEth.toString()}`);
  console.log(`  Total Cost (ETH): ${ethers.formatEther(totalCostEth)} ETH`);
  console.log(`  Fee (raw): ${feeEth.toString()}`);
  console.log(`  Fee (ETH): ${ethers.formatEther(feeEth)} ETH`);
  console.log('');
  
  try {
    const [totalCostToken, feeToken] = await marketplace.calculatePurchaseCostInPaymentToken(assetId, tokenAmount);
    console.log(`calculatePurchaseCostInPaymentToken(${assetId}, ${tokenAmount}):`);
    console.log(`  Total Cost (raw): ${totalCostToken.toString()}`);
    console.log(`  Total Cost (USDC): ${ethers.formatUnits(totalCostToken, 6)} USDC`);
    console.log(`  Fee (raw): ${feeToken.toString()}`);
    console.log(`  Fee (USDC): ${ethers.formatUnits(feeToken, 6)} USDC`);
  } catch (error: any) {
    console.log(`calculatePurchaseCostInPaymentToken failed: ${error.message}`);
  }
}

main().catch(console.error);

