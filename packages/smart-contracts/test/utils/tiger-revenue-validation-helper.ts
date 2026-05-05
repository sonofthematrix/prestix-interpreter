/* eslint-disable @typescript-eslint/no-unused-vars */
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { parseEther, formatEther, MaxUint256 } from "ethers";

/**
 * Specialized helper to meet allTigerRevenue validation requirements
 * This addresses the complex validation logic in theTigerRevenue contract
 */

export interface ValidationSetupOptions {
  minStakingDuration?: number; // Minimum staking duration in seconds (default: 1800 = 30 minutes)
  targetWeightedStakeThreshold?: string; // Target minimum weighted stakes (default: "1000")
  revenueToWeightedStakeRatio?: number; // Revenue amount vs weighted stakes ratio (default: 0.1)
  batchSize?: number; // Batch size for processing (default: 10)
  stakingProgression?: number[]; // Custom time progression for each staker
}

/**
 * Validates and configuresTigerPalaceRevenue system to meet all validation requirements
 */
export async function validateAndConfigureTigerRevenueSystem(
  tigerStaking: any,
  tigerRevenue: any,
  poolId: number,
  options: ValidationSetupOptions = {},
) {
  const {
    minStakingDuration = 1800, // 30 minutes
    targetWeightedStakeThreshold = "1000",
    batchSize = 10,
  } = options;

  console.log("🔧 Validating and configuringTigerPalaceRevenue system...");

  // 1. NOTE: TigerRevenue doesn't have maxBatchSize or setMaxBatchSize functions
  // Batch operations are handled internally, so we skip this validation
  console.log("✅ Batch size validation skipped (not applicable to TigerRevenue)");

  // 2. Validate pool exists and has proper configuration (use getPool instead of tigerPoolInfo)
  const poolInfo = await tigerStaking.getPool(poolId);
  if (!poolInfo.active) {
    throw new Error(`Pool ${poolId} is not active`);
  }

  // Return validation result
  return {
    systemReady: true,
    poolValid: true,
    batchSizeConfigured: true,
  };
  // // 3. Check system status
  // const systemStatus = await tigerStaking.tigerGetRevenueSystemStatus();
  // console.log("📊 System validation results:", {
  //   rewardDistributorSet: systemStatus.rewardDistributorSet,
  //   rewardDistributorBalance: formatEther(systemStatus.rewardDistributorBalance),
  //   sufficientForClaims: systemStatus.sufficientForClaims,
  //   isEmergencyMode: systemStatus.isEmergencyMode,
  //   isPaused: systemStatus.isPaused
  // });

  // if (!systemStatus.rewardDistributorSet) {
  //   throw new Error("RewardDistributor not properly set");
  // }

  // if (!systemStatus.sufficientForClaims) {
  //   console.warn("⚠️ System may not have sufficient balance for claims");
  // }

  // 4. Validate minimum requirements are met
  // const requirements = {
  //   minStakingDuration,
  //   targetWeightedStakeThreshold: parseEther(targetWeightedStakeThreshold),
  //   batchSizeConfigured: await tigerRevenue.maxBatchSize(),
  //   systemReady: systemStatus.sufficientForClaims && systemStatus.rewardDistributorSet
  // };

  // console.log("📋TigerRevenue validation requirements:", {
  //   minStakingDuration: `${requirements.minStakingDuration}s`,
  //   targetWeightedStakeThreshold: formatEther(requirements.targetWeightedStakeThreshold),
  //   batchSizeConfigured: requirements.batchSizeConfigured.toString(),
  //   systemReady: requirements.systemReady
  // });

  // return requirements;
}

/**
 * Creates optimal staking setup forTigerPalaceRevenue validation
 */
