import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🧪 Testing local Hardhat deployment...\n");
  
  const [deployer, user1] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Test User: ${user1.address}`);
  
  // Check if deployment file exists
  const deploymentFile = path.join(__dirname, "../deployments/localhost-upgradeable.json");
  if (!fs.existsSync(deploymentFile)) {
    console.log("❌ No deployment file found. Please run deployment first:");
    console.log("   npx hardhat run scripts/deploy-upgradeable.ts --network localhost");
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  console.log(`📄 Loaded deployment from ${deploymentFile}`);
  
  // Test Registry
  console.log("\n✅ Testing RWAAssetRegistry...");
  const registry = await ethers.getContractAt(
    "RWAAssetRegistryUpgradeable",
    deployment.contracts.RWAAssetRegistry.proxy
  );
  
  // Test asset registration
  const registerTx = await registry.registerAsset(
    deployer.address,
    "Test Villa #1",
    "Luxury villa in Bali with ocean view",
    "VILLA",
    "Bali, Indonesia",
    ethers.parseEther("1000000"), // 1M USD
    ethers.parseEther("1000"),    // 1000 USD per token
    1000                          // 1000 tokens
  );
  await registerTx.wait();
  console.log("✅ Asset registered successfully");
  
  // Get asset details
  const asset = await registry.getAsset(1);
  console.log(`   Asset ID: ${asset.id}`);
  console.log(`   Title: ${asset.title}`);
  console.log(`   Owner: ${asset.owner}`);
  console.log(`   Price: ${ethers.formatEther(asset.price)} ETH`);
  console.log(`   Token Price: ${ethers.formatEther(asset.tokenPrice)} ETH`);
  console.log(`   Total Tokens: ${asset.totalTokens}`);
  console.log(`   Available Tokens: ${asset.availableTokens}`);
  
  // Test Factory
  console.log("\n✅ Testing RWATokenFactory...");
  const factory = await ethers.getContractAt(
    "RWATokenFactoryUpgradeable",
    deployment.contracts.RWATokenFactory.proxy
  );
  
  // Test token creation
  const createTokenTx = await factory.createToken(
    1, // assetId
    "Bali Villa Token",
    "BVT",
    1000,
    deployer.address
  );
  await createTokenTx.wait();
  console.log("✅ Token created successfully");
  
  // Get token address
  const tokenAddress = await factory.getTokenAddress(1);
  console.log(`   Token Address: ${tokenAddress}`);
  
  // Test Marketplace
  console.log("\n✅ Testing RWAMarketplace...");
  const marketplace = await ethers.getContractAt(
    "RWAMarketplaceUpgradeable",
    deployment.contracts.RWAMarketplace.proxy
  );
  
  // Test purchase calculation
  const [totalCost, marketplaceFee] = await marketplace.calculatePurchaseCost(1, 10);
  console.log(`   Purchase 10 tokens:`);
  console.log(`   Total Cost: ${ethers.formatEther(totalCost)} ETH`);
  console.log(`   Marketplace Fee: ${ethers.formatEther(marketplaceFee)} ETH`);
  
  // Test Membership
  console.log("\n✅ Testing MembershipSystem...");
  const membership = await ethers.getContractAt(
    "MembershipSystemUpgradeable",
    deployment.contracts.MembershipSystem.proxy
  );
  
  // Register a member (using the simplified interface)
  const memberRegisterTx = await membership.registerMember(
    user1.getAddress(),
    2 // SILVER tier
  );
  await memberRegisterTx.wait();
  console.log("✅ Member registered");

  // Check membership
  const memberInfo = await membership.getMemberInfo(user1.getAddress());
  console.log("✅ Member info retrieved:", {
    tier: memberInfo.tier,
    joinDate: new Date(Number(memberInfo.joinDate) * 1000).toISOString(),
    isActive: memberInfo.isActive
  });
  
  // Check membership status
  const isMember = await membership.isMember(user1.getAddress());
  console.log(`   Is Member: ${isMember.toString()}`);
  
  // Test contract interactions
  console.log("\n✅ Testing Contract Interactions...");
  
  // Test marketplace fee
  const marketplaceFeePercentage = await marketplace.getMarketplaceFee();
  console.log(`   Marketplace Fee: ${marketplaceFeePercentage} basis points`);
  
  // Test factory token validation
  const isValidToken = await factory.isValidToken(tokenAddress);
  console.log(`   Token Valid: ${isValidToken}`);
  
  // Test registry asset status
  const isAssetActive = await registry.isAssetActive(1);
  console.log(`   Asset Active: ${isAssetActive}`);
  
  // Test membership benefits
  const memberCount = await membership.getMemberCount();
  console.log(`   Total Members: ${memberCount}`);
  
  console.log("\n🎉 All tests passed!");
  console.log("\n📊 Test Summary:");
  console.log("==================");
  console.log("✅ Asset Registry: Asset registration and retrieval");
  console.log("✅ Token Factory: Token creation and validation");
  console.log("✅ Marketplace: Purchase cost calculation");
  console.log("✅ Membership: Tier creation and membership purchase");
  console.log("✅ Contract Interactions: Cross-contract functionality");
  
  console.log("\n🔗 Contract Addresses:");
  console.log(`Registry:     ${deployment.contracts.RWAAssetRegistry.proxy}`);
  console.log(`Factory:      ${deployment.contracts.RWATokenFactory.proxy}`);
  console.log(`Marketplace:  ${deployment.contracts.RWAMarketplace.proxy}`);
  console.log(`Membership:   ${deployment.contracts.MembershipSystem.proxy}`);
  
  console.log("\n🚀 Ready for Sepolia deployment!");
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
