import dotenv from "dotenv";
import fs from "fs";
import hre, { ethers } from "hardhat";
import path from "path";
import { JsonRpcProvider } from "ethers";
// Load environment variables
const envLocalPath = path.join(__dirname, "../.env.local");
const envPath = path.join(__dirname, "../.env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

/**
 * Verify Token Contracts Directly
 * 
 * This script verifies tokens by reading their on-chain data and trying verification
 * with different contract versions (RWAToken404Fixed, RWAToken404).
 * 
 * Usage: bun run hardhat run scripts/verify-tokens-direct.ts --network sepolia
 */

interface TokenToVerify {
  contractType: string;
  contractName: string;
  contractAddress: string;
}

// Token contracts from database
const TOKENS_TO_VERIFY: TokenToVerify[] = [
  { contractType: "TOKEN_ASSET_1", contractName: "Beachfront Villa Paradise", contractAddress: "0x646a6c076b964d0ac10f51f71b16881d58a075fc" },
  { contractType: "TOKEN_ASSET_2", contractName: "Luxury Suburban Estate", contractAddress: "0x35d609cde158370ea141105aeeb061cb8bf4b0e5" },
  { contractType: "TOKEN_ASSET_3", contractName: "Commercial Office Building", contractAddress: "0x0ff5291ea0961aaa348b1a9d4adb423453a89740" },
  { contractType: "TOKEN_ASSET_4", contractName: "Mediterranean Coastal Villa", contractAddress: "0x98b0a661f7ace3ed3a45454f973105d5e7d85a39" },
  { contractType: "TOKEN_ASSET_5", contractName: "Urban Penthouse Suite", contractAddress: "0xad94afa5ae19aa7454080623ec4a6e356351a2ed" },
  { contractType: "TOKEN_ASSET_6", contractName: "Modern Downtown Loft", contractAddress: "0x1a4dad4873958a36533c02950fdf15864e1e3473" },
  { contractType: "TOKEN_ASSET_7", contractName: "Mountain Resort Estate", contractAddress: "0x170410b033b79d0f67df70b464a237c7a5263c83" },
  { contractType: "TOKEN_ASSET_8", contractName: "Luxury Yacht", contractAddress: "0xf70242426792a8028f2385a6f066be2f3d81e205" },
  { contractType: "TOKEN_ASSET_9", contractName: "Mediterranean Coastal Villa", contractAddress: "0x57d8fbfc3f8c473df4e699f0d364f65e95a50f4a" },
  { contractType: "TOKEN_ASSET_10", contractName: "Luxury Beachfront Villa Bali", contractAddress: "0xe94c72eb13c1407534bc9a8e9c5607375a8877a9" },
  { contractType: "TOKEN_ASSET_11", contractName: "Luxury Superyacht", contractAddress: "0x3370f4c73124c40a7f0f0c3cf47636c61c97c13c" },
  { contractType: "TOKEN_ASSET_12", contractName: "Modern Mountain Estate", contractAddress: "0x9749791fd8be3efd37358982353a34183d87e879" },
];

async function getTokenInfo(tokenAddress: string, provider: JsonRpcProvider): Promise<{
  name: string;
  symbol: string;
  assetId: bigint;
  totalSupply: bigint;
  owner: string;
  tokenURI: string;
} | null> {
  const abi = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function assetId() view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function owner() view returns (address)',
    'function tokenURI(uint256) view returns (string)',
  ];

  try {
    const contract = new ethers.Contract(tokenAddress, abi, provider);
    
    const [name, symbol, assetId, totalSupply] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.assetId(),
      contract.totalSupply(),
    ]);

    let owner = "0x0000000000000000000000000000000000000000";
    try {
      owner = await contract.owner();
    } catch {
      // owner() might not exist
    }

    let tokenURI = '';
    try {
      tokenURI = await contract.tokenURI(1);
    } catch {
      // tokenURI might not be available
    }

    return { name, symbol, assetId, totalSupply, owner, tokenURI };
  } catch (error: any) {
    console.warn(`   ⚠️  Could not get token info: ${error.message}`);
    return null;
  }
}

