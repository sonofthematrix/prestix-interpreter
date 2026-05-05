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
 * Deploy Marketplace Cost Calculation Fix
 * 
 * This script:
 * 1. Upgrades registry to add getTokenPrice helper function
 * 2. Deploys new marketplace implementation with fix
 * 3. Upgrades marketplace proxy to use fixed implementation
 * 4. Verifies the fix works correctly
 * 
 * Usage: bun run hardhat run scripts/deploy-marketplace-cost-fix.ts --network sepolia
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
const REGISTRY_PROXY = deployed?.addresses?.RWAAssetRegistry || process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || "0xA1fb017a8c89cCB76F63d2244C4a228964B50D80";
const PROXY_ADMIN = deployed?.addresses?.ProxyAdmin || "0xB8AD57FC91066Bba784186A307D9b0271ce4d789";

// ProxyAdmin ABI
const PROXY_ADMIN_ABI = [
  "function owner() external view returns (address)",
  "function upgrade(address proxy, address implementation) external",
  "function getProxyImplementation(address proxy) external view returns (address)",
] as const;

// Registry ABI (for upgrade and testing)
const REGISTRY_ABI = [
  "function getTokenPriceValue(uint256 assetId) external view returns (uint256)",
  "function getAvailableTokens(uint256 assetId) external view returns (uint256)",
  "function getAssetStatus(uint256 assetId) external view returns (uint8)",
  "function upgradeTo(address newImplementation) external",
  "function UPGRADER_ROLE() external view returns (bytes32)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
] as const;

