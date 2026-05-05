#!/usr/bin/env ts-node

/**
 * Verify Contract Existence on Sepolia
 *
 * Checks if contracts exist at the addresses specified in environment variables
 */

import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Verifying contract existence on Sepolia...\n");

  const [deployer] = await ethers.getSigners();
  const provider = deployer.provider;

  // Contract addresses from environment variables
  const contracts = {
    registry: process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY,
    marketplace: process.env.NEXT_PUBLIC_RWA_MARKETPLACE,
    factory: process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY,
    factory404: process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY_404,
  };

  for (const [name, address] of Object.entries(contracts)) {
    if (!address) {
      console.error(`❌ ${name}: No address in environment variables`);
      continue;
    }

    try {
      const code = await provider.getCode(address);
      if (code === '0x') {
        console.error(`❌ ${name}: Contract not deployed at ${address}`);
      } else {
        console.log(`✅ ${name}: Contract exists at ${address}`);

        // Try to get basic info if it's a known contract type
        if (name === 'registry') {
          try {
            const contract = new ethers.Contract(address, [
              "function getTotalAssets() view returns (uint256)"
            ], provider);
            const totalAssets = await contract.getTotalAssets();
            console.log(`   📊 Total assets: ${totalAssets}`);
          } catch (error) {
            console.log(`   ⚠️  Could not query registry: ${error.message}`);
          }
        }

        if (name === 'marketplace') {
          try {
            const contract = new ethers.Contract(address, [
              "function getMarketplaceFee() view returns (uint256)"
            ], provider);
            const fee = await contract.getMarketplaceFee();
            console.log(`   💰 Marketplace fee: ${fee} basis points (${Number(fee) / 100}%)`);
          } catch (error) {
            console.log(`   ⚠️  Could not query marketplace: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ ${name}: Error checking ${address}: ${error.message}`);
    }
  }

  console.log("\n🎉 Contract existence verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });