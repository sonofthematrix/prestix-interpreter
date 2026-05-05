/**
 * Verify TigerPalaceToken Proxy Contract
 * 
 * Verifies the TigerPalaceToken proxy contract deployed on Sepolia.
 * 
 * Usage: bun hardhat run scripts/verify-tigerpalace-token-proxy.ts --network sepolia
 */

import "dotenv/config";
import hre from "hardhat";
import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   TIGERPALACE TOKEN PROXY VERIFICATION                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  // Load deployment addresses
  const addressesFile = path.join(__dirname, "../deployed-addresses-proxy.json");
  if (!fs.existsSync(addressesFile)) {
    console.log(`❌ Error: Deployment file not found: ${addressesFile}`);
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(addressesFile, "utf-8"));
  const tokenProxyAddress = deployment.addresses.TigerPalaceToken;
  const proxyAdminAddress = deployment.addresses.ProxyAdmin;
  
  if (!tokenProxyAddress) {
    console.log("❌ Error: TigerPalaceToken address not found in deployment file");
    process.exit(1);
  }
  
  console.log(`📡 Network: sepolia`);
  console.log(`📍 Token Proxy: ${tokenProxyAddress}`);
  console.log(`👑 Proxy Admin: ${proxyAdminAddress}\n`);
  
  // Get implementation address
  console.log("🔍 Getting implementation address...");
  let implementationAddress: string;
  try {
    implementationAddress = await upgrades.erc1967.getImplementationAddress(tokenProxyAddress);
    console.log(`✅ Implementation: ${implementationAddress}`);
  } catch (error: any) {
    // Fallback to storage slot
    const implementationSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const storageValue = await ethers.provider.getStorage(tokenProxyAddress, implementationSlot);
    const addressHex = storageValue.slice(-40);
    implementationAddress = ethers.getAddress("0x" + addressHex);
    console.log(`✅ Implementation (via storage): ${implementationAddress}`);
  }
  
  // Get admin address
  console.log("🔍 Getting admin address...");
  let adminAddress: string;
  try {
    adminAddress = await upgrades.erc1967.getAdminAddress(tokenProxyAddress);
    console.log(`✅ Admin: ${adminAddress}`);
  } catch (error: any) {
    adminAddress = proxyAdminAddress;
    console.log(`✅ Admin (from deployment): ${adminAddress}`);
  }
  
  // Verify implementation first
  console.log("\n" + "=".repeat(70));
  console.log("1️⃣  Verifying Implementation");
  console.log("=".repeat(70));
  
  try {
    await hre.run("verify:verify", {
      address: implementationAddress,
      contract: "contracts/TigerPalaceToken.sol:TigerPalaceToken",
      constructorArguments: [],
    });
    console.log("✅ Implementation verified!");
  } catch (error: any) {
    if (error.message?.includes("Already Verified") || error.message?.includes("already verified")) {
      console.log("✅ Implementation already verified");
    } else {
      console.log(`⚠️  Implementation verification: ${error.message}`);
    }
  }
  
  await new Promise((resolve) => setTimeout(resolve, 10000));
  
  // Verify proxy
  console.log("\n" + "=".repeat(70));
  console.log("2️⃣  Verifying Proxy");
  console.log("=".repeat(70));
  
  // Get initialization data (initialize function with admin address)
  const TigerPalaceToken = await ethers.getContractFactory("TigerPalaceToken");
  const iface = TigerPalaceToken.interface;
  const initData = iface.encodeFunctionData("initialize", [adminAddress]);
  
  console.log(`   Proxy: ${tokenProxyAddress}`);
  console.log(`   Implementation: ${implementationAddress}`);
  console.log(`   Admin: ${adminAddress}`);
  console.log(`   Init Data: ${initData.slice(0, 20)}...`);
  
  try {
    await hre.run("verify:verify", {
      address: tokenProxyAddress,
      contract: "contracts/proxy/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy",
      constructorArguments: [implementationAddress, adminAddress, initData],
    });
    console.log("✅ Proxy verified successfully!");
  } catch (error: any) {
    if (error.message?.includes("Already Verified") || error.message?.includes("already verified")) {
      console.log("✅ Proxy already verified");
    } else {
      // Try without init data
      try {
        console.log("⚠️  Retrying without init data...");
        await hre.run("verify:verify", {
          address: tokenProxyAddress,
          contract: "contracts/proxy/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy",
          constructorArguments: [implementationAddress, adminAddress, "0x"],
        });
        console.log("✅ Proxy verified (without init data)!");
      } catch (retryError: any) {
        console.log(`⚠️  Proxy verification failed: ${retryError.message}`);
        console.log(`   Note: Check Etherscan directly - proxy may be pre-verified`);
      }
    }
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("📋 SUMMARY");
  console.log("=".repeat(70));
  console.log(`✅ Token Proxy: ${tokenProxyAddress}`);
  console.log(`✅ Implementation: ${implementationAddress}`);
  console.log(`✅ Admin: ${adminAddress}`);
  console.log(`\n🔗 Etherscan: https://sepolia.etherscan.io/address/${tokenProxyAddress}`);
}

main().catch((error) => {
  console.error("❌ Verification failed:", error);
  process.exit(1);
});

