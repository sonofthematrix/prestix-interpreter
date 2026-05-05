import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MARKETPLACE_PROXY = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || "0x5295d340a0B06A2552C2169E5D238849550ea9Fe";

/**
 * Direct Fix Marketplace Fee Storage Slot
 * 
 * This script directly reads and writes the storage slot containing _marketplaceFeePercentage
 * to fix storage corruption issues.
 * 
 * Storage Layout (RWAMarketplaceUpgradeable):
 * - Slot 0-7: Inherited from OpenZeppelin contracts (AccessControl, Pausable, etc.)
 * - Slot 8: assetRegistry (IRWAAssetRegistry - stored as address)
 * - Slot 9: tokenFactory (address)
 * - Slot 10: tokenFactory404 (address)
 * - Slot 11: _listingIdCounter (CountersUpgradeable.Counter - uint256)
 * - Slot 12+: Mappings (don't take direct slots)
 * - Slot ?: _marketplaceFeePercentage (uint256) ← CORRUPTED
 * 
 * We need to find the exact slot by reading storage directly.
 */

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   DIRECT FIX MARKETPLACE FEE STORAGE                        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.config.chainId})`);
  console.log(`\n👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH\n`);

  const MARKETPLACE_ABI = [
    "function getMarketplaceFee() view returns (uint256)",
    "function setMarketplaceFee(uint256 newFeePercentage)",
    "function FEE_MANAGER_ROLE() view returns (bytes32)",
    "function hasRole(bytes32 role, address account) view returns (bool)",
  ];

  const marketplace = await ethers.getContractAt(MARKETPLACE_ABI, MARKETPLACE_PROXY);

  console.log("🔍 Step 1: Check current fee via contract function...");
  const currentFeeViaFunction = await marketplace.getMarketplaceFee();
  console.log(`   Via getMarketplaceFee(): ${currentFeeViaFunction.toString()} basis points\n`);

  console.log("🔍 Step 2: Check permissions...");
  const FEE_MANAGER_ROLE = await marketplace.FEE_MANAGER_ROLE();
  const hasRole = await marketplace.hasRole(FEE_MANAGER_ROLE, deployer.address);
  
  if (!hasRole) {
    console.error("❌ Deployer does not have FEE_MANAGER_ROLE.");
    console.error("   Please grant FEE_MANAGER_ROLE to deployer address first.\n");
    process.exit(1);
  }
  console.log("   ✅ Deployer has FEE_MANAGER_ROLE\n");

  // Try to fix using setMarketplaceFee (should work if storage is accessible)
  console.log("⚙️  Step 3: Attempting to fix via setMarketplaceFee()...");
  console.log("   This should write directly to the storage slot.\n");
  
  try {
    const tx = await marketplace.setMarketplaceFee(250);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log("   Waiting for confirmation...\n");
    
    const receipt = await tx.wait();
    console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}\n`);

    console.log("🔍 Step 4: Verifying fix...");
    // Wait a moment for state to update
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newFee = await marketplace.getMarketplaceFee();
    console.log(`   New Fee (via function): ${newFee.toString()} basis points`);
    
    // Also check via direct RPC call (like the check script does)
    const provider = deployer.provider;
    const directContract = new ethers.Contract(
      MARKETPLACE_PROXY,
      ["function getMarketplaceFee() view returns (uint256)"],
      provider
    );
    const directFee = await directContract.getMarketplaceFee();
    console.log(`   New Fee (direct RPC): ${directFee.toString()} basis points\n`);
    
    if (newFee.toString() === "250" && directFee.toString() === "250") {
      console.log("   ✅ Fee percentage fixed successfully!\n");
    } else {
      console.error("   ❌ Fee percentage is still incorrect!");
      console.error(`      Expected: 250`);
      console.error(`      Via function: ${newFee.toString()}`);
      console.error(`      Via direct RPC: ${directFee.toString()}\n`);
      
      if (newFee.toString() === "250" && directFee.toString() !== "250") {
        console.error("   ⚠️  Hardhat shows correct value but direct RPC shows corrupted value.");
        console.error("   This suggests a caching issue or different provider endpoints.\n");
      }
      
      process.exit(1);
    }

    console.log("════════════════════════════════════════════════════════════");
    console.log("✅ FIX COMPLETE");
    console.log("════════════════════════════════════════════════════════════\n");
    console.log("📝 Summary:");
    console.log(`   - Fixed _marketplaceFeePercentage: ${currentFeeViaFunction.toString()} → 250`);
    console.log(`   - Transaction: ${receipt.hash}`);
    console.log(`   - Block: ${receipt.blockNumber}\n`);
    console.log("🧪 Next Steps:");
    console.log("   1. Verify with: bun run scripts/check-marketplace-fee.ts");
    console.log("   2. Test cost calculation: bun run scripts/test-usdc-purchase.ts 30 1");
    console.log("   3. Verify cost is now correct\n");
    
  } catch (error: any) {
    console.error(`❌ Error during fix: ${error.message}`);
    if (error.message.includes("revert") || error.message.includes("execution reverted")) {
      console.error("\n💡 Transaction reverted. Possible causes:");
      console.error("   1. Storage slot corruption preventing write");
      console.error("   2. Missing FEE_MANAGER_ROLE (though we checked)");
      console.error("   3. Contract paused or access control issue");
      console.error("\n   May need to upgrade contract to fix storage layout.\n");
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

