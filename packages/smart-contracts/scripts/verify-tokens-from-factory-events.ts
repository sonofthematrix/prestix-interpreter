import dotenv from "dotenv";
import fs from "fs";
import { EventLog, JsonRpcProvider } from "ethers";   
import hre, { ethers } from "hardhat";
import path from "path";

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
 * Verify Token Contracts from Factory Events
 * 
 * This script:
 * 1. Finds Token404Created events from the factory
 * 2. Extracts constructor arguments from event logs
 * 3. Verifies each token contract on Etherscan
 * 
 * Usage: bun run hardhat run scripts/verify-tokens-from-factory-events.ts --network sepolia
 */

interface TokenInfo {
  assetId: number;
  tokenAddress: string;
  name: string;
  symbol: string;
  totalSupply: bigint;
  owner: string;
  tokenURI: string;
  blockNumber: number;
  txHash: string;
}

async function getFactoryAddress(): Promise<string> {
  // Use ERC404_FACTORY_OPTIMIZED address directly (from database check)
  // This is the factory that actually created the tokens
  const factoryAddress = "0xc4c334ec69dc7884dc63414a9f94bd7f0a6a220a"; // ERC404_FACTORY_OPTIMIZED
  
  console.log(`   ✅ Using ERC404_FACTORY_OPTIMIZED: ${factoryAddress}`);
  return factoryAddress;
}

async function getTokenCreationEvents(factoryAddress: string, provider: JsonRpcProvider): Promise<TokenInfo[]> {
  console.log(`\n🔍 Searching for Token404Created events from factory ${factoryAddress}...`);

  // Factory ABI for Token404Created event
  const factoryABI = [
    "event Token404Created(uint256 indexed assetId, address indexed tokenAddress, string name, string symbol, uint256 totalSupply, string tokenURI)"
  ];

  const factory = new ethers.Contract(factoryAddress, factoryABI, provider);

  // Get current block
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 50000); // Search last 50k blocks

  console.log(`   Searching blocks ${fromBlock} to ${currentBlock}...`);

  // Query events
  const filter = factory.filters.Token404Created();
  const events = await factory.queryFilter(filter, fromBlock, currentBlock);

  console.log(`   ✅ Found ${events.length} Token404Created events\n`);

  const tokens: TokenInfo[] = [];

  for (const event of events) {
    if ((event as EventLog).args) {
      tokens.push({
        assetId: Number((event as EventLog).args.assetId),
        tokenAddress: (event as EventLog).args.tokenAddress,
        name: (event as EventLog).args.name,
        symbol: (event as EventLog).args.symbol,
        totalSupply: (event as EventLog).args.totalSupply,
        owner: "", // Owner not in event, will fetch separately
        tokenURI: (event as EventLog).args.tokenURI,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
      });
    }
  }

  // Get owner for each token (from factory's _assetToOwner mapping or token's owner())
  for (const token of tokens) {
    try {
      const tokenABI = ['function owner() view returns (address)'];
      const tokenContract = new ethers.Contract(token.tokenAddress, tokenABI, provider);
      token.owner = await tokenContract.owner();
    } catch {
      // Try to get from factory's _assetToOwner (if accessible)
      // For now, we'll use a placeholder and try verification
      token.owner = "0x0000000000000000000000000000000000000000";
    }
  }

  return tokens;
}

