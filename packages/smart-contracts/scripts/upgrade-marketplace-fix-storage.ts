import { ethers, upgrades, network } from "hardhat";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MARKETPLACE_PROXY = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || "0x5295d340a0B06A2552C2169E5D238849550ea9Fe";

/**
 * Upgrade Marketplace Contract to Fix Storage Layout Corruption
 * 
 * This script upgrades the RWAMarketplaceUpgradeable contract to fix the
 * storage layout corruption issue where _marketplaceFeePercentage reads from
 * the wrong storage slot.
 * 
 * Steps:
 * 1. Deploy new implementation with verified storage layout
 * 2. Upgrade proxy to new implementation
 * 3. Re-initialize _marketplaceFeePercentage to 250 (2.5%)
 * 4. Verify fix
 */

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   UPGRADE MARKETPLACE - FIX STORAGE LAYOUT                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.config.chainId})`);
  console.log(`\n👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH\n`);

  // Check current implementation
  const currentImpl = await upgrades.erc1967.getImplementationAddress(MARKETPLACE_PROXY);
  console.log(`📋 Current Implementation: ${currentImpl}\n`);

  // Check current fee (should be corrupted)
  const MARKETPLACE_ABI = [
    "function getMarketplaceFee() view returns (uint256)",
    "function setMarketplaceFee(uint256 newFeePercentage)",
    "function FEE_MANAGER_ROLE() view returns (bytes32)",
    "function hasRole(bytes32 role, address account) view returns (bool)",
  ];

  const marketplace = await ethers.getContractAt(MARKETPLACE_ABI, MARKETPLACE_PROXY);
  const currentFee = await marketplace.getMarketplaceFee();
  console.log(`🔍 Current Fee: ${currentFee.toString()} basis points`);
  console.log(`   Expected: 250 basis points (2.5%)\n`);

  if (currentFee.toString() === "250") {
    console.log("⚠️  Fee appears correct, but may be reading from wrong slot.");
    console.log("   Proceeding with upgrade to ensure storage layout is correct.\n");
  }

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 1: DEPLOY NEW IMPLEMENTATION");
  console.log("======================================================================\n");

  console.log("   📦 Deploying new marketplace implementation...");
  const RWAMarketplaceUpgradeable = await ethers.getContractFactory("RWAMarketplaceUpgradeable");
  const newMarketplaceImpl = await RWAMarketplaceUpgradeable.deploy();
  await newMarketplaceImpl.waitForDeployment();
  const newMarketplaceImplAddress = await newMarketplaceImpl.getAddress();
  console.log(`   ✅ New implementation deployed: ${newMarketplaceImplAddress}\n`);

  // Verify code exists
  const code = await ethers.provider.getCode(newMarketplaceImplAddress);
  if (code === "0x") {
    console.error("❌ Deployed implementation has no code!");
    process.exit(1);
  }
  console.log(`   ✅ Implementation has code (${code.length / 2 - 1} bytes)\n`);

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 2: REGISTER EXISTING PROXY");
  console.log("======================================================================\n");

  // Register existing proxy if not already registered
  // forceImport registers the proxy with the current implementation
  try {
    console.log("   📝 Registering existing proxy with Hardhat upgrades plugin...");
    console.log(`   Proxy: ${MARKETPLACE_PROXY}`);
    console.log(`   Current Implementation: ${currentImpl}\n`);
    
    // Create a mock instance of the current implementation for forceImport
    // This tells Hardhat what the proxy is pointing to
    const currentImplContract = await ethers.getContractAt("RWAMarketplaceUpgradeable", currentImpl);
    
    // Use forceImport to register the proxy
    // This creates a deployment record so Hardhat knows about the proxy
    await upgrades.forceImport(MARKETPLACE_PROXY, RWAMarketplaceUpgradeable);
    console.log("   ✅ Proxy registered successfully\n");
  } catch (error: any) {
    const errorMsg = error.message.toLowerCase();
    if (errorMsg.includes("already registered") || 
        errorMsg.includes("already exists") ||
        errorMsg.includes("duplicate")) {
      console.log("   ✅ Proxy already registered\n");
    } else {
      console.warn(`   ⚠️  Could not register proxy: ${error.message}`);
      console.warn("   Attempting upgrade with prepareUpgrade instead...\n");
      
      // Try alternative approach: prepare upgrade and use proxy admin directly
      try {
        const preparedImpl = await upgrades.prepareUpgrade(MARKETPLACE_PROXY, RWAMarketplaceUpgradeable);
        console.log(`   ✅ Prepared upgrade to: ${preparedImpl}`);
        console.log("   Will use proxy admin for upgrade...\n");
      } catch (prepError: any) {
        console.error(`   ❌ Could not prepare upgrade: ${prepError.message}\n`);
        throw prepError;
      }
    }
  }

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 3: UPGRADE PROXY");
  console.log("======================================================================\n");

  console.log("   ⬆️  Upgrading marketplace proxy to new implementation...");
  console.log(`   Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   New Implementation: ${newMarketplaceImplAddress}\n`);

  let upgradeReceipt:   any = null;
  let upgradeTx: any = null;

  try {
    // Try using upgrades.upgradeProxy first
    const upgradedMarketplace = await upgrades.upgradeProxy(MARKETPLACE_PROXY, RWAMarketplaceUpgradeable);
    await upgradedMarketplace.waitForDeployment();
    const upgradeTx = upgradedMarketplace.deploymentTransaction();
    
    if (upgradeTx) {
      console.log(`   Transaction Hash: ${upgradeTx.hash}`);
      console.log("   Waiting for confirmation...\n");
      upgradeReceipt = await upgradeTx.wait();
      console.log(`   ✅ Upgrade successful!`);
      console.log(`   Block: ${upgradeReceipt.blockNumber}`);
      console.log(`   Gas Used: ${upgradeReceipt.gasUsed.toString()}\n`);
    } else {
      console.log(`   ✅ Upgrade successful!\n`);
    }
    
  } catch (error: any) {
    const errorMsg = error.message.toLowerCase();
    if (errorMsg.includes("not registered") || 
        errorMsg.includes("execution reverted") ||
        errorMsg.includes("revert")) {
      if (errorMsg.includes("execution reverted") || errorMsg.includes("revert")) {
        console.log("   ⚠️  Upgrade via Hardhat failed (execution reverted), using direct upgrade...\n");
        console.log("   💡 This usually means missing UPGRADER_ROLE or storage layout issue.\n");
      } else {
        console.log("   ⚠️  Proxy not registered with Hardhat, using direct upgrade...\n");
      }
      
      // Use prepareUpgrade to validate, then upgrade via proxy's own function (UUPS)
      try {
        const preparedImpl = await upgrades.prepareUpgrade(MARKETPLACE_PROXY, RWAMarketplaceUpgradeable);
        console.log(`   ✅ Prepared upgrade validated: ${preparedImpl}`);
        
        // Get the proxy contract and call upgradeTo directly (UUPS pattern)
        const PROXY_ABI = [
          "function upgradeTo(address newImplementation) external",
          "function UPGRADER_ROLE() view returns (bytes32)",
          "function hasRole(bytes32 role, address account) view returns (bool)",
        ];
        
        const proxy = await ethers.getContractAt(PROXY_ABI, MARKETPLACE_PROXY);
        
        // Check if deployer has UPGRADER_ROLE
        console.log("   🔍 Checking deployer permissions...");
        const UPGRADER_ROLE = await proxy.UPGRADER_ROLE();
        console.log(`   UPGRADER_ROLE: ${UPGRADER_ROLE}`);
        const hasRole = await proxy.hasRole(UPGRADER_ROLE, deployer.address);
        console.log(`   Deployer (${deployer.address}) has UPGRADER_ROLE: ${hasRole ? '✅ YES' : '❌ NO'}\n`);
        
        if (!hasRole) {
          console.error("   ❌ Deployer does not have UPGRADER_ROLE on proxy");
          console.error("   💡 Solution: Grant UPGRADER_ROLE to deployer address");
          console.error(`      Run: grantRole(${UPGRADER_ROLE}, ${deployer.address})`);
          throw new Error("Deployer does not have UPGRADER_ROLE on proxy");
        }
        
        console.log("   ✅ Deployer has UPGRADER_ROLE, calling upgradeTo...");
        const upgradeTx = await proxy.upgradeTo(newMarketplaceImplAddress);
        console.log(`   Transaction Hash: ${upgradeTx.hash}`);
        console.log("   Waiting for confirmation...\n");
        
        upgradeReceipt = await upgradeTx.wait();
        console.log(`   ✅ Upgrade successful!`);
        console.log(`   Block: ${upgradeReceipt.blockNumber}`);
        console.log(`   Gas Used: ${upgradeReceipt.gasUsed.toString()}\n`);
        
      } catch (directError: any) {
        console.error(`❌ Error during direct upgrade: ${directError.message}`);
        if (directError.message.includes("storage")) {
          console.error("\n💡 Storage layout mismatch detected!");
          console.error("   This may require manual storage slot correction.");
        }
        throw directError;
      }
    } else {
      console.error(`❌ Error during upgrade: ${error.message}`);
      if (error.message.includes("storage")) {
        console.error("\n💡 Storage layout mismatch detected!");
        console.error("   This may require manual storage slot correction.");
      }
      throw error;
    }
  }

  const verifiedImpl = await upgrades.erc1967.getImplementationAddress(MARKETPLACE_PROXY);
  console.log(`   ✅ Verified: Proxy now points to ${verifiedImpl}\n`);

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 4: RE-INITIALIZE FEE PERCENTAGE");
  console.log("======================================================================\n");

  const upgradedMarketplace = await ethers.getContractAt(MARKETPLACE_ABI, MARKETPLACE_PROXY);
  
  // Check permissions
  const FEE_MANAGER_ROLE = await upgradedMarketplace.FEE_MANAGER_ROLE();
  const hasRole = await upgradedMarketplace.hasRole(FEE_MANAGER_ROLE, deployer.address);
  
  if (!hasRole) {
    console.error("❌ Deployer does not have FEE_MANAGER_ROLE.");
    console.error("   Cannot re-initialize fee percentage.\n");
    process.exit(1);
  }
  console.log("   ✅ Deployer has FEE_MANAGER_ROLE\n");

  // Check fee after upgrade
  const feeAfterUpgrade = await upgradedMarketplace.getMarketplaceFee();
  console.log(`   Fee after upgrade: ${feeAfterUpgrade.toString()} basis points\n`);

  if (feeAfterUpgrade.toString() !== "250") {
    console.log("   ⚙️  Setting fee percentage to 250 (2.5%)...");
    const setFeeTx = await upgradedMarketplace.setMarketplaceFee(250);
    console.log(`   Transaction Hash: ${setFeeTx.hash}`);
    console.log("   Waiting for confirmation...\n");
    
    const receipt = await setFeeTx.wait();
    console.log(`   ✅ Fee set successfully!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}\n`);
  } else {
    console.log("   ✅ Fee is already correct (250 basis points)\n");
  }

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 5: VERIFY FIX");
  console.log("======================================================================\n");

  const finalFee = await upgradedMarketplace.getMarketplaceFee();
  console.log(`   Final Fee: ${finalFee.toString()} basis points`);
  
  if (finalFee.toString() === "250") {
    console.log("   ✅ Fee percentage is CORRECT!\n");
  } else {
    console.error("   ❌ Fee percentage is still incorrect!");
    console.error(`      Expected: 250, Got: ${finalFee.toString()}\n`);
    console.error("   ⚠️  Storage layout may still be corrupted.");
    console.error("   May need to check storage slots directly.\n");
    process.exit(1);
  }

  // Test cost calculation
  const CALC_ABI = [
    "function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)",
  ];
  const marketplaceCalc = await ethers.getContractAt(CALC_ABI, MARKETPLACE_PROXY);
  
  const testAssetId = 30;
  const testTokenAmount = 1;
  
  try {
    const [totalCost, fee] = await marketplaceCalc.calculatePurchaseCost(testAssetId, testTokenAmount);
    const expectedTotalCost = ethers.parseEther("0.546666666666666632"); // Approximate
    
    console.log(`   🧪 Testing cost calculation for Asset ID ${testAssetId}, ${testTokenAmount} token:`);
    console.log(`   Total Cost: ${ethers.formatEther(totalCost)} ETH`);
    console.log(`   Fee: ${ethers.formatEther(fee)} ETH`);
    console.log(`   Expected Total: ~0.5466 ETH\n`);
    
    // Check if result is reasonable (within 10% of expected)
    const diff = totalCost > expectedTotalCost 
      ? totalCost - expectedTotalCost 
      : expectedTotalCost - totalCost;
    const percentDiff = Number(diff) / Number(expectedTotalCost);
    
    if (percentDiff < 0.1) {
      console.log("   ✅ Cost calculation is CORRECT!\n");
    } else {
      console.error("   ⚠️  Cost calculation may still be incorrect.");
      console.error(`      Difference: ${ethers.formatEther(diff)} ETH (${(percentDiff * 100).toFixed(2)}%)\n`);
    }
  } catch (error: any) {
    console.warn(`   ⚠️  Could not test cost calculation: ${error.message}\n`);
  }

  console.log("════════════════════════════════════════════════════════════");
  console.log("✅ UPGRADE COMPLETE");
  console.log("════════════════════════════════════════════════════════════\n");
  console.log("📝 Summary:");
  console.log(`   - Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   - Old Implementation: ${currentImpl}`);
  console.log(`   - New Implementation: ${newMarketplaceImplAddress}`);
  console.log(`   - Fee Fixed: ${currentFee.toString()} → 250\n`);
  console.log("🔗 View on Etherscan:");
  console.log(`   Marketplace Proxy: https://sepolia.etherscan.io/address/${MARKETPLACE_PROXY}`);
  console.log(`   New Implementation: https://sepolia.etherscan.io/address/${newMarketplaceImplAddress}\n`);
  console.log("🧪 Next Steps:");
  console.log("   1. Verify fee with: bun run scripts/check-marketplace-fee.ts");
  console.log("   2. Test purchase: bun run scripts/test-usdc-purchase.ts 30 1");
  console.log("   3. Monitor for any issues\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

