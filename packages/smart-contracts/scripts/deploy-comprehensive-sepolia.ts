import "dotenv/config";
import fs from "fs";
import hre from "hardhat";
import path from "path";
const { ethers, network } = hre;

/**
 * Comprehensive RWA Marketplace Deployment Script
 * 
 * Deploys all core contracts with proper initialization and verification
 * 
 * Usage: bun run hardhat run scripts/deploy-comprehensive-sepolia.ts --network sepolia
 */

interface DeploymentResult {
  network: string;
  deployer: string;
  feeRecipient: string;
  contracts: {
    RWAAssetRegistry: string;
    RWATokenFactory: string;
    RWAMarketplace: string;
  };
  deploymentBlock: number;
  gasUsed: {
    registry: string;
    factory: string;
    marketplace: string;
  };
  timestamp: string;
}

async function checkDeployerBalance(): Promise<boolean> {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const ethBalance = ethers.formatEther(balance);
  
  console.log(`💰 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethBalance} ETH`);
  
  const minRequired = 0.1; // Minimum 0.1 ETH recommended
  if (parseFloat(ethBalance) < minRequired) {
    console.log(`⚠️  Warning: Balance below ${minRequired} ETH`);
    console.log(`   Deployment may fail due to insufficient funds`);
    return false;
  }
  
  return true;
}

async function verifyContract(
  address: string,
  contractPath: string,
  constructorArgs: any[] = []
): Promise<boolean> {
  try {
    console.log(`\n🔍 Verifying ${contractPath} at ${address}...`);
    
    await hre.run("verify:verify", {
      address: address,
      contract: contractPath,
      constructorArguments: constructorArgs,
    });
    
    console.log(`✅ Contract verified successfully!`);
    return true;
  } catch (error: any) {
    if (error.message.includes("Already Verified") || error.message.includes("already verified")) {
      console.log(`✅ Contract already verified`);
      return true;
    } else {
      console.log(`⚠️  Verification failed: ${error.message}`);
      console.log(`   You can verify manually later with:`);
      console.log(`   bun run hardhat verify --network sepolia ${address} ${constructorArgs.join(" ")}`);
      return false;
    }
  }
}

