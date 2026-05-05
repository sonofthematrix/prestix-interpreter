/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { deployTigerPalaceTokenUpgradeable } from "./token-deployment";

/**
 * 🚀 Optimized Contract Fixture for Refactored Tests
 *
 * This fixture provides a standardized way to deploy and initialize
 * the optimizedTigerStaking ecosystem with simplified interfaces.
 */

export interface OptimizedEcosystemFixture {
  // Contracts
  rwaToken: any;
  TigerStaking: any;
  rwaRevenue: any;
  rewardDistributor: any;

  // Signers
  deployer: SignerWithAddress;
  treasury: SignerWithAddress;
  users: SignerWithAddress[];

  // Helper functions
  createSimplifiedPool: (
    minStaked: any,
    apy: number,
    pRate: number,
  ) => Promise<number>;
  addTierConfig: (
    duration: number,
    multiplier: number,
    tierName: string,
    isPenalty: boolean,
  ) => Promise<void>;
  fundAndApproveUser: (user: SignerWithAddress, amount: any) => Promise<void>;

  // Pool info
  defaultPoolId: number;
}

/**
 * Deploy and initialize the complete optimized ecosystem
 */
export async function deployOptimizedEcosystem(
  signers: SignerWithAddress[],
  options: {
    createDefaultPool?: boolean;
    setupTiers?: boolean;
    fundUsers?: boolean;
    fundingAmount?: any;
  } = {},
): Promise<OptimizedEcosystemFixture> {
  const [deployer, treasury, ...users] = signers;
  const {
    createDefaultPool = true,
    setupTiers = false,
    fundUsers = true,
    fundingAmount = ethers.parseEther("100000"),
  } = options;

  // Deploy TigerPalaceToken as upgradeable contract with UUPS proxy (production pattern)
  const { token: rwaToken } = await deployTigerPalaceTokenUpgradeable(deployer, {
    minBalance: ethers.parseEther("10000000"), // 10M tokens minimum
  });

  // Deploy RWARewardDistributor (not upgradeable)
  const RWARewardDistributor = await ethers.getContractFactory(
    "RWARewardDistributor",
  );
  const rewardDistributor = await RWARewardDistributor.deploy(
    await rwaToken.getAddress(), // token address
    treasury.address, // treasury
    ethers.parseEther("1000"), // initial reward pool
  );

  // Deploy RWARevenue (not upgradeable)
  const RWARevenue = await ethers.getContractFactory("RWARevenue");
  const rwaRevenue = await RWARevenue.deploy(
    await rwaToken.getAddress(), // token address
    await rewardDistributor.getAddress(), // reward distributor
  );

  // Initialize RWARevenue with staking address (will be set after staking deployment)
  // Note: RWARevenue needs to be initialized after RWAStaking is deployed

  // Deploy RWAStaking (not upgradeable)
  const RWAStakingFactory = await ethers.getContractFactory("RWAStaking");
  const TigerStaking = await RWAStakingFactory.deploy(
    await rwaToken.getAddress(), // token address
    await rwaRevenue.getAddress(), // revenue address
    await rewardDistributor.getAddress(), // reward distributor
  );

  // Initialize RWARevenue with staking address (check if already initialized)
  try {
    const currentStakingAddr = await rwaRevenue.rwaStakingAddress();
    if (currentStakingAddr === ethers.ZeroAddress) {
      await rwaRevenue.initialize(await TigerStaking.getAddress());
    }
  } catch (error: any) {
    if (!error.message?.includes("already initialized")) {
      throw error;
    }
  }

  // NOTE: TigerPalaceToken doesn't have setMaxWalletExemption or setTaxExemption functions
  // Upgradeable token doesn't have max wallet/tax restrictions
  const rewardDistributorAddress = await rewardDistributor.getAddress();
  const rwaStakingAddress = await TigerStaking.getAddress();
  const rwaRevenueAddress = await rwaRevenue.getAddress();

  // Setup RewardDistributor approval for RWAStaking
  // Note: RWARewardDistributor doesn't have approveERC20, so we transfer tokens directly
  // The staking contract will need tokens transferred to it for rewards
  // For now, we'll skip the approval and let tests handle token transfers as needed

  // Helper functions
  const createSimplifiedPool = async (
    minStaked: any,
    apy: number,
    pRate: number,
  ): Promise<number> => {
    // Use getStats() instead of poolLength()
    const statsBefore = await TigerStaking.getStats();
    const poolCountBefore = statsBefore._poolCount || statsBefore.poolCount || 0;
    // createPool(name, duration, multiplier) - APY needs to be in basis points
    // Duration must be > 0, use minimum of 1 second for flexible pools
    // Multiplier = 10000 + (apy in basis points), so 12% APY = 10000 + 1200 = 11200
    const apyBasisPoints = apy >= 10000 ? apy : apy; // apy is already in basis points (1200 = 12%)
    const multiplier = 10000 + apyBasisPoints; // Add base 100% to get total multiplier
    const poolDuration = 1; // Minimum 1 second (contract requires duration > 0)
    const tx = await (TigerStaking as any).connect(deployer).createPool(`Pool ${Date.now()}`, poolDuration, multiplier, ethers.parseEther("100"));
    await tx.wait();
    // Get stats after creation to get the actual pool ID
    const statsAfter = await TigerStaking.getStats();
    const poolCountAfter = statsAfter._poolCount || statsAfter.poolCount || 0;
    // Return the new pool ID
    // Since pools are 1-indexed and sequential, if poolCountAfter = 5, the new pool ID is 5
    return Number(poolCountAfter);
  };

  const addTierConfig = async (
    duration: number,
    multiplier: number,
    tierName: string,
    isPenalty: boolean,
  ): Promise<void> => {
    // RWAStaking doesn't have addTierConfig - tiers are set per pool
    // This is a no-op for compatibility, pools are created with duration/multiplier
    console.warn("addTierConfig: RWAStaking doesn't support tier configs. Create pools with duration/multiplier instead.");
  };

  const fundAndApproveUser = async (
    user: SignerWithAddress,
    amount: any,
  ): Promise<void> => {
    // NOTE: TigerPalaceToken upgradeable version doesn't have setMaxWalletExemption
    // Max wallet functionality is not implemented in the upgradeable version
    // Transfers will work normally without exemptions
    
    // Transfer tokens to user
    await rwaToken.transfer(user.address, amount);
    // Approve staking contract
    const tx = await (rwaToken as any)
      .connect(user)
      .approve(await TigerStaking.getAddress(), ethers.MaxUint256);
    await tx.wait();
  };

  // Create default pool if requested
  let defaultPoolId = -1;
  if (createDefaultPool) {
    defaultPoolId = await createSimplifiedPool(
      ethers.parseEther("100"), // 100 TPT minimum
      1200, // 12% apy
      0, // No penalty
    );
  }

  // Setup basic tier configuration if requested
  if (setupTiers) {
    await addTierConfig(1800, 0, "Penalty", true); // 30 min penalty
    await addTierConfig(3600, 10000, "Bronze", false); // 1 hour, 100%
    await addTierConfig(7200, 12500, "Silver", false); // 2 hours, 125%
    await addTierConfig(86400, 15000, "Gold", false); // 1 day, 150%
    await addTierConfig(604800, 20000, "Platinum", false); // 7 days, 200%
  }

  // Fund users if requested
  if (fundUsers) {
    // Fund reward distributor (already exempt)
    await rwaToken.transfer(rewardDistributorAddress, fundingAmount);
    
    // Fund users
    // NOTE: TigerPalaceToken upgradeable version doesn't have setMaxWalletExemption
    // Max wallet functionality is not implemented in the upgradeable version
    for (const user of users) {
      await rwaToken.transfer(user.address, fundingAmount);
      // Setup approvals for users
      const tx = await (rwaToken as any)
        .connect(user)
        .approve(rwaStakingAddress, ethers.MaxUint256);
      await tx.wait();
    }
  }

  return {
    rwaToken,
    TigerStaking,
    rwaRevenue,
    rewardDistributor,
    deployer,
    treasury,
    users,
    createSimplifiedPool,
    addTierConfig,
    fundAndApproveUser,
    defaultPoolId,
  };
}