// Marketplace ABI (for upgrade and testing)
const MARKETPLACE_ABI = [
  "function upgradeTo(address newImplementation) external",
  "function UPGRADER_ROLE() external view returns (bytes32)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) external view returns (uint256 totalCost, uint256 marketplaceFee)",
] as const;

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   DEPLOY MARKETPLACE COST CALCULATION FIX                  ║");
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
  const proxyAdmin = await ethers.getContractAt(PROXY_ADMIN_ABI as any, PROXY_ADMIN);
  const registry = await ethers.getContractAt(REGISTRY_ABI as any, REGISTRY_PROXY);
  const marketplace = await ethers.getContractAt(MARKETPLACE_ABI as any, MARKETPLACE_PROXY);

  console.log("=".repeat(70));
  console.log("📋 STEP 1: UPGRADE REGISTRY");
  console.log("=".repeat(70));

  // Check if registry already has getTokenPriceValue
  let registryNeedsUpgrade = false;
  try {
    await registry.getTokenPriceValue(30);
    console.log("   ✅ Registry already has getTokenPriceValue function\n");
  } catch (error: any) {
    if (error.message.includes("function") || error.message.includes("selector")) {
      console.log("   ⚠️  Registry does not have getTokenPriceValue function");
      console.log("   ⚠️  Registry upgrade required\n");
      registryNeedsUpgrade = true;
    } else {
      console.log("   ⚠️  Could not check registry (may need upgrade)\n");
      registryNeedsUpgrade = true;
    }
  }

    if (registryNeedsUpgrade) {
    console.log("   📦 Deploying new registry implementation...");
    const RegistryFactory = await ethers.getContractFactory("RWAAssetRegistryUpgradeable");
    const newRegistryImpl = await RegistryFactory.deploy();
    await newRegistryImpl.waitForDeployment();
    const newRegistryImplAddress = await newRegistryImpl.getAddress();
    console.log(`   ✅ New registry implementation: ${newRegistryImplAddress}\n`);

    // Check upgrade permissions - registry uses UUPS pattern
    const registryWithUpgrade = await ethers.getContractAt(REGISTRY_ABI as any, REGISTRY_PROXY);
    const UPGRADER_ROLE = await registryWithUpgrade.UPGRADER_ROLE();
    const hasUpgraderRole = await registryWithUpgrade.hasRole(UPGRADER_ROLE, deployer.address);
    
    if (!hasUpgraderRole) {
      console.log("   ⚠️  Deployer does not have UPGRADER_ROLE on registry");
      console.log("   ⚠️  Skipping registry upgrade (marketplace fix will fail if registry not upgraded)");
      console.log(`   💡 Grant UPGRADER_ROLE to ${deployer.address} on registry first\n`);
    } else {
      console.log("   ⬆️  Upgrading registry proxy (UUPS pattern)...");
      const upgradeTx = await registryWithUpgrade.upgradeTo(newRegistryImplAddress);
      console.log(`   Transaction: ${upgradeTx.hash}`);
      console.log("   Waiting for confirmation...");
      const receipt = await upgradeTx.wait();
      console.log(`   ✅ Registry upgraded successfully!`);
      console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`   Block: ${receipt.blockNumber}\n`);
    }
  }

  console.log("=".repeat(70));
  console.log("📋 STEP 2: DEPLOY MARKETPLACE FIX");
  console.log("=".repeat(70));

  // Deploy new marketplace implementation
  console.log("\n   📦 Deploying new marketplace implementation with cost calculation fix...");
  const MarketplaceFactory = await ethers.getContractFactory("RWAMarketplaceUpgradeable");
  const newMarketplaceImpl = await MarketplaceFactory.deploy();
  await newMarketplaceImpl.waitForDeployment();
  const newMarketplaceImplAddress = await newMarketplaceImpl.getAddress();
  console.log(`   ✅ New marketplace implementation: ${newMarketplaceImplAddress}\n`);

  // Verify implementation has code
  const implCode = await ethers.provider.getCode(newMarketplaceImplAddress);
  if (implCode === "0x") {
    console.log(`   ❌ Error: Implementation ${newMarketplaceImplAddress} has no code!`);
    process.exit(1);
  }
  console.log(`   ✅ Implementation has code (${implCode.length} bytes)\n`);

  console.log("=".repeat(70));
  console.log("📋 STEP 3: UPGRADE MARKETPLACE PROXY");
  console.log("=".repeat(70));

  // Check upgrade permissions
  const UPGRADER_ROLE_MARKETPLACE = await marketplace.UPGRADER_ROLE();
  const hasUpgraderRoleMarketplace = await marketplace.hasRole(UPGRADER_ROLE_MARKETPLACE, deployer.address);

  if (!hasUpgraderRoleMarketplace) {
    console.log("   ❌ Error: Deployer does not have UPGRADER_ROLE on marketplace");
    console.log("   Cannot upgrade marketplace proxy.");
    process.exit(1);
  }

  // Upgrade marketplace proxy
  console.log("\n   ⬆️  Upgrading marketplace proxy to new implementation...");
  console.log(`   Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   New Implementation: ${newMarketplaceImplAddress}`);
  
  const upgradeTx = await marketplace.upgradeTo(newMarketplaceImplAddress);
  console.log(`   Transaction: ${upgradeTx.hash}`);
  console.log("   Waiting for confirmation...");
  const receipt = await upgradeTx.wait();
  console.log(`   ✅ Upgrade successful!`);
  console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`   Block: ${receipt.blockNumber}\n`);

  // Verify upgrade
  let verifiedImpl: string;
  try {
    verifiedImpl = await proxyAdmin.getProxyImplementation(MARKETPLACE_PROXY);
  } catch (error: any) {
    verifiedImpl = await upgrades.erc1967.getImplementationAddress(MARKETPLACE_PROXY);
  }
  
  if (verifiedImpl.toLowerCase() !== newMarketplaceImplAddress.toLowerCase()) {
    console.log(`   ❌ Error: Upgrade verification failed!`);
    console.log(`   Expected: ${newMarketplaceImplAddress}`);
    console.log(`   Got: ${verifiedImpl}`);
    process.exit(1);
  }
  console.log(`   ✅ Verified: Proxy now points to ${verifiedImpl}\n`);

  console.log("=".repeat(70));
  console.log("📋 STEP 4: VERIFY FIX");
  console.log("=".repeat(70));

  // Refresh marketplace instance after upgrade
  const upgradedMarketplace = await ethers.getContractAt(MARKETPLACE_ABI as any, MARKETPLACE_PROXY);

  // Test cost calculation with asset ID 30
  console.log("\n   🧪 Testing cost calculation for Asset ID 30, 1 token...");
  try {
    // First verify registry functions work
    const tokenPrice = await registry.getTokenPriceValue(30);
    const availableTokens = await registry.getAvailableTokens(30);
    const status = await registry.getAssetStatus(30);
    
    console.log(`   Registry values:`);
    console.log(`     tokenPrice: ${ethers.formatEther(tokenPrice)} ETH`);
    console.log(`     availableTokens: ${availableTokens.toString()}`);
    console.log(`     status: ${status.toString()}\n`);
    
    const [totalCost, fee] = await upgradedMarketplace.calculatePurchaseCost(30, 1);
    const expectedCost = ethers.parseEther("0.5333333333333333"); // Expected base price
    const expectedTotal = expectedCost + (expectedCost * 250n / 10000n); // + 2.5% fee
    
    console.log(`   Marketplace result:`);
    console.log(`     Total Cost: ${ethers.formatEther(totalCost)} ETH`);
    console.log(`     Fee: ${ethers.formatEther(fee)} ETH`);
    console.log(`     Expected Total: ~${ethers.formatEther(expectedTotal)} ETH\n`);

    const difference = totalCost > expectedTotal ? totalCost - expectedTotal : expectedTotal - totalCost;
    const tolerance = ethers.parseEther("0.01"); // 0.01 ETH tolerance
    
    if (difference < tolerance) {
      console.log("   ✅ FIX VERIFIED! Cost calculation is now correct!\n");
    } else {
      console.log(`   ⚠️  Cost calculation still incorrect (difference: ${ethers.formatEther(difference)} ETH)`);
      console.log("   ⚠️  May need to verify registry upgrade completed\n");
    }
  } catch (error: any) {
    console.log(`   ⚠️  Could not test: ${error.message}`);
    if (error.message.includes("getTokenPriceValue") || error.message.includes("getAvailableTokens")) {
      console.log("   ⚠️  Registry may not have been upgraded. Please upgrade registry first.\n");
    }
  }

  console.log("=".repeat(70));
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));
  console.log(`\n📝 Summary:`);
  console.log(`   - Registry Proxy: ${REGISTRY_PROXY}`);
  console.log(`   - Marketplace Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   - New Marketplace Implementation: ${verifiedImpl}`);
  console.log(`   - Fix: Uses getTokenPrice helper to avoid struct unpacking issues\n`);
  console.log("🔗 View on Etherscan:");
  console.log(`   Marketplace Proxy: https://sepolia.etherscan.io/address/${MARKETPLACE_PROXY}`);
  console.log(`   Marketplace Implementation: https://sepolia.etherscan.io/address/${verifiedImpl}`);
  console.log(`   Registry Proxy: https://sepolia.etherscan.io/address/${REGISTRY_PROXY}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment script failed:", error);
    process.exit(1);
  });