async function verifyToken(token: TokenInfo): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`\n📤 Verifying Token for Asset ${token.assetId}...`);
    console.log(`   Address: ${token.tokenAddress}`);
    console.log(`   Name: ${token.name}`);
    console.log(`   Symbol: ${token.symbol}`);
    console.log(`   TotalSupply: ${token.totalSupply.toString()}`);
    console.log(`   Owner: ${token.owner}`);
    console.log(`   TokenURI: ${token.tokenURI}`);

    // Check if contract has code
    const code = await new JsonRpcProvider(process.env.SEPOLIA_RPC_URL).getCode(token.tokenAddress);
    if (code === "0x") {
      return { success: false, error: "No contract code found at address" };
    }
    console.log(`   ✅ Contract code found (${code.length / 2 - 1} bytes)`);

    // Constructor arguments
    const constructorArgs = [
      token.name,
      token.symbol,
      token.assetId,
      token.totalSupply.toString(),
      token.owner,
      token.tokenURI,
    ];

    console.log(`   Constructor Args:`);
    console.log(`      name: "${token.name}"`);
    console.log(`      symbol: "${token.symbol}"`);
    console.log(`      assetId: ${token.assetId}`);
    console.log(`      totalSupply: ${token.totalSupply.toString()}`);
    console.log(`      owner: ${token.owner}`);
    console.log(`      tokenURI: "${token.tokenURI}"`);

    // Try RWAToken404Fixed first (most tokens use this)
    const contractPath = "contracts/core/RWAToken404Fixed.sol:RWAToken404Fixed";

    try {
      await hre.run("verify:verify", {
        address: token.tokenAddress,
        contract: contractPath,
        constructorArguments: constructorArgs,
      });

      console.log(`   ✅ Token verified successfully!`);
      console.log(`   🔗 View at: https://sepolia.etherscan.io/address/${token.tokenAddress}#code`);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || String(error);

      if (errorMessage.includes("Already Verified") ||
          errorMessage.includes("already verified") ||
          errorMessage.includes("Contract source code already verified")) {
        console.log(`   ✅ Token already verified`);
        console.log(`   🔗 View at: https://sepolia.etherscan.io/address/${token.tokenAddress}#code`);
        return { success: true };
      } else if (errorMessage.includes("bytecode doesn't match")) {
        // Try RWAToken404 (original version) instead
        console.log(`   ⚠️  Bytecode mismatch with RWAToken404Fixed, trying RWAToken404...`);
        try {
          await hre.run("verify:verify", {
            address: token.tokenAddress,
            contract: "contracts/core/RWAToken404.sol:RWAToken404",
            constructorArguments: constructorArgs,
          });
          console.log(`   ✅ Token verified with RWAToken404!`);
          console.log(`   🔗 View at: https://sepolia.etherscan.io/address/${token.tokenAddress}#code`);
          return { success: true };
        } catch (retryError: any) {
          return { success: false, error: `Both RWAToken404Fixed and RWAToken404 failed: ${retryError.message}` };
        }
      } else {
        return { success: false, error: errorMessage };
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   VERIFY TOKEN CONTRACTS FROM FACTORY EVENTS              ║");
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

  // Get factory address
  const factoryAddress = await getFactoryAddress();
  console.log(`🏭 Factory Address: ${factoryAddress}\n`);

  // Get all token creation events
  const tokens = await getTokenCreationEvents(factoryAddress, new JsonRpcProvider(process.env.SEPOLIA_RPC_URL));

  if (tokens.length === 0) {
    console.log("❌ No token creation events found. Check factory address and block range.");
    process.exit(1);
  }

  console.log(`📋 Found ${tokens.length} tokens to verify:\n`);
  tokens.forEach((token, index) => {
    console.log(`   ${index + 1}. Asset ${token.assetId}: ${token.name} (${token.symbol})`);
    console.log(`      Address: ${token.tokenAddress}`);
  });

  const results: Array<{ assetId: number; address: string; success: boolean; error?: string }> = [];

  // Verify each token
  for (const token of tokens) {
    try {
      const result = await verifyToken(token);
      results.push({
        assetId: token.assetId,
        address: token.tokenAddress,
        success: result.success,
        error: result.error,
      });

      // Wait between verifications to avoid rate limiting
      if (tokens.indexOf(token) < tokens.length - 1) {
        console.log("\n⏳ Waiting 20 seconds before next verification...");
        await new Promise(resolve => setTimeout(resolve, 20000));
      }
    } catch (error: any) {
      console.log(`❌ Error verifying token ${token.assetId}: ${error.message}`);
      results.push({
        assetId: token.assetId,
        address: token.tokenAddress,
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
    console.log(`   ✅ Asset ${result.assetId}: ${result.address}`);
    console.log(`      https://sepolia.etherscan.io/address/${result.address}#code`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ Failed Verifications: ${failed.length}/${results.length}`);
    failed.forEach(result => {
      console.log(`   ❌ Asset ${result.assetId}: ${result.address}`);
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
  const resultsPath = path.join(__dirname, "../deployments/token-verification-from-events-results.json");
  const verificationData = {
    timestamp: new Date().toISOString(),
    network: "sepolia",
    factoryAddress,
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

