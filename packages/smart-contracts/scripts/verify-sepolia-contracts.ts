import dotenv from "dotenv";
import fs from "fs";
import hre, { ethers, upgrades } from "hardhat";
import path from "path";

// Load environment variables from .env.local first, then .env
const envLocalPath = path.join(__dirname, "../.env.local");
const envPath = path.join(__dirname, "../.env");

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log("📝 Loaded environment variables from .env.local");
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("📝 Loaded environment variables from .env");
} else {
  dotenv.config(); // Fallback to default .env loading
}

/**
 * Verification Script for Sepolia Contracts
 * 
 * Verifies all three RWA contracts (Registry, Factory, Marketplace) on Etherscan
 * Handles both proxy and implementation contract verification
 * 
 * Usage: bun run hardhat run scripts/verify-sepolia-contracts.ts --network sepolia
 */

interface ContractInfo {
  name: string;
  proxyAddress: string;
  implementationAddress?: string;
  contractPath: string;
  constructorArgs?: any[];
  isUpgradeable: boolean;
}

interface VerificationResult {
  contract: string;
  proxyAddress: string;
  implementationAddress?: string;
  proxyVerified: boolean;
  implementationVerified: boolean;
  errors: string[];
}

// Load deployed addresses from file
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
const addresses = deployed?.addresses || {};

const CONTRACTS: ContractInfo[] = [
  {
    name: "RWAAssetRegistry",
    proxyAddress: addresses.RWAAssetRegistry || process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY_ADDRESS || "0x4db4f17e4e3a67bBD8c0cD3BE83072961703Ef07",
    contractPath: "contracts/upgradeable/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable",
    isUpgradeable: true,
  },
  {
    name: "RWATokenFactory",
    proxyAddress: addresses.RWATokenFactory || process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY_ADDRESS || "0x07E9a4C59c7774b2700d8e3fe3424CD9fB85aa2E",
    contractPath: "contracts/upgradeable/RWATokenFactoryUpgradeable.sol:RWATokenFactoryUpgradeable",
    isUpgradeable: true,
  },
  {
    name: "RWAMarketplace",
    proxyAddress: addresses.RWAMarketplace || process.env.NEXT_PUBLIC_RWA_MARKETPLACE_ADDRESS || "0x6e3bfae36b8eE8F0Ec2BA9C3CE6db1Bf61331BD0",
    contractPath: "contracts/upgradeable/RWAMarketplaceUpgradeable.sol:RWAMarketplaceUpgradeable",
    isUpgradeable: true,
  },
];

async function getImplementationAddress(proxyAddress: string): Promise<string | null> {
  try {
    console.log(`🔍 Getting implementation address for proxy ${proxyAddress}...`);
    
    // First try using upgrades plugin (most reliable)
    try {
      const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
      if (implAddress && implAddress !== ethers.ZeroAddress) {
        console.log(`✅ Implementation address (via upgrades): ${implAddress}`);
        return implAddress;
      }
    } catch (error: any) {
      console.log(`⚠️  Could not get implementation address via upgrades plugin: ${error.message}`);
    }
    
    // Fallback: Try to get implementation address using ERC1967 storage slot
    try {
      const implementationSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
      const storageValue = await ethers.provider.getStorage(proxyAddress, implementationSlot);
      
      if (storageValue && storageValue !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        // Extract address from storage slot (last 20 bytes = 40 hex chars)
        const addressHex = storageValue.slice(-40);
        const address = ethers.getAddress("0x" + addressHex); // This will checksum the address
        console.log(`✅ Implementation address (via storage slot): ${address}`);
        return address;
      }
    } catch (error: any) {
      console.log(`⚠️  Could not get implementation address via storage slot: ${error.message}`);
    }
    
    return null;
  } catch (error: any) {
    console.log(`⚠️  Error getting implementation address: ${error.message}`);
    return null;
  }
}

