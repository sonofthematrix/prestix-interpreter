import { ethers, upgrades, network } from "hardhat";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Deploy New Marketplace - Complete Setup
 * 
 * This script deploys a fresh marketplace proxy and implementation,
 * initializes it with proper parameters, and configures all settings.
 * 
 * Steps:
 * 1. Deploy new UUPS proxy (implementation deployed automatically)
 * 2. Verify initialization
 * 3. Verify roles
 * 4. Configure payment token (USDC)
 * 5. Configure price oracle (if available)
 * 6. Final verification
 */

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || "0xA1fb017a8c89cCB76F63d2244C4a228964B50D80";
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY || process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY_404 || "";
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const PRICE_ORACLE_ADDRESS = process.env.NEXT_PUBLIC_CHAINLINK_PRICE_ORACLE || "";
const FEE_RECIPIENT = process.env.FEE_RECIPIENT || process.env.ADMIN_ADDRESS || "";

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   DEPLOY NEW MARKETPLACE - COMPLETE SETUP                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.config.chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH\n`);

  // Validate required addresses
  if (!REGISTRY_ADDRESS || REGISTRY_ADDRESS === "") {
    console.error("❌ NEXT_PUBLIC_RWA_ASSET_REGISTRY not set in environment variables");
    process.exit(1);
  }

  if (!FACTORY_ADDRESS || FACTORY_ADDRESS === "") {
    console.error("❌ NEXT_PUBLIC_RWA_TOKEN_FACTORY not set in environment variables");
    process.exit(1);
  }

  const feeRecipient = FEE_RECIPIENT || deployer.address;
  const adminAddress = deployer.address;

  console.log("📋 Configuration:");
  console.log(`   Registry: ${REGISTRY_ADDRESS}`);
  console.log(`   Factory: ${FACTORY_ADDRESS}`);
  console.log(`   USDC: ${USDC_ADDRESS}`);
  console.log(`   Price Oracle: ${PRICE_ORACLE_ADDRESS || "Not configured"}`);
  console.log(`   Fee Recipient: ${feeRecipient}`);
  console.log(`   Admin: ${adminAddress}\n`);

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 1: DEPLOY MARKETPLACE PROXY (UUPS)");
  console.log("======================================================================\n");

  console.log("   📦 Deploying marketplace proxy with UUPS pattern...");
  console.log("   (Implementation will be deployed automatically)");
  console.log("   Initializing with:");
  console.log(`     - Asset Registry: ${REGISTRY_ADDRESS}`);
  console.log(`     - Token Factory: ${FACTORY_ADDRESS}`);
  console.log(`     - Fee Recipient: ${feeRecipient}`);
  console.log(`     - Admin: ${adminAddress}\n`);

  const RWAMarketplaceFixedV2 = await ethers.getContractFactory("RWAMarketplaceFixedV2");
  const marketplaceProxy = await upgrades.deployProxy(
    RWAMarketplaceFixedV2,
    [
      REGISTRY_ADDRESS,
      FACTORY_ADDRESS,
      feeRecipient,
      "0x7a6f7dE826064903f2e419833b9633560217FEe2", // tokenFactory404
      [USDC_ADDRESS], // initialPaymentTokens
      adminAddress,
      "https://daoble.xyz/api/assets/" // tokenUriBase
    ],
    {
      kind: "uups",
      initializer: "initialize",
    }
  );
  await marketplaceProxy.waitForDeployment();
  const marketplaceProxyAddress = await marketplaceProxy.getAddress();
  
  console.log(`   ✅ Proxy deployed: ${marketplaceProxyAddress}`);
  
  // Get implementation address from proxy
  const marketplaceImplAddress = await upgrades.erc1967.getImplementationAddress(marketplaceProxyAddress);
  console.log(`   ✅ Implementation deployed: ${marketplaceImplAddress}`);
  
  // Verify implementation has code
  const code = await ethers.provider.getCode(marketplaceImplAddress);
  if (code === "0x") {
    console.error("❌ Implementation has no code!");
    process.exit(1);
  }
  console.log(`   ✅ Implementation verified (${code.length / 2 - 1} bytes)\n`);

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 2: VERIFY INITIALIZATION");
  console.log("======================================================================\n");

  const MARKETPLACE_ABI = [
    "function assetRegistry() view returns (address)",
    "function tokenFactory() view returns (address)",
    "function getFeeRecipient() view returns (address)",
    "function getMarketplaceFee() view returns (uint256)",
    "function paymentToken() view returns (address)",
    "function priceOracle() view returns (address)",
    "function paused() view returns (bool)",
    "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
    "function UPGRADER_ROLE() view returns (bytes32)",
    "function FEE_MANAGER_ROLE() view returns (bytes32)",
    "function MARKETPLACE_ADMIN_ROLE() view returns (bytes32)",
    "function hasRole(bytes32 role, address account) view returns (bool)",
  ];

  const marketplace = await ethers.getContractAt(MARKETPLACE_ABI, marketplaceProxyAddress);

  console.log("   🔍 Verifying initialization...");
  const assetRegistry = await marketplace.assetRegistry();
  const tokenFactory = await marketplace.tokenFactory();
  const feeRecipientAddr = await marketplace.getFeeRecipient();
  const marketplaceFee = await marketplace.getMarketplaceFee();
  const isPaused = await marketplace.paused();

  console.log(`   Asset Registry: ${assetRegistry}`);
  console.log(`   Token Factory: ${tokenFactory}`);
  console.log(`   Fee Recipient: ${feeRecipientAddr}`);
  console.log(`   Marketplace Fee: ${marketplaceFee.toString()} basis points (${Number(marketplaceFee) / 100}%)`);
  console.log(`   Paused: ${isPaused ? "Yes ❌" : "No ✅"}\n`);

  if (assetRegistry.toLowerCase() !== REGISTRY_ADDRESS.toLowerCase()) {
    console.error(`   ❌ Asset registry mismatch!`);
    process.exit(1);
  }
  if (tokenFactory.toLowerCase() !== FACTORY_ADDRESS.toLowerCase()) {
    console.error(`   ❌ Token factory mismatch!`);
    process.exit(1);
  }
  if (marketplaceFee.toString() !== "250") {
    console.error(`   ❌ Marketplace fee incorrect! Expected 250, got ${marketplaceFee.toString()}`);
    process.exit(1);
  }
  console.log("   ✅ Initialization verified\n");

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 3: VERIFY ROLES");
  console.log("======================================================================\n");

  console.log("   🔍 Checking role assignments...");
  const DEFAULT_ADMIN_ROLE = await marketplace.DEFAULT_ADMIN_ROLE();
  const UPGRADER_ROLE = await marketplace.UPGRADER_ROLE();
  const FEE_MANAGER_ROLE = await marketplace.FEE_MANAGER_ROLE();
  const MARKETPLACE_ADMIN_ROLE = await marketplace.MARKETPLACE_ADMIN_ROLE();

  const hasDefaultAdmin = await marketplace.hasRole(DEFAULT_ADMIN_ROLE, adminAddress);
  const hasUpgrader = await marketplace.hasRole(UPGRADER_ROLE, adminAddress);
  const hasFeeManager = await marketplace.hasRole(FEE_MANAGER_ROLE, adminAddress);
  const hasMarketplaceAdmin = await marketplace.hasRole(MARKETPLACE_ADMIN_ROLE, adminAddress);

  console.log(`   DEFAULT_ADMIN_ROLE: ${hasDefaultAdmin ? "✅" : "❌"}`);
  console.log(`   UPGRADER_ROLE: ${hasUpgrader ? "✅" : "❌"}`);
  console.log(`   FEE_MANAGER_ROLE: ${hasFeeManager ? "✅" : "❌"}`);
  console.log(`   MARKETPLACE_ADMIN_ROLE: ${hasMarketplaceAdmin ? "✅" : "❌"}\n`);

  if (!hasDefaultAdmin || !hasUpgrader || !hasFeeManager || !hasMarketplaceAdmin) {
    console.error("   ❌ Admin does not have all required roles!");
    process.exit(1);
  }
  console.log("   ✅ All roles assigned correctly\n");

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 4: CONFIGURE PAYMENT TOKEN (USDC)");
  console.log("======================================================================\n");

  const SETTINGS_ABI = [
    "function setPaymentToken(address newPaymentToken)",
    "function paymentToken() view returns (address)",
  ];

  const marketplaceWithSettings = await ethers.getContractAt(
    [...MARKETPLACE_ABI, ...SETTINGS_ABI],
    marketplaceProxyAddress
  );

  const currentPaymentToken = await marketplaceWithSettings.paymentToken();
  console.log(`   Current Payment Token: ${currentPaymentToken || "Not set (ETH only)"}\n`);

  if (currentPaymentToken.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
    console.log(`   ⚙️  Setting payment token to USDC: ${USDC_ADDRESS}...`);
    try {
      const setPaymentTokenTx = await marketplaceWithSettings.setPaymentToken(USDC_ADDRESS);
      console.log(`   Transaction Hash: ${setPaymentTokenTx.hash}`);
      console.log("   Waiting for confirmation...\n");
      
      const receipt = await setPaymentTokenTx.wait();
      console.log(`   ✅ Payment token configured!`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas Used: ${receipt.gasUsed.toString()}\n`);

      const newPaymentToken = await marketplaceWithSettings.paymentToken();
      if (newPaymentToken.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
        console.log("   ✅ Payment token verified\n");
      } else {
        console.error(`   ❌ Payment token mismatch! Expected ${USDC_ADDRESS}, got ${newPaymentToken}\n`);
      }
    } catch (error: any) {
      console.error(`   ❌ Error setting payment token: ${error.message}\n`);
      console.error("   ⚠️  Continuing without payment token configuration...\n");
    }
  } else {
    console.log("   ✅ Payment token already configured correctly\n");
  }

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 5: CONFIGURE PRICE ORACLE (if available)");
  console.log("======================================================================\n");

  if (PRICE_ORACLE_ADDRESS && PRICE_ORACLE_ADDRESS !== "") {
    const ORACLE_ABI = [
      "function setPriceOracle(address newPriceOracle)",
      "function priceOracle() view returns (address)",
    ];

    const marketplaceWithOracle = await ethers.getContractAt(
      [...MARKETPLACE_ABI, ...ORACLE_ABI],
      marketplaceProxyAddress
    );

    const currentOracle = await marketplaceWithOracle.priceOracle();
    console.log(`   Current Price Oracle: ${currentOracle || "Not set"}\n`);

    if (currentOracle.toLowerCase() !== PRICE_ORACLE_ADDRESS.toLowerCase()) {
      console.log(`   ⚙️  Setting price oracle: ${PRICE_ORACLE_ADDRESS}...`);
      try {
        const setOracleTx = await marketplaceWithOracle.setPriceOracle(PRICE_ORACLE_ADDRESS);
        console.log(`   Transaction Hash: ${setOracleTx.hash}`);
        console.log("   Waiting for confirmation...\n");
        
        const receipt = await setOracleTx.wait();
        console.log(`   ✅ Price oracle configured!`);
        console.log(`   Block: ${receipt.blockNumber}`);
        console.log(`   Gas Used: ${receipt.gasUsed.toString()}\n`);

        const newOracle = await marketplaceWithOracle.priceOracle();
        if (newOracle.toLowerCase() === PRICE_ORACLE_ADDRESS.toLowerCase()) {
          console.log("   ✅ Price oracle verified\n");
        } else {
          console.error(`   ❌ Price oracle mismatch!\n`);
        }
      } catch (error: any) {
        console.error(`   ❌ Error setting price oracle: ${error.message}\n`);
        console.error("   ⚠️  Continuing without price oracle configuration...\n");
      }
    } else {
      console.log("   ✅ Price oracle already configured correctly\n");
    }
  } else {
    console.log("   ⚠️  Price oracle address not provided, skipping configuration\n");
  }

  // ======================================================================
  console.log("======================================================================");
  console.log("📋 STEP 6: FINAL VERIFICATION");
  console.log("======================================================================\n");

  console.log("   🔍 Final configuration check...");
  const finalMarketplace = await ethers.getContractAt(MARKETPLACE_ABI, marketplaceProxyAddress);
  
  const finalAssetRegistry = await finalMarketplace.assetRegistry();
  const finalTokenFactory = await finalMarketplace.tokenFactory();
  const finalFeeRecipient = await finalMarketplace.getFeeRecipient();
  const finalMarketplaceFee = await finalMarketplace.getMarketplaceFee();
  const finalPaymentToken = await finalMarketplace.paymentToken();
  const finalPriceOracle = await finalMarketplace.priceOracle();
  const finalPaused = await finalMarketplace.paused();

  console.log(`   Asset Registry: ${finalAssetRegistry}`);
  console.log(`   Token Factory: ${finalTokenFactory}`);
  console.log(`   Fee Recipient: ${finalFeeRecipient}`);
  console.log(`   Marketplace Fee: ${finalMarketplaceFee.toString()} bps`);
  console.log(`   Payment Token: ${finalPaymentToken || "Not set (ETH only)"}`);
  console.log(`   Price Oracle: ${finalPriceOracle || "Not set"}`);
  console.log(`   Paused: ${finalPaused ? "Yes ❌" : "No ✅"}\n`);

  // ======================================================================
  console.log("======================================================================");
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("======================================================================\n");

  console.log("📝 Summary:");
  console.log(`   Marketplace Proxy: ${marketplaceProxyAddress}`);
  console.log(`   Implementation: ${marketplaceImplAddress}`);
  console.log(`   Asset Registry: ${finalAssetRegistry}`);
  console.log(`   Token Factory: ${finalTokenFactory}`);
  console.log(`   Fee Recipient: ${finalFeeRecipient}`);
  console.log(`   Marketplace Fee: ${finalMarketplaceFee.toString()} bps (${Number(finalMarketplaceFee) / 100}%)`);
  console.log(`   Payment Token: ${finalPaymentToken || "ETH only"}`);
  console.log(`   Price Oracle: ${finalPriceOracle || "Not configured"}`);
  console.log(`   Admin: ${adminAddress}\n`);

  console.log("🔗 View on Etherscan:");
  console.log(`   Proxy: https://sepolia.etherscan.io/address/${marketplaceProxyAddress}`);
  console.log(`   Implementation: https://sepolia.etherscan.io/address/${marketplaceImplAddress}\n`);

  console.log("📋 Environment Variables to Update:");
  console.log(`   NEXT_PUBLIC_RWA_MARKETPLACE=${marketplaceProxyAddress}`);
  console.log(`   NEXT_PUBLIC_RWA_MARKETPLACE_ADDRESS=${marketplaceProxyAddress}\n`);

  console.log("🧪 Next Steps:");
  console.log("   1. Update environment variables with new marketplace address");
  console.log("   2. Grant MARKETPLACE_ROLE to marketplace on registry:");
  console.log(`      bun run scripts/grant-marketplace-role-to-registry.ts`);
  console.log("   3. Grant TOKEN_CREATOR_ROLE to marketplace on factory:");
  console.log(`      bun run scripts/grant-token-creator-role.ts`);
  console.log("   4. Test marketplace:");
  console.log(`      bun run scripts/test-usdc-purchase.ts <assetId> <tokenAmount>`);
  console.log("   5. Verify cost calculation:");
  console.log(`      bun run scripts/check-marketplace-fee.ts\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

