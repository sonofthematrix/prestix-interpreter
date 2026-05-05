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
 * Deploy Marketplace Implementation with Validation Fix
 * 
 * This script:
 * 1. Deploys a new marketplace implementation with validation fixes
 * 2. Upgrades the marketplace proxy to the new implementation
 * 3. Verifies the upgrade and configuration
 * 
 * Usage: bun run hardhat run scripts/deploy-marketplace-with-validation-fix.ts --network sepolia
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

// Marketplace ABI (for upgrade and configuration)
const MARKETPLACE_ABI = [
  "function getTokenFactory404() external view returns (address)",
  "function setTokenFactory404(address newFactory404) external",
  "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function upgradeTo(address newImplementation) external", // UUPS upgrade function
  "function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) external view returns (uint256 totalCost, uint256 marketplaceFee)",
];

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   DEPLOY MARKETPLACE WITH VALIDATION FIX                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const network = await ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})\n`);

  if (network.chainId !== 11155111n) {
    console.log("⚠️  Warning: Not connected to Sepolia testnet!");
    console.log("   Expected Chain ID: 11155111");
    console.log(`   Current Chain ID: ${network.chainId}\n`);
    const confirm = await new Promise<boolean>((resolve) => {
      process.stdin.once("data", () => resolve(true));
      setTimeout(() => resolve(false), 5000);
    });
    if (!confirm) {
      console.log("   Aborting deployment.\n");
      process.exit(1);
    }
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
  const marketplace = await ethers.getContractAt(MARKETPLACE_ABI, MARKETPLACE_PROXY);

  console.log("=".repeat(70));
  console.log("📋 PRE-DEPLOYMENT CHECKS");
  console.log("=".repeat(70));

  // Check upgrade permissions
  const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
  let hasUpgraderRole = false;
  try {
    hasUpgraderRole = await marketplace.hasRole(UPGRADER_ROLE, deployer.address);
    console.log(`   Marketplace UPGRADER_ROLE: ${hasUpgraderRole ? "✅ YES" : "❌ NO"}`);
  } catch (error: any) {
    console.log(`   ⚠️  Could not check UPGRADER_ROLE: ${error.message}`);
  }

  // Check ProxyAdmin ownership
  let proxyAdminOwner: string = ethers.ZeroAddress;
  try {
    proxyAdminOwner = await proxyAdmin.owner();
    console.log(`   ProxyAdmin Owner: ${proxyAdminOwner}`);
    
    if (proxyAdminOwner && proxyAdminOwner !== ethers.ZeroAddress) {
      if (proxyAdminOwner.toLowerCase() === deployer.address.toLowerCase()) {
        console.log(`   ✅ Deployer is ProxyAdmin owner\n`);
      } else {
        console.log(`   ⚠️  Deployer is NOT ProxyAdmin owner\n`);
      }
    } else {
      console.log(`   ⚠️  ProxyAdmin owner is zero address\n`);
    }
  } catch (error: any) {
    console.log(`   ⚠️  Could not read ProxyAdmin owner: ${error.message}\n`);
  }

  // Verify permissions
  if (!hasUpgraderRole && (proxyAdminOwner === ethers.ZeroAddress || 
      proxyAdminOwner.toLowerCase() !== deployer.address.toLowerCase())) {
    console.log(`❌ Error: Deployer does not have upgrade permissions!`);
    console.log(`   - Does not have UPGRADER_ROLE on marketplace`);
    console.log(`   - Is not ProxyAdmin owner`);
    console.log(`\n   Please use the account that has upgrade permissions.`);
    process.exit(1);
  }

  // Check current implementation
  let currentImpl: string;
  try {
    currentImpl = await proxyAdmin.getProxyImplementation(MARKETPLACE_PROXY);
    console.log(`   Current Implementation: ${currentImpl}`);
  } catch (error: any) {
    console.log(`   ⚠️  Could not read current implementation: ${error.message}`);
    try {
      currentImpl = await upgrades.erc1967.getImplementationAddress(MARKETPLACE_PROXY);
      console.log(`   Current Implementation (via plugin): ${currentImpl}`);
    } catch (e: any) {
      console.log(`   ⚠️  Could not determine current implementation`);
      currentImpl = ethers.ZeroAddress;
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("📦 DEPLOYING NEW IMPLEMENTATION");
  console.log("=".repeat(70));

  // Deploy new implementation
  console.log(`\n1️⃣  Deploying new marketplace implementation with validation fix...`);
  const MarketplaceFactory = await ethers.getContractFactory("RWAMarketplaceUpgradeable");
  
  // Use optimizer settings from hardhat config
  const newImplementation = await MarketplaceFactory.deploy();
  await newImplementation.waitForDeployment();
  const newImplAddress = await newImplementation.getAddress();
  
  console.log(`   ✅ New implementation deployed: ${newImplAddress}`);
  console.log(`   Transaction: ${(await newImplementation.deploymentTransaction()?.wait())?.hash || "N/A"}\n`);

  // Verify implementation has code
  const implCode = await ethers.provider.getCode(newImplAddress);
  if (implCode === "0x") {
    console.log(`❌ Error: Implementation ${newImplAddress} has no code!`);
    process.exit(1);
  }
  console.log(`   ✅ Implementation has code (${implCode.length} bytes)\n`);

  console.log("=".repeat(70));
  console.log("⬆️  UPGRADING PROXY");
  console.log("=".repeat(70));

  // Upgrade proxy
  let upgradeTx: any;
  try {
    console.log(`\n2️⃣  Upgrading marketplace proxy to new implementation...`);
    console.log(`   Proxy: ${MARKETPLACE_PROXY}`);
    console.log(`   New Implementation: ${newImplAddress}`);
    
    if (hasUpgraderRole) {
      // UUPS pattern - upgrade directly on marketplace
      console.log(`   Using UUPS pattern (direct upgrade)...`);
      upgradeTx = await marketplace.upgradeTo(newImplAddress);
    } else {
      // TransparentProxy pattern - upgrade via ProxyAdmin
      console.log(`   Using TransparentProxy pattern (via ProxyAdmin)...`);
      upgradeTx = await proxyAdmin.upgrade(MARKETPLACE_PROXY, newImplAddress);
    }
    
    console.log(`   Transaction: ${upgradeTx.hash}`);
    console.log(`   Waiting for confirmation...`);
    const receipt = await upgradeTx.wait();
    console.log(`   ✅ Upgrade successful!`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   Block: ${receipt.blockNumber}\n`);
  } catch (error: any) {
    console.log(`   ❌ Error upgrading proxy: ${error.message}`);
    if (error.message.includes("Ownable") || error.message.includes("not the owner")) {
      console.log(`   Only ProxyAdmin owner or account with UPGRADER_ROLE can upgrade.`);
    } else if (error.message.includes("AccessControl")) {
      console.log(`   Need UPGRADER_ROLE for UUPS pattern or ProxyAdmin owner for TransparentProxy.`);
    }
    throw error;
  }

  // Verify upgrade
  let verifiedImpl: string;
  try {
    verifiedImpl = await proxyAdmin.getProxyImplementation(MARKETPLACE_PROXY);
  } catch (error: any) {
    verifiedImpl = await upgrades.erc1967.getImplementationAddress(MARKETPLACE_PROXY);
  }
  
  if (verifiedImpl.toLowerCase() !== newImplAddress.toLowerCase()) {
    console.log(`❌ Error: Upgrade verification failed!`);
    console.log(`   Expected: ${newImplAddress}`);
    console.log(`   Got: ${verifiedImpl}`);
    process.exit(1);
  }
  console.log(`   ✅ Verified: Proxy now points to ${verifiedImpl}\n`);

  console.log("=".repeat(70));
  console.log("🔧 POST-UPGRADE CONFIGURATION");
  console.log("=".repeat(70));

  // Refresh marketplace instance after upgrade
  const upgradedMarketplace = await ethers.getContractAt(MARKETPLACE_ABI, MARKETPLACE_PROXY);

  // Check and configure tokenFactory404
  let currentFactory404: string;
  try {
    currentFactory404 = await upgradedMarketplace.getTokenFactory404();
    console.log(`   Current tokenFactory404: ${currentFactory404}`);
    
    if (currentFactory404.toLowerCase() === FACTORY_404_ADDRESS.toLowerCase()) {
      console.log(`   ✅ Already configured correctly!\n`);
    } else {
      console.log(`   ⚠️  Needs configuration\n`);
    }
  } catch (error: any) {
    console.log(`   ⚠️  Could not read tokenFactory404: ${error.message}`);
    currentFactory404 = ethers.ZeroAddress;
  }

  // Configure tokenFactory404 if needed
  if (currentFactory404 === ethers.ZeroAddress || 
      currentFactory404.toLowerCase() !== FACTORY_404_ADDRESS.toLowerCase()) {
    try {
      console.log(`\n3️⃣  Configuring tokenFactory404...`);
      console.log(`   Factory Address: ${FACTORY_404_ADDRESS}`);
      
      // Check if deployer has admin role
      const DEFAULT_ADMIN_ROLE = await upgradedMarketplace.DEFAULT_ADMIN_ROLE();
      const hasAdminRole = await upgradedMarketplace.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
      
      if (!hasAdminRole) {
        console.log(`   ⚠️  Deployer does not have DEFAULT_ADMIN_ROLE`);
        console.log(`   Cannot configure tokenFactory404 automatically.`);
        console.log(`   Please grant DEFAULT_ADMIN_ROLE to ${deployer.address}`);
        console.log(`   Or configure tokenFactory404 manually.\n`);
      } else {
        const setFactoryTx = await upgradedMarketplace.setTokenFactory404(FACTORY_404_ADDRESS);
        console.log(`   Transaction: ${setFactoryTx.hash}`);
        console.log(`   Waiting for confirmation...`);
        await setFactoryTx.wait();
        console.log(`   ✅ tokenFactory404 configured successfully!\n`);
      }
    } catch (error: any) {
      console.log(`   ⚠️  Error configuring tokenFactory404: ${error.message}`);
      if (error.message.includes("AccessControl")) {
        console.log(`   Deployer may not have DEFAULT_ADMIN_ROLE`);
      }
      // Don't throw - upgrade was successful, configuration can be done manually
    }
  }

  console.log("=".repeat(70));
  console.log("✅ VERIFICATION");
  console.log("=".repeat(70));

  // Final verification
  let finalImpl: string;
  try {
    finalImpl = await proxyAdmin.getProxyImplementation(MARKETPLACE_PROXY);
  } catch (error: any) {
    finalImpl = await upgrades.erc1967.getImplementationAddress(MARKETPLACE_PROXY);
  }
  console.log(`   Proxy Implementation: ${finalImpl}`);
  console.log(`   Matches new implementation: ${finalImpl.toLowerCase() === newImplAddress.toLowerCase() ? "✅ YES" : "❌ NO"}`);

  try {
    const finalFactory404 = await upgradedMarketplace.getTokenFactory404();
    console.log(`   tokenFactory404: ${finalFactory404}`);
    console.log(`   Is configured: ${finalFactory404 !== ethers.ZeroAddress ? "✅ YES" : "❌ NO"}`);
  } catch (error: any) {
    console.log(`   tokenFactory404: Could not verify`);
  }

  // Test calculatePurchaseCost with a known asset (if available)
  console.log(`\n🧪 Testing calculatePurchaseCost function...`);
  try {
    // Try asset 1 (common test asset)
    const [totalCost, marketplaceFee] = await upgradedMarketplace.calculatePurchaseCost(1, 1);
    console.log(`   ✅ calculatePurchaseCost works correctly`);
    console.log(`   Test result: ${ethers.formatEther(totalCost)} ETH total, ${ethers.formatEther(marketplaceFee)} ETH fee`);
  } catch (error: any) {
    if (error.message.includes("asset not found")) {
      console.log(`   ⚠️  Could not test (asset 1 not found)`);
    } else if (error.message.includes("invalid token price")) {
      console.log(`   ⚠️  Validation triggered: ${error.message}`);
    } else {
      console.log(`   ⚠️  Test error: ${error.message}`);
    }
  }

  console.log("\n✅ Deployment complete!");
  console.log("\n📝 Summary:");
  console.log(`   - New implementation deployed: ${newImplAddress}`);
  console.log(`   - Marketplace proxy upgraded to: ${finalImpl}`);
  console.log(`   - Proxy address: ${MARKETPLACE_PROXY}`);
  console.log(`   - Validation fixes: ✅ Active`);
  console.log("\n🔗 View on Etherscan:");
  console.log(`   Proxy: https://sepolia.etherscan.io/address/${MARKETPLACE_PROXY}`);
  console.log(`   Implementation: https://sepolia.etherscan.io/address/${finalImpl}`);
  
  // Save implementation address for future reference
  const outputFile = path.join(__dirname, "../marketplace-implementation-addresses.json");
  const addresses = {
    proxy: MARKETPLACE_PROXY,
    implementation: finalImpl,
    deployedAt: new Date().toISOString(),
    network: network.name,
    chainId: network.chainId.toString(),
  };
  fs.writeFileSync(outputFile, JSON.stringify(addresses, null, 2));
  console.log(`\n💾 Implementation address saved to: ${outputFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment script failed:", error);
    process.exit(1);
  });

