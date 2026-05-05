import { ethers } from "hardhat";

/**
 * Setup script for Dividend-Staking Integration
 * 
 * Configures existing contracts to work with the dividend-staking system
 * Run this after deploying the new contracts
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting up dividend-staking integration with account:", deployer.address);

  // Contract addresses (update these with your deployed addresses)
  const TIGER_PALACE_TOKEN = process.env.TIGER_PALACE_TOKEN || "";
  const REWARD_DISTRIBUTOR = process.env.REWARD_DISTRIBUTOR || "";
  const RWA_STAKING = process.env.RWA_STAKING || "";
  const RWA_REVENUE = process.env.RWA_REVENUE || "";
  
  // Array of RWA token addresses to enable
  const RWA_TOKENS = (process.env.RWA_TOKENS || "").split(",").filter(addr => addr.length > 0);

  if (!TIGER_PALACE_TOKEN || !REWARD_DISTRIBUTOR || !RWA_STAKING || !RWA_REVENUE) {
    throw new Error("Missing required environment variables. Set TIGER_PALACE_TOKEN, REWARD_DISTRIBUTOR, RWA_STAKING, RWA_REVENUE");
  }

  console.log("\nContract Addresses:");
  console.log("TigerPalaceToken:", TIGER_PALACE_TOKEN);
  console.log("RewardDistributor:", REWARD_DISTRIBUTOR);
  console.log("RWAStaking:", RWA_STAKING);
  console.log("RWARevenue:", RWA_REVENUE);

  // Get contract instances
  const RewardDistributor = await ethers.getContractAt("RWARewardDistributor", REWARD_DISTRIBUTOR);
  const Staking = await ethers.getContractAt("RWAStaking", RWA_STAKING);
  const Revenue = await ethers.getContractAt("RWARevenue", RWA_REVENUE);

  // Step 1: Update RWAToken contracts
  console.log("\n1. Updating RWAToken contracts...");
  
  if (RWA_TOKENS.length > 0) {
    for (const tokenAddress of RWA_TOKENS) {
      try {
        const RWAToken = await ethers.getContractAt("RWAToken", tokenAddress);
        
        // Set TigerPalaceToken if not set
        const currentTPT = await RWAToken.tokenizinToken();
        if (currentTPT === ethers.ZeroAddress) {
          console.log(`  Setting TigerPalaceToken for ${tokenAddress}...`);
          await RWAToken.setTigerPalaceToken(TIGER_PALACE_TOKEN);
          console.log(`  ✅ TigerPalaceToken set`);
        } else {
          console.log(`  ✅ TigerPalaceToken already set for ${tokenAddress}`);
        }

        // Set RewardDistributor if not set
        const currentDistributor = await RWAToken.rewardDistributorAddress();
        if (currentDistributor === ethers.ZeroAddress) {
          console.log(`  Setting RewardDistributor for ${tokenAddress}...`);
          await RWAToken.setRewardDistributor(REWARD_DISTRIBUTOR);
          console.log(`  ✅ RewardDistributor set`);
        } else {
          console.log(`  ✅ RewardDistributor already set for ${tokenAddress}`);
        }
      } catch (error: any) {
        console.log(`  ⚠️  Error updating ${tokenAddress}:`, error.message);
        // Try RWAToken404
        try {
          const RWAToken404 = await ethers.getContractAt("RWAToken404", tokenAddress);
          const currentTPT = await RWAToken404.tokenizinToken();
          if (currentTPT === ethers.ZeroAddress) {
            await RWAToken404.setTokenizinToken(TIGER_PALACE_TOKEN);
          }
          const currentDistributor = await RWAToken404.rewardDistributorAddress();
          if (currentDistributor === ethers.ZeroAddress) {
            await RWAToken404.setRewardDistributor(REWARD_DISTRIBUTOR);
          }
          console.log(`  ✅ Updated RWAToken404 ${tokenAddress}`);
        } catch (error2: any) {
          console.log(`  ❌ Failed to update ${tokenAddress}:`, error2.message);
        }
      }
    }
  } else {
    console.log("  ⚠️  No RWA tokens specified in RWA_TOKENS environment variable");
  }

  // Step 2: Enable tokens for staking
  console.log("\n2. Enabling RWA tokens for staking...");
  
  if (RWA_TOKENS.length > 0) {
    for (const tokenAddress of RWA_TOKENS) {
      try {
        const isSupported = await Staking.supportedRWATokens(tokenAddress);
        if (!isSupported) {
          console.log(`  Enabling ${tokenAddress} for staking...`);
          await Staking.setSupportedRWAToken(tokenAddress, true);
          console.log(`  ✅ Enabled ${tokenAddress}`);
        } else {
          console.log(`  ✅ ${tokenAddress} already enabled`);
        }
      } catch (error: any) {
        console.log(`  ❌ Failed to enable ${tokenAddress}:`, error.message);
      }
    }
  }

  // Step 3: Verify configuration
  console.log("\n3. Verifying configuration...");
  
  const distributorStats = await RewardDistributor.getRewardPoolStats();
  console.log("RewardDistributor Stats:");
  console.log("  Total Reward Pool:", ethers.formatEther(distributorStats[0]));
  console.log("  Distributed Rewards:", ethers.formatEther(distributorStats[1]));
  console.log("  Pending Rewards:", ethers.formatEther(distributorStats[2]));

  const stakingAddress = await RewardDistributor.rwaStakingAddress();
  const revenueAddress = await RewardDistributor.rwaRevenueAddress();
  console.log("\nRewardDistributor Configuration:");
  console.log("  Staking Address:", stakingAddress);
  console.log("  Revenue Address:", revenueAddress);
  console.log("  Match:", stakingAddress.toLowerCase() === RWA_STAKING.toLowerCase() && 
                      revenueAddress.toLowerCase() === RWA_REVENUE.toLowerCase());

  console.log("\n✅ Setup complete!");
  console.log("\nNext steps:");
  console.log("1. Fund RewardDistributor with TPT tokens");
  console.log("2. Test dividend distribution");
  console.log("3. Test staking functionality");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

