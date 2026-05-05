import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables - check multiple locations
const rootEnvLocalPath = path.join(__dirname, "../../../.env.local");
const rootEnvPath = path.join(__dirname, "../../../.env");
const localEnvLocalPath = path.join(__dirname, "../.env.local");
const localEnvPath = path.join(__dirname, "../.env");

// Priority: root .env.local > root .env > local .env.local > local .env
if (fs.existsSync(rootEnvLocalPath)) {
  dotenv.config({ path: rootEnvLocalPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(localEnvLocalPath)) {
  dotenv.config({ path: localEnvLocalPath });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config(); // Fallback to default
}

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || '0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D';

// Registry ABI
const REGISTRY_ABI = [
  'function getAsset(uint256) view returns (tuple(uint256 id, address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens, uint256 availableTokens, uint256 soldTokens, uint8 status, uint256 createdAt, uint256 updatedAt))',
  'function updateAsset(uint256 assetId, uint256 newPrice, uint256 newTokenPrice)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function ASSET_MANAGER_ROLE() view returns (bytes32)',
] as const;

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   UPDATE ASSET TOKEN PRICE FOR TESTING                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get parameters from environment
  const assetIdStr = process.env.ASSET_ID;
  const tokenPriceEthStr = process.env.TOKEN_PRICE_ETH || '0.001'; // Default 0.001 ETH (~$3-4 USDC)
  
  if (!assetIdStr) {
    console.log('❌ Usage: ASSET_ID=<id> [TOKEN_PRICE_ETH=<price>] bun hardhat run scripts/update-asset-token-price.ts --network sepolia\n');
    console.log('📋 Parameters:');
    console.log('  ASSET_ID        : Asset ID to update (required)');
    console.log('  TOKEN_PRICE_ETH : New token price in ETH (default: 0.001 ETH)\n');
    console.log('📝 Examples:');
    console.log('  ASSET_ID=11 TOKEN_PRICE_ETH=0.001 bun hardhat run scripts/update-asset-token-price.ts --network sepolia');
    console.log('  ASSET_ID=11 TOKEN_PRICE_ETH=0.0001 bun hardhat run scripts/update-asset-token-price.ts --network sepolia\n');
    process.exit(1);
  }

  const assetId = parseInt(assetIdStr);
  const tokenPriceEth = parseFloat(tokenPriceEthStr);
  const tokenPriceWei = ethers.parseEther(tokenPriceEthStr);

  // Get admin wallet
  const adminAddress = process.env.ADMIN_WALLET || 
                       process.env.ADMIN_WALLET_ADDRESS || 
                       process.env.WALLET_ADDRESS;
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || 
                          process.env.PRIVATE_KEY;

  if (!adminAddress || !adminPrivateKey) {
    console.log('❌ Admin wallet not found in environment variables');
    console.log('   Please set ADMIN_WALLET (or ADMIN_WALLET_ADDRESS) and ADMIN_PRIVATE_KEY in .env.local\n');
    process.exit(1);
  }

  console.log(`📋 Configuration:`);
  console.log(`   Registry: ${REGISTRY_ADDRESS}`);
  console.log(`   Asset ID: ${assetId}`);
  console.log(`   New Token Price: ${tokenPriceEth} ETH (${tokenPriceWei.toString()} wei)`);
  console.log(`   Admin Wallet: ${adminAddress}\n`);

  try {
    // Create signer
    const provider = ethers.provider;
    const adminSigner = new ethers.Wallet(adminPrivateKey, provider);

    // Verify admin signer
    if (adminSigner.address.toLowerCase() !== adminAddress.toLowerCase()) {
      throw new Error(`Admin private key does not match admin address. Expected: ${adminAddress}, Got: ${adminSigner.address}`);
    }

    // Get registry contract
    const registry = await ethers.getContractAt(REGISTRY_ABI as any, REGISTRY_ADDRESS);

    // Get current asset details
    console.log(`🔍 Fetching current asset details...`);
    const asset = await registry.getAsset(assetId);
    console.log(`   Title: ${asset.title}`);
    console.log(`   Current Token Price: ${ethers.formatEther(asset.tokenPrice)} ETH`);
    console.log(`   Current Total Price: ${ethers.formatEther(asset.price)} ETH`);
    console.log(`   Status: ${asset.status === 1 ? 'Active' : 'Inactive'}\n`);

    // Check admin role
    console.log(`🔍 Checking admin permissions...`);
    const ASSET_MANAGER_ROLE = await registry.ASSET_MANAGER_ROLE();
    const hasRole = await registry.hasRole(ASSET_MANAGER_ROLE, adminSigner.address);
    
    if (!hasRole) {
      console.log(`❌ Admin wallet does not have ASSET_MANAGER_ROLE`);
      console.log(`   Address: ${adminSigner.address}`);
      console.log(`   Role: ${ASSET_MANAGER_ROLE}\n`);
      console.log(`💡 Solution: Grant ASSET_MANAGER_ROLE to ${adminSigner.address} on the registry contract\n`);
      process.exit(1);
    }

    console.log(`   ✅ Admin has ASSET_MANAGER_ROLE\n`);

    // Calculate new total price (tokenPrice * totalTokens)
    const newTotalPrice = asset.totalTokens * tokenPriceWei;

    // Update asset
    console.log(`⚙️  Updating asset token price...`);
    console.log(`   New Token Price: ${tokenPriceEth} ETH`);
    console.log(`   New Total Price: ${ethers.formatEther(newTotalPrice)} ETH\n`);
    
    const registryWithSigner = registry.connect(adminSigner);
    const tx = await (registryWithSigner as any).updateAsset(assetId, newTotalPrice, tokenPriceWei);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log(`   Waiting for confirmation...\n`);

    const receipt = await tx.wait();
    console.log(`✅ Asset updated successfully!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}\n`);

    // Verify update
    console.log(`🔍 Verifying update...`);
    const updatedAsset = await registry.getAsset(assetId);
    const updatedTokenPrice = ethers.formatEther(updatedAsset.tokenPrice);
    
    if (updatedTokenPrice === tokenPriceEthStr) {
      console.log(`✅ Verification successful!`);
      console.log(`   New Token Price: ${updatedTokenPrice} ETH\n`);
    } else {
      console.log(`⚠️  Token price mismatch:`);
      console.log(`   Expected: ${tokenPriceEthStr} ETH`);
      console.log(`   Got: ${updatedTokenPrice} ETH\n`);
    }

    // Calculate cost for 1 token purchase
    const oneTokenCost = tokenPriceWei;
    const marketplaceFeeBps = 250n; // 2.5% = 250 basis points
    const marketplaceFee = (oneTokenCost * marketplaceFeeBps) / 10000n;
    const totalCost = oneTokenCost + marketplaceFee;
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   SUMMARY                                                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`✅ Asset ${assetId} token price updated to ${tokenPriceEth} ETH`);
    console.log(`\n📊 Purchase Cost (1 token):`);
    console.log(`   Token Price: ${ethers.formatEther(oneTokenCost)} ETH`);
    console.log(`   Marketplace Fee (2.5%): ${ethers.formatEther(marketplaceFee)} ETH`);
    console.log(`   Total Cost: ${ethers.formatEther(totalCost)} ETH`);
    console.log(`   (~${(parseFloat(ethers.formatEther(totalCost)) * 3000).toFixed(2)} USDC at ~$3000/ETH)\n`);
    console.log(`💡 This price allows testing with limited USDC/EURC balance\n`);

  } catch (error: any) {
    console.error('❌ Update failed:', error.message);
    
    if (error.transaction) {
      console.error(`   Transaction hash: ${error.transaction.hash}`);
    }
    
    if (error.message.includes('AccessControl')) {
      console.log(`\n💡 Solution: Ensure admin wallet has ASSET_MANAGER_ROLE on the registry contract`);
    } else if (error.message.includes('insufficient funds')) {
      console.log(`\n💡 Solution: Ensure admin wallet has sufficient ETH for gas fees`);
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

