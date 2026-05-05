import hre from "hardhat";
const { ethers, upgrades } = hre as any;
import { formatEther, formatUnits, parseEther } from "ethers";
import fs from "fs";
import path from "path";

/**
 * RWA Marketplace Deployment Script
 * Deploys RWAMarketplaceUpgradeable with UUPS proxy pattern
 * 
 * Features:
 * - UUPS upgradeable proxy pattern
 * - Access control with roles
 * - Pausable for emergency stops
 * - ReentrancyGuard for security
 * - Marketplace fee management
 */

interface DeploymentConfig {
  assetRegistryAddress: string;
  tokenFactoryAddress: string;
  feeRecipientAddress: string;
  adminAddress: string;
  initialFeePercentage?: number; // In basis points (250 = 2.5%)
}

interface DeploymentResult {
  proxy: string;
  implementation: string;
  admin: string;
  network: string;
  chainId: number;
  deployer: string;
  gasUsed: string;
  deploymentBlock: number;
  timestamp: number;
  config: DeploymentConfig;
}

const DEPLOYMENT_FILE = "deployed-rwa-marketplace.json";

async function analyzeNetwork(): Promise<void> {
  console.log("🔍 Analyzing network...");
  
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log(`📦 Current block: ${blockNumber}`);
  
  const feeData = await ethers.provider.getFeeData();
  console.log(`⛽ Gas price: ${formatUnits(feeData.gasPrice ?? 0, "gwei")} gwei`);
  
  if (feeData.maxFeePerGas) {
    console.log(`⛽ Max fee per gas: ${formatUnits(feeData.maxFeePerGas, "gwei")} gwei`);
  }
  
  if (feeData.maxPriorityFeePerGas) {
    console.log(`⛽ Max priority fee: ${formatUnits(feeData.maxPriorityFeePerGas, "gwei")} gwei`);
  }
}

async function checkDeployerBalance(): Promise<boolean> {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const ethBalance = formatEther(balance);
  
  console.log(`\n💰 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethBalance} ETH`);
  
  const minRequired = 0.05; // Minimum 0.05 ETH recommended
  if (parseFloat(ethBalance) < minRequired) {
    console.log(`⚠️  Warning: Balance below ${minRequired} ETH`);
    console.log(`   Deployment may fail due to insufficient funds`);
    return false;
  }
  
  return true;
}

async function validateConfig(config: DeploymentConfig): Promise<boolean> {
  console.log("\n🔍 Validating deployment configuration...");
  
  // Validate addresses
  if (!ethers.isAddress(config.assetRegistryAddress)) {
    console.log("❌ Invalid asset registry address");
    return false;
  }
  
  if (!ethers.isAddress(config.tokenFactoryAddress)) {
    console.log("❌ Invalid token factory address");
    return false;
  }
  
  if (!ethers.isAddress(config.feeRecipientAddress)) {
    console.log("❌ Invalid fee recipient address");
    return false;
  }
  
  if (!ethers.isAddress(config.adminAddress)) {
    console.log("❌ Invalid admin address");
    return false;
  }
  
  // Check if contracts exist
  const assetRegistryCode = await ethers.provider.getCode(config.assetRegistryAddress);
  if (assetRegistryCode === "0x") {
    console.log("❌ Asset registry contract not found at specified address");
    return false;
  }
  
  const tokenFactoryCode = await ethers.provider.getCode(config.tokenFactoryAddress);
  if (tokenFactoryCode === "0x") {
    console.log("❌ Token factory contract not found at specified address");
    return false;
  }
  
  console.log("✅ Configuration validated");
  console.log(`   Asset Registry: ${config.assetRegistryAddress}`);
  console.log(`   Token Factory: ${config.tokenFactoryAddress}`);
  console.log(`   Fee Recipient: ${config.feeRecipientAddress}`);
  console.log(`   Admin: ${config.adminAddress}`);
  
  return true;
}

