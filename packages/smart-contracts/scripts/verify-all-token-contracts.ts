import dotenv from "dotenv";
import fs from "fs";
import hre, { ethers } from "hardhat";
import { JsonRpcProvider } from "ethers";
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
 * Verify All Token Contracts on Etherscan
 * 
 * This script verifies all ERC404 token contracts (TOKEN_ASSET_*) on Etherscan.
 * These are ERC404 tokens deployed via RWATokenFactory404.
 * 
 * Usage: bun run hardhat run scripts/verify-all-token-contracts.ts --network sepolia
 */

interface TokenContract {
  contractType: string;
  contractName: string;
  contractAddress: string;
  assetId?: number;
}

async function getTokenConstructorArgs(
  tokenAddress: string,
  provider: JsonRpcProvider
): Promise<{ name: string; symbol: string; assetId: bigint; totalSupply: bigint; owner: string; tokenURI: string } | null> {
  try {
    // Try to read constructor parameters from contract storage or events
    // For ERC404 tokens, we can try to read name, symbol, assetId, totalSupply, owner, tokenURI
    const tokenABI = [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function assetId() view returns (uint256)',
      'function totalSupply() view returns (uint256)',
      'function owner() view returns (address)',
      'function tokenURI(uint256) view returns (string)',
    ];

    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
    
    const [name, symbol, assetId, totalSupply, owner] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.assetId(),
      tokenContract.totalSupply(),
      tokenContract.owner(),
    ]);

    // Try to get tokenURI for tokenId 1
    let tokenURI = '';
    try {
      tokenURI = await tokenContract.tokenURI(1);
    } catch {
      // tokenURI might not be available or tokenId 1 might not exist
    }

    return {
      name,
      symbol,
      assetId,
      totalSupply,
      owner,
      tokenURI: tokenURI || '',
    };
  } catch (error: any) {
    console.warn(`⚠️  Could not get constructor args for ${tokenAddress}: ${error.message}`);
    return null;
  }
}

async function verifyTokenContract(token: TokenContract): Promise<{ success: boolean; error?: string }> {
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

    // Get constructor arguments
    const constructorArgs = await getTokenConstructorArgs(token.contractAddress, new JsonRpcProvider(process.env.SEPOLIA_RPC_URL));
    
    if (!constructorArgs) {
      console.log(`   ⚠️  Could not determine constructor args - trying without args`);
    } else {
      console.log(`   Constructor Args:`);
      console.log(`      name: ${constructorArgs.name}`);
      console.log(`      symbol: ${constructorArgs.symbol}`);
      console.log(`      assetId: ${constructorArgs.assetId.toString()}`);
      console.log(`      totalSupply: ${constructorArgs.totalSupply.toString()}`);
      console.log(`      owner: ${constructorArgs.owner}`);
      console.log(`      tokenURI: ${constructorArgs.tokenURI || 'N/A'}`);
    }

    // Verify on Etherscan
    // ERC404 tokens use RWAToken404Fixed contract
    const contractPath = "contracts/core/RWAToken404Fixed.sol:RWAToken404Fixed";
    
    try {
      await hre.run("verify:verify", {
        address: token.contractAddress,
        contract: contractPath,
        constructorArguments: constructorArgs ? [
          constructorArgs.name,
          constructorArgs.symbol,
          constructorArgs.assetId,
          constructorArgs.totalSupply,
          constructorArgs.owner,
          constructorArgs.tokenURI,
        ] : [],
      });

      console.log(`   ✅ ${token.contractType} verified successfully!`);
      console.log(`   🔗 View at: https://sepolia.etherscan.io/address/${token.contractAddress}#code`);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      
      if (errorMessage.includes("Already Verified") || 
          errorMessage.includes("already verified") ||
          errorMessage.includes("Contract source code already verified")) {
        console.log(`   ✅ ${token.contractType} already verified`);
        console.log(`   🔗 View at: https://sepolia.etherscan.io/address/${token.contractAddress}#code`);
        return { success: true };
      } else {
        console.log(`   ❌ Verification failed: ${errorMessage}`);
        
        // Try without constructor args as fallback
        if (constructorArgs) {
          console.log(`   ⚠️  Retrying without constructor args...`);
          try {
            await hre.run("verify:verify", {
              address: token.contractAddress,
              contract: contractPath,
              constructorArguments: [],
            });
            console.log(`   ✅ Verified without constructor args`);
            return { success: true };
          } catch (retryError: any) {
            return { success: false, error: errorMessage };
          }
        }
        
        return { success: false, error: errorMessage };
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   VERIFY ALL TOKEN CONTRACTS ON ETHERSCAN                 ║");
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

  const network = await new JsonRpcProvider(process.env.SEPOLIA_RPC_URL).getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`🔑 Etherscan API Key: ${etherscanApiKey?.substring(0, 8)}...\n`);

  if (network.chainId !== 11155111n) {
    console.log("⚠️  Warning: Not connected to Sepolia testnet!");
    console.log("   Expected Chain ID: 11155111");
    console.log(`   Current Chain ID: ${network.chainId}\n`);
  }

  // Load token contracts from database
  // We'll use a simple approach - load from the verification status file or query database
  const verificationStatusFile = path.join(__dirname, "../../etherscan-verification-status.json");
  let tokenContracts: TokenContract[] = [];

  if (fs.existsSync(verificationStatusFile)) {
    const statusData = JSON.parse(fs.readFileSync(verificationStatusFile, "utf-8"));
    tokenContracts = statusData.contracts
      .filter((c: any) => c.contractType.startsWith("TOKEN_ASSET_"))
      .map((c: any) => ({
        contractType: c.contractType,
        contractName: c.contractName,
        contractAddress: c.proxyAddress,
      }));
  } else {
    console.log("⚠️  Verification status file not found. Using hardcoded token list...");
    // Fallback: Use known token addresses
    tokenContracts = [
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
      { contractType: "TOKEN_ASSET_100", contractName: "Test ERC-404 Property Token", contractAddress: "0x743d2850f734c437872b2c0377d85c7886ced127" },
    ];
  }

  console.log(`📋 Found ${tokenContracts.length} token contracts to verify\n`);

  const results: Array<{ contract: string; address: string; success: boolean; error?: string }> = [];

  // Verify each token contract
  for (const token of tokenContracts) {
    try {
      const result = await verifyTokenContract(token);
      results.push({
        contract: token.contractType,
        address: token.contractAddress,
        success: result.success,
        error: result.error,
      });

      // Wait between verifications to avoid rate limiting
      if (tokenContracts.indexOf(token) < tokenContracts.length - 1) {
        console.log("\n⏳ Waiting 20 seconds before next verification...");
        await new Promise(resolve => setTimeout(resolve, 20000));
      }
    } catch (error: any) {
      console.log(`❌ Error verifying ${token.contractType}: ${error.message}`);
      results.push({
        contract: token.contractType,
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
    console.log("🎉 ALL TOKEN CONTRACTS VERIFIED SUCCESSFULLY!");
  } else {
    console.log("⚠️  Some token contracts failed verification. Check errors above.");
  }
  console.log("=".repeat(70) + "\n");

  // Save results
  const resultsPath = path.join(__dirname, "../deployments/token-contracts-verification-results.json");
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

