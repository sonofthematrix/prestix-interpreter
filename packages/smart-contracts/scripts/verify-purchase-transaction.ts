import dotenv from "dotenv";
import fs from "fs";
import hre, { ethers } from "hardhat";
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
 * Verify Purchase Transaction Details
 * 
 * Verifies critical aspects of a purchaseTokensWithERC20 transaction:
 * - Marketplace role on 404 factory
 * - Token registration in factory
 * - Token contract details
 * - Asset registry details
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
const MARKETPLACE_ADDRESS = deployed?.addresses?.RWAMarketplace || process.env.NEXT_PUBLIC_RWA_MARKETPLACE_ADDRESS || "0x5295d340a0B06A2552C2169E5D238849550ea9Fe";
const FACTORY_404_ADDRESS = "0x7a6f7dE826064903f2e419833b9633560217FEe2";
const TOKEN_CONTRACT = "0xc9C369525DFf385935dfDC6aC2F678C26998D0d7";
const ASSET_ID = 11;
const BUYER_ADDRESS = "0xFe3DafA1c35b0562A910359f67d71eCB21328205";

// Factory 404 ABI (minimal)
const FACTORY_404_ABI = [
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function isValidToken(address tokenAddress) external view returns (bool)",
  "function getTokenAddress(uint256 assetId) external view returns (address)",
  "function getAssetId(address tokenAddress) external view returns (uint256)",
  "function TOKEN_CREATOR_ROLE() external view returns (bytes32)",
];

// Token 404 ABI (minimal)
const TOKEN_404_ABI = [
  "function assetId() external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
];

// Marketplace ABI (minimal)
const MARKETPLACE_ABI = [
  "function tokenFactory404() external view returns (address)",
  "function assetRegistry() external view returns (address)",
];

