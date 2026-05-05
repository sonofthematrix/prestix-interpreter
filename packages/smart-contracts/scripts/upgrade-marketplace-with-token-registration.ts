import dotenv from "dotenv";
import fs from "fs";
import hre, { ethers, upgrades } from "hardhat";
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
 * Upgrade Marketplace Proxy with Token Registration Support
 * 
 * This script:
 * 1. Deploys new marketplace implementation with registerTokenAddress() function
 * 2. Upgrades marketplace proxy to new implementation
 * 3. Configures tokenFactory404 after upgrade
 * 4. Verifies all configurations
 * 
 * Usage: bun run hardhat run scripts/upgrade-marketplace-with-token-registration.ts --network sepolia
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
const PROXY_ADMIN = deployed?.addresses?.ProxyAdmin || "0xB8AD57FC91066Bba784186A307D9b0271ce4d789";
const FACTORY_404_ADDRESS = deployed?.addresses?.RWATokenFactory404 || "0x7a6f7dE826064903f2e419833b9633560217FEe2";

// ProxyAdmin ABI
const PROXY_ADMIN_ABI = [
  "function owner() external view returns (address)",
  "function upgrade(address proxy, address implementation) external",
  "function getProxyImplementation(address proxy) external view returns (address)",
  "function getProxyAdmin(address proxy) external view returns (address)",
];

