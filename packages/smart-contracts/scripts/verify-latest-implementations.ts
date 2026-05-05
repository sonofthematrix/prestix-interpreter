import dotenv from "dotenv";
import fs from "fs";
import hre, { ethers, upgrades } from "hardhat";
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
 * Verify Latest Implementation Contracts on Etherscan
 * 
 * This script verifies the latest implementation contracts that were deployed:
 * - Marketplace: 0x1822EFd4F5cdA9fD25e56662afDdD7f92cb56Cb2 (with token registration)
 * - Registry: 0x9090d5BF0b58006c690121070C8088Bcfa66a85F
 * - Factory: 0x7aCd221938dde8c1505aD2556556B7b87e0789b4
 * 
 * Usage: bun run hardhat run scripts/verify-latest-implementations.ts --network sepolia
 */

interface ContractToVerify {
  name: string;
  address: string;
  contractPath: string;
  constructorArgs?: any[];
}

// Latest implementation addresses (from verification check)
const CONTRACTS_TO_VERIFY: ContractToVerify[] = [
  {
    name: "RWAMarketplaceUpgradeable (Latest with Token Registration)",
    address: "0x1822EFd4F5cdA9fD25e56662afDdD7f92cb56Cb2",
    contractPath: "contracts/upgradeable/RWAMarketplaceUpgradeable.sol:RWAMarketplaceUpgradeable",
    constructorArgs: [], // Upgradeable contracts have no constructor args
  },
  {
    name: "RWAAssetRegistryUpgradeable",
    address: "0x9090d5BF0b58006c690121070C8088Bcfa66a85F",
    contractPath: "contracts/upgradeable/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable",
    constructorArgs: [],
  },
  {
    name: "RWATokenFactoryUpgradeable",
    address: "0x7aCd221938dde8c1505aD2556556B7b87e0789b4",
    contractPath: "contracts/upgradeable/RWATokenFactoryUpgradeable.sol:RWATokenFactoryUpgradeable",
    constructorArgs: [],
  },
  {
    name: "RWAStakingUpgradeable",
    address: "0x1e36c8940F7DEa536C8483A465719A3eeaE606ad",
    contractPath: "contracts/upgradeable/RWAStakingUpgradeable.sol:RWAStakingUpgradeable",
    constructorArgs: [],
  },
  {
    name: "MembershipSystemUpgradeable",
    address: "0x1083A8fd80419664A51dCaf1AC11fEE37Ada61cF",
    contractPath: "contracts/upgradeable/MembershipSystemUpgradeable.sol:MembershipSystemUpgradeable",
    constructorArgs: [],
  },
];

async function verifyContract(contract: ContractToVerify): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`\n📤 Verifying ${contract.name}...`);
    console.log(`   Address: ${contract.address}`);
    console.log(`   Contract: ${contract.contractPath}`);
    
    if (contract.constructorArgs && contract.constructorArgs.length > 0) {
      console.log(`   Constructor Args: ${JSON.stringify(contract.constructorArgs)}`);
    } else {
      console.log(`   Constructor Args: None (upgradeable contract)`);
    }

    // Check if contract has code
    const code = await ethers.provider.getCode(contract.address);
    if (code === "0x") {
      return { success: false, error: "No contract code found at address" };
    }
    console.log(`   ✅ Contract code found (${code.length / 2 - 1} bytes)`);

    // Verify on Etherscan
    await hre.run("verify:verify", {
      address: contract.address,
      contract: contract.contractPath,
      constructorArguments: contract.constructorArgs || [],
    });

    console.log(`   ✅ ${contract.name} verified successfully!`);
    console.log(`   🔗 View at: https://sepolia.etherscan.io/address/${contract.address}#code`);
    return { success: true };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    
    if (errorMessage.includes("Already Verified") || 
        errorMessage.includes("already verified") ||
        errorMessage.includes("Contract source code already verified")) {
      console.log(`   ✅ ${contract.name} already verified`);
      console.log(`   🔗 View at: https://sepolia.etherscan.io/address/${contract.address}#code`);
      return { success: true };
    } else {
      console.log(`   ❌ Verification failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   VERIFY LATEST IMPLEMENTATION CONTRACTS ON ETHERSCAN    ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Check environment variables
  if (!process.env.ETHERSCAN_API_KEY && !process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY) {
    console.log("❌ Error: ETHERSCAN_API_KEY not set in environment");
    console.log("   Set it in your .env.local or .env file as ETHERSCAN_API_KEY or NEXT_PUBLIC_ETHERSCAN_API_KEY");
    process.exit(1);
  }

  const etherscanApiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
  
  // Set in environment for Hardhat verify plugin
  if (etherscanApiKey) {
    process.env.ETHERSCAN_API_KEY = etherscanApiKey;
  }

  const network = await ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`🔑 Etherscan API Key: ${etherscanApiKey?.substring(0, 8)}...\n`);

  if (network.chainId !== 11155111n) {
    console.log("⚠️  Warning: Not connected to Sepolia testnet!");
    console.log("   Expected Chain ID: 11155111");
    console.log(`   Current Chain ID: ${network.chainId}\n`);
  }

  console.log("📋 Contracts to verify:");
  CONTRACTS_TO_VERIFY.forEach((contract, index) => {
    console.log(`   ${index + 1}. ${contract.name}`);
    console.log(`      Address: ${contract.address}`);
  });

  const results: Array<{ contract: string; address: string; success: boolean; error?: string }> = [];

  // Verify each contract
  for (const contract of CONTRACTS_TO_VERIFY) {
    try {
      const result = await verifyContract(contract);
      results.push({
        contract: contract.name,
        address: contract.address,
        success: result.success,
        error: result.error,
      });

      // Wait between verifications to avoid rate limiting
      if (CONTRACTS_TO_VERIFY.indexOf(contract) < CONTRACTS_TO_VERIFY.length - 1) {
        console.log("\n⏳ Waiting 15 seconds before next verification...");
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    } catch (error: any) {
      console.log(`❌ Error verifying ${contract.name}: ${error.message}`);
      results.push({
        contract: contract.name,
        address: contract.address,
        success: false,
        error: error.message,
      });
    }
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 VERIFICATION SUMMARY");
  console.log("=".repeat(70));

  const verified = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ Successfully Verified: ${verified.length}/${results.length}`);
  verified.forEach(result => {
    console.log(`   ✅ ${result.contract}`);
    console.log(`      ${result.address}`);
    console.log(`      https://sepolia.etherscan.io/address/${result.address}#code`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ Failed Verifications: ${failed.length}/${results.length}`);
    failed.forEach(result => {
      console.log(`   ❌ ${result.contract}`);
      console.log(`      ${result.address}`);
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
    });
  }

  console.log("\n" + "=".repeat(70));
  
  if (failed.length === 0) {
    console.log("🎉 ALL CONTRACTS VERIFIED SUCCESSFULLY!");
  } else {
    console.log("⚠️  Some contracts failed verification. Check errors above.");
  }
  console.log("=".repeat(70) + "\n");

  // Save results
  const resultsPath = path.join(__dirname, "../deployments/latest-implementation-verification-results.json");
  const verificationData = {
    timestamp: new Date().toISOString(),
    network: "sepolia",
    results: results,
  };
  
  fs.writeFileSync(resultsPath, JSON.stringify(verificationData, null, 2));
  console.log(`💾 Verification results saved to ${resultsPath}`);

  // Exit with appropriate code
  process.exit(failed.length === 0 ? 0 : 1);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification script failed:", error);
    process.exit(1);
  });

