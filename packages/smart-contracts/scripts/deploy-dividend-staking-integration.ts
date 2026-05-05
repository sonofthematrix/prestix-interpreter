import { ethers } from "hardhat";
import { parseEther } from "ethers";

/**
 * Deployment script for Dividend-Staking Integration
 * 
 * Deploys and configures all contracts needed for RWA token staking with dividend distribution
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Step 1: Deploy TigerPalaceToken (if not already deployed)
  console.log("\n1. Deploying TigerPalaceToken...");
  const TigerPalaceToken = await ethers.getContractFactory("TigerPalaceToken");
  const treasuryAddress = deployer.address; // Update with actual treasury address
  const tokenizinToken = await TigerPalaceToken.deploy(
    deployer.address,
    treasuryAddress,
    parseEther("10000000") // 10M initial supply
  );
  await tokenizinToken.waitForDeployment();
  const tptAddress = await tokenizinToken.getAddress();
  console.log("✅ TigerPalaceToken deployed to:", tptAddress);

  // Step 2: Deploy RWARewardDistributor
  console.log("\n2. Deploying RWARewardDistributor...");
  const RWARewardDistributor = await ethers.getContractFactory("RWARewardDistributor");
  const rewardDistributor = await RWARewardDistributor.deploy(
    tptAddress,
    treasuryAddress,
    parseEther("10000") // Initial reward pool
  );
  await rewardDistributor.waitForDeployment();
  const distributorAddress = await rewardDistributor.getAddress();
  console.log("✅ RWARewardDistributor deployed to:", distributorAddress);

  // Step 3: Deploy RWARevenue
  console.log("\n3. Deploying RWARevenue...");
  const RWARevenue = await ethers.getContractFactory("RWARevenue");
  const rwaRevenue = await RWARevenue.deploy(
    tptAddress,
    distributorAddress
  );
  await rwaRevenue.waitForDeployment();
  const revenueAddress = await rwaRevenue.getAddress();
  console.log("✅ RWARevenue deployed to:", revenueAddress);

  // Step 4: Deploy RWAStaking
  console.log("\n4. Deploying RWAStaking...");
  const RWAStaking = await ethers.getContractFactory("RWAStaking");
  const staking = await RWAStaking.deploy(
    tptAddress,
    revenueAddress,
    distributorAddress
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("✅ RWAStaking deployed to:", stakingAddress);

  // Step 5: Initialize contracts
  console.log("\n5. Initializing contracts...");
  
  // Initialize RewardDistributor
  await rewardDistributor.initialize(
    stakingAddress,
    revenueAddress,
    treasuryAddress
  );
  console.log("✅ RewardDistributor initialized");

  // Initialize RWARevenue
  await rwaRevenue.initialize(stakingAddress);
  console.log("✅ RWARevenue initialized");

  // Step 6: Configure TigerPalaceToken to exempt RewardDistributor
  console.log("\n6. Configuring TigerPalaceToken...");
  await tokenizinToken.setRewardDistributor(distributorAddress);
  console.log("✅ RewardDistributor exempted from max wallet limits");

  // Step 7: Fund RewardDistributor with initial TPT
  console.log("\n7. Funding RewardDistributor...");
  const initialFunding = parseEther("50000");
  await tokenizinToken.transfer(distributorAddress, initialFunding);
  console.log(`✅ Transferred ${initialFunding.toString()} TPT to RewardDistributor`);

  // Step 8: Grant necessary roles
  console.log("\n8. Setting up roles...");
  
  // Grant REVENUE_COLLECTOR_ROLE to RWARevenue
  const REVENUE_COLLECTOR_ROLE = await rewardDistributor.REVENUE_COLLECTOR_ROLE();
  await rewardDistributor.grantRole(REVENUE_COLLECTOR_ROLE, revenueAddress);
  console.log("✅ Granted REVENUE_COLLECTOR_ROLE to RWARevenue");

  // Grant REWARD_MANAGER_ROLE to deployer (or admin address)
  const REWARD_MANAGER_ROLE = await rewardDistributor.REWARD_MANAGER_ROLE();
  await rewardDistributor.grantRole(REWARD_MANAGER_ROLE, deployer.address);
  console.log("✅ Granted REWARD_MANAGER_ROLE to deployer");

  // Grant REVENUE_MANAGER_ROLE to deployer
  const REVENUE_MANAGER_ROLE = await rwaRevenue.REVENUE_MANAGER_ROLE();
  await rwaRevenue.grantRole(REVENUE_MANAGER_ROLE, deployer.address);
  console.log("✅ Granted REVENUE_MANAGER_ROLE to deployer");

  // Grant POOL_MANAGER_ROLE to deployer
  const POOL_MANAGER_ROLE = await staking.POOL_MANAGER_ROLE();
  await staking.grantRole(POOL_MANAGER_ROLE, deployer.address);
  console.log("✅ Granted POOL_MANAGER_ROLE to deployer");

  // Step 9: Verify deployment
  console.log("\n9. Verifying deployment...");
  
  const distributorStats = await rewardDistributor.getRewardPoolStats();
  console.log("RewardDistributor Stats:");
  console.log("  - Total Reward Pool:", distributorStats[0].toString());
  console.log("  - Distributed Rewards:", distributorStats[1].toString());
  console.log("  - Pending Rewards:", distributorStats[2].toString());

  const poolCount = await staking.nextPoolId();
  console.log(`\nStaking Pools Created: ${poolCount.toString()}`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log("TigerPalaceToken:", tptAddress);
  console.log("RWARewardDistributor:", distributorAddress);
  console.log("RWARevenue:", revenueAddress);
  console.log("RWAStaking:", stakingAddress);
  console.log("\nNext Steps:");
  console.log("1. Update RWAToken contracts with RewardDistributor address");
  console.log("2. Enable RWA tokens for staking using setSupportedRWAToken()");
  console.log("3. Fund RewardDistributor with TPT for dividend distribution");
  console.log("4. Test the integration with test scripts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

