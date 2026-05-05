import dotenv from "dotenv";
import fs from "fs";
import hre, { ethers } from "hardhat";
import path from "path";

// Load environment variables from both .env.local and .env
const envLocalPath = path.join(__dirname, "../.env.local");
const envPath = path.join(__dirname, "../.env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

/**
 * Fix Marketplace 404 Factory Configuration
 * 
 * This script fixes critical issues found in the marketplace configuration:
 * 1. Grants TOKEN_CREATOR_ROLE to marketplace on 404 factory
 * 2. Configures tokenFactory404 on marketplace proxy
 * 3. Verifies all configurations are correct
 * 
 * Usage: bun run hardhat run scripts/fix-marketplace-404-configuration.ts --network sepolia
 */

// Load deployed addresses
function loadDeployedAddresses(): any {
  const addressesFile = path.join(__dirname, "../deployed-addresses-proxy.json");
  try {
    if (fs.existsSync(addressesFile)) {
      const data = fs.readFileSync(addressesFile, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading deployed addresses:", error);
  }
  return null;
}

const deployed = loadDeployedAddresses();
const MARKETPLACE_PROXY = deployed?.addresses?.RWAMarketplace || process.env.NEXT_PUBLIC_RWA_MARKETPLACE_ADDRESS || "0x5295d340a0B06A2552C2169E5D238849550ea9Fe";
const FACTORY_404_ADDRESS = deployed?.addresses?.RWATokenFactory404 || "0x7a6f7dE826064903f2e419833b9633560217FEe2";

// Factory 404 ABI
const FACTORY_404_ABI = [
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function grantRole(bytes32 role, address account) external",
  "function TOKEN_CREATOR_ROLE() external view returns (bytes32)",
];

// Marketplace ABI
const MARKETPLACE_ABI = [
  "function getTokenFactory404() external view returns (address)",
  "function setTokenFactory404(address newFactory404) external",
  "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",
];

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   FIX MARKETPLACE 404 FACTORY CONFIGURATION               ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const network = await ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})\n`);

  if (network.chainId !== 11155111n) {
    console.log("⚠️  Warning: Not connected to Sepolia testnet!");
    console.log("   Expected Chain ID: 11155111");
    console.log(`   Current Chain ID: ${network.chainId}\n`);
    process.exit(1);
  }

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    console.log("❌ Error: Deployer has no balance. Cannot execute transactions.");
    process.exit(1);
  }

  // Get contract instances
  const factory404 = await ethers.getContractAt(FACTORY_404_ABI, FACTORY_404_ADDRESS);
  const marketplace = await ethers.getContractAt(MARKETPLACE_ABI, MARKETPLACE_PROXY);

  console.log("=".repeat(70));
  console.log("📋 CURRENT STATE");
  console.log("=".repeat(70));

  // Check current state
  const TOKEN_CREATOR_ROLE = await factory404.TOKEN_CREATOR_ROLE();
  const hasRole = await factory404.hasRole(TOKEN_CREATOR_ROLE, MARKETPLACE_PROXY);
  
  // Try to read current factory404, but don't fail if function doesn't exist
  let currentFactory404 = ethers.ZeroAddress;
  try {
    currentFactory404 = await marketplace.getTokenFactory404();
  } catch (error: any) {
    console.log(`   ⚠️  Could not read tokenFactory404 (function may not exist in current implementation)`);
    console.log(`   Will proceed with setting it anyway...`);
  }

  console.log(`   Marketplace Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   404 Factory: ${FACTORY_404_ADDRESS}`);
  console.log(`   Marketplace has TOKEN_CREATOR_ROLE: ${hasRole ? "✅ YES" : "❌ NO"}`);
  console.log(`   Marketplace tokenFactory404: ${currentFactory404 === ethers.ZeroAddress ? "Not configured" : currentFactory404}`);
  console.log(`   Is configured: ${currentFactory404 !== ethers.ZeroAddress ? "✅ YES" : "❌ NO"}\n`);

  console.log("=".repeat(70));
  console.log("🔧 APPLYING FIXES");
  console.log("=".repeat(70));

  // Fix 1: Grant TOKEN_CREATOR_ROLE to marketplace
  if (!hasRole) {
    console.log("\n1️⃣  Granting TOKEN_CREATOR_ROLE to marketplace...");
    try {
      const tx1 = await factory404.grantRole(TOKEN_CREATOR_ROLE, MARKETPLACE_PROXY);
      console.log(`   Transaction: ${tx1.hash}`);
      console.log(`   Waiting for confirmation...`);
      await tx1.wait();
      console.log(`   ✅ TOKEN_CREATOR_ROLE granted successfully!`);
    } catch (error: any) {
      console.log(`   ❌ Error granting role: ${error.message}`);
      if (error.message.includes("AccessControl")) {
        console.log(`   ⚠️  Deployer may not have DEFAULT_ADMIN_ROLE on factory`);
      }
      throw error;
    }
  } else {
    console.log("\n1️⃣  Marketplace already has TOKEN_CREATOR_ROLE ✅");
  }

  // Fix 2: Configure tokenFactory404 on marketplace
  if (currentFactory404 === ethers.ZeroAddress) {
    console.log("\n2️⃣  Configuring tokenFactory404 on marketplace...");
    try {
      const tx2 = await marketplace.setTokenFactory404(FACTORY_404_ADDRESS);
      console.log(`   Transaction: ${tx2.hash}`);
      console.log(`   Waiting for confirmation...`);
      await tx2.wait();
      console.log(`   ✅ tokenFactory404 configured successfully!`);
    } catch (error: any) {
      console.log(`   ❌ Error configuring factory404: ${error.message}`);
      if (error.message.includes("AccessControl")) {
        console.log(`   ⚠️  Deployer may not have DEFAULT_ADMIN_ROLE on marketplace`);
      }
      throw error;
    }
  } else {
    if (currentFactory404.toLowerCase() === FACTORY_404_ADDRESS.toLowerCase()) {
      console.log("\n2️⃣  tokenFactory404 already configured correctly ✅");
    } else {
      console.log(`\n2️⃣  tokenFactory404 is set to different address: ${currentFactory404}`);
      console.log(`   Updating to correct address...`);
      try {
        const tx2 = await marketplace.setTokenFactory404(FACTORY_404_ADDRESS);
        console.log(`   Transaction: ${tx2.hash}`);
        console.log(`   Waiting for confirmation...`);
        await tx2.wait();
        console.log(`   ✅ tokenFactory404 updated successfully!`);
      } catch (error: any) {
        console.log(`   ❌ Error updating factory404: ${error.message}`);
        throw error;
      }
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ VERIFICATION");
  console.log("=".repeat(70));

  // Verify fixes
  const hasRoleAfter = await factory404.hasRole(TOKEN_CREATOR_ROLE, MARKETPLACE_PROXY);
  
  let factory404After = ethers.ZeroAddress;
  try {
    factory404After = await marketplace.getTokenFactory404();
  } catch (error: any) {
    console.log(`   ⚠️  Could not verify tokenFactory404 (function may not exist)`);
  }

  console.log(`   Marketplace has TOKEN_CREATOR_ROLE: ${hasRoleAfter ? "✅ YES" : "❌ NO"}`);
  console.log(`   Marketplace tokenFactory404: ${factory404After === ethers.ZeroAddress ? "Could not verify" : factory404After}`);
  console.log(`   Is configured: ${factory404After !== ethers.ZeroAddress ? "✅ YES" : "⚠️  Could not verify"}`);

  if (hasRoleAfter && factory404After.toLowerCase() === FACTORY_404_ADDRESS.toLowerCase()) {
    console.log("\n✅ All fixes applied successfully!");
    console.log("\n📝 Summary:");
    console.log(`   - Marketplace now has TOKEN_CREATOR_ROLE on 404 factory`);
    console.log(`   - Marketplace tokenFactory404 is configured: ${factory404After}`);
    console.log(`   - Marketplace can now mint ERC404 tokens`);
  } else {
    console.log("\n⚠️  Some fixes may not have been applied correctly.");
    if (!hasRoleAfter) {
      console.log(`   - Marketplace still missing TOKEN_CREATOR_ROLE`);
    }
    if (factory404After === ethers.ZeroAddress) {
      console.log(`   - Marketplace tokenFactory404 still not configured`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Fix script failed:", error);
    process.exit(1);
  });

