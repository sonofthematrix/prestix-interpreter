import dotenv from "dotenv";
import fs from "fs";
import hre from "hardhat";
import path from "path";

// Load environment variables from both .env.local and .env
// .env.local takes precedence and overrides .env values
const envLocalPath = path.join(__dirname, "../.env.local");
const envPath = path.join(__dirname, "../.env");

// Load .env first (base values)
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("📝 Loaded environment variables from .env");
}

// Load .env.local second (overrides .env values)
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true }); // Override existing vars
  console.log("📝 Loaded environment variables from .env.local (overrides .env)");
}

/**
 * Verify Marketplace Implementation Contract on Sepolia
 * 
 * Usage: bun run hardhat run scripts/verify-marketplace-implementation.ts --network sepolia
 */

const MARKETPLACE_IMPLEMENTATION_ADDRESS = "0x3e8b80714196ecb6925150347215bdf4c1420a8d";
const CONTRACT_PATH = "contracts/upgradeable/RWAMarketplaceUpgradeable.sol:RWAMarketplaceUpgradeable";

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   MARKETPLACE IMPLEMENTATION VERIFICATION                ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Check environment variables
  const etherscanApiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
  
  if (!etherscanApiKey) {
    console.log("❌ Error: ETHERSCAN_API_KEY not set in environment");
    console.log("   Set it in your .env.local or .env file as ETHERSCAN_API_KEY or NEXT_PUBLIC_ETHERSCAN_API_KEY");
    process.exit(1);
  }

  // Set in environment for Hardhat verify plugin
  process.env.ETHERSCAN_API_KEY = etherscanApiKey;

  const network = await hre.ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`🔑 Etherscan API Key: ${etherscanApiKey.substring(0, 8)}...`);

  if (network.chainId !== 11155111n) {
    console.log("⚠️  Warning: Not connected to Sepolia testnet!");
    console.log("   Expected Chain ID: 11155111");
    console.log(`   Current Chain ID: ${network.chainId}`);
    process.exit(1);
  }

  console.log(`\n📋 Verifying Marketplace Implementation:`);
  console.log(`   Address: ${MARKETPLACE_IMPLEMENTATION_ADDRESS}`);
  console.log(`   Contract: ${CONTRACT_PATH}`);
  console.log(`   Constructor Args: [] (upgradeable contract uses initialize)`);

  // Check if contract has code
  const code = await hre.ethers.provider.getCode(MARKETPLACE_IMPLEMENTATION_ADDRESS);
  if (code === "0x") {
    console.log(`❌ No contract code found at ${MARKETPLACE_IMPLEMENTATION_ADDRESS}`);
    console.log(`   Please verify the address is correct and the contract is deployed on Sepolia`);
    process.exit(1);
  }

  console.log(`✅ Contract code found (${code.length} bytes)`);

  try {
    console.log("\n📤 Submitting verification request to Etherscan...");
    
    await hre.run("verify:verify", {
      address: MARKETPLACE_IMPLEMENTATION_ADDRESS,
      contract: CONTRACT_PATH,
      constructorArguments: [], // Upgradeable contracts have no constructor args
    });

    console.log("\n✅ Marketplace implementation contract verified successfully!");
    console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/address/${MARKETPLACE_IMPLEMENTATION_ADDRESS}#code`);
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    
    if (errorMessage.includes("Already Verified") || errorMessage.includes("already verified")) {
      console.log("\n✅ Marketplace implementation contract already verified!");
      console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/address/${MARKETPLACE_IMPLEMENTATION_ADDRESS}#code`);
    } else {
      console.log(`\n❌ Verification failed: ${errorMessage}`);
      console.log("\n💡 Troubleshooting:");
      console.log("   1. Ensure the contract address is correct");
      console.log("   2. Check that compiler version matches deployment (0.8.23)");
      console.log("   3. Verify optimizer settings match (runs: 200, viaIR: true)");
      console.log("   4. Ensure ETHERSCAN_API_KEY is valid");
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification script failed:", error);
    process.exit(1);
  });

