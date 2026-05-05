#!/usr/bin/env ts-node

/**
 * TPT Staking - Simple Dry Run Test
 * 
 * Performs basic validation of the deployment pipeline
 */

import { ethers, network } from "hardhat";
import fs from "fs";

async function main() {
  console.log("🧪 TPT Staking - Dry Run Test");
  console.log("===============================");
  console.log(`Network: ${network.name}`);
  
  let passed = 0;
  let failed = 0;
  let warnings = 0;
  
  // Test 1: Contract compilation
  try {
    await ethers.getContractFactory("TigerStaking");
    await ethers.getContractFactory("TigerRevenue");
    await ethers.getContractFactory("RWARewardDistributor");
    console.log("✅ Contract compilation: PASS");
    passed++;
  } catch (error) {
    console.log("❌ Contract compilation: FAIL");
    console.error(error);
    failed++;
  }
  
  // Test 2: Master deployment script exists
  if (fs.existsSync("scripts/deploy-ecosystem-with-proxies.ts")) {
    console.log("✅ Master deployment script: PASS");
    passed++;
  } else {
    console.log("❌ Master deployment script: FAIL");
    failed++;
  }
  
  // Test 3: Mainnet deployment script exists
  if (fs.existsSync("scripts/deploy-ecosystem-mainnet.ts")) {
    console.log("✅ Mainnet deployment script: PASS");
    passed++;
  } else {
    console.log("❌ Mainnet deployment script: FAIL");
    failed++;
  }
  
  // Test 4: Network directories exist
  const networkDirs = ["deployments/mainnet", "deployments/sepolia", "abis/mainnet", "abis/sepolia"];
  const missingDirs = networkDirs.filter(dir => !fs.existsSync(dir));
  
  if (missingDirs.length === 0) {
    console.log("✅ Network directories: PASS");
    passed++;
  } else {
    console.log(`⚠️ Network directories: WARNING (missing: ${missingDirs.join(", ")})`);
    warnings++;
  }
  
  // Test 5: Package.json scripts
  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const requiredScripts = ["deploy:ecosystem:sepolia", "deploy:ecosystem:mainnet"];
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
    
    if (missingScripts.length === 0) {
      console.log("✅ Package.json scripts: PASS");
      passed++;
    } else {
      console.log(`❌ Package.json scripts: FAIL (missing: ${missingScripts.join(", ")})`);
      failed++;
    }
  } catch (error) {
    console.log("❌ Package.json scripts: FAIL");
    failed++;
  }
  
  // Test 6: OpenZeppelin version
  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const ozVersion = packageJson.dependencies["@openzeppelin/contracts-upgradeable"];
    
    if (ozVersion && ozVersion.includes("4.9.6")) {
      console.log(`✅ OpenZeppelin version: PASS (${ozVersion})`);
      passed++;
    } else {
      console.log(`⚠️ OpenZeppelin version: WARNING (${ozVersion})`);
      warnings++;
    }
  } catch (error) {
    console.log("❌ OpenZeppelin version: FAIL");
    failed++;
  }
  
  // Summary
  console.log("\n📊 Dry Run Test Summary");
  console.log("======================");
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️ Warnings: ${warnings}`);
  
  if (failed > 0) {
    console.error("❌ Dry run test failed!");
    process.exit(1);
  } else if (warnings > 0) {
    console.warn("⚠️ Dry run test completed with warnings");
    process.exit(0);
  } else {
    console.log("✅ Dry run test passed!");
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Dry run test failed:", error);
    process.exit(1);
  });
}
