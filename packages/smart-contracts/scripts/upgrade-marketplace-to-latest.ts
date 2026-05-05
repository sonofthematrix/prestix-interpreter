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
 * Upgrade Marketplace Proxy to Latest Implementation
 * 
 * This script:
 * 1. Upgrades marketplace proxy to the verified latest implementation
 * 2. Configures tokenFactory404 after upgrade
 * 3. Verifies all configurations
 * 
 * Usage: bun run hardhat run scripts/upgrade-marketplace-to-latest.ts --network sepolia
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
const LATEST_IMPLEMENTATION = "0x3e8b80714196ecb6925150347215bdf4c1420a8d"; // Verified implementation

// ProxyAdmin ABI (from deployed ABI)
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
  "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function upgradeTo(address newImplementation) external", // UUPS upgrade function
];

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   UPGRADE MARKETPLACE TO LATEST IMPLEMENTATION            ║");
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

  // Check if marketplace uses UUPS pattern (has UPGRADER_ROLE)
  const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
  let hasUpgraderRole = false;
  try {
    hasUpgraderRole = await marketplace.hasRole(UPGRADER_ROLE, deployer.address);
    console.log(`   Marketplace UPGRADER_ROLE check: ${hasUpgraderRole ? "✅ YES" : "❌ NO"}`);
  } catch (error: any) {
    console.log(`   ⚠️  Could not check UPGRADER_ROLE: ${error.message}`);
  }

  // Check ProxyAdmin ownership (for TransparentProxy pattern)
  let proxyAdminOwner: string = ethers.ZeroAddress;
  try {
    proxyAdminOwner = await proxyAdmin.owner();
    console.log(`   ProxyAdmin: ${PROXY_ADMIN}`);
    console.log(`   ProxyAdmin Owner: ${proxyAdminOwner}`);
    console.log(`   Deployer: ${deployer.address}`);
    
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

  // Determine upgrade method
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
    console.log(`   Target Implementation: ${LATEST_IMPLEMENTATION}`);
    
    if (currentImpl.toLowerCase() === LATEST_IMPLEMENTATION.toLowerCase()) {
      console.log(`   ✅ Already on latest implementation!\n`);
    } else {
      console.log(`   ⚠️  Needs upgrade\n`);
    }
  } catch (error: any) {
    console.log(`   ⚠️  Could not read current implementation: ${error.message}`);
    console.log(`   Proceeding with upgrade...\n`);
  }

  // Verify implementation has code
  const implCode = await ethers.provider.getCode(LATEST_IMPLEMENTATION);
  if (implCode === "0x") {
    console.log(`❌ Error: Implementation ${LATEST_IMPLEMENTATION} has no code!`);
    console.log(`   Verify the implementation address is correct.`);
    process.exit(1);
  }
  console.log(`   ✅ Implementation has code (${implCode.length} bytes)\n`);

  console.log("=".repeat(70));
  console.log("⬆️  UPGRADING PROXY");
  console.log("=".repeat(70));

  // Upgrade proxy
  let upgradeTx: any;
  try {
    console.log(`\n1️⃣  Upgrading marketplace proxy to latest implementation...`);
    console.log(`   Proxy: ${MARKETPLACE_PROXY}`);
    console.log(`   New Implementation: ${LATEST_IMPLEMENTATION}`);
    
    if (hasUpgraderRole) {
      // UUPS pattern - upgrade directly on marketplace
      console.log(`   Using UUPS pattern (direct upgrade)...`);
      upgradeTx = await marketplace.upgradeTo(LATEST_IMPLEMENTATION);
    } else {
      // TransparentProxy pattern - upgrade via ProxyAdmin
      console.log(`   Using TransparentProxy pattern (via ProxyAdmin)...`);
      upgradeTx = await proxyAdmin.upgrade(MARKETPLACE_PROXY, LATEST_IMPLEMENTATION);
    }
    
    console.log(`   Transaction: ${upgradeTx.hash}`);
    console.log(`   Waiting for confirmation...`);
    const receipt = await upgradeTx.wait();
    console.log(`   ✅ Upgrade successful!`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   Block: ${receipt.blockNumber}\n`);
  } catch (error: any) {
    if (error.message.includes("Ownable") || error.message.includes("not the owner")) {
      console.log(`   ❌ Error: Deployer is not authorized to upgrade`);
      console.log(`   Only ProxyAdmin owner or account with UPGRADER_ROLE can upgrade.`);
      console.log(`   Please use the account that has upgrade permissions.`);
    } else if (error.message.includes("AccessControl")) {
      console.log(`   ❌ Error: Deployer does not have required role`);
      console.log(`   Need UPGRADER_ROLE for UUPS pattern or ProxyAdmin owner for TransparentProxy.`);
    } else {
      console.log(`   ❌ Error upgrading proxy: ${error.message}`);
    }
    throw error;
  }

  // Verify upgrade
  let newImpl: string;
  try {
    newImpl = await proxyAdmin.getProxyImplementation(MARKETPLACE_PROXY);
  } catch (error: any) {
    // Fallback: use upgrades plugin
    newImpl = await upgrades.erc1967.getImplementationAddress(MARKETPLACE_PROXY);
  }
  
  if (newImpl.toLowerCase() !== LATEST_IMPLEMENTATION.toLowerCase()) {
    console.log(`❌ Error: Upgrade verification failed!`);
    console.log(`   Expected: ${LATEST_IMPLEMENTATION}`);
    console.log(`   Got: ${newImpl}`);
    process.exit(1);
  }
  console.log(`   ✅ Verified: Proxy now points to ${newImpl}\n`);

  console.log("=".repeat(70));
  console.log("🔧 CONFIGURING TOKEN FACTORY 404");
  console.log("=".repeat(70));

  // Get marketplace instance with new ABI (refresh after upgrade)
  marketplace = await ethers.getContractAt(MARKETPLACE_ABI, MARKETPLACE_PROXY);

  // Check current tokenFactory404
  let currentFactory404: string;
  try {
    currentFactory404 = await marketplace.getTokenFactory404();
    console.log(`   Current tokenFactory404: ${currentFactory404}`);
    
    if (currentFactory404.toLowerCase() === FACTORY_404_ADDRESS.toLowerCase()) {
      console.log(`   ✅ Already configured correctly!\n`);
    } else {
      console.log(`   ⚠️  Needs configuration\n`);
    }
  } catch (error: any) {
    console.log(`   ⚠️  Could not read tokenFactory404: ${error.message}`);
    console.log(`   Proceeding with configuration...\n`);
    currentFactory404 = ethers.ZeroAddress;
  }

  // Configure tokenFactory404
  if (currentFactory404 === ethers.ZeroAddress || 
      currentFactory404.toLowerCase() !== FACTORY_404_ADDRESS.toLowerCase()) {
    try {
      console.log(`\n2️⃣  Configuring tokenFactory404...`);
      console.log(`   Factory Address: ${FACTORY_404_ADDRESS}`);
      
      // Check if deployer has admin role
      const DEFAULT_ADMIN_ROLE = await marketplace.DEFAULT_ADMIN_ROLE();
      const hasAdminRole = await marketplace.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
      
      if (!hasAdminRole) {
        console.log(`   ⚠️  Deployer does not have DEFAULT_ADMIN_ROLE`);
        console.log(`   Cannot configure tokenFactory404.`);
        console.log(`   Please grant DEFAULT_ADMIN_ROLE to ${deployer.address}`);
        console.log(`   Or configure tokenFactory404 manually.`);
      } else {
        const setFactoryTx = await marketplace.setTokenFactory404(FACTORY_404_ADDRESS);
        console.log(`   Transaction: ${setFactoryTx.hash}`);
        console.log(`   Waiting for confirmation...`);
        await setFactoryTx.wait();
        console.log(`   ✅ tokenFactory404 configured successfully!\n`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error configuring tokenFactory404: ${error.message}`);
      if (error.message.includes("AccessControl")) {
        console.log(`   ⚠️  Deployer may not have DEFAULT_ADMIN_ROLE`);
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
  console.log(`   Matches target: ${finalImpl.toLowerCase() === LATEST_IMPLEMENTATION.toLowerCase() ? "✅ YES" : "❌ NO"}`);

  try {
    const finalFactory404 = await marketplace.getTokenFactory404();
    console.log(`   tokenFactory404: ${finalFactory404}`);
    console.log(`   Is configured: ${finalFactory404 !== ethers.ZeroAddress ? "✅ YES" : "❌ NO"}`);
  } catch (error: any) {
    console.log(`   tokenFactory404: Could not verify`);
  }

  console.log("\n✅ Upgrade complete!");
  console.log("\n📝 Summary:");
  console.log(`   - Marketplace proxy upgraded to: ${finalImpl}`);
  console.log(`   - Proxy address: ${MARKETPLACE_PROXY}`);
  console.log(`   - tokenFactory404: ${currentFactory404 === ethers.ZeroAddress ? "Needs manual configuration" : "Configured"}`);
  console.log("\n🔗 View on Etherscan:");
  console.log(`   Proxy: https://sepolia.etherscan.io/address/${MARKETPLACE_PROXY}`);
  console.log(`   Implementation: https://sepolia.etherscan.io/address/${finalImpl}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Upgrade script failed:", error);
    process.exit(1);
  });