function validateEnvironment() {
  console.log("🔍 Validating Environment Variables");
  console.log("=".repeat(70));
  
  const requiredVars: { [key: string]: string | undefined } = {
    SEPOLIA_URL: process.env.SEPOLIA_URL || process.env.SEPOLIA_RPC_URL,
    TGR_DEPLOY_PRVT_KEY: process.env.TGR_DEPLOY_PRVT_KEY,
    TGR_DEPLOY_SEED_PHRASE: process.env.TGR_DEPLOY_SEED_PHRASE,
    PRIVATE_KEY: process.env.PRIVATE_KEY,
  };
  
  const missingVars: string[] = [];
  
  // Check RPC URL
  if (!requiredVars.SEPOLIA_URL) {
    missingVars.push('SEPOLIA_URL or SEPOLIA_RPC_URL');
    console.log("❌ SEPOLIA_URL not set");
  } else {
    console.log(`✅ SEPOLIA_URL: ${requiredVars.SEPOLIA_URL.substring(0, 30)}...`);
  }
  
  // Check for at least one auth method
  const hasAuth = requiredVars.TGR_DEPLOY_PRVT_KEY || 
                  requiredVars.TGR_DEPLOY_SEED_PHRASE || 
                  requiredVars.PRIVATE_KEY;
  
  if (!hasAuth) {
    missingVars.push('TGR_DEPLOY_PRVT_KEY or TGR_DEPLOY_SEED_PHRASE or PRIVATE_KEY');
    console.log("❌ No deployment key found");
  } else {
    if (requiredVars.TGR_DEPLOY_PRVT_KEY) {
      console.log("✅ TGR_DEPLOY_PRVT_KEY: Set");
    } else if (requiredVars.TGR_DEPLOY_SEED_PHRASE) {
      console.log("✅ TGR_DEPLOY_SEED_PHRASE: Set");
    } else {
      console.log("✅ PRIVATE_KEY: Set");
    }
  }
  
  if (missingVars.length > 0) {
    console.log("\n❌ Missing required environment variables:");
    missingVars.forEach(v => console.log(`   - ${v}`));
    console.log("\n📝 Please set these in your .env file:");
    console.log("   SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_KEY");
    console.log("   TGR_DEPLOY_PRVT_KEY=0x...your_private_key");
    console.log("\n   Or use a public RPC:");
    console.log("   SEPOLIA_URL=https://ethereum-sepolia-rpc.publicnode.com");
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  console.log("✅ Environment variables validated\n");
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   COMPREHENSIVE RWA MARKETPLACE DEPLOYMENT                ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  // Load environment variables
  const envLocalPath = path.join(__dirname, "../.env.local");
  const envPath = path.join(__dirname, "../.env");
  
  if (fs.existsSync(envLocalPath)) {
    require("dotenv").config({ path: envLocalPath });
    console.log("📝 Loaded environment variables from .env.local");
  } else if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
    console.log("📝 Loaded environment variables from .env");
  }
  
  // Validate environment variables before connecting to network
  validateEnvironment();
  
  // Check network
  const networkInfo = await ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${networkInfo.chainId})`);
  if (networkInfo.chainId !== 11155111n && network.name !== "hardhat" && network.name !== "localhost") {
    console.log("⚠️  Warning: Not deploying to Sepolia testnet!");
    console.log("   Expected Chain ID: 11155111");
    console.log(`   Current Chain ID: ${networkInfo.chainId}`);
  }
  
  // Check deployer balance
  const hasBalance = await checkDeployerBalance();
  if (!hasBalance && network.name === "sepolia") {
    console.log("\n⚠️  Please fund the deployer wallet and try again");
    process.exit(1);
  }
  
  const [deployer] = await ethers.getSigners();
  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  const marketplaceFeeBps = process.env.MARKETPLACE_FEE_BPS
    ? Number(process.env.MARKETPLACE_FEE_BPS)
    : 250; // Default 2.5%
  
  console.log(`\n📋 Deployment Configuration:`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Fee Recipient: ${feeRecipient}`);
  console.log(`   Marketplace Fee: ${marketplaceFeeBps} bps (${marketplaceFeeBps / 100}%)`);
  
  // ========================================================================
  // 1. Deploy RWAAssetRegistry
  // ========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("1️⃣  Deploying RWAAssetRegistry...");
  console.log("=".repeat(70));
  
  const Registry = await ethers.getContractFactory("RWAAssetRegistry");
  const registryDeployTx = await Registry.deploy();
  const registryReceipt = await registryDeployTx.deploymentTransaction()?.wait();
  await registryDeployTx.waitForDeployment();
  const registryAddress = await registryDeployTx.getAddress();
  
  console.log(`✅ RWAAssetRegistry deployed: ${registryAddress}`);
  console.log(`   Block: ${registryReceipt?.blockNumber || "unknown"}`);
  console.log(`   Gas Used: ${registryReceipt?.gasUsed.toString() || "unknown"}`);
  
  // ========================================================================
  // 2. Deploy RWATokenFactory
  // ========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("2️⃣  Deploying RWATokenFactory...");
  console.log("=".repeat(70));
  
  const Factory = await ethers.getContractFactory("RWATokenFactory");
  const factoryDeployTx = await Factory.deploy();
  const factoryReceipt = await factoryDeployTx.deploymentTransaction()?.wait();
  await factoryDeployTx.waitForDeployment();
  const factoryAddress = await factoryDeployTx.getAddress();
  
  console.log(`✅ RWATokenFactory deployed: ${factoryAddress}`);
  console.log(`   Block: ${factoryReceipt?.blockNumber || "unknown"}`);
  console.log(`   Gas Used: ${factoryReceipt?.gasUsed.toString() || "unknown"}`);
  
  // ========================================================================
  // 3. Deploy RWAMarketplace
  // ========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("3️⃣  Deploying RWAMarketplace...");
  console.log("=".repeat(70));
  
  const Marketplace = await ethers.getContractFactory("RWAMarketplace");
  const marketplaceDeployTx = await Marketplace.deploy(
    registryAddress,
    factoryAddress,
    feeRecipient
  );
  const marketplaceReceipt = await marketplaceDeployTx.deploymentTransaction()?.wait();
  await marketplaceDeployTx.waitForDeployment();
  const marketplaceAddress = await marketplaceDeployTx.getAddress();
  
  console.log(`✅ RWAMarketplace deployed: ${marketplaceAddress}`);
  console.log(`   Block: ${marketplaceReceipt?.blockNumber || "unknown"}`);
  console.log(`   Gas Used: ${marketplaceReceipt?.gasUsed.toString() || "unknown"}`);
  
  // ========================================================================
  // 4. Post-Deployment Configuration
  // ========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("4️⃣  Configuring contracts...");
  console.log("=".repeat(70));
  
  const registry = await ethers.getContractAt("RWAAssetRegistry", registryAddress);
  const factory = await ethers.getContractAt("RWATokenFactory", factoryAddress);
  const marketplace = await ethers.getContractAt("RWAMarketplace", marketplaceAddress);
  
  // 4a) Grant MARKETPLACE_ROLE to marketplace on registry
  console.log("\n🔐 Granting MARKETPLACE_ROLE to marketplace on registry...");
  const tx1 = await registry.addMarketplace(marketplaceAddress);
  const receipt1 = await tx1.wait();
  console.log(`✅ Role granted (Tx: ${receipt1.hash})`);
  
  // 4b) Grant TOKEN_CREATOR_ROLE to marketplace on factory
  console.log("\n🔐 Granting TOKEN_CREATOR_ROLE to marketplace on factory...");
  const tx2 = await factory.addTokenCreator(marketplaceAddress);
  const receipt2 = await tx2.wait();
  console.log(`✅ Role granted (Tx: ${receipt2.hash})`);
  
  // 4c) Set marketplace fee
  console.log(`\n💸 Setting marketplace fee to ${marketplaceFeeBps} bps...`);
  const tx3 = await marketplace.setMarketplaceFee(marketplaceFeeBps);
  const receipt3 = await tx3.wait();
  console.log(`✅ Fee set (Tx: ${receipt3.hash})`);
  
  // ========================================================================
  // 5. Verification
  // ========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("5️⃣  Verifying contract configuration...");
  console.log("=".repeat(70));
  
  // Verify registry configuration
  const marketplaceRole = await registry.MARKETPLACE_ROLE();
  const hasMarketplaceRole = await registry.hasRole(marketplaceRole, marketplaceAddress);
  console.log(`   Registry → Marketplace role: ${hasMarketplaceRole ? "✅" : "❌"}`);
  
  // Verify factory configuration
  const tokenCreatorRole = await factory.TOKEN_CREATOR_ROLE();
  const hasCreatorRole = await factory.hasRole(tokenCreatorRole, marketplaceAddress);
  console.log(`   Factory → Marketplace role: ${hasCreatorRole ? "✅" : "❌"}`);
  
  // Verify marketplace configuration
  const marketplaceRegistry = await marketplace.assetRegistry();
  const marketplaceFactory = await marketplace.tokenFactory();
  const marketplaceFee = await marketplace.getMarketplaceFee();
  console.log(`   Marketplace Registry: ${marketplaceRegistry === registryAddress ? "✅" : "❌"} ${marketplaceRegistry}`);
  console.log(`   Marketplace Factory: ${marketplaceFactory === factoryAddress ? "✅" : "❌"} ${marketplaceFactory}`);
  console.log(`   Marketplace Fee: ${marketplaceFee.toString()} bps`);
  
  // ========================================================================
  // 6. Save Deployment Results
  // ========================================================================
  const deploymentResult: DeploymentResult = {
    network: network.name,
    deployer: deployer.address,
    feeRecipient,
    contracts: {
      RWAAssetRegistry: registryAddress,
      RWATokenFactory: factoryAddress,
      RWAMarketplace: marketplaceAddress,
    },
    deploymentBlock: marketplaceReceipt?.blockNumber || 0,
    gasUsed: {
      registry: registryReceipt?.gasUsed.toString() || "0",
      factory: factoryReceipt?.gasUsed.toString() || "0",
      marketplace: marketplaceReceipt?.gasUsed.toString() || "0",
    },
    timestamp: new Date().toISOString(),
  };
  
  const outDir = path.join(__dirname, "../deployments");
  const outFile = path.join(outDir, `${network.name}.json`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(deploymentResult, null, 2));
  console.log(`\n💾 Deployment addresses saved to ${outFile}`);
  
  // ========================================================================
  // 7. Etherscan Verification (if API key available)
  // ========================================================================
  const etherscanApiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
  
  if (etherscanApiKey && network.name === "sepolia") {
    console.log("\n" + "=".repeat(70));
    console.log("6️⃣  Verifying contracts on Etherscan...");
    console.log("=".repeat(70));
    
    console.log("\n⏳ Waiting 30 seconds for Etherscan to index contracts...");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Verify Registry
    await verifyContract(
      registryAddress,
      "contracts/core/RWAAssetRegistry.sol:RWAAssetRegistry",
      []
    );
    
    // Wait between verifications
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Verify Factory
    await verifyContract(
      factoryAddress,
      "contracts/core/RWATokenFactory.sol:RWATokenFactory",
      []
    );
    
    // Wait between verifications
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Verify Marketplace
    await verifyContract(
      marketplaceAddress,
      "contracts/marketplace/RWAMarketplace.sol:RWAMarketplace",
      [registryAddress, factoryAddress, feeRecipient]
    );
  } else {
    console.log("\n⚠️  Skipping Etherscan verification (no API key or not Sepolia)");
  }
  
  // ========================================================================
  // 8. Summary
  // ========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("🎉 DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));
  console.log(`\n📋 Contract Addresses:`);
  console.log(`   RWAAssetRegistry: ${registryAddress}`);
  console.log(`   RWATokenFactory: ${factoryAddress}`);
  console.log(`   RWAMarketplace: ${marketplaceAddress}`);
  console.log(`\n🔗 Explorer Links:`);
  console.log(`   Registry: https://sepolia.etherscan.io/address/${registryAddress}`);
  console.log(`   Factory: https://sepolia.etherscan.io/address/${factoryAddress}`);
  console.log(`   Marketplace: https://sepolia.etherscan.io/address/${marketplaceAddress}`);
  console.log(`\n📝 Next Steps:`);
  console.log(`   1. Update environment variables with new addresses`);
  console.log(`   2. Test contract interactions`);
  console.log(`   3. Update frontend configuration`);
  console.log("=".repeat(70) + "\n");
}

main().catch((error) => {
  console.error("\n❌ Deployment failed:", error);
  process.exit(1);
});