// Registry ABI (minimal)
const REGISTRY_ABI = [
  "function getAsset(uint256 assetId) external view returns (tuple(uint256 id, address owner, string title, string description, uint256 value, uint256 totalTokens, uint256 availableTokens, uint8 status, string assetType, string location, string metadataURI))",
];

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   PURCHASE TRANSACTION VERIFICATION                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const network = await ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})\n`);

  if (network.chainId !== 11155111n) {
    console.log("⚠️  Warning: Not connected to Sepolia testnet!");
    console.log("   Expected Chain ID: 11155111");
    console.log(`   Current Chain ID: ${network.chainId}\n`);
  }

  // Get contract instances
  const factory404 = await ethers.getContractAt(FACTORY_404_ABI, FACTORY_404_ADDRESS);
  const marketplace = await ethers.getContractAt(MARKETPLACE_ABI, MARKETPLACE_ADDRESS);
  
  console.log("=".repeat(70));
  console.log("1️⃣  ROLE VERIFICATION");
  console.log("=".repeat(70));

  // Get TOKEN_CREATOR_ROLE
  const TOKEN_CREATOR_ROLE = await factory404.TOKEN_CREATOR_ROLE();
  console.log(`   TOKEN_CREATOR_ROLE: ${TOKEN_CREATOR_ROLE}`);

  // Check if marketplace has TOKEN_CREATOR_ROLE
  const hasRole = await factory404.hasRole(TOKEN_CREATOR_ROLE, MARKETPLACE_ADDRESS);
  console.log(`   Marketplace has TOKEN_CREATOR_ROLE: ${hasRole ? "✅ YES" : "❌ NO"}`);
  
  if (!hasRole) {
    console.log("\n   ⚠️  CRITICAL: Marketplace does NOT have TOKEN_CREATOR_ROLE!");
    console.log("   Minting will fail. Grant role using:");
    console.log(`   factory404.grantRole(${TOKEN_CREATOR_ROLE}, ${MARKETPLACE_ADDRESS})`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("2️⃣  TOKEN REGISTRATION");
  console.log("=".repeat(70));

  // Check if token is valid in factory
  const isValidToken = await factory404.isValidToken(TOKEN_CONTRACT);
  console.log(`   Token ${TOKEN_CONTRACT} is valid: ${isValidToken ? "✅ YES" : "❌ NO"}`);

  // Get assetId from factory
  try {
    const factoryAssetId = await factory404.getAssetId(TOKEN_CONTRACT);
    console.log(`   Factory assetId for token: ${factoryAssetId}`);
    console.log(`   Registry assetId: ${ASSET_ID}`);
    
    if (factoryAssetId !== BigInt(ASSET_ID)) {
      console.log(`   ⚠️  AssetId mismatch! Factory: ${factoryAssetId}, Registry: ${ASSET_ID}`);
      console.log(`   This is handled correctly by the marketplace code (uses tokenAssetId for minting)`);
    } else {
      console.log(`   ✅ AssetIds match`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error getting assetId: ${error.message}`);
  }

  // Get token address from factory for assetId
  try {
    const tokenAddressFromFactory = await factory404.getTokenAddress(ASSET_ID);
    console.log(`   Token address from factory (assetId ${ASSET_ID}): ${tokenAddressFromFactory}`);
    
    if (tokenAddressFromFactory.toLowerCase() === TOKEN_CONTRACT.toLowerCase()) {
      console.log(`   ✅ Token address matches`);
    } else {
      console.log(`   ⚠️  Token address mismatch!`);
      console.log(`   Expected: ${TOKEN_CONTRACT}`);
      console.log(`   Factory: ${tokenAddressFromFactory}`);
    }
  } catch (error: any) {
    console.log(`   ⚠️  Token not found in factory for assetId ${ASSET_ID}: ${error.message}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("3️⃣  TOKEN CONTRACT DETAILS");
  console.log("=".repeat(70));

  try {
    const token = await ethers.getContractAt(TOKEN_404_ABI, TOKEN_CONTRACT);
    
    const tokenAssetId = await token.assetId();
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    const buyerBalance = await token.balanceOf(BUYER_ADDRESS);

    console.log(`   Token Address: ${TOKEN_CONTRACT}`);
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Token AssetId: ${tokenAssetId}`);
    console.log(`   Total Supply: ${totalSupply.toString()}`);
    console.log(`   Buyer Balance: ${buyerBalance.toString()}`);
    
    if (buyerBalance > 0n) {
      console.log(`   ✅ Buyer has tokens (purchase likely succeeded)`);
    } else {
      console.log(`   ⚠️  Buyer has no tokens (purchase may have failed)`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error reading token contract: ${error.message}`);
    console.log(`   Token may not be ERC404 or contract may not exist`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("4️⃣  MARKETPLACE CONFIGURATION");
  console.log("=".repeat(70));

  // Check marketplace's 404 factory address
  try {
    const marketplaceFactory404 = await marketplace.tokenFactory404();
    console.log(`   Marketplace tokenFactory404: ${marketplaceFactory404}`);
    
    if (marketplaceFactory404.toLowerCase() === FACTORY_404_ADDRESS.toLowerCase()) {
      console.log(`   ✅ Factory address matches`);
    } else {
      console.log(`   ⚠️  Factory address mismatch!`);
      console.log(`   Expected: ${FACTORY_404_ADDRESS}`);
      console.log(`   Marketplace: ${marketplaceFactory404}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error reading marketplace factory404: ${error.message}`);
  }

  // Get asset registry
  try {
    const assetRegistryAddress = await marketplace.assetRegistry();
    console.log(`   Asset Registry: ${assetRegistryAddress}`);
    
    const registry = await ethers.getContractAt(REGISTRY_ABI, assetRegistryAddress);
    const asset = await registry.getAsset(ASSET_ID);
    
    console.log(`\n   Asset Details (ID: ${ASSET_ID}):`);
    console.log(`   Owner: ${asset.owner}`);
    console.log(`   Title: ${asset.title}`);
    console.log(`   Status: ${asset.status} (1 = Active)`);
    console.log(`   Total Tokens: ${asset.totalTokens.toString()}`);
    console.log(`   Available Tokens: ${asset.availableTokens.toString()}`);
    
    if (asset.status === 1) {
      console.log(`   ✅ Asset is active`);
    } else {
      console.log(`   ⚠️  Asset is not active (status: ${asset.status})`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error reading asset registry: ${error.message}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("📋 SUMMARY");
  console.log("=".repeat(70));
  
  console.log("\n✅ Verification complete!");
  console.log("\n📝 Key Points:");
  console.log("   - Marketplace must have TOKEN_CREATOR_ROLE on 404 factory to mint");
  console.log("   - Token must be registered in factory");
  console.log("   - AssetId mismatch is handled (uses token's assetId for minting)");
  console.log("   - Check buyer balance to confirm purchase succeeded");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification script failed:", error);
    process.exit(1);
  });