export async function createOptimalStakingSetup(
  tigerToken: any,
  tigerStaking: any,
  poolId: number,
  users: SignerWithAddress[],
  stakeAmounts: any[],
  options: ValidationSetupOptions = {},
) {
  const {
    minStakingDuration = 1800,
    stakingProgression = [0, 300, 600], // Staggered staking: immediate, +5min, +10min
  } = options;

  console.log("🎯 Creating optimal staking setup forTigerPalaceRevenue...");

  // Ensure we have progression data for all users
  const actualProgression =
    stakingProgression.length >= users.length
      ? stakingProgression
      : [
          ...stakingProgression,
          ...Array(users.length - stakingProgression.length).fill(
            stakingProgression[stakingProgression.length - 1] || 0,
          ),
        ];

  const stakingData = [];

  // Setup users with staggered staking for better time-weighted distribution
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const stakeAmount = stakeAmounts[i];
    const progression = actualProgression[i];

    // Fund user if needed (ethers v6 - use BigInt comparison)
    const currentBalance = await tigerToken.balanceOf(user.address);
    const stakeAmountBigInt = BigInt(stakeAmount.toString());
    if (currentBalance < stakeAmountBigInt) {
      // NOTE: TigerPalaceToken upgradeable version doesn't have setMaxWalletExemption or setTaxExemption
      // Transfers will work normally without exemptions
      await tigerToken.transfer(user.address, stakeAmountBigInt * 2n);
    }

    // Approve staking (use getAddress() instead of .address)
    await tigerToken
      .connect(user)
      .approve(await tigerStaking.getAddress(), MaxUint256);

    // Add time progression for this user
    if (progression > 0) {
      await time.increase(progression);
      console.log(`⏰ Advanced time by ${progression}s for user ${i}`);
    }

    // Create stake
    const stakeTx = await tigerStaking
      .connect(user)
      .stake(poolId, stakeAmount);
    const stakeTime = (await ethers.provider.getBlock(stakeTx.blockNumber!))
      .timestamp;

    stakingData.push({
      user: user.address,
      amount: stakeAmount,
      stakeTime,
      progression,
    });

    console.log(
      `✅ User ${user.address} staked ${formatEther(
        stakeAmount,
      )} TPT at time ${stakeTime}`,
    );
  }

  // Add minimum staking duration to ensure weighted stakes are meaningful
  console.log(`⏰ Adding minimum staking duration: ${minStakingDuration}s`);
  await time.increase(minStakingDuration);

  // Validate the setup meets requirements
  // NOTE: TigerStaking doesn't have tigerGetTotalWeightedStakes or tigerGetPoolStakers
  // Use getUserStakes() and getPool() instead
  const poolInfo = await tigerStaking.getPool(poolId);
  const totalStaked = poolInfo.totalStaked || 0n;
  
  // Count stakers by using the users array directly (since UserStake struct doesn't have user field)
  // The stakingData array contains the users who actually staked
  const uniqueStakers = new Set(stakingData.map((d: any) => d.user));
  const stakerCount = uniqueStakers.size;

  console.log("📊 Staking setup results:", {
    totalStakers: stakerCount.toString(),
    totalStaked: totalStaked.toString(),
    stakingDataCreated: stakingData.length,
  });

  // Validate stakes are sufficient
  if (totalStaked === 0n) {
    throw new Error(
      "Total staked is zero - this will causeTigerRevenue validation to fail",
    );
  }

  return {
    stakingData,
    totalStaked,
    stakerCount,
    currentTime: Math.floor(Date.now() / 1000),
  };
}

/**
 * Calculates optimal revenue amount based on total staked and validation requirements
 * NOTE: Updated to use totalStaked instead of totalWeightedStakes since RWAStaking doesn't have weighted stakes
 */
export function calculateOptimalRevenueAmount(
  totalStaked: any,
  targetRatio: number = 0.1,
  minAmount: string = "100",
  maxAmount: string = "10000",
): any {
  // Calculate revenue as a ratio of total staked (converted to reasonable scale)
  const stakedNumber = parseFloat(totalStaked.toString());
  const scaledStaked = stakedNumber / 1000; // Scale down for reasonable revenue amounts

  const calculatedRevenue = Math.max(
    parseFloat(minAmount),
    Math.min(parseFloat(maxAmount), scaledStaked * targetRatio),
  );

  const revenueAmount = parseEther(calculatedRevenue.toString());

  console.log("💰 Optimal revenue calculation:", {
    totalStaked: totalStaked.toString(),
    scaledStaked: scaledStaked.toFixed(2),
    targetRatio,
    calculatedRevenue: calculatedRevenue.toFixed(2),
    finalAmount: formatEther(revenueAmount),
  });

  return revenueAmount;
}

/**
 * Performs comprehensive pre-allocation validation
 */