async function verifyToken(token: TokenToVerify): Promise<{ success: boolean; error?: string; contractVersion?: string }> {
  try {
    console.log(`\n📤 Verifying ${token.contractType}...`);
    console.log(`   Name: ${token.contractName}`);
    console.log(`   Address: ${token.contractAddress}`);

    // Check if contract has code
    const code = await new JsonRpcProvider(process.env.SEPOLIA_RPC_URL).getCode(token.contractAddress);
    if (code === "0x") {
      return { success: false, error: "No contract code found at address" };
    }
    console.log(`   ✅ Contract code found (${code.length / 2 - 1} bytes)`);

    // Get token info
    const tokenInfo = await getTokenInfo(token.contractAddress, new JsonRpcProvider(process.env.SEPOLIA_RPC_URL));
    if (!tokenInfo) {
      return { success: false, error: "Could not read token information" };
    }

    console.log(`   Token Info:`);
    console.log(`      Name: ${tokenInfo.name}`);
    console.log(`      Symbol: ${tokenInfo.symbol}`);
    console.log(`      AssetId: ${tokenInfo.assetId.toString()}`);
    console.log(`      TotalSupply: ${tokenInfo.totalSupply.toString()}`);
    console.log(`      Owner: ${tokenInfo.owner}`);
    console.log(`      TokenURI: ${tokenInfo.tokenURI || 'N/A'}`);

    const constructorArgs = [
      tokenInfo.name,
      tokenInfo.symbol,
      tokenInfo.assetId.toString(),
      tokenInfo.totalSupply.toString(),
      tokenInfo.owner,
      tokenInfo.tokenURI || '',
    ];

    // Try RWAToken404Fixed first
    const contractPaths = [
      "contracts/core/RWAToken404Fixed.sol:RWAToken404Fixed",
      "contracts/core/RWAToken404.sol:RWAToken404",
    ];

    for (const contractPath of contractPaths) {
      try {
        console.log(`   🔍 Trying ${contractPath}...`);
        
        await hre.run("verify:verify", {
          address: token.contractAddress,
          contract: contractPath,
          constructorArguments: constructorArgs,
        });

        console.log(`   ✅ Token verified successfully with ${contractPath}!`);
        console.log(`   🔗 View at: https://sepolia.etherscan.io/address/${token.contractAddress}#code`);
        return { success: true, contractVersion: contractPath };
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        
        if (errorMessage.includes("Already Verified") ||
            errorMessage.includes("already verified") ||
            errorMessage.includes("Contract source code already verified")) {
          console.log(`   ✅ Token already verified`);
          console.log(`   🔗 View at: https://sepolia.etherscan.io/address/${token.contractAddress}#code`);
          return { success: true, contractVersion: contractPath };
        } else if (errorMessage.includes("bytecode doesn't match")) {
          console.log(`   ⚠️  Bytecode mismatch with ${contractPath}, trying next...`);
          continue; // Try next contract version
        } else {
          // Other error - return it
          if (contractPath === contractPaths[contractPaths.length - 1]) {
            // Last attempt failed
            return { success: false, error: errorMessage };
          }
          continue; // Try next contract version
        }
      }
    }

    return { success: false, error: "All contract versions failed" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   VERIFY TOKEN CONTRACTS DIRECTLY                        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Check environment variables
  if (!process.env.ETHERSCAN_API_KEY && !process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY) {
    console.log("❌ Error: ETHERSCAN_API_KEY not set in environment");
    process.exit(1);
  }

  const etherscanApiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
  if (etherscanApiKey) {
    process.env.ETHERSCAN_API_KEY = etherscanApiKey;
  }

  const network = await new JsonRpcProvider(process.env.SEPOLIA_RPC_URL).getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`🔑 Etherscan API Key: ${etherscanApiKey?.substring(0, 8)}...\n`);

  if (network.chainId !== 11155111n) {
    console.log("⚠️  Warning: Not connected to Sepolia testnet!");
  }

  console.log(`📋 Found ${TOKENS_TO_VERIFY.length} tokens to verify\n`);

  const results: Array<{ contractType: string; address: string; success: boolean; error?: string; contractVersion?: string }> = [];

  // Verify each token
  for (const token of TOKENS_TO_VERIFY) {
    try {
      const result = await verifyToken(token);
      results.push({
        contractType: token.contractType,
        address: token.contractAddress,
        success: result.success,
        error: result.error,
        contractVersion: result.contractVersion,
      });

      // Wait between verifications to avoid rate limiting
      if (TOKENS_TO_VERIFY.indexOf(token) < TOKENS_TO_VERIFY.length - 1) {
        console.log("\n⏳ Waiting 20 seconds before next verification...");
        await new Promise(resolve => setTimeout(resolve, 20000));
      }
    } catch (error: any) {
      console.log(`❌ Error verifying ${token.contractType}: ${error.message}`);
      results.push({
        contractType: token.contractType,
        address: token.contractAddress,
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
    console.log(`   ✅ ${result.contractType}: ${result.address}`);
    if (result.contractVersion) {
      console.log(`      Contract: ${result.contractVersion}`);
    }
    console.log(`      https://sepolia.etherscan.io/address/${result.address}#code`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ Failed Verifications: ${failed.length}/${results.length}`);
    failed.forEach(result => {
      console.log(`   ❌ ${result.contractType}: ${result.address}`);
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
    });
  }

  console.log("\n" + "=".repeat(70));
  
  if (failed.length === 0) {
    console.log("🎉 ALL TOKEN CONTRACTS VERIFIED SUCCESSFULLY!");
  } else {
    console.log("⚠️  Some token contracts failed verification. Check errors above.");
  }
  console.log("=".repeat(70) + "\n");

  // Save results
  const resultsPath = path.join(__dirname, "../deployments/token-direct-verification-results.json");
  const verificationData = {
    timestamp: new Date().toISOString(),
    network: "sepolia",
    results: results,
  };
  
  fs.writeFileSync(resultsPath, JSON.stringify(verificationData, null, 2));
  console.log(`💾 Verification results saved to ${resultsPath}`);

  process.exit(failed.length === 0 ? 0 : 1);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification script failed:", error);
    process.exit(1);
  });

