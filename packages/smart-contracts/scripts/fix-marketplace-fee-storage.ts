import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MARKETPLACE_PROXY = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || "0x5295d340a0B06A2552C2169E5D238849550ea9Fe";

/**
 * Calculate storage slot for _marketplaceFeePercentage
 * 
 * Storage layout (approximate):
 * Slot 0-7: Inherited from OpenZeppelin contracts
 * Slot 8: assetRegistry (IRWAAssetRegistry - stored as address)
 * Slot 9: tokenFactory (address)
 * Slot 10: tokenFactory404 (address)
 * Slot 11: _listingIdCounter (CountersUpgradeable.Counter - uses 1 slot)
 * Slot 12+: Mappings (don't take direct slots, use keccak256)
 * Slot ?: _marketplaceFeePercentage (uint256)
 * 
 * Since mappings don't take slots, _marketplaceFeePercentage should be around slot 12-13
 * But due to storage layout shifts, we need to find it empirically.
 */
async function findStorageSlot() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_INFURA_RPC_URL);
  
  // Try slots 0-20 to find where 250 might be stored (or where corrupted value is)
  const targetValue = 250n;
  const corruptedValue = 815492690561245246858434306133286459396883480647n;
  
  console.log("🔍 Searching for storage slot containing fee percentage...\n");
  
  for (let slot = 0; slot <= 20; slot++) {
    try {
      const value = await provider.getStorage(MARKETPLACE_PROXY, slot);
      const valueBigInt = BigInt(value);
      
      if (valueBigInt === targetValue || valueBigInt === corruptedValue) {
        console.log(`   Slot ${slot}: ${valueBigInt.toString()}`);
        if (valueBigInt === targetValue) {
          console.log(`   ✅ Found correct value (250) at slot ${slot}`);
        } else {
          console.log(`   ❌ Found corrupted value at slot ${slot}`);
        }
      }
    } catch (error) {
      // Skip errors
    }
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   FIX MARKETPLACE FEE - DIRECT STORAGE ACCESS             ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.config.chainId})`);
  console.log(`\n👤 Deployer: ${deployer.address}\n`);

  // First, try to find the storage slot
  await findStorageSlot();
  
  console.log("\n💡 Note: Direct storage slot manipulation requires a custom contract.");
  console.log("   The issue is likely a storage layout mismatch in the upgradeable proxy.");
  console.log("   The best solution is to upgrade the contract with correct storage layout.\n");
  
  console.log("🔧 Recommended Solution:");
  console.log("   1. Ensure storage gap is properly sized");
  console.log("   2. Redeploy marketplace implementation with correct storage layout");
  console.log("   3. Upgrade proxy to new implementation");
  console.log("   4. Re-initialize _marketplaceFeePercentage if needed\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

