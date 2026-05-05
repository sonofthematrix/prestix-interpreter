import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
const rootEnvLocalPath = path.join(__dirname, "../../../.env.local");
const rootEnvPath = path.join(__dirname, "../../../.env");
const localEnvLocalPath = path.join(__dirname, "../.env.local");
const localEnvPath = path.join(__dirname, "../.env");

if (fs.existsSync(rootEnvLocalPath)) {
  dotenv.config({ path: rootEnvLocalPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(localEnvLocalPath)) {
  dotenv.config({ path: localEnvLocalPath });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}

const MARKETPLACE_PROXY = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';

const MARKETPLACE_ABI = [
  'function getMarketplaceFee() view returns (uint256)',
  'function setMarketplaceFee(uint256 newFeePercentage)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function FEE_MANAGER_ROLE() view returns (bytes32)',
  'function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
] as const;

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   FIX MARKETPLACE FEE PERCENTAGE                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

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
  console.log(`   Marketplace Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   Admin Wallet: ${adminAddress}\n`);

  try {
    // Create signer
    const provider = ethers.provider;
    const adminSigner = new ethers.Wallet(adminPrivateKey, provider);

    // Verify admin signer
    if (adminSigner.address.toLowerCase() !== adminAddress.toLowerCase()) {
      throw new Error(`Admin private key does not match admin address. Expected: ${adminAddress}, Got: ${adminSigner.address}`);
    }

    // Get marketplace contract
    const marketplace = await ethers.getContractAt(MARKETPLACE_ABI as any, MARKETPLACE_PROXY);

    // Check current fee
    console.log(`🔍 Checking current marketplace fee...`);
    const currentFee = await marketplace.getMarketplaceFee();
    console.log(`   Current Fee: ${currentFee.toString()}`);
    console.log(`   Current Fee Rate: ${(Number(currentFee) / 10000 * 100).toFixed(2)}%\n`);

    // Target fee: 250 basis points = 2.5%
    const targetFee = 250n;

    if (currentFee === targetFee) {
      console.log(`✅ Marketplace fee is already set correctly (2.5%)\n`);
      
      // Test calculation
      console.log(`🧮 Testing calculation with Asset 11, 1 token:`);
      const [totalCost, marketplaceFee] = await marketplace.calculatePurchaseCost(11n, 1n);
      console.log(`   Total Cost: ${ethers.formatEther(totalCost)} ETH`);
      console.log(`   Marketplace Fee: ${ethers.formatEther(marketplaceFee)} ETH\n`);
      
      if (totalCost === ethers.parseEther('0.001025')) {
        console.log(`✅ Calculation is correct!\n`);
      } else {
        console.log(`⚠️  Calculation still seems incorrect. Expected: 0.001025 ETH\n`);
      }
      return;
    }

    // Check admin permissions
    console.log(`🔍 Checking admin permissions...`);
    const FEE_MANAGER_ROLE = await marketplace.FEE_MANAGER_ROLE();
    const hasRole = await marketplace.hasRole(FEE_MANAGER_ROLE, adminSigner.address);
    
    if (!hasRole) {
      console.log(`❌ Admin wallet does not have FEE_MANAGER_ROLE`);
      console.log(`   Address: ${adminSigner.address}`);
      console.log(`   Role: ${FEE_MANAGER_ROLE}\n`);
      console.log(`💡 Solution: Grant FEE_MANAGER_ROLE to ${adminSigner.address} on the marketplace contract\n`);
      process.exit(1);
    }

    console.log(`   ✅ Admin has FEE_MANAGER_ROLE\n`);

    // Set correct fee
    console.log(`⚙️  Setting marketplace fee to ${targetFee} (2.5%)...`);
    const marketplaceWithSigner = marketplace.connect(adminSigner);
    const tx = await (marketplaceWithSigner as any).setMarketplaceFee(targetFee);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log(`   Waiting for confirmation...\n`);

    const receipt = await tx.wait();
    console.log(`✅ Marketplace fee updated successfully!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}\n`);

    // Verify update
    console.log(`🔍 Verifying update...`);
    const newFee = await marketplace.getMarketplaceFee();
    if (newFee === targetFee) {
      console.log(`✅ Verification successful!`);
      console.log(`   New Fee: ${newFee.toString()} (${(Number(newFee) / 10000 * 100).toFixed(2)}%)\n`);
    } else {
      console.log(`❌ Verification failed!`);
      console.log(`   Expected: ${targetFee.toString()}`);
      console.log(`   Got: ${newFee.toString()}`);
      process.exit(1);
    }

    // Test calculation
    console.log(`🧮 Testing calculation with Asset 11, 1 token:`);
    const [totalCost, marketplaceFee] = await marketplace.calculatePurchaseCost(11n, 1n);
    const expectedBasePrice = ethers.parseEther('0.001'); // 0.001 ETH per token
    const expectedFee = (expectedBasePrice * targetFee) / 10000n; // 2.5% fee
    const expectedTotalCost = expectedBasePrice + expectedFee; // 0.001025 ETH

    console.log(`   Expected Base Price: ${ethers.formatEther(expectedBasePrice)} ETH`);
    console.log(`   Expected Fee (2.5%): ${ethers.formatEther(expectedFee)} ETH`);
    console.log(`   Expected Total Cost: ${ethers.formatEther(expectedTotalCost)} ETH`);
    console.log(`\n   Actual Total Cost: ${ethers.formatEther(totalCost)} ETH`);
    console.log(`   Actual Marketplace Fee: ${ethers.formatEther(marketplaceFee)} ETH\n`);

    if (totalCost === expectedTotalCost) {
      console.log(`✅ Calculation is now correct!\n`);
    } else {
      console.log(`⚠️  Calculation still doesn't match expected value.`);
      console.log(`   Difference: ${ethers.formatEther(totalCost > expectedTotalCost ? totalCost - expectedTotalCost : expectedTotalCost - totalCost)} ETH\n`);
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   SUMMARY                                                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`✅ Marketplace fee fixed: ${(Number(newFee) / 10000 * 100).toFixed(2)}%`);
    console.log(`✅ Purchase cost calculation should now work correctly\n`);

  } catch (error: any) {
    console.error('❌ Fix failed:', error.message);
    
    if (error.transaction) {
      console.error(`   Transaction hash: ${error.transaction.hash}`);
    }
    
    if (error.message.includes('AccessControl')) {
      console.log(`\n💡 Solution: Ensure admin wallet has FEE_MANAGER_ROLE on the marketplace contract`);
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