/**
 * Standard test amounts for consistent testing
 */
export const TEST_AMOUNTS = {
  TINY: ethers.parseEther("100"),
  SMALL: ethers.parseEther("1000"),
  MEDIUM: ethers.parseEther("5000"),
  LARGE: ethers.parseEther("10000"),
  HUGE: ethers.parseEther("25000"),
  MEGA: ethers.parseEther("100000"),
};

/**
 * Standard tier durations for consistent testing
 */
export const TIER_DURATIONS = {
  PENALTY: 1800, // 30 minutes (penalty period for early withdrawal)
  BRONZE: 3600, // 1 hour
  SILVER: 7200, // 2 hours
  GOLD: 86400, // 1 day
  PLATINUM: 604800, // 7 days
};

/**
 * Pool configuration presets
 */
export const POOL_PRESETS = {
  BASIC: {
    minStaked: ethers.parseEther("100"),
    apy: 1200, // 12%
    pRate: 0,
  },
  HIGH_YIELD: {
    minStaked: ethers.parseEther("1000"),
    apy: 2400, // 24%
    pRate: 500, // 5%
  },
  VIP: {
    minStaked: ethers.parseEther("10000"),
    apy: 3600, // 36%
    pRate: 1000, // 10%
  },
};

/**
 * Legacy compatibility constants
 */
export const LEGACY_VALUES = {
  UNLIMITED_CAP: 0,
  ALWAYS_OPEN_START: 0,
  NEVER_CLOSES_END: "340282366920938463463374607431768211455", // type(uint128).max
};

/**
 * Quick setup function for simple tests
 */
export async function quickSetup(signers: SignerWithAddress[]) {
  return await deployOptimizedEcosystem(signers, {
    createDefaultPool: true,
    setupTiers: true,
    fundUsers: true,
    fundingAmount: TEST_AMOUNTS.MEGA,
  });
}
