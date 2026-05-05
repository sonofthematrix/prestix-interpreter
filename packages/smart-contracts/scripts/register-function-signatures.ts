/**
 * Register Function Signatures with 4byte.directory
 * 
 * Registers all function signatures from deployed contracts with 4byte.directory
 * to enable MetaMask parameter decoding.
 * 
 * Usage: bun hardhat run scripts/register-function-signatures.ts --network sepolia
 */

import "dotenv/config";
import hre from "hardhat";
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

interface DeploymentAddresses {
  network: string;
  addresses: {
    ProxyAdmin: string;
    TigerPalaceToken?: string;
    RWAAssetRegistry: string;
    RWATokenFactory: string;
    RWAMarketplace: string;
    RWAStaking: string;
    RWARewardDistributor: string;
    RWARevenue: string;
    MembershipSystem: string;
  };
}

interface FunctionSignature {
  hexSignature: string;
  textSignature: string;
  contractName: string;
  functionName: string;
}

interface RegistrationResult {
  signature: FunctionSignature;
  success: boolean;
  error?: string;
  alreadyExists?: boolean;
}

// Contract mapping
const CONTRACT_MAPPINGS: { [key: string]: string } = {
  ProxyAdmin: "contracts/proxy/ProxyAdmin.sol:ProxyAdmin",
  TigerPalaceToken: "contracts/TigerPalaceToken.sol:TigerPalaceToken",
  RWAAssetRegistry: "contracts/upgradeable/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable",
  RWATokenFactory: "contracts/upgradeable/RWATokenFactoryUpgradeable.sol:RWATokenFactoryUpgradeable",
  RWAMarketplace: "contracts/upgradeable/RWAMarketplaceUpgradeable.sol:RWAMarketplaceUpgradeable",
  RWAStaking: "contracts/upgradeable/RWAStakingUpgradeable.sol:RWAStakingUpgradeable",
  RWARewardDistributor: "contracts/staking/RWARewardDistributor.sol:RWARewardDistributor",
  RWARevenue: "contracts/staking/RWARevenue.sol:RWARevenue",
  MembershipSystem: "contracts/upgradeable/MembershipSystemUpgradeable.sol:MembershipSystemUpgradeable",
};

/**
 * Extract function signatures from ABI
 */
function extractFunctionSignatures(abi: any[], contractName: string): FunctionSignature[] {
  const signatures: FunctionSignature[] = [];

  for (const item of abi) {
    if (item.type === "function" && item.stateMutability !== "view" && item.stateMutability !== "pure") {
      // Build function signature: functionName(param1Type,param2Type,...)
      const paramTypes = item.inputs.map((input: any) => input.type).join(",");
      const textSignature = `${item.name}(${paramTypes})`;

      // Calculate function selector (first 4 bytes of keccak256 hash)
      const hash = ethers.keccak256(ethers.toUtf8Bytes(textSignature));
      const hexSignature = hash.slice(0, 10); // 0x + 8 hex chars = 4 bytes

      signatures.push({
        hexSignature,
        textSignature,
        contractName,
        functionName: item.name,
      });
    }
  }

  return signatures;
}

/**
 * Check if signature already exists in 4byte.directory
 */