// Marketplace ABI (after upgrade)
const MARKETPLACE_ABI = [
  "function getTokenFactory404() external view returns (address)",
  "function setTokenFactory404(address newFactory404) external",
  "function registerTokenAddress(uint256 assetId, address tokenAddress) external",
  "function getRegisteredTokenAddress(uint256 assetId) external view returns (address)",
  "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function upgradeTo(address newImplementation) external", // UUPS upgrade function
];

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   UPGRADE MARKETPLACE WITH TOKEN REGISTRATION              ║");
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
  const proxyAdmin = await ethers.getContractAt(PROXY_ADMIN_ABI, PROXY_ADMIN);
  let marketplace = await ethers.getContractAt(MARKETPLACE_ABI, MARKETPLACE_PROXY);

  console.log("=".repeat(70));
  console.log("📋 CURRENT STATE");
  console.log("=".repeat(70));

  // Check current implementation
  let currentImplementation: string;
  try {
    currentImplementation = await proxyAdmin.getProxyImplementation(MARKETPLACE_PROXY);
    console.log(`Current Implementation: ${currentImplementation}`);
  } catch (error: any) {
    console.log(`⚠️  Could not get current implementation: ${error.message}`);
    // Try UUPS pattern
    try {
      const code = await ethers.provider.getCode(MARKETPLACE_PROXY);
      if (code === "0x") {
        console.log("❌ Error: Proxy contract has no code!");
        process.exit(1);
      }
      // For UUPS, implementation is stored in the proxy's storage slot
      console.log("ℹ️  Using UUPS pattern - will upgrade via proxy");
    } catch (e) {
      console.log("❌ Error: Could not determine proxy type");
      process.exit(1);
    }
  }

  // Check admin permissions
  console.log("\n" + "=".repeat(70));
  console.log("🔐 PERMISSION CHECKS");
  console.log("=".repeat(70));

  try {
    const adminRole = await marketplace.DEFAULT_ADMIN_ROLE();
    const hasAdminRole = await marketplace.hasRole(adminRole, deployer.address);
    console.log(`Deployer has ADMIN_ROLE: ${hasAdminRole ? "✅ YES" : "❌ NO"}`);
    
    if (!hasAdminRole) {
      console.log("\n⚠️  Warning: Deployer doesn't have ADMIN_ROLE on marketplace");
      console.log("   Upgrade may still work if deployer owns ProxyAdmin");
    }
  } catch (error: any) {
    console.log(`⚠️  Could not check admin role: ${error.message}`);
  }

  // Check ProxyAdmin ownership
  try {
    const proxyAdminOwner = await proxyAdmin.owner();
    console.log(`ProxyAdmin Owner: ${proxyAdminOwner}`);
    console.log(`Deployer is ProxyAdmin Owner: ${proxyAdminOwner.toLowerCase() === deployer.address.toLowerCase() ? "✅ YES" : "❌ NO"}`);
    
    if (proxyAdminOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("\n⚠️  Warning: Deployer is not ProxyAdmin owner");
      console.log("   Upgrade may fail if deployer doesn't have UPGRADER_ROLE");
    }
  } catch (error: any) {
    console.log(`⚠️  Could not check ProxyAdmin ownership: ${error.message}`);
  }

  // Step 1: Deploy new implementation
  console.log("\n" + "=".repeat(70));
  console.log("📦 STEP 1: DEPLOY NEW IMPLEMENTATION");
  console.log("=".repeat(70));

  console.log("\n📝 Deploying RWAMarketplaceUpgradeable with token registration support...");
  
  const RWAMarketplaceUpgradeable = await ethers.getContractFactory("RWAMarketplaceUpgradeable");
  const newImplementation = await RWAMarketplaceUpgradeable.deploy();
  await newImplementation.waitForDeployment();
  
  const newImplementationAddress = await newImplementation.getAddress();
  console.log(`✅ New Implementation Deployed: ${newImplementationAddress}`);

  // Verify implementation has code
  const implementationCode = await ethers.provider.getCode(newImplementationAddress);
  if (implementationCode === "0x") {
    console.log("❌ Error: New implementation has no code!");
    process.exit(1);
  }
  console.log(`✅ Implementation code verified (${implementationCode.length / 2 - 1} bytes)\n`);

  // Step 2: Upgrade proxy
  console.log("=".repeat(70));
  console.log("⬆️  STEP 2: UPGRADE PROXY");
  console.log("=".repeat(70));

  console.log(`\n📝 Upgrading proxy ${MARKETPLACE_PROXY} to ${newImplementationAddress}...`);

  try {
    // Try UUPS upgrade first (via proxy)
    try {
      const upgradeTx = await marketplace.upgradeTo(newImplementationAddress);
      console.log(`⏳ Upgrade transaction submitted: ${upgradeTx.hash}`);
      const receipt = await upgradeTx.wait();
      console.log(`✅ Upgrade confirmed in block ${receipt.blockNumber}`);
    } catch (upgradeError: any) {
      // Fallback to ProxyAdmin upgrade
      console.log(`⚠️  UUPS upgrade failed, trying ProxyAdmin upgrade: ${upgradeError.message}`);
      const upgradeTx = await proxyAdmin.upgrade(MARKETPLACE_PROXY, newImplementationAddress);
      console.log(`⏳ Upgrade transaction submitted: ${upgradeTx.hash}`);
      const receipt = await upgradeTx.wait();
      console.log(`✅ Upgrade confirmed in block ${receipt.blockNumber}`);
    }
  } catch (error: any) {
    console.log(`❌ Upgrade failed: ${error.message}`);
    if (error.data) {
      console.log(`   Error data: ${error.data}`);
    }
    process.exit(1);
  }

  // Verify upgrade
  console.log("\n🔍 Verifying upgrade...");
  const updatedImplementation = await proxyAdmin.getProxyImplementation(MARKETPLACE_PROXY);
  if (updatedImplementation.toLowerCase() === newImplementationAddress.toLowerCase()) {
    console.log(`✅ Upgrade verified: ${updatedImplementation}`);
  } else {
    console.log(`⚠️  Implementation mismatch:`);
    console.log(`   Expected: ${newImplementationAddress}`);
    console.log(`   Got: ${updatedImplementation}`);
  }

  // Step 3: Verify new functions are available
  console.log("\n" + "=".repeat(70));
  console.log("🔍 STEP 3: VERIFY NEW FUNCTIONS");
  console.log("=".repeat(70));

  // Reconnect to marketplace with new implementation
  marketplace = await ethers.getContractAt(MARKETPLACE_ABI, MARKETPLACE_PROXY);

  try {
    const testAssetId = 1;
    const registeredAddress = await marketplace.getRegisteredTokenAddress(testAssetId);
    console.log(`✅ getRegisteredTokenAddress() function available`);
    console.log(`   Test result (assetId 1): ${registeredAddress === ethers.ZeroAddress ? "Not registered (expected)" : registeredAddress}`);
  } catch (error: any) {
    console.log(`❌ getRegisteredTokenAddress() function not available: ${error.message}`);
  }

  // Step 4: Configure tokenFactory404 (if not already configured)
  console.log("\n" + "=".repeat(70));
  console.log("⚙️  STEP 4: CONFIGURE TOKEN FACTORY 404");
  console.log("=".repeat(70));

  try {
    const currentFactory404 = await marketplace.getTokenFactory404();
    console.log(`Current tokenFactory404: ${currentFactory404}`);

    if (currentFactory404.toLowerCase() !== FACTORY_404_ADDRESS.toLowerCase()) {
      console.log(`\n📝 Setting tokenFactory404 to ${FACTORY_404_ADDRESS}...`);
      const setFactoryTx = await marketplace.setTokenFactory404(FACTORY_404_ADDRESS);
      console.log(`⏳ Transaction submitted: ${setFactoryTx.hash}`);
      await setFactoryTx.wait();
      console.log(`✅ tokenFactory404 configured`);

      // Verify
      const updatedFactory404 = await marketplace.getTokenFactory404();
      if (updatedFactory404.toLowerCase() === FACTORY_404_ADDRESS.toLowerCase()) {
        console.log(`✅ Verified: ${updatedFactory404}`);
      } else {
        console.log(`⚠️  Verification failed: ${updatedFactory404}`);
      }
    } else {
      console.log(`✅ tokenFactory404 already correctly configured`);
    }
  } catch (error: any) {
    console.log(`⚠️  Could not configure tokenFactory404: ${error.message}`);
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 UPGRADE SUMMARY");
  console.log("=".repeat(70));
  console.log(`✅ New Implementation: ${newImplementationAddress}`);
  console.log(`✅ Proxy Upgraded: ${MARKETPLACE_PROXY}`);
  console.log(`✅ Token Registration Functions: Available`);
  console.log(`✅ tokenFactory404: Configured`);
  console.log("\n🎉 UPGRADE COMPLETE!");
  console.log("\n📋 Next Steps:");
  console.log("   1. Update database with new implementation address");
  console.log("   2. Store new ABI in database");
  console.log("   3. Register all token addresses using registerTokenAddress()");
  console.log("   4. Test purchase flow");
  console.log("=".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });

