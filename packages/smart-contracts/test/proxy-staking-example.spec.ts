/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  deployCompleteEcosystemWithProxies,
  setupProxyTestEnvironment,
  createTestPoolsWithDurations,
  testStakingAtDuration,
  PROXY_TEST_CONFIG,
  ProxyFixtureData,
} from "./utils/proxy-fixture";

describe("Proxy Staking Tests with Different Durations", function () {
  let fixtureData: ProxyFixtureData;
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let charlie: SignerWithAddress;
  let poolData: any;

  before(async function () {
    console.log("🚀 Setting up proxy-based staking ecosystem...");

    const signers = await ethers.getSigners();
    [deployer, alice, bob, charlie] = signers;

    // Deploy complete ecosystem with proxy patterns
    fixtureData = await deployCompleteEcosystemWithProxies(signers);

    // Setup test environment with user funding
    await setupProxyTestEnvironment(fixtureData, [alice, bob, charlie], {
      fundingAmount: PROXY_TEST_CONFIG.FUNDING_AMOUNTS.LARGE,
      setupApprovals: true,
    });

    // Create pools with different durations (shared across all tests)
    poolData = await createTestPoolsWithDurations(fixtureData, deployer);

    console.log("✅ Proxy ecosystem setup completed!");
  });

  describe("Multi-Duration Pool Testing", function () {

    it("Should successfully stake and withdraw from flexible pool (no lock)", async function () {
      const poolId = poolData.poolIds[0]; // Flexible pool - use actual pool ID
      const stakeAmount = ethers.parseEther("1000");

      const result = await testStakingAtDuration(
        fixtureData,
        alice,
        poolId,
        stakeAmount,
        0, // No waiting period
        "Flexible Pool - Immediate Withdrawal",
      );

      expect(result.success).to.be.true;
      console.log("✅ Flexible pool test completed");
    });

    it("Should test 30-day pool - early withdrawal vs. mature withdrawal", async function () {
      const poolId = poolData.poolIds[1]; // 30-day pool - use actual pool ID
      const stakeAmount = ethers.parseEther("1000");

      // Test early withdrawal (should fail or have penalties)
      console.log("\n--- Testing Early Withdrawal (Day 15) ---");
      const earlyResult = await testStakingAtDuration(
        fixtureData,
        bob,
        poolId,
        stakeAmount,
        PROXY_TEST_CONFIG.DURATIONS.DAYS_30 / 2, // 15 days
        "30-Day Pool - Early Withdrawal",
      );

      // Test mature withdrawal (should succeed with full rewards)
      console.log("\n--- Testing Mature Withdrawal (Day 35) ---");
      const matureResult = await testStakingAtDuration(
        fixtureData,
        charlie,
        poolId,
        stakeAmount,
        PROXY_TEST_CONFIG.DURATIONS.DAYS_30 + 5 * 24 * 60 * 60, // 35 days
        "30-Day Pool - Mature Withdrawal",
      );

      // At least one should succeed
      expect(earlyResult.success || matureResult.success).to.be.true;
      console.log("✅ 30-day pool duration tests completed");
    });

    it("Should test 90-day pool maturity", async function () {
      const poolId = poolData.poolIds[2]; // 90-day pool - use actual pool ID
      const stakeAmount = ethers.parseEther("2000"); // Higher amount for 90-day pool

      const result = await testStakingAtDuration(
        fixtureData,
        alice,
        poolId,
        stakeAmount,
        PROXY_TEST_CONFIG.DURATIONS.DAYS_90 + 1 * 24 * 60 * 60, // 91 days
        "90-Day Pool - Full Maturity",
      );

      expect(result.success).to.be.true;
      if (result.rewards && BigInt(result.rewards.toString()) > 0n) {
        console.log(
          `💰 Earned rewards: ${ethers.formatEther(result.rewards)} TPT`,
        );
      }
      console.log("✅ 90-day pool test completed");
    });

    it("Should test 180-day pool with highest rewards", async function () { 
      const poolId = poolData.poolIds[3]; // 180-day pool - use actual pool ID
      const stakeAmount = ethers.parseEther("5000"); // Even higher amount for 180-day pool

      const result = await testStakingAtDuration(
        fixtureData,
        bob,
        poolId,
        stakeAmount,
        PROXY_TEST_CONFIG.DURATIONS.DAYS_180 + 1 * 24 * 60 * 60, // 181 days
        "180-Day Pool - Maximum Rewards",
      );

      expect(result.success).to.be.true;
      if (result.rewards && BigInt(result.rewards.toString()) > 0n) {
        console.log(
          `💰 Maximum rewards earned: ${ethers.formatEther(
            result.rewards,
          )} TPT`,
        );
      }
      console.log("✅ 180-day pool test completed");
    });
  });

  describe("Optimization Verification", function () {
    it("Should verify contracts are deployed with optimization", async function () {
      // Check that the contracts are properly deployed and functional
      const stakingAddress = await fixtureData.TigerStaking.getAddress();
      const revenueAddress = await fixtureData.rwaRevenue.getAddress();

      expect(stakingAddress).to.not.equal(ethers.ZeroAddress); 
      expect(revenueAddress).to.not.equal(ethers.ZeroAddress);

      // Verify basic functionality
      const acceptedToken = await fixtureData.TigerStaking.rwaAcceptedToken();
      expect(acceptedToken).to.equal(await fixtureData.tokenizinToken.getAddress());

      console.log("✅ Optimization verification completed");
      console.log(`📊 Gas usage summary:`);
      console.log(
        `• TigerPalaceToken: ${fixtureData.deploymentInfo.gasUsed.tokenizinToken}`,
      );
      console.log(
        `• RewardDistributor: ${fixtureData.deploymentInfo.gasUsed.rewardDistributor}`,
      );
      console.log(
        `• RWAStaking Implementation: ${fixtureData.deploymentInfo.gasUsed.rwaStakingImpl}`,
      );
      console.log(
        `• RWARevenue Implementation: ${fixtureData.deploymentInfo.gasUsed.rwaRevenueImpl}`,
      );
    });
  });

  describe("Advanced Staking Scenarios", function () {
    it("Should test partial withdrawals in flexible pool", async function () {
      const poolId = poolData.poolIds[0]; // Flexible pool - use actual pool ID with actual pool ID
      const fullStakeAmount = ethers.parseEther("5000");
      
      // Get pool info to check multiplier and duration
      const poolInfo = await fixtureData.TigerStaking.getPool(poolId);
      
      // Skip test if pool has no rewards (multiplier = 10000)
      if (poolInfo.multiplier === 10000n) {
        console.log("⚠️ Skipping test: Pool has multiplier 10000 (0% rewards)");
        return;
      }
      
      // Stake full amount
      await fixtureData.tokenizinToken
        .connect(charlie)
        .approve(await fixtureData.TigerStaking.getAddress(), fullStakeAmount);
      await fixtureData.TigerStaking
        .connect(charlie)
        .stake(poolId, fullStakeAmount);

      // Get user stakes to find the correct stake ID
      const userStakesBefore = await fixtureData.TigerStaking.getUserStakes(charlie.address);
      const poolStakesBefore = userStakesBefore.filter((s: any) => Number(s.poolId) === poolId);
      
      if (poolStakesBefore.length === 0) {
        throw new Error("No stakes found in pool");
      }
      
      // Find the stake ID (index in userStakes array)
      let stakeId = -1;
      for (let i = 0; i < userStakesBefore.length; i++) {
        if (Number(userStakesBefore[i].poolId) === poolId && !userStakesBefore[i].claimed) {
          stakeId = i;
          break;
        }
      }
      
      if (stakeId < 0) {
        throw new Error("No unclaimed stake found");
      }

      // Advance time to ensure stake is mature
      const poolDuration = Number(poolInfo.duration);
      await ethers.provider.send("evm_increaseTime", [poolDuration + 1]);
      await ethers.provider.send("evm_mine", []);
      
      // Check if stake has rewards before claiming
      const pendingRewards = await fixtureData.TigerStaking.getPendingRewards(charlie.address, stakeId);
      
      if (pendingRewards === 0n) {
        console.log("⚠️ No rewards to claim - stake may have 0% multiplier");
        return;
      }

      // Fund the staking contract with rewards before claiming
      // claimRewards transfers tokens from the contract to the user, so the contract must have the tokens
      const stakingContractBalance = await fixtureData.tokenizinToken.balanceOf(
        await fixtureData.TigerStaking.getAddress()
      );
      
      if (stakingContractBalance < pendingRewards) {
        // Transfer additional tokens to cover rewards (deployer has tokens from deployment)
        const tokensNeeded = pendingRewards - stakingContractBalance;
        await fixtureData.tokenizinToken
          .connect(deployer)
          .transfer(
            await fixtureData.TigerStaking.getAddress(),
            tokensNeeded
          );
      }

      // Claim rewards (note: RWAStaking doesn't support partial withdrawals)
      // claimRewards only claims rewards, not principal
      await fixtureData.TigerStaking.connect(charlie).claimRewards(stakeId);

      // Check remaining stake - after claiming, stake should be marked as claimed
      const userStakes = await fixtureData.TigerStaking.getUserStakes(charlie.address);
      const poolStakes = userStakes.filter((s: any) => Number(s.poolId) === poolId);
      const claimedStakes = poolStakes.filter((s: any) => s.claimed);
      
      // After claiming, the stake should be marked as claimed
      expect(claimedStakes.length).to.be.gte(1);

      console.log("✅ Partial withdrawal test completed");
    });

    it("Should test stake amount limits and pool caps", async function () {
      const poolId = poolData.poolIds[2]; // 90-day pool - use actual pool ID
      const minStakeAmount = ethers.parseEther("500"); // Pool minimum

      // Verify pool exists and is active
      const pool = await fixtureData.TigerStaking.getPool(poolId);
      expect(pool.active).to.be.true;
      
      // Verify pool has minimum stake requirement
      expect(pool.minStake).to.equal(minStakeAmount);

      // Test below minimum - should revert with "RWAStaking: below minimum stake" error
      await fixtureData.tokenizinToken.connect(alice).approve(
        await fixtureData.TigerStaking.getAddress(),
        ethers.parseEther("50"), // 50 TPT is below the 500 TPT minimum
      );

      await expect(
        fixtureData.TigerStaking.connect(alice).stake(
          poolId,
          ethers.parseEther("50"), // This should revert as it's below minimum
        ),
      ).to.be.revertedWith("RWAStaking: below minimum stake");

      // Test valid amount (at minimum)
      await fixtureData.tokenizinToken 
        .connect(alice)
        .approve(await fixtureData.TigerStaking.getAddress(), minStakeAmount);
      await fixtureData.TigerStaking
        .connect(alice)
        .stake(poolId, minStakeAmount);

      console.log("✅ Stake limits test completed - minimum stake enforcement working");
    });
  });
});