async function checkSignatureExists(hexSignature: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.4byte.directory/api/v1/signatures/?hex_signature=${hexSignature.slice(2)}`
    );
    const data = await response.json();
    return (data as { count: number })?.count > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Register signature with 4byte.directory
 */
async function registerSignature(signature: FunctionSignature): Promise<RegistrationResult> {
  // Check if already exists
  const exists = await checkSignatureExists(signature.hexSignature);
  if (exists) {
    return {
      signature,
      success: true,
      alreadyExists: true,
    };
  }

  try {
    // Register with 4byte.directory
    const response = await fetch("https://www.4byte.directory/api/v1/signatures/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hex_signature: signature.hexSignature.slice(2), // Remove 0x prefix
        text_signature: signature.textSignature,
      }),
    });

    if (response.ok) {
      return {
        signature,
        success: true,
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        signature,
        success: false,
        error: (errorData as { detail?: string } | undefined)?.detail || `HTTP ${response.status}`,
      };
    }
  } catch (error: any) {
    return {
      signature,
      success: false,
      error: error.message,
    };
  }
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   REGISTER FUNCTION SIGNATURES WITH 4BYTE.DIRECTORY     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Load deployment addresses
  const addressesFile = path.join(__dirname, "../deployed-addresses-proxy.json");
  if (!fs.existsSync(addressesFile)) {
    console.log(`❌ Error: Deployment file not found: ${addressesFile}`);
    process.exit(1);
  }

  const deployment: DeploymentAddresses = JSON.parse(fs.readFileSync(addressesFile, "utf-8"));
  const network = await ethers.provider.getNetwork();

  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`📋 Deployment Network: ${deployment.network}\n`);

  const allSignatures: FunctionSignature[] = [];
  const results: RegistrationResult[] = [];

  // Extract signatures from each contract
  console.log("🔍 Extracting function signatures from contracts...\n");

  for (const [contractName, artifactPath] of Object.entries(CONTRACT_MAPPINGS)) {
    try {
      const artifact = await hre.artifacts.readArtifact(artifactPath);
      const signatures = extractFunctionSignatures(artifact.abi, contractName);
      allSignatures.push(...signatures);
      console.log(`✅ ${contractName}: ${signatures.length} write functions found`);
    } catch (error: any) {
      console.log(`⚠️  ${contractName}: Failed to load artifact - ${error.message}`);
    }
  }

  console.log(`\n📊 Total signatures to register: ${allSignatures.length}\n`);

  // Register signatures
  console.log("📤 Registering signatures with 4byte.directory...\n");
  console.log("=".repeat(70));

  for (let i = 0; i < allSignatures.length; i++) {
    const signature = allSignatures[i];
    console.log(`\n[${i + 1}/${allSignatures.length}] ${signature.contractName}.${signature.functionName}`);
    console.log(`   Signature: ${signature.textSignature}`);
    console.log(`   Selector: ${signature.hexSignature}`);

    const result = await registerSignature(signature);
    results.push(result);

    if (result.success) {
      if (result.alreadyExists) {
        console.log(`   ✅ Already exists in 4byte.directory`);
      } else {
        console.log(`   ✅ Successfully registered`);
      }
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }

    // Rate limiting - wait 1 second between requests
    if (i < allSignatures.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📋 REGISTRATION SUMMARY");
  console.log("=".repeat(70));

  const successful = results.filter((r) => r.success).length;
  const newlyRegistered = results.filter((r) => r.success && !r.alreadyExists).length;
  const alreadyExists = results.filter((r) => r.alreadyExists).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\n✅ Successfully registered: ${newlyRegistered}`);
  console.log(`✅ Already exists: ${alreadyExists}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}`);

  // Save results
  const resultsFile = path.join(__dirname, "../deployments/function-signature-registration.json");
  fs.writeFileSync(
    resultsFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        network: deployment.network,
        summary: {
          total: results.length,
          successful: successful,
          newlyRegistered: newlyRegistered,
          alreadyExists: alreadyExists,
          failed: failed,
        },
        results: results,
      },
      null,
      2
    )
  );
  console.log(`\n💾 Results saved to: ${resultsFile}`);

  // Show failed registrations
  if (failed > 0) {
    console.log("\n⚠️  Failed Registrations:");
    console.log("=".repeat(70));
    for (const result of results.filter((r) => !r.success)) {
      console.log(`\n${result.signature.contractName}.${result.signature.functionName}`);
      console.log(`   ${result.signature.textSignature}`);
      console.log(`   Error: ${result.error}`);
    }
  }

  console.log("\n🎉 Registration complete!");
  console.log("\n📝 Note: It may take 5-10 minutes for signatures to propagate in 4byte.directory");
  console.log("   MetaMask will automatically decode transactions once signatures are available.");
}

main().catch((error) => {
  console.error("❌ Registration failed:", error);
  process.exit(1);
});