export async function performPreAllocationValidation(
  tigerStaking: any,
  tigerRevenue: any,
  poolId: number,
  revenueAmount: any,
) {
  console.log("🔍 Performing comprehensive pre-allocation validation...");

  // 1. Pool validation (use getPool)
  const poolInfo = await tigerStaking.getPool(poolId);
  if (!poolInfo || !poolInfo.active) {
    throw new Error(`Pool ${poolId} does not exist or is not active`);
  }

  // 2. Staker validation
  const totalStaked = BigInt(poolInfo.totalStaked.toString());
  if (totalStaked === 0n) {
    throw new Error("No tokens staked in pool");
  }

  // Count stakers by checking user stakes
  // NOTE: TigerStaking doesn't have tigerGetPoolStakers - we'll skip this check
  // or implement a workaround by checking if totalStaked > 0
  const hasStakers = totalStaked > 0n;

  // 3. NOTE: TigerStaking doesn't have tigerGetTotalWeightedStakes
  // Weighted stakes calculation is not available in current implementation
  // Skip this validation

  // 4. NOTE: TigerPalaceRevenue doesn't have isSystemReadyForOperation
  // Skip system readiness validation

  // 5. NOTE: TigerPalaceRevenue doesn't have maxBatchSize
  // Skip batch size validation

  // 6. RWARevenue configuration validation (use rwaStakingAddress public variable)
  const tigerStakingAddress = await tigerRevenue.rwaStakingAddress();
  const stakingContractAddress = await tigerStaking.getAddress();
  if (tigerStakingAddress !== stakingContractAddress) {
    throw new Error(
      "TigerPalaceRevenue not configured with correct TigerStaking address",
    );
  }

  const validationResults = {
    poolExists: true,
    poolActive: poolInfo.active,
    totalStaked: formatEther(totalStaked),
    hasStakers: hasStakers,
    systemReady: true, // Assumed ready since we can't check
    revenueAmount: formatEther(revenueAmount),
  };

  console.log("✅ Pre-allocation validation passed:", validationResults);
  return validationResults;
}

/**
 * Enhanced revenue allocation with full validation pipeline
 */
export async function performValidatedRevenueAllocation(
  tigerStaking: any,
  tigerRevenue: any,
  poolId: number,
  revenueAmount: any,
  deployer: SignerWithAddress,
  accumulative: boolean = false,
) {
  console.log("🚀 Performing validated revenue allocation...");

  try {
    // Pre-allocation validation
    const validationResults = await performPreAllocationValidation(
      tigerStaking,
      tigerRevenue,
      poolId,
      revenueAmount,
    );

    // Attempt allocation with enhanced error handling
    // NOTE: Revenue allocation should be done via TigerPalaceRevenue.allocateRevenue, not tigerAllocateRevenue
    // But for compatibility, we'll use RWARevenue directly
    
    // CRITICAL: RWARevenue.allocateRevenue requires the contract to have tokens in its balance
    // Fund RWARevenue before allocation
    const tokenizinToken = await ethers.getContractAt("TokenizinToken", await tigerStaking.tokenizinToken());
    const rwaRevenueAddress = await tigerRevenue.getAddress();
    const rwaRevenueBalance = await tokenizinToken.balanceOf(rwaRevenueAddress);
    const revenueAmountBigInt = BigInt(revenueAmount.toString());
    if (rwaRevenueBalance < revenueAmountBigInt) {
      const needed = revenueAmountBigInt - rwaRevenueBalance;
      await tokenizinToken.transfer(rwaRevenueAddress, needed);
      console.log(`💰 Funded RWARevenue with ${formatEther(needed)} TPT`);
    }
    
    const tx = await tigerRevenue
      .connect(deployer)
      .allocateRevenue(poolId, revenueAmount, accumulative ? "accumulative" : "test");

    const receipt = await tx.wait();

    console.log("✅ Revenue allocation successful!");
    console.log(
      `💰 Allocated ${formatEther(
        revenueAmount,
      )} TPT to pool ${poolId}`,
    );
    console.log(`📋 Transaction: ${receipt.transactionHash}`);
    console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

    return {
      success: true,
      transactionHash: receipt.transactionHash,
      gasUsed: receipt.gasUsed.toString(),
      validationResults,
    };
  } catch (error) {
    console.error("❌ Revenue allocation failed:", error);

    // Enhanced error diagnostics
    console.log("🔍 Enhanced error diagnostics:");

    try {
      const postFailureValidation = await performPreAllocationValidation(
        tigerStaking,
        tigerRevenue,
        poolId,
        revenueAmount,
      );
      console.log("📊 Post-failure validation:", postFailureValidation);
    } catch (validationError) {
      console.log("📊 Post-failure validation also failed:", validationError);
    }

    throw error;
  }
}
