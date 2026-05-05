/**
 * Comprehensive Sepolia Deployment Script with TransparentUpgradeableProxy
 * 
 * Deploys all Tiger Palace RWA contracts as upgradeable proxies:
 * - ProxyAdmin (manages all proxies)
 * - RWAAssetRegistryUpgradeable
 * - RWATokenFactoryUpgradeable
 * - RWATokenFactory404 (non-upgradeable, but can be wrapped)
 * - RWAMarketplaceUpgradeable
 * - RWAStakingUpgradeable
 * - RWARewardDistributorUpgradeable
 * - RWARevenueUpgradeable
 * - MembershipSystemUpgradeable
 * 
 * All contracts use TransparentUpgradeableProxy pattern with ProxyAdmin
 * 
 * Usage: bun hardhat run scripts/deploy-all-sepolia-proxies.ts --network sepolia
 */

import "dotenv/config";
import hre from "hardhat";
import fs from "fs";
import path from "path";
const { ethers, network } = hre;

interface DeploymentResult {
  network: string;
  chainId: number;
  deployer: string;
  proxyAdmin: string;
  timestamp: string;
  contracts: {
    [key: string]: {
      proxy: string;
      implementation: string;
      admin: string;
    };
  };
  abis: {
    [key: string]: any;
  };
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
      return false;
    }
  }
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   COMPREHENSIVE SEPOLIA PROXY DEPLOYMENT                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  const [deployer] = await ethers.getSigners();
  const networkInfo = await ethers.provider.getNetwork();
  
  console.log(`📡 Network: ${network.name} (Chain ID: ${networkInfo.chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);
  
  if (parseFloat(ethers.formatEther(balance)) < 0.1) {
    console.log("⚠️  Warning: Low balance. Deployment may fail.");
  }
  
  const result: DeploymentResult = {
    network: network.name,
    chainId: Number(networkInfo.chainId),
    deployer: deployer.address,
    proxyAdmin: "",
    timestamp: new Date().toISOString(),
    contracts: {},
    abis: {}
  };
  
  try {
    // ========================================================================
    // Step 1: Deploy ProxyAdmin
    // ========================================================================
    console.log("=".repeat(70));
    console.log("1️⃣  Deploying ProxyAdmin...");
    console.log("=".repeat(70));
    
    const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
    const proxyAdmin = await ProxyAdmin.deploy();
    await proxyAdmin.waitForDeployment();
    const proxyAdminAddress = await proxyAdmin.getAddress();
    
    console.log(`✅ ProxyAdmin deployed: ${proxyAdminAddress}`);
    
    result.proxyAdmin = proxyAdminAddress;
    
    // ========================================================================
    // Step 2: Deploy RWAAssetRegistryUpgradeable
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("2️⃣  Deploying RWAAssetRegistryUpgradeable...");
    console.log("=".repeat(70));
    
    const RWAAssetRegistryUpgradeable = await ethers.getContractFactory("RWAAssetRegistryUpgradeable");
    
    // Deploy implementation
    const registryImpl = await RWAAssetRegistryUpgradeable.deploy();
    await registryImpl.waitForDeployment();
    const registryImplAddress = await registryImpl.getAddress();
    console.log(`✅ Implementation deployed: ${registryImplAddress}`);
    
    // Encode initialize function
    const registryInterface = RWAAssetRegistryUpgradeable.interface;
    const initData = registryInterface.encodeFunctionData("initialize", [deployer.address]);
    
    // Deploy TransparentUpgradeableProxy
    const TransparentUpgradeableProxy = await ethers.getContractFactory("TransparentUpgradeableProxy");
    const registryProxy = await TransparentUpgradeableProxy.deploy(
      registryImplAddress,
      proxyAdminAddress,
      initData
    );
    await registryProxy.waitForDeployment();
    const registryProxyAddress = await registryProxy.getAddress();
    
    console.log(`✅ Proxy deployed: ${registryProxyAddress}`);
    console.log(`   Implementation: ${registryImplAddress}`);
    console.log(`   Admin: ${proxyAdminAddress}`);
    
    result.contracts.RWAAssetRegistry = {
      proxy: registryProxyAddress,
      implementation: registryImplAddress,
      admin: proxyAdminAddress
    };
    
    // ========================================================================
    // Step 3: Deploy RWATokenFactoryUpgradeable
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("3️⃣  Deploying RWATokenFactoryUpgradeable...");
    console.log("=".repeat(70));
    
    const RWATokenFactoryUpgradeable = await ethers.getContractFactory("RWATokenFactoryUpgradeable");
    
    const factoryImpl = await RWATokenFactoryUpgradeable.deploy();
    await factoryImpl.waitForDeployment();
    const factoryImplAddress = await factoryImpl.getAddress();
    console.log(`✅ Implementation deployed: ${factoryImplAddress}`);
    
    const factoryInterface = RWATokenFactoryUpgradeable.interface;
    const factoryInitData = factoryInterface.encodeFunctionData("initialize", [deployer.address]);
    
    const factoryProxy = await TransparentUpgradeableProxy.deploy(
      factoryImplAddress,
      proxyAdminAddress,
      factoryInitData
    );
    await factoryProxy.waitForDeployment();
    const factoryProxyAddress = await factoryProxy.getAddress();
    
    console.log(`✅ Proxy deployed: ${factoryProxyAddress}`);
    console.log(`   Implementation: ${factoryImplAddress}`);
    console.log(`   Admin: ${proxyAdminAddress}`);
    
    result.contracts.RWATokenFactory = {
      proxy: factoryProxyAddress,
      implementation: factoryImplAddress,
      admin: proxyAdminAddress
    };
    
    // ========================================================================
    // Step 4: Deploy RWATokenFactory404 (non-upgradeable, but we'll deploy it)
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("4️⃣  Deploying RWATokenFactory404...");
    console.log("=".repeat(70));
    
    const RWATokenFactory404 = await ethers.getContractFactory("RWATokenFactory404");
    const factory404 = await RWATokenFactory404.deploy();
    await factory404.waitForDeployment();
    const factory404Address = await factory404.getAddress();
    
    console.log(`✅ RWATokenFactory404 deployed: ${factory404Address}`);
    
    // Note: Factory404 is not upgradeable, so we store it differently
    result.contracts.RWATokenFactory404 = {
      proxy: factory404Address, // Same as implementation
      implementation: factory404Address,
      admin: deployer.address // Owner is deployer
    };
    
    // ========================================================================
    // Step 5: Deploy RWAMarketplaceUpgradeable
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("5️⃣  Deploying RWAMarketplaceUpgradeable...");
    console.log("=".repeat(70));
    
    const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
    const marketplaceFeeBps = process.env.MARKETPLACE_FEE_BPS 
      ? Number(process.env.MARKETPLACE_FEE_BPS) 
      : 250; // 2.5%
    
    const RWAMarketplaceUpgradeable = await ethers.getContractFactory("RWAMarketplaceUpgradeable");
    
    const marketplaceImpl = await RWAMarketplaceUpgradeable.deploy();
    await marketplaceImpl.waitForDeployment();
    const marketplaceImplAddress = await marketplaceImpl.getAddress();
    console.log(`✅ Implementation deployed: ${marketplaceImplAddress}`);
    
    const marketplaceInterface = RWAMarketplaceUpgradeable.interface;
    const marketplaceInitData = marketplaceInterface.encodeFunctionData("initialize", [
      registryProxyAddress,
      factoryProxyAddress,
      feeRecipient,
      deployer.address // admin
    ]);
    
    const marketplaceProxy = await TransparentUpgradeableProxy.deploy(
      marketplaceImplAddress,
      proxyAdminAddress,
      marketplaceInitData
    );
    await marketplaceProxy.waitForDeployment();
    const marketplaceProxyAddress = await marketplaceProxy.getAddress();
    
    console.log(`✅ Proxy deployed: ${marketplaceProxyAddress}`);
    console.log(`   Implementation: ${marketplaceImplAddress}`);
    console.log(`   Admin: ${proxyAdminAddress}`);
    console.log(`   Fee Recipient: ${feeRecipient}`);
    console.log(`   Fee: ${marketplaceFeeBps} bps (${marketplaceFeeBps / 100}%)`);
    
    result.contracts.RWAMarketplace = {
      proxy: marketplaceProxyAddress,
      implementation: marketplaceImplAddress,
      admin: proxyAdminAddress
    };
    
    // ========================================================================
    // Step 6: Deploy RWAStakingUpgradeable
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("6️⃣  Deploying RWAStakingUpgradeable...");
    console.log("=".repeat(70));
    
    // First, we need to deploy RWARevenue and RWARewardDistributor
    // Let's deploy them first, then staking
    
    // ========================================================================
    // Step 6a: Deploy RWARewardDistributor (non-upgradeable)
    // ========================================================================
    console.log("\n6️⃣a Deploying RWARewardDistributor...");
    
    // Note: RWARewardDistributor is NOT upgradeable - it has a constructor
    // We'll deploy it directly
    const treasury = process.env.TREASURY_ADDRESS || deployer.address;
    const initialRewardPool = process.env.INITIAL_REWARD_POOL 
      ? ethers.parseEther(process.env.INITIAL_REWARD_POOL)
      : ethers.parseEther("0"); // Will be funded later
    
    // For now, we'll use a placeholder token address - will be updated later
    const placeholderToken = deployer.address; // Will be replaced with actual token
    
    const RWARewardDistributor = await ethers.getContractFactory("RWARewardDistributor");
    const distributor = await RWARewardDistributor.deploy(
      placeholderToken,
      treasury,
      initialRewardPool
    );
    await distributor.waitForDeployment();
    const distributorAddress = await distributor.getAddress();
    
    console.log(`✅ RWARewardDistributor deployed: ${distributorAddress}`);
    console.log(`   Note: Token address will be set after token deployment`);
    
    result.contracts.RWARewardDistributor = {
      proxy: distributorAddress, // Same as implementation (not upgradeable)
      implementation: distributorAddress,
      admin: deployer.address // Owner is deployer
    };
    
    // ========================================================================
    // Step 6b: Deploy RWARevenue (non-upgradeable)
    // ========================================================================
    console.log("\n6️⃣b Deploying RWARevenue...");
    
    // Note: RWARevenue is NOT upgradeable - it has a constructor
    const RWARevenue = await ethers.getContractFactory("RWARevenue");
    const revenue = await RWARevenue.deploy(
      placeholderToken,
      distributorAddress
    );
    await revenue.waitForDeployment();
    const revenueAddress = await revenue.getAddress();
    
    console.log(`✅ RWARevenue deployed: ${revenueAddress}`);
    
    result.contracts.RWARevenue = {
      proxy: revenueAddress, // Same as implementation (not upgradeable)
      implementation: revenueAddress,
      admin: deployer.address // Owner is deployer
    };
    
    // Initialize RWARevenue with staking address (will be set after staking deployment)
    // We'll do this later after staking is deployed
    
    // ========================================================================
    // Step 6c: Deploy RWAStakingUpgradeable
    // ========================================================================
    console.log("\n6️⃣c Deploying RWAStakingUpgradeable...");
    
    const RWAStakingUpgradeable = await ethers.getContractFactory("RWAStakingUpgradeable");
    
    const stakingImpl = await RWAStakingUpgradeable.deploy();
    await stakingImpl.waitForDeployment();
    const stakingImplAddress = await stakingImpl.getAddress();
    console.log(`✅ Implementation deployed: ${stakingImplAddress}`);
    
    const stakingInterface = RWAStakingUpgradeable.interface;
    const stakingInitData = stakingInterface.encodeFunctionData("initialize", [
      placeholderToken, // token address (will be set later)
      revenueAddress,
      distributorAddress,
      deployer.address  // admin
    ]);
    
    const stakingProxy = await TransparentUpgradeableProxy.deploy(
      stakingImplAddress,
      proxyAdminAddress,
      stakingInitData
    );
    await stakingProxy.waitForDeployment();
    const stakingProxyAddress = await stakingProxy.getAddress();
    
    console.log(`✅ Proxy deployed: ${stakingProxyAddress}`);
    
    result.contracts.RWAStaking = {
      proxy: stakingProxyAddress,
      implementation: stakingImplAddress,
      admin: proxyAdminAddress
    };
    
    // Now initialize RWARevenue with staking address
    console.log("\n🔧 Initializing RWARevenue with staking address...");
    const revenueContract = await ethers.getContractAt("RWARevenue", revenueAddress);
    const initRevenueTx = await revenueContract.initialize(stakingProxyAddress);
    await initRevenueTx.wait();
    console.log("✅ RWARevenue initialized with staking address");
    
    // Initialize RWARewardDistributor with contract addresses
    console.log("\n🔧 Initializing RWARewardDistributor with contract addresses...");
    const distributorContract = await ethers.getContractAt("RWARewardDistributor", distributorAddress);
    const initDistributorTx = await distributorContract.initialize(
      stakingProxyAddress,
      revenueAddress,
      treasury
    );
    await initDistributorTx.wait();
    console.log("✅ RWARewardDistributor initialized");
    
    // ========================================================================
    // Step 7: Deploy MembershipSystemUpgradeable
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("7️⃣  Deploying MembershipSystemUpgradeable...");
    console.log("=".repeat(70));
    
    const MembershipSystemUpgradeable = await ethers.getContractFactory("MembershipSystemUpgradeable");
    
    const membershipImpl = await MembershipSystemUpgradeable.deploy();
    await membershipImpl.waitForDeployment();
    const membershipImplAddress = await membershipImpl.getAddress();
    console.log(`✅ Implementation deployed: ${membershipImplAddress}`);
    
    const membershipInterface = MembershipSystemUpgradeable.interface;
    const membershipInitData = membershipInterface.encodeFunctionData("initialize", [deployer.address]);
    
    const membershipProxy = await TransparentUpgradeableProxy.deploy(
      membershipImplAddress,
      proxyAdminAddress,
      membershipInitData
    );
    await membershipProxy.waitForDeployment();
    const membershipProxyAddress = await membershipProxy.getAddress();
    
    console.log(`✅ Proxy deployed: ${membershipProxyAddress}`);
    
    result.contracts.MembershipSystem = {
      proxy: membershipProxyAddress,
      implementation: membershipImplAddress,
      admin: proxyAdminAddress
    };
    
    // ========================================================================
    // Step 8: Configure Contract Relationships
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("8️⃣  Configuring contract relationships...");
    console.log("=".repeat(70));
    
    // Get contract instances
    const registry = await ethers.getContractAt("RWAAssetRegistryUpgradeable", registryProxyAddress);
    const factory = await ethers.getContractAt("RWATokenFactoryUpgradeable", factoryProxyAddress);
    const marketplace = await ethers.getContractAt("RWAMarketplaceUpgradeable", marketplaceProxyAddress);
    
    // Grant MARKETPLACE_ROLE to marketplace
    const MARKETPLACE_ROLE = await registry.MARKETPLACE_ROLE();
    const tx1 = await registry.grantRole(MARKETPLACE_ROLE, marketplaceProxyAddress);
    await tx1.wait();
    console.log("✅ Granted MARKETPLACE_ROLE to marketplace");
    
    // Grant TOKEN_CREATOR_ROLE to marketplace on factory
    const TOKEN_CREATOR_ROLE = await factory.TOKEN_CREATOR_ROLE();
    const tx2 = await factory.grantRole(TOKEN_CREATOR_ROLE, marketplaceProxyAddress);
    await tx2.wait();
    console.log("✅ Granted TOKEN_CREATOR_ROLE to marketplace");
    
    // Note: Factory doesn't need roles on registry - it creates tokens directly
    
    // ========================================================================
    // Step 9: Save Deployment Results
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("9️⃣  Saving deployment results...");
    console.log("=".repeat(70));
    
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // Save to sepolia-proxies.json
    const deploymentFile = path.join(deploymentsDir, "sepolia-proxies.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(result, null, 2));
    console.log(`✅ Saved to: ${deploymentFile}`);
    
    // Also update deployed-addresses-proxy.json
    const proxyAddressesFile = path.join(__dirname, "../deployed-addresses-proxy.json");
    const proxyAddresses = {
      network: "sepolia",
      addresses: {
        ProxyAdmin: proxyAdminAddress,
        RWAAssetRegistry: registryProxyAddress,
        RWATokenFactory: factoryProxyAddress,
        RWATokenFactory404: factory404Address,
        RWAMarketplace: marketplaceProxyAddress,
        RWAStaking: stakingProxyAddress,
        RWARewardDistributor: distributorAddress,
        RWARevenue: revenueAddress,
        MembershipSystem: membershipProxyAddress,
        // Implementation addresses
        RWAAssetRegistry_Implementation: registryImplAddress,
        RWATokenFactory_Implementation: factoryImplAddress,
        RWAMarketplace_Implementation: marketplaceImplAddress,
        RWAStaking_Implementation: stakingImplAddress,
        MembershipSystem_Implementation: membershipImplAddress,
      }
    };
    fs.writeFileSync(proxyAddressesFile, JSON.stringify(proxyAddresses, null, 2));
    console.log(`✅ Saved to: ${proxyAddressesFile}`);
    
    // ========================================================================
    // Step 10: Etherscan Verification
    // ========================================================================
    const etherscanApiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
    
    if (etherscanApiKey && network.name === "sepolia") {
      console.log("\n" + "=".repeat(70));
      console.log("🔟 Verifying contracts on Etherscan...");
      console.log("=".repeat(70));
      
      console.log("\n⏳ Waiting 30 seconds for Etherscan to index contracts...");
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Verify ProxyAdmin
      await verifyContract(proxyAdminAddress, "contracts/proxy/ProxyAdmin.sol:ProxyAdmin", []);
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Verify implementations
      await verifyContract(registryImplAddress, "contracts/upgradeable/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable", []);
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      await verifyContract(factoryImplAddress, "contracts/upgradeable/RWATokenFactoryUpgradeable.sol:RWATokenFactoryUpgradeable", []);
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      await verifyContract(factory404Address, "contracts/core/RWATokenFactory404.sol:RWATokenFactory404", [registryProxyAddress]);
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      await verifyContract(marketplaceImplAddress, "contracts/upgradeable/RWAMarketplaceUpgradeable.sol:RWAMarketplaceUpgradeable", []);
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      await verifyContract(stakingImplAddress, "contracts/upgradeable/RWAStakingUpgradeable.sol:RWAStakingUpgradeable", []);
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      await verifyContract(distributorAddress, "contracts/staking/RWARewardDistributor.sol:RWARewardDistributor", [
        placeholderToken,
        treasury,
        initialRewardPool
      ]);
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      await verifyContract(revenueAddress, "contracts/staking/RWARevenue.sol:RWARevenue", [
        placeholderToken,
        distributorAddress
      ]);
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      await verifyContract(membershipImplAddress, "contracts/upgradeable/MembershipSystemUpgradeable.sol:MembershipSystemUpgradeable", []);
      
      // Verify proxies (they need special handling)
      console.log("\n📝 Note: Proxy contracts are verified automatically when implementations are verified");
    } else {
      console.log("\n⚠️  Skipping Etherscan verification (no API key or not Sepolia)");
    }
    
    // ========================================================================
    // Step 11: Summary
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(70));
    console.log("\n📋 Contract Addresses (Use PROXY addresses for integration):");
    console.log(`\n🔧 ProxyAdmin: ${proxyAdminAddress}`);
    console.log(`\n📦 Core Contracts:`);
    console.log(`   RWAAssetRegistry: ${registryProxyAddress}`);
    console.log(`   RWATokenFactory: ${factoryProxyAddress}`);
    console.log(`   RWATokenFactory404: ${factory404Address}`);
    console.log(`   RWAMarketplace: ${marketplaceProxyAddress}`);
    console.log(`\n💰 Staking Contracts:`);
    console.log(`   RWAStaking: ${stakingProxyAddress}`);
    console.log(`   RWARewardDistributor: ${distributorAddress}`);
    console.log(`   RWARevenue: ${revenueAddress}`);
    console.log(`\n👥 Membership:`);
    console.log(`   MembershipSystem: ${membershipProxyAddress}`);
    
    console.log(`\n🔗 Explorer Links:`);
    const explorerBase = "https://sepolia.etherscan.io";
    console.log(`   ProxyAdmin: ${explorerBase}/address/${proxyAdminAddress}`);
    console.log(`   Registry: ${explorerBase}/address/${registryProxyAddress}`);
    console.log(`   Factory: ${explorerBase}/address/${factoryProxyAddress}`);
    console.log(`   Factory404: ${explorerBase}/address/${factory404Address}`);
    console.log(`   Marketplace: ${explorerBase}/address/${marketplaceProxyAddress}`);
    
    console.log(`\n📝 Environment Variables for .env.local:`);
    console.log("=".repeat(70));
    console.log(`SEPOLIA_PROXY_ADMIN=${proxyAdminAddress}`);
    console.log(`RWA_ASSET_REGISTRY=${registryProxyAddress}`);
    console.log(`RWA_TOKEN_FACTORY=${factoryProxyAddress}`);
    console.log(`RWA_TOKEN_FACTORY_404=${factory404Address}`);
    console.log(`RWA_MARKETPLACE=${marketplaceProxyAddress}`);
    console.log(`RWA_STAKING=${stakingProxyAddress}`);
    console.log(`RWA_REWARD_DISTRIBUTOR=${distributorAddress}`);
    console.log(`RWA_REVENUE=${revenueAddress}`);
    console.log(`MEMBERSHIP_SYSTEM=${membershipProxyAddress}`);
    console.log("=".repeat(70) + "\n");
    
  } catch (error: any) {
    console.error("\n❌ Deployment failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

