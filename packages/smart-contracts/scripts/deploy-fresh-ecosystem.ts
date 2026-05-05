import { ethers, upgrades, network } from "hardhat";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * DEPLOY FRESH ECOSYSTEM - Phase 2
 *
 * Deploys the complete RWA marketplace ecosystem from scratch:
 * - RWAAssetRegistryUpgradeable (proxy)
 * - RWATokenFactoryUpgradeable (proxy)
 * - RWATokenFactory404 (direct, non-upgradeable)
 * - RWAMarketplaceUpgradeable (proxy)
 *
 * Architecture: TransparentUpgradeableProxy with existing ProxyAdmin
 * All contracts initialized properly to minimize post-deployment setup
 */

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || "0xA1fb017a8c89cCB76F63d2244C4a228964B50D80";
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY || process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY_404 || "";
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const TKNZN_ADDRESS = process.env.NEXT_PUBLIC_TKNZN_ADDRESS || "0x064682F1555d3baD3Dab5eDD0DEe45372F23a570";
const PRICE_ORACLE_ADDRESS = process.env.NEXT_PUBLIC_CHAINLINK_PRICE_ORACLE || "";
const FEE_RECIPIENT = process.env.FEE_RECIPIENT || process.env.ADMIN_ADDRESS || "";
const PROXY_ADMIN_ADDRESS = process.env.PROXY_ADMIN_ADDRESS || "0x299090a8caA6d89c29D104BbFB646B95aBFdd16a";

// Asset configuration for marketplace initialization
const INITIAL_PAYMENT_TOKENS = [USDC_ADDRESS, TKNZN_ADDRESS]; // Start with USDC and TKNZN

interface DeploymentResult {
  proxyAdmin: string;
  registry: {
    proxy: string;
    implementation: string;
  };
  factory: {
    proxy: string;
    implementation: string;
  };
  factory404: string; // Direct deployment, no proxy
  marketplace: {
    proxy: string;
    implementation: string;
  };
  timestamp: number;
  network: string;
  chainId: number;
}

