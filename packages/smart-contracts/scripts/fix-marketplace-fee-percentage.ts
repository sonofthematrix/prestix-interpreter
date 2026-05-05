import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MARKETPLACE_PROXY = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || "0x5295d340a0B06A2552C2169E5D238849550ea9Fe";

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   FIX MARKETPLACE FEE PERCENTAGE                          ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.config.chainId})`);
  console.log(`\n👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH\n`);

  const MARKETPLACE_ABI = [
    "function getMarketplaceFee() view returns (uint256)",
    "function setMarketplaceFee(uint256 newFeePercentage)",
    "function FEE_MANAGER_ROLE() view returns (bytes32)",
    "function hasRole(bytes32 role, address account) view returns (bool)",
  ];

  const marketplace = await ethers.getContractAt(MARKETPLACE_ABI, MARKETPLACE_PROXY);

  console.log("🔍 Checking current fee percentage...");
  const currentFee = await marketplace.getMarketplaceFee();
  console.log(`   Current: ${currentFee.toString()} basis points`);
  console.log(`   Expected: 250 basis points (2.5%)\n`);

  if (currentFee.toString() === "250") {
    console.log("✅ Fee percentage is already correct. No action needed.\n");
    return;
  }

  console.log("🔐 Checking permissions...");
  const FEE_MANAGER_ROLE = await marketplace.FEE_MANAGER_ROLE();
  const hasRole = await marketplace.hasRole(FEE_MANAGER_ROLE, deployer.address);
  
  if (!hasRole) {
    console.error("❌ Deployer does not have FEE_MANAGER_ROLE.");
    console.error("   Please grant FEE_MANAGER_ROLE to deployer address first.\n");
    process.exit(1);
  }
  console.log("   ✅ Deployer has FEE_MANAGER_ROLE\n");

  console.log("⚙️  Setting fee percentage to 250 (2.5%)...");
  const tx = await marketplace.setMarketplaceFee(250);
  console.log(`   Transaction Hash: ${tx.hash}`);
  console.log("   Waiting for confirmation...\n");
  
  const receipt = await tx.wait();
  console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
  console.log(`   Gas Used: ${receipt.gasUsed.toString()}\n`);

  console.log("🔍 Verifying fix...");
  const newFee = await marketplace.getMarketplaceFee();
  console.log(`   New Fee: ${newFee.toString()} basis points`);
  
  if (newFee.toString() === "250") {
    console.log("   ✅ Fee percentage fixed successfully!\n");
  } else {
    console.error("   ❌ Fee percentage is still incorrect!");
    console.error(`      Expected: 250, Got: ${newFee.toString()}\n`);
    process.exit(1);
  }

  console.log("════════════════════════════════════════════════════════════");
  console.log("✅ FIX COMPLETE");
  console.log("════════════════════════════════════════════════════════════\n");
  console.log("📝 Summary:");
  console.log(`   - Fixed _marketplaceFeePercentage: ${currentFee.toString()} → 250`);
  console.log(`   - Transaction: ${receipt.hash}`);
  console.log(`   - Block: ${receipt.blockNumber}\n`);
  console.log("🧪 Next Steps:");
  console.log("   1. Test cost calculation: bun run scripts/test-usdc-purchase.ts 30 1");
  console.log("   2. Verify cost is now correct\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