async function deployMarketplace(config: DeploymentConfig): Promise<DeploymentResult> {
  console.log("\n🚀 Deploying RWA Marketplace with UUPS Proxy...");
  
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  // Get contract factory
  const RWAMarketplace = await ethers.getContractFactory("RWAMarketplaceUpgradeable");
  console.log("📋 Contract factory loaded");
  
  // Deploy with proxy
  console.log("🔄 Deploying proxy and implementation...");
  const marketplace = await upgrades.deployProxy(
    RWAMarketplace,
    [
      config.assetRegistryAddress,
      config.tokenFactoryAddress,
      config.feeRecipientAddress,
      config.adminAddress
    ],
    {
      kind: "uups",
      initializer: "initialize"
    }
  );
  
  await marketplace.waitForDeployment();
  const proxyAddress = await marketplace.getAddress();
  
  console.log("✅ Marketplace deployed!");
  console.log(`   Proxy: ${proxyAddress}`);
  
  // Get implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log(`   Implementation: ${implementationAddress}`);
  
  // Get admin address
  const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);
  console.log(`   ProxyAdmin: ${adminAddress}`);
  
  // Get deployment block
  const deploymentTx = marketplace.deploymentTransaction();
  const receipt = await deploymentTx?.wait();
  const deploymentBlock = receipt?.blockNumber || 0;
  const gasUsed = receipt?.gasUsed || 0n;
  
  console.log(`   Block: ${deploymentBlock}`);
  console.log(`   Gas Used: ${gasUsed.toString()}`);
  
  return {
    proxy: proxyAddress,
    implementation: implementationAddress,
    admin: adminAddress,
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    gasUsed: gasUsed.toString(),
    deploymentBlock,
    timestamp: Date.now(),
    config
  };
}

async function verifyDeployment(result: DeploymentResult): Promise<boolean> {
  console.log("\n🔍 Verifying deployment...");
  
  try {
    const marketplace = await ethers.getContractAt("RWAMarketplaceUpgradeable", result.proxy);
    
    // Check asset registry
    const assetRegistry = await marketplace.assetRegistry();
    if (assetRegistry.toLowerCase() !== result.config.assetRegistryAddress.toLowerCase()) {
      console.log("❌ Asset registry mismatch");
      return false;
    }
    console.log("✅ Asset registry configured correctly");
    
    // Check token factory
    const tokenFactory = await marketplace.tokenFactory();
    if (tokenFactory.toLowerCase() !== result.config.tokenFactoryAddress.toLowerCase()) {
      console.log("❌ Token factory mismatch");
      return false;
    }
    console.log("✅ Token factory configured correctly");
    
    // Check admin role
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const hasAdminRole = await marketplace.hasRole(DEFAULT_ADMIN_ROLE, result.config.adminAddress);
    if (!hasAdminRole) {
      console.log("❌ Admin role not granted");
      return false;
    }
    console.log("✅ Admin role configured correctly");
    
    // Check marketplace fee
    const feePercentage = await marketplace.getMarketplaceFeePercentage();
    console.log(`✅ Marketplace fee: ${feePercentage} basis points (${Number(feePercentage) / 100}%)`);
    
    console.log("\n✅ All verification checks passed!");
    return true;
  } catch (error: any) {
    console.log("❌ Verification failed:", error.message);
    return false;
  }
}

async function verifyOnEtherscan(result: DeploymentResult): Promise<void> {
  console.log("\n🔍 Verifying on Etherscan...");
  
  try {
    console.log("⏳ Waiting 30 seconds for Etherscan to index...");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    console.log("📤 Submitting implementation for verification...");
    await hre.run("verify:verify", {
      address: result.implementation,
      constructorArguments: []
    });
    
    console.log("✅ Contract verified on Etherscan!");
    console.log(`   View at: https://sepolia.etherscan.io/address/${result.proxy}#code`);
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  Contract already verified");
    } else {
      console.log("⚠️  Etherscan verification failed:", error.message);
      console.log("   You can verify manually later with:");
      console.log(`   npx hardhat verify --network sepolia ${result.implementation}`);
    }
  }
}

async function saveDeployment(result: DeploymentResult): Promise<void> {
  // Save to deployment file
  fs.writeFileSync(DEPLOYMENT_FILE, JSON.stringify(result, null, 2));
  console.log(`\n💾 Deployment saved to ${DEPLOYMENT_FILE}`);
  
  // Also save to frontend-accessible location
  const frontendABIDir = path.join(__dirname, "../../src/lib/contracts/abis");
  const deploymentInfoPath = path.join(frontendABIDir, "rwa-marketplace-deployment.json");
  
  if (!fs.existsSync(frontendABIDir)) {
    fs.mkdirSync(frontendABIDir, { recursive: true });
  }
  
  fs.writeFileSync(deploymentInfoPath, JSON.stringify({
    address: result.proxy,
    network: result.network,
    chainId: result.chainId,
    deploymentBlock: result.deploymentBlock,
    timestamp: result.timestamp
  }, null, 2));
  
  console.log(`💾 Deployment info saved to ${deploymentInfoPath}`);
  
  // Copy ABI to frontend
  const artifactPath = path.join(__dirname, "../artifacts/contracts/upgradeable/RWAMarketplaceUpgradeable.sol/RWAMarketplaceUpgradeable.json");
  const abiPath = path.join(frontendABIDir, "RWAMarketplaceUpgradeable.json");
  
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    fs.writeFileSync(abiPath, JSON.stringify({
      abi: artifact.abi,
      contractName: "RWAMarketplaceUpgradeable"
    }, null, 2));
    console.log(`💾 ABI saved to ${abiPath}`);
  }
}

