import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || "0xA1fb017a8c89cCB76F63d2244C4a228964B50D80";

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   DEPLOY TEST MARKETPLACE COST DEBUG CONTRACT              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.config.chainId})`);
  console.log(`\n👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH\n`);

  console.log("📦 Deploying TestMarketplaceCostDebug contract...");
  const TestMarketplaceCostDebug = await ethers.getContractFactory("TestMarketplaceCostDebug");
  const testContract = await TestMarketplaceCostDebug.deploy(REGISTRY_ADDRESS);
  await testContract.waitForDeployment();
  const testContractAddress = await testContract.getAddress();
  
  console.log(`✅ Test contract deployed: ${testContractAddress}\n`);

  console.log("🧪 Testing contract with Asset ID 30...\n");
  
  // Test 1: Direct call
  console.log("Test 1: Direct getTokenPriceValue call");
  const directPrice = await testContract.testGetTokenPrice(30);
  console.log(`   Result: ${directPrice.toString()} (${ethers.formatEther(directPrice)} ETH)\n`);

  // Test 2: Stored value
  console.log("Test 2: Stored getTokenPriceValue call");
  const storedPrice = await testContract.testGetTokenPriceStored(30);
  console.log(`   Result: ${storedPrice.toString()} (${ethers.formatEther(storedPrice)} ETH)\n`);

  // Test 3: Calculate cost (mimics marketplace)
  console.log("Test 3: Calculate cost (mimics marketplace logic)");
  const [totalCost, tokenPrice] = await testContract.testCalculateCost(30, 1);
  console.log(`   Token Price: ${tokenPrice.toString()} (${ethers.formatEther(tokenPrice)} ETH)`);
  console.log(`   Total Cost (1 token): ${totalCost.toString()} (${ethers.formatEther(totalCost)} ETH)\n`);

  // Test 4: Compare methods
  console.log("Test 4: Compare direct call vs struct unpacking");
  const [directCall, fromStruct, valuesMatch] = await testContract.compareMethods(30);
  console.log(`   Direct Call: ${directCall.toString()} (${ethers.formatEther(directCall)} ETH)`);
  console.log(`   From Struct: ${fromStruct.toString()} (${ethers.formatEther(fromStruct)} ETH)`);
  console.log(`   Match: ${valuesMatch ? "✅ YES" : "❌ NO"}\n`);

  // Compare with actual marketplace
  const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || "0x5295d340a0B06A2552C2169E5D238849550ea9Fe";
  const MARKETPLACE_ABI = [
    "function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)"
  ];
  const marketplace = await ethers.getContractAt(MARKETPLACE_ABI, MARKETPLACE_ADDRESS);
  
  console.log("Test 5: Compare with actual marketplace");
  const [marketplaceTotalCost, marketplaceFee] = await marketplace.calculatePurchaseCost(30, 1);
  console.log(`   Marketplace Total Cost: ${marketplaceTotalCost.toString()} (${ethers.formatEther(marketplaceTotalCost)} ETH)`);
  console.log(`   Marketplace Fee: ${marketplaceFee.toString()} (${ethers.formatEther(marketplaceFee)} ETH)`);
  console.log(`   Test Contract Total Cost: ${totalCost.toString()} (${ethers.formatEther(totalCost)} ETH)\n`);

  if (marketplaceTotalCost === totalCost) {
    console.log("✅ Test contract matches marketplace - both are correct!");
  } else {
    console.error("❌ MISMATCH: Test contract result differs from marketplace");
    const ratio = Number(marketplaceTotalCost) / Number(totalCost);
    console.error(`   Ratio: ${ratio}`);
    console.error(`   This indicates the marketplace has a bug that the test contract does not reproduce.\n`);
  }

  console.log("════════════════════════════════════════════════════════════");
  console.log("📝 Summary:");
  console.log("════════════════════════════════════════════════════════════\n");
  console.log(`Test Contract Address: ${testContractAddress}`);
  console.log(`Registry Address: ${REGISTRY_ADDRESS}`);
  console.log(`\n🔗 View on Etherscan:`);
  console.log(`   Test Contract: https://sepolia.etherscan.io/address/${testContractAddress}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