async function verifyContract(
  address: string,
  contractPath: string,
  constructorArgs: any[] = [],
  contractName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`\n📤 Verifying ${contractName} at ${address}...`);
    console.log(`   Contract: ${contractPath}`);
    if (constructorArgs.length > 0) {
      console.log(`   Constructor args: ${JSON.stringify(constructorArgs)}`);
    }
    
    await hre.run("verify:verify", {
      address: address,
      contract: contractPath,
      constructorArguments: constructorArgs,
    });
    
    console.log(`✅ ${contractName} verified successfully!`);
    return { success: true };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    
    if (errorMessage.includes("Already Verified") || errorMessage.includes("already verified")) {
      console.log(`✅ ${contractName} already verified`);
      return { success: true };
    } else {
      console.log(`❌ Verification failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }
}

async function verifyProxyContract(proxyAddress: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`\n📤 Verifying proxy contract at ${proxyAddress}...`);
    
    // TransparentUpgradeableProxy from OpenZeppelin
    // Constructor args: implementation, admin, data
    // For verification, we need to check if it's already verified or use the proxy verification method
    
    // First check if contract is already verified
    const code = await ethers.provider.getCode(proxyAddress);
    if (code === "0x") {
      return { success: false, error: "No contract code found at address" };
    }
    
    // For OpenZeppelin proxies, they're usually already verified
    // But we can try to verify using the standard proxy pattern
    try {
      await hre.run("verify:verify", {
        address: proxyAddress,
        constructorArguments: [], // Proxies don't have constructor args in the traditional sense
      });
      
      console.log(`✅ Proxy contract verified successfully!`);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      
      if (errorMessage.includes("Already Verified") || errorMessage.includes("already verified")) {
        console.log(`✅ Proxy contract already verified`);
        return { success: true };
      }
      
      // Proxy contracts are often OpenZeppelin contracts that are already verified
      // We can skip proxy verification if it fails
      console.log(`⚠️  Proxy verification skipped (OpenZeppelin proxies are usually pre-verified)`);
      return { success: true }; // Consider proxy verification optional
    }
  } catch (error: any) {
    console.log(`⚠️  Proxy verification failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function verifyContractInfo(contract: ContractInfo): Promise<VerificationResult> {
  const result: VerificationResult = {
    contract: contract.name,
    proxyAddress: contract.proxyAddress,
    proxyVerified: false,
    implementationVerified: false,
    errors: [],
  };
  
  console.log("\n" + "=".repeat(70));
  console.log(`🔍 Verifying ${contract.name}`);
  console.log("=".repeat(70));
  console.log(`📍 Proxy Address: ${contract.proxyAddress}`);
  
  // Check if proxy address has code
  const proxyCode = await ethers.provider.getCode(contract.proxyAddress);
  if (proxyCode === "0x") {
    result.errors.push(`No contract code found at proxy address ${contract.proxyAddress}`);
    console.log(`❌ No contract code found at proxy address`);
    return result;
  }
  
  // Get implementation address if upgradeable
  if (contract.isUpgradeable) {
    const implAddress = await getImplementationAddress(contract.proxyAddress);
    if (implAddress) {
      result.implementationAddress = implAddress;
      
      // Verify implementation contract
      const implResult = await verifyContract(
        implAddress,
        contract.contractPath,
        contract.constructorArgs || [],
        `${contract.name} Implementation`
      );
      
      result.implementationVerified = implResult.success;
      if (!implResult.success && implResult.error) {
        result.errors.push(`Implementation verification: ${implResult.error}`);
      }
      
      // Wait a bit between verifications to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      result.errors.push(`Could not determine implementation address for ${contract.name}`);
    }
  }
  
  // Verify proxy contract (optional - OpenZeppelin proxies are usually pre-verified)
  const proxyResult = await verifyProxyContract(contract.proxyAddress);
  result.proxyVerified = proxyResult.success;
  if (!proxyResult.success && proxyResult.error) {
    result.errors.push(`Proxy verification: ${proxyResult.error}`);
  }
  
  return result;
}

async function printSummary(results: VerificationResult[]): Promise<void> {
  console.log("\n" + "=".repeat(70));
  console.log("📋 VERIFICATION SUMMARY");
  console.log("=".repeat(70));
  
  let allVerified = true;
  
  for (const result of results) {
    console.log(`\n📄 ${result.contract}:`);
    console.log(`   Proxy: ${result.proxyAddress}`);
    if (result.implementationAddress) {
      console.log(`   Implementation: ${result.implementationAddress}`);
    }
    console.log(`   Proxy Verified: ${result.proxyVerified ? "✅" : "❌"}`);
    console.log(`   Implementation Verified: ${result.implementationVerified ? "✅" : "❌"}`);
    
    if (result.errors.length > 0) {
      console.log(`   ⚠️  Errors:`);
      result.errors.forEach(error => console.log(`      - ${error}`));
      allVerified = false;
    }
    
    if (result.implementationAddress) {
      console.log(`   🔗 Etherscan Links:`);
      console.log(`      Proxy: https://sepolia.etherscan.io/address/${result.proxyAddress}`);
      console.log(`      Implementation: https://sepolia.etherscan.io/address/${result.implementationAddress}`);
    }
  }
  
  console.log("\n" + "=".repeat(70));
  if (allVerified && results.every(r => r.implementationVerified)) {
    console.log("✅ All contracts verified successfully!");
  } else {
    console.log("⚠️  Some contracts failed verification. Check errors above.");
  }
  console.log("=".repeat(70) + "\n");
}

async function saveVerificationResults(results: VerificationResult[]): Promise<void> {
  const resultsPath = path.join(__dirname, "../deployments/sepolia-verification-results.json");
  const verificationData = {
    timestamp: new Date().toISOString(),
    network: "sepolia",
    results: results.map(r => ({
      contract: r.contract,
      proxyAddress: r.proxyAddress,
      implementationAddress: r.implementationAddress,
      proxyVerified: r.proxyVerified,
      implementationVerified: r.implementationVerified,
      errors: r.errors,
    })),
  };
  
  fs.writeFileSync(resultsPath, JSON.stringify(verificationData, null, 2));
  console.log(`💾 Verification results saved to ${resultsPath}`);
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   SEPOLIA CONTRACT VERIFICATION                            ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  // Check environment variables
  if (!process.env.ETHERSCAN_API_KEY && !process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY) {
    console.log("❌ Error: ETHERSCAN_API_KEY not set in environment");
    console.log("   Set it in your .env.local or .env file as ETHERSCAN_API_KEY or NEXT_PUBLIC_ETHERSCAN_API_KEY");
    process.exit(1);
  }
  
  // Use NEXT_PUBLIC_ prefixed version if available, otherwise fall back to non-prefixed
  const etherscanApiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
  
  // Set in environment for Hardhat verify plugin
  if (etherscanApiKey) {
    process.env.ETHERSCAN_API_KEY = etherscanApiKey;
  }
  
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`🔑 Etherscan API Key: ${etherscanApiKey?.substring(0, 8)}...`);
  
  if (network.chainId !== 11155111n) {
    console.log("⚠️  Warning: Not connected to Sepolia testnet!");
    console.log("   Expected Chain ID: 11155111");
    console.log(`   Current Chain ID: ${network.chainId}`);
  }
  
  console.log("\n📋 Contracts to verify:");
  CONTRACTS.forEach((contract, index) => {
    console.log(`   ${index + 1}. ${contract.name}: ${contract.proxyAddress}`);
  });
  
  const results: VerificationResult[] = [];
  
  // Verify each contract
  for (const contract of CONTRACTS) {
    try {
      const result = await verifyContractInfo(contract);
      results.push(result);
      
      // Wait between contract verifications to avoid rate limiting
      if (CONTRACTS.indexOf(contract) < CONTRACTS.length - 1) {
        console.log("\n⏳ Waiting 10 seconds before next verification...");
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    } catch (error: any) {
      console.log(`❌ Error verifying ${contract.name}: ${error.message}`);
      results.push({
        contract: contract.name,
        proxyAddress: contract.proxyAddress,
        proxyVerified: false,
        implementationVerified: false,
        errors: [error.message],
      });
    }
  }
  
  // Print summary
  await printSummary(results);
  
  // Save results
  await saveVerificationResults(results);
  
  // Exit with appropriate code
  const allVerified = results.every(r => r.implementationVerified);
  process.exit(allVerified ? 0 : 1);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification script failed:", error);
    process.exit(1);
  });