async function printSummary(result: DeploymentResult): Promise<void> {
  console.log("\n" + "=".repeat(70));
  console.log("🎉 RWA MARKETPLACE DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));
  console.log(`\n📋 Deployment Summary:`);
  console.log(`   Network: ${result.network} (Chain ID: ${result.chainId})`);
  console.log(`   Deployer: ${result.deployer}`);
  console.log(`   Block: ${result.deploymentBlock}`);
  console.log(`   Gas Used: ${result.gasUsed}`);
  console.log(`\n📍 Contract Addresses:`);
  console.log(`   Proxy: ${result.proxy}`);
  console.log(`   Implementation: ${result.implementation}`);
  console.log(`   ProxyAdmin: ${result.admin}`);
  console.log(`\n🔧 Configuration:`);
  console.log(`   Asset Registry: ${result.config.assetRegistryAddress}`);
  console.log(`   Token Factory: ${result.config.tokenFactoryAddress}`);
  console.log(`   Fee Recipient: ${result.config.feeRecipientAddress}`);
  console.log(`   Admin: ${result.config.adminAddress}`);
  console.log(`\n🔗 Explorer Links:`);
  console.log(`   Proxy: https://sepolia.etherscan.io/address/${result.proxy}`);
  console.log(`   Implementation: https://sepolia.etherscan.io/address/${result.implementation}`);
  console.log(`\n📚 Next Steps:`);
  console.log(`   1. Verify configuration in frontend admin dashboard`);
  console.log(`   2. Test marketplace functionality`);
  console.log(`   3. Grant additional roles if needed`);
  console.log(`   4. Configure marketplace settings (fees, etc.)`);
  console.log("=".repeat(70) + "\n");
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   RWA MARKETPLACE DEPLOYMENT (UUPS Upgradeable)            ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  try {
    // Step 1: Analyze network
    await analyzeNetwork();
    
    // Step 2: Check deployer balance
    const hasBalance = await checkDeployerBalance();
    if (!hasBalance) {
      console.log("\n⚠️  Please fund the deployer wallet and try again");
      process.exit(1);
    }
    
    // Step 3: Load or create configuration
    // TODO: Load from environment variables or config file
    const config: DeploymentConfig = {
      assetRegistryAddress: process.env.RWA_ASSET_REGISTRY || "0x0000000000000000000000000000000000000000",
      tokenFactoryAddress: process.env.RWA_TOKEN_FACTORY || "0x0000000000000000000000000000000000000000",
      feeRecipientAddress: process.env.FEE_RECIPIENT || "0x0000000000000000000000000000000000000000",
      adminAddress: process.env.ADMIN_WALLET_ADDRESS || "0x0000000000000000000000000000000000000000"
    };
    
    // Step 4: Validate configuration
    const isValid = await validateConfig(config);
    if (!isValid) {
      console.log("\n❌ Configuration validation failed");
      process.exit(1);
    }
    
    // Step 5: Deploy marketplace
    const result = await deployMarketplace(config);
    
    // Step 6: Verify deployment
    const verified = await verifyDeployment(result);
    if (!verified) {
      console.log("\n⚠️  Deployment verification failed - check configuration");
      process.exit(1);
    }
    
    // Step 7: Save deployment
    await saveDeployment(result);
    
    // Step 8: Verify on Etherscan
    await verifyOnEtherscan(result);
    
    // Step 9: Print summary
    await printSummary(result);
    
    console.log("✅ Deployment process completed successfully!");
    
  } catch (error: any) {
    console.log("\n❌ Deployment failed:");
    console.log(error.message);
    if (error.stack) {
      console.log("\nStack trace:");
      console.log(error.stack);
    }
    process.exit(1);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