async function deployFreshEcosystem(): Promise<DeploymentResult> {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   DEPLOY FRESH RWA ECOSYSTEM - COMPLETE SETUP              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.config.chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH\n`);

  // Validate required addresses
  if (!PROXY_ADMIN_ADDRESS || PROXY_ADMIN_ADDRESS === "") {
    console.error("❌ PROXY_ADMIN_ADDRESS not set in environment variables");
    process.exit(1);
  }

  const feeRecipient = FEE_RECIPIENT || deployer.address;
  const adminAddress = deployer.address;

  console.log("📋 Configuration:");
  console.log(`   ProxyAdmin: ${PROXY_ADMIN_ADDRESS}`);
  console.log(`   Fee Recipient: ${feeRecipient}`);
  console.log(`   Admin: ${adminAddress}`);
  console.log(`   Initial Payment Tokens: [${INITIAL_PAYMENT_TOKENS.join(', ')}]\n`);

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 1: DEPLOY RWAAssetRegistryUpgradeable PROXY");
  console.log("======================================================================\n");

  console.log("   📦 Deploying RWAAssetRegistryUpgradeable proxy...");
  console.log("   (Implementation will be deployed automatically)");
  console.log("   Initializing with admin address\n");

  const RWAAssetRegistryUpgradeable = await ethers.getContractFactory("RWAAssetRegistryUpgradeable");
  const registryProxy = await upgrades.deployProxy(
    RWAAssetRegistryUpgradeable,
    [adminAddress], // initialize(address admin)
    {
      kind: "transparent",
      initialOwner: adminAddress,
      constructorArgs: [],
      timeout: 0,
    }
  );
  await registryProxy.waitForDeployment();
  const registryProxyAddress = await registryProxy.getAddress();

  console.log(`   ✅ Proxy deployed: ${registryProxyAddress}`);

  // Get implementation address from proxy
  const registryImplAddress = await upgrades.erc1967.getImplementationAddress(registryProxyAddress);
  console.log(`   ✅ Implementation deployed: ${registryImplAddress}`);

  // Verify implementation has code
  const registryCode = await ethers.provider.getCode(registryImplAddress);
  if (registryCode === "0x") {
    console.error("❌ Registry implementation has no code!");
    process.exit(1);
  }
  console.log(`   ✅ Registry implementation verified (${registryCode.length / 2 - 1} bytes)\n`);

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 2: DEPLOY RWATokenFactoryUpgradeable PROXY");
  console.log("======================================================================\n");

  console.log("   📦 Deploying RWATokenFactoryUpgradeable proxy...");
  console.log("   (Implementation will be deployed automatically)");
  console.log("   Initializing with admin address\n");

  const RWATokenFactoryUpgradeable = await ethers.getContractFactory("RWATokenFactoryUpgradeable");
  const factoryProxy = await upgrades.deployProxy(
    RWATokenFactoryUpgradeable,
    [adminAddress], // initialize(address admin)
    {
      kind: "transparent",
      initialOwner: adminAddress,
      constructorArgs: [],
      timeout: 0,
    }
  );
  await factoryProxy.waitForDeployment();
  const factoryProxyAddress = await factoryProxy.getAddress();

  console.log(`   ✅ Proxy deployed: ${factoryProxyAddress}`);

  // Get implementation address from proxy
  const factoryImplAddress = await upgrades.erc1967.getImplementationAddress(factoryProxyAddress);
  console.log(`   ✅ Implementation deployed: ${factoryImplAddress}`);

  // Verify implementation has code
  const factoryCode = await ethers.provider.getCode(factoryImplAddress);
  if (factoryCode === "0x") {
    console.error("❌ Factory implementation has no code!");
    process.exit(1);
  }
  console.log(`   ✅ Factory implementation verified (${factoryCode.length / 2 - 1} bytes)\n`);

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 3: DEPLOY RWATokenFactory404 (DIRECT)");
  console.log("======================================================================\n");

  console.log("   📦 Deploying RWATokenFactory404 directly (non-upgradeable)...\n");

  const RWATokenFactory404 = await ethers.getContractFactory("RWATokenFactory404");
  const factory404 = await RWATokenFactory404.deploy();
  await factory404.waitForDeployment();
  const factory404Address = await factory404.getAddress();

  console.log(`   ✅ Factory404 deployed: ${factory404Address}`);

  // Verify deployment
  const factory404Code = await ethers.provider.getCode(factory404Address);
  if (factory404Code === "0x") {
    console.error("❌ Factory404 has no code!");
    process.exit(1);
  }
  console.log(`   ✅ Factory404 verified (${factory404Code.length / 2 - 1} bytes)\n`);

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 4: DEPLOY RWAMarketplaceUpgradeableSetter PROXY");
  console.log("======================================================================\n");

  console.log("   📦 Deploying RWAMarketplaceUpgradeableSetter proxy...");
  console.log("   (Implementation will be deployed automatically)");
  console.log("   Initializing with:");
  console.log(`     - Asset Registry: ${registryProxyAddress}`);
  console.log(`     - Token Factory: ${factoryProxyAddress}`);
  console.log(`     - Fee Recipient: ${feeRecipient}`);
  console.log(`     - Token Factory 404: ${factory404Address}`);
  console.log(`     - Initial Payment Tokens: [${INITIAL_PAYMENT_TOKENS.join(', ')}]`);
  console.log(`     - Admin: ${adminAddress}\n`);

  const RWAMarketplaceUpgradeableSetter = await ethers.getContractFactory("RWAMarketplaceUpgradeableSetter");
  const marketplaceProxy = await upgrades.deployProxy(
    RWAMarketplaceUpgradeableSetter,
    [
      registryProxyAddress,    // assetRegistry_
      factoryProxyAddress,     // tokenFactory_
      feeRecipient,           // feeRecipient_
      factory404Address,      // tokenFactory404_
      INITIAL_PAYMENT_TOKENS, // initialPaymentTokens_
      adminAddress            // admin_
    ],
    {
      kind: "uups", // UUPS pattern for marketplace
      constructorArgs: [],
      timeout: 0,
    }
  );
  await marketplaceProxy.waitForDeployment();
  const marketplaceProxyAddress = await marketplaceProxy.getAddress();

  console.log(`   ✅ Proxy deployed: ${marketplaceProxyAddress}`);

  // Get implementation address from proxy
  const marketplaceImplAddress = await upgrades.erc1967.getImplementationAddress(marketplaceProxyAddress);
  console.log(`   ✅ Implementation deployed: ${marketplaceImplAddress}`);

  // Verify implementation has code
  const marketplaceCode = await ethers.provider.getCode(marketplaceImplAddress);
  if (marketplaceCode === "0x") {
    console.error("❌ Marketplace implementation has no code!");
    process.exit(1);
  }
  console.log(`   ✅ Marketplace implementation verified (${marketplaceCode.length / 2 - 1} bytes)\n`);

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 5: CONFIGURE MARKETPLACE FACTORY404");
  console.log("======================================================================\n");

  console.log(`   ⚙️ Setting tokenFactory404 to ${factory404Address}...`);

  // Set the ERC404 factory address in marketplace
  const setFactoryTx = await marketplaceProxy.setTokenFactory404(factory404Address);
  console.log(`   Transaction Hash: ${setFactoryTx.hash}`);
  console.log("   Waiting for confirmation...\n");

  const receipt = await setFactoryTx.wait();
  console.log(`   ✅ Factory404 configured!`);
  console.log(`   Block: ${receipt.blockNumber}`);
  console.log(`   Gas Used: ${receipt.gasUsed.toString()}\n`);

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 6: VERIFY DEPLOYMENT");
  console.log("======================================================================\n");

  console.log("   🔍 Verifying all deployments...");

  // Verify ProxyAdmin exists (using pre-existing ProxyAdmin from deployment plan)
  const proxyAdmin = await ethers.getContractAt("ProxyAdmin", PROXY_ADMIN_ADDRESS);
  const proxyAdminOwner = await proxyAdmin.owner();
  console.log(`   📋 Using existing ProxyAdmin: ${PROXY_ADMIN_ADDRESS}`);
  console.log(`   📋 ProxyAdmin owner: ${proxyAdminOwner}`);
  console.log(`   ✅ ProxyAdmin verified (pre-existing contract)`);

  // Verify Registry initialization
  const registryHasAdminRole = await registryProxy.hasRole(ethers.ZeroHash, adminAddress);
  console.log(`   Registry admin role: ${registryHasAdminRole}`);
  console.log(`   ✅ Registry initialized`);

  // Verify Factory initialization
  const factoryHasAdminRole = await factoryProxy.hasRole(ethers.ZeroHash, adminAddress);
  console.log(`   Factory admin role: ${factoryHasAdminRole}`);
  console.log(`   ✅ Factory initialized`);

  // Verify Marketplace initialization
  const marketplaceAssetRegistry = await marketplaceProxy.assetRegistry();
  const marketplaceFeeRecipient = await marketplaceProxy.getFeeRecipient();
  const marketplaceFee = await marketplaceProxy.getMarketplaceFee();
  const marketplaceTokenFactory404 = await marketplaceProxy.getTokenFactory404();
  const marketplacePaused = await marketplaceProxy.paused();

  console.log(`   Marketplace assetRegistry: ${marketplaceAssetRegistry}`);
  console.log(`   Marketplace feeRecipient: ${marketplaceFeeRecipient}`);
  console.log(`   Marketplace fee: ${marketplaceFee.toString()} basis points (${Number(marketplaceFee) / 100}%)`);
  console.log(`   Marketplace tokenFactory404: ${marketplaceTokenFactory404}`);
  console.log(`   Marketplace paused: ${marketplacePaused ? "Yes ❌" : "No ✅"}`);

  if (marketplaceAssetRegistry.toLowerCase() !== registryProxyAddress.toLowerCase()) {
    console.error("   ❌ Marketplace assetRegistry mismatch!");
    process.exit(1);
  }
  if (marketplaceTokenFactory404.toLowerCase() !== factory404Address.toLowerCase()) {
    console.error("   ❌ Marketplace tokenFactory404 mismatch!");
    process.exit(1);
  }
  if (marketplaceFee.toString() !== "250") {
    console.error(`   ❌ Marketplace fee incorrect! Expected 250, got ${marketplaceFee.toString()}`);
    process.exit(1);
  }
  console.log("   ✅ Marketplace initialized correctly\n");

  // ======================================================================
  console.log("======================================================================");
  console.log("✅ FRESH ECOSYSTEM DEPLOYMENT COMPLETE");
  console.log("======================================================================\n");

  const result: DeploymentResult = {
    proxyAdmin: PROXY_ADMIN_ADDRESS,
    registry: {
      proxy: registryProxyAddress,
      implementation: registryImplAddress,
    },
    factory: {
      proxy: factoryProxyAddress,
      implementation: factoryImplAddress,
    },
    factory404: factory404Address,
    marketplace: {
      proxy: marketplaceProxyAddress,
      implementation: marketplaceImplAddress,
    },
    timestamp: Date.now(),
    network: network.name,
    chainId: network.config.chainId,
  };

  console.log("📝 Deployment Summary:");
  console.log(`   ProxyAdmin: ${result.proxyAdmin}`);
  console.log(`   Registry Proxy: ${result.registry.proxy}`);
  console.log(`   Registry Implementation: ${result.registry.implementation}`);
  console.log(`   Factory Proxy: ${result.factory.proxy}`);
  console.log(`   Factory Implementation: ${result.factory.implementation}`);
  console.log(`   Factory404: ${result.factory404}`);
  console.log(`   MarketplaceSetter Proxy: ${result.marketplace.proxy}`);
  console.log(`   MarketplaceSetter Implementation: ${result.marketplace.implementation}`);
  console.log(`   Network: ${result.network} (Chain ID: ${result.chainId})`);
  console.log(`   Timestamp: ${new Date(result.timestamp).toISOString()}\n`);

  console.log("🔗 View on Etherscan:");
  console.log(`   Registry Proxy: https://sepolia.etherscan.io/address/${result.registry.proxy}`);
  console.log(`   Factory Proxy: https://sepolia.etherscan.io/address/${result.factory.proxy}`);
  console.log(`   Factory404: https://sepolia.etherscan.io/address/${result.factory404}`);
  console.log(`   MarketplaceSetter Proxy: https://sepolia.etherscan.io/address/${result.marketplace.proxy}\n`);

  console.log("📋 Environment Variables to Update:");
  console.log(`   NEXT_PUBLIC_RWA_ASSET_REGISTRY=${result.registry.proxy}`);
  console.log(`   NEXT_PUBLIC_RWA_TOKEN_FACTORY=${result.factory.proxy}`);
  console.log(`   NEXT_PUBLIC_RWA_TOKEN_FACTORY_404=${result.factory404}`);
  console.log(`   NEXT_PUBLIC_RWA_MARKETPLACE_SETTER=${result.marketplace.proxy}\n`);

  console.log("🧪 Next Steps:");
  console.log("   1. Grant MARKETPLACE_ROLE to marketplace on registry");
  console.log("   2. Grant TOKEN_CREATOR_ROLE to marketplace on factory");
  console.log("   3. Grant TOKEN_CREATOR_ROLE to marketplace on factory404");
  console.log("   4. Register assets in registry");
  console.log("   5. Deploy ERC404 tokens for assets");
  console.log("   6. Create marketplace listings\n");

  // Save deployment result
  const deploymentPath = path.resolve(__dirname, "../deployed-addresses-fresh.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(result, null, 2));
  console.log(`💾 Deployment data saved to: ${deploymentPath}`);

  return result;
}

async function main() {
  try {
    await deployFreshEcosystem();
    console.log("🎉 FRESH ECOSYSTEM DEPLOYMENT COMPLETED SUCCESSFULLY!");
    process.exit(0);
  } catch (error) {
    console.error("❌ FRESH ECOSYSTEM DEPLOYMENT FAILED:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});