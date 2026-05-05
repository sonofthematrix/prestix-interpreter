#!/usr/bin/env ts-node

/**
 * TPT Staking Ecosystem - Mainnet Deployment Script
 * 
 * This script is specifically configured for mainnet deployment with:
 * - Enhanced security checks
 * - Gas optimization for mainnet
 * - Mainnet-specific address validation
 * - Production-ready error handling
 */

import { ethers, network } from "hardhat";
import { parseUnits, formatEther } from "ethers/lib/utils";
import fs from "fs";
import path from "path";

// Mainnet-specific configuration
const MAINNET_CONFIG = {
  network: "mainnet",
  gasPrice: parseUnits("30", "gwei"), // Conservative gas price
  maxGasPrice: parseUnits("50", "gwei"), // Maximum acceptable gas price
  confirmations: 5, // Higher confirmations for mainnet
  verifyDelay: 30000, // Longer delay for verification
  addresses: {
    TPT: "0x64945165255bcb83f2Ef9f31a575975832CA4dB4",
    Treasury: "0xF35dB46c803B8AB1A8F2CAaE93f068434df6de52",
    ProxyAdmin: "0x5eF6cC12028EB39AC92646EA45993e1F3F6e9856"
  }
};

// Mainnet deployment state file
const MAINNET_STATE_FILE = "deployments/mainnet/deployment-state.json";
const MAINNET_ADDRESSES_FILE = "deployments/mainnet/addresses.json";

async function main() {
  console.log("🚀 TPT Staking - Mainnet Deployment");
  console.log("=====================================");
  
  // Validate we're on mainnet
  if (network.name !== "mainnet" && network.name !== "homestead") {
    throw new Error("This script is for mainnet deployment only. Use --network mainnet");
  }

  // Pre-deployment validation
  await validateMainnetEnvironment();
  
  // Execute main deployment script with mainnet config
  console.log("📋 Executing main deployment script with mainnet configuration...");
  
  // Set mainnet-specific environment variables
  process.env.RELEASE_NETWORK_GUARD = "mainnet";
  process.env.MAINNET_TIGERPALACE_TOKEN = MAINNET_CONFIG.addresses.TPT;
  process.env.MAINNET_TREASURY = MAINNET_CONFIG.addresses.Treasury;
  process.env.MAINNET_PROXY_ADMIN_ADDRESS = MAINNET_CONFIG.addresses.ProxyAdmin;
  
  // Execute main deployment script directly
  await import("./deploy-ecosystem-with-proxies");
  
  // Post-deployment mainnet-specific validation
  await postDeploymentMainnetValidation();
}

async function validateMainnetEnvironment() {
  console.log("🔍 Validating mainnet environment...");
  
  // Check environment variables
  const requiredEnvVars = [
    "DEPLOYER_PRIVATE_KEY",
    "INFURA_API_KEY", 
    "ETHERSCAN_API_KEY",
    "PROXYADMIN_OWNER_EXPECTED"
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
  
  // Validate deployer balance
  const [deployer] = await ethers.getSigners();
  const balance = await deployer.getBalance();
  const minBalance = parseUnits("0.1", "ether"); // Minimum 0.1 ETH for mainnet
  
  if (balance.lt(minBalance)) {
    throw new Error(`Insufficient deployer balance. Required: ${formatEther(minBalance)} ETH, Available: ${formatEther(balance)} ETH`);
  }
  
  // Check gas price
  const currentGasPrice = await ethers.provider.getGasPrice();
  if (currentGasPrice.gt(MAINNET_CONFIG.maxGasPrice)) {
    throw new Error(`Gas price too high: ${formatEther(currentGasPrice)} ETH. Max allowed: ${formatEther(MAINNET_CONFIG.maxGasPrice)} ETH`);
  }
  
  console.log("✅ Mainnet environment validation passed");
}

async function postDeploymentMainnetValidation() {
  console.log("🔍 Performing mainnet-specific post-deployment validation...");
  
  // Load deployment addresses
  if (!fs.existsSync(MAINNET_ADDRESSES_FILE)) {
    throw new Error("Mainnet addresses file not found");
  }
  
  const addresses = JSON.parse(fs.readFileSync(MAINNET_ADDRESSES_FILE, "utf8"));
  
  // Validate all contracts are deployed
  const requiredContracts = [
    "RewardDistributor_Implementation",
    "TigerRevenue_Implementation", 
    "TigerStaking_Implementation",
    "RewardDistributor_Proxy",
    "TigerRevenue_Proxy",
    "TigerStaking_Proxy"
  ];
  
  for (const contract of requiredContracts) {
    if (!addresses.addresses[contract] || addresses.addresses[contract] === "") {
      throw new Error(`Missing deployment address for: ${contract}`);
    }
  }
  
  // Validate contract verification
  if (addresses.verification.status !== "completed") {
    console.warn("⚠️ Contract verification not completed. Manual verification may be required.");
  }
  
  console.log("✅ Mainnet post-deployment validation completed");
  console.log("🎉 Mainnet deployment successful!");
}

// Error handling
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled promise rejection:", error);
  process.exit(1);
});

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Mainnet deployment failed:", error);
      process.exit(1);
    });
}
