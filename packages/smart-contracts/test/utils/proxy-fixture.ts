/* eslint-disable @typescript-eslint/no-explicit-any */
import hre from "hardhat";
const { ethers } = hre as any;
const { parseEther, formatEther } = ethers;
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { applyCompatibilityWrapper } from "./contract-compatibility";
import { deployTokenizinTokenUpgradeable } from "./token-deployment";

// Helper function to deploy contracts using ethers v6 ContractFactory
async function deployContractByName(signer: SignerWithAddress, contractName: string, args: any[]) {
  const factory = await ethers.getContractFactory(contractName);
  const contract = await factory.connect(signer).deploy(...args);
  await contract.waitForDeployment();
  
  // Add .address property for backwards compatibility
  const address = await contract.getAddress();
  (contract as any).address = address;
  
  return contract;
}

// Helper to add .address property to contracts from getContractAt
async function addAddressProperty(contract: any) {
  const address = await contract.getAddress();
  (contract as any).address = address;
  return contract;
}

export interface ProxyFixtureData {
  // Core contracts
  tokenizinToken: any;
  rewardDistributor: any;

  // Implementation contracts
  rwaStakingImpl: any;
  rwaRevenueImpl: any;

  // Proxy contracts (use these for testing)
  TigerStaking: any;
  rwaRevenue: any;

  // Deployment info
  deploymentInfo: {
    network: string;
    timestamp: number;
    gasUsed: {
      tokenizinToken: any;
      rewardDistributor: any;
      rwaStakingImpl: any;
      rwaRevenueImpl: any;
      rwaStakingProxy: any;
      rwaRevenueProxy: any;
    };
  };
}

/**
 * Deploy complete ecosystem with proxy patterns matching production deployment
 * 
 * NOTE: For proper upgradeable contract testing, use deployUpgradeableEcosystem() from upgradeable-fixture.ts
 * which follows the production pattern:
 * 1. Deploy implementation contract
 * 2. Deploy ProxyAdmin
 * 3. Deploy TransparentUpgradeableProxy linked to implementation
 * 4. Initialize proxy
 * 5. Ensure deployer has admin role rights for all contracts and proxies
 * 
 * This function deploys contracts directly (not via proxies) for simpler testing scenarios.
 * For upgrade testing, use upgradeable-fixture.ts instead.
 */
export async function deployCompleteEcosystemWithProxies(
  signers: SignerWithAddress[],
): Promise<ProxyFixtureData> {
  const [deployer, treasury] = signers;

  console.log("🚀 Deploying complete ecosystem with proxy patterns...");

  const gasUsed: any = {};

  // Step 1: Deploy TPT Token as upgradeable contract with UUPS proxy (production pattern)
  console.log("📦 Step 1: Deploying TPT Token...");
  
  const { token: tokenizinToken } = await deployTokenizinTokenUpgradeable(deployer, {
    minBalance: parseEther("10000000"), // 10M tokens minimum
  });
    
  gasUsed.tokenizinToken = tokenizinToken.deploymentTransaction()?.gasLimit || 0n;

  // Step 2: Deploy RWARewardDistributor (not upgradeable, direct deployment)
  console.log("📦 Step 2: Deploying RWARewardDistributor...");
  const rewardDistributor = await deployContractByName(
    deployer as any,
    "RWARewardDistributor",
    [
      await tokenizinToken.getAddress(), // token address
      treasury.address, // treasury
      parseEther("1000"), // initial reward pool
    ],
  );
  gasUsed.rewardDistributor = rewardDistributor.deploymentTransaction()?.gasLimit || 0n;

  // Step 3: Deploy RWARevenue and RWAStaking directly (not upgradeable)
  console.log("📦 Step 3: Deploying RWARevenue and RWAStaking...");

  const rwaRevenue = await deployContractByName(
    deployer as any,
    "RWARevenue",
    [
      await tokenizinToken.getAddress(), // token address
      await rewardDistributor.getAddress(), // reward distributor
    ],
  );
  gasUsed.rwaRevenueImpl = rwaRevenue.deploymentTransaction()?.gasLimit || 0n;

  const TigerStaking = await deployContractByName(
    deployer as any,
    "RWAStaking",
    [
      await tokenizinToken.getAddress(), // token address
      await rwaRevenue.getAddress(), // revenue address
      await rewardDistributor.getAddress(), // reward distributor
    ],
  );
  gasUsed.rwaStakingImpl = TigerStaking.deploymentTransaction()?.gasLimit || 0n;

  // Initialize RWARevenue with staking address (check if already initialized)
  try {
    const currentStakingAddr = await rwaRevenue.rwaStakingAddress();
    if (currentStakingAddr === ethers.ZeroAddress) {
      await rwaRevenue.initialize(await TigerStaking.getAddress());
    } else {
      console.log("⚠️ RWARevenue already initialized, skipping");
    }
  } catch (error: any) {
    if (error.message?.includes("already initialized")) {
      console.log("⚠️ RWARevenue already initialized, continuing...");
    } else {
      throw error;
    }
  }

  // CRITICAL: Grant RWAStaking the REVENUE_MANAGER_ROLE on RWARevenue so it can call allocateRevenue
  const REVENUE_MANAGER_ROLE = await rwaRevenue.REVENUE_MANAGER_ROLE();
  await rwaRevenue.grantRole(REVENUE_MANAGER_ROLE, await TigerStaking.getAddress());

  // Step 4: Configure Token Permissions and Fund RWARewardDistributor
  console.log("🔧 Step 4: Configuring token permissions and funding...");

  // CRITICAL: Set max wallet exemptions BEFORE transfers to avoid "exceeds max wallet" errors
  const rewardDistributorAddress = await rewardDistributor.getAddress();
  const rwaStakingAddress = await TigerStaking.getAddress();
  const rwaRevenueAddress = await rwaRevenue.getAddress();

  // NOTE: TokenizinToken doesn't have setMaxWalletExemption or setTaxExemption functions
  // These are not needed for the upgradeable version of the token
  // If tax/max wallet features are needed, they should be added to the contract
  console.log("🔐 Token permissions configured (no exemptions needed for upgradeable token)");

  // Fund RWARewardDistributor (now safe from max wallet limits)
  const fundingAmount = parseEther("100000"); // 100K TPT
  await (tokenizinToken as any).connect(deployer).transfer(rewardDistributorAddress, fundingAmount);

  // Grant roles to deployer for testing
  // Deployer already has DEFAULT_ADMIN_ROLE, but needs POOL_MANAGER_ROLE and REWARD_MANAGER_ROLE
  const POOL_MANAGER_ROLE = await TigerStaking.POOL_MANAGER_ROLE();
  const REWARD_MANAGER_ROLE = await TigerStaking.REWARD_MANAGER_ROLE();
  await TigerStaking.grantRole(POOL_MANAGER_ROLE, deployer.address);
  await TigerStaking.grantRole(REWARD_MANAGER_ROLE, deployer.address);

  // Note: RWARewardDistributor doesn't have approveERC20 function
  // Tokens need to be transferred directly to contracts that need them

  console.log("✅ Complete ecosystem deployed!");

  // Apply compatibility wrapper for legacy function names
  const wrappedFixture = applyCompatibilityWrapper({
    tokenizinToken,
    rewardDistributor,
    rwaStakingImpl: TigerStaking,
    rwaRevenueImpl: rwaRevenue,
    TigerStaking,
    rwaRevenue,
  });

  return {
    tokenizinToken,
    rewardDistributor,
    rwaStakingImpl: wrappedFixture.rwaStakingImpl || TigerStaking,
    rwaRevenueImpl: wrappedFixture.rwaRevenueImpl || rwaRevenue,
    TigerStaking: wrappedFixture.TigerStaking || TigerStaking,
    rwaRevenue: wrappedFixture.rwaRevenue || rwaRevenue,
    deploymentInfo: {
      network: "test",
      timestamp: Date.now(),
      gasUsed,
    },
  };
}

/**
 * Setup test users for proxy-based ecosystem testing
 */
export async function setupProxyTestEnvironment(
  fixtureData: ProxyFixtureData,
  users: SignerWithAddress[],
  options: {
    fundingAmount?: any;
    setupApprovals?: boolean;
    approvalAmount?: any;
  } = {},
) {
  const {
    fundingAmount = parseEther("10000"),
    setupApprovals = true,
    approvalAmount = ethers.MaxUint256,
  } = options;

  console.log("🔧 Setting up proxy test environment...");

  // Fund and exclude users
  for (const user of users) {
    // CRITICAL: Set max wallet exemption for users BEFORE funding
    // NOTE: TokenizinToken upgradeable version doesn't have setMaxWalletExemption
    // Max wallet functionality is not implemented in the upgradeable version
    
    // Fund user
    await fixtureData.tokenizinToken.transfer(user.address, fundingAmount);

    // Setup approvals if requested
    if (setupApprovals) {
      await fixtureData.tokenizinToken
        .connect(user)
        .approve(await fixtureData.TigerStaking.getAddress(), approvalAmount);
    }
  }

  console.log("✅ Proxy test environment setup completed!");
}

/**
 * Verify proxy deployment and configuration
 */
export async function verifyProxyDeployment(
  fixtureData: ProxyFixtureData,
): Promise<boolean> {
  try {
    console.log("🔍 Verifying proxy deployment...");

    // Check RWAStaking configuration
    // These are properties, not functions - access directly
    const acceptedToken = await fixtureData.TigerStaking.tokenizinToken();
    const rewardDistributorAddr =
      await fixtureData.TigerStaking.rewardDistributorAddress();
    const rwaRevenueAddr = await fixtureData.TigerStaking.rwaRevenueAddress();

    // Check RWARevenue configuration
    const rwaMultiAddr = await fixtureData.rwaRevenue.rwaMulti();
    const rwaStakingAddr = await fixtureData.rwaRevenue.rwaStakingAddress();
    
    // Verify addresses match expected values
    const tokenizinTokenAddress = await fixtureData.tokenizinToken.getAddress();
    const rewardDistributorAddress = await fixtureData.rewardDistributor.getAddress();
    const rwaRevenueAddress = await fixtureData.rwaRevenue.getAddress();
    const rwaStakingAddress = await fixtureData.TigerStaking.getAddress();
    
    const isValid =
      acceptedToken === tokenizinTokenAddress &&
      rewardDistributorAddr === rewardDistributorAddress &&
      rwaRevenueAddr === rwaRevenueAddress &&
      rwaMultiAddr === rwaStakingAddress &&
      rwaStakingAddr === rwaStakingAddress;

    console.log(
      "✅ Proxy deployment verification:",
      isValid ? "PASSED" : "FAILED",
    );

    return isValid;
  } catch (error) {
    console.error("❌ Proxy deployment verification failed:", error);
    return false;
  }
}

/**
 * Create multiple pools with different staking durations for testing
 */
export async function createTestPoolsWithDurations(
  fixtureData: ProxyFixtureData,
  _deployer: SignerWithAddress,
) {
  console.log("🏊 Creating test pools with different durations...");

  const poolConfigs = [
    {
      name: "Flexible Pool",
      minStaked: parseEther("100"),
      apy: 1000, // 10%
      cap: 0, // Unlimited
      duration: 1, // Flexible (minimum 1 second)
    },
    {
      name: "30-Day Pool",
      minStaked: parseEther("100"),
      apy: 1200, // 12%
      cap: 0, // Unlimited
      duration: 30 * 24 * 60 * 60, // 30 days
    },
    {
      name: "90-Day Pool",
      minStaked: parseEther("500"),
      apy: 1500, // 15%
      cap: 0, // Unlimited
      duration: 90 * 24 * 60 * 60, // 90 days
    },
    {
      name: "180-Day Pool",
      minStaked: parseEther("1000"),
      apy: 2000, // 20%
      cap: 0, // Unlimited
      duration: 180 * 24 * 60 * 60, // 180 days
    },
  ];

  const poolIds = [];

  for (let i = 0; i < poolConfigs.length; i++) {
    const config = poolConfigs[i];
    console.log(`📝 Creating ${config.name}...`);

    // Get pool count before creation
    // getStats() returns (uint256 _totalStaked, uint256 _totalRewardsDistributed, uint256 _poolCount)
    const [, , poolCountBefore] = await fixtureData.TigerStaking.getStats();

    // Use correct function name: createPool() instead of createPool()
    // createPool(name, duration, multiplier, minStake) - multiplier is in basis points
    // Multiplier = 10000 (base 100%) + APY in basis points
    // Example: 10% APY = 1000 basis points, so multiplier = 10000 + 1000 = 11000
    await fixtureData.TigerStaking.createPool(
      config.name,
      config.duration,
      10000 + config.apy, // Base 100% + APY in basis points
      config.minStaked, // Use minStaked from config
    );

    // Get actual pool ID after creation
    // Pools start at ID 1 (not 0) because nextPoolId starts at 1
    const [, , poolCountAfter] = await fixtureData.TigerStaking.getStats();
    const actualPoolId = Number(poolCountAfter); // Pool ID matches pool count
    
    poolIds.push(actualPoolId);
    console.log(`✅ ${config.name} created with ID: ${actualPoolId}`);
  }

  console.log("✅ All test pools created successfully!");

  return {
    poolIds,
    configs: poolConfigs,
  };
}

/**
 * Test helper to advance time and perform withdrawal tests
 */
export async function testStakingAtDuration(
  fixtureData: ProxyFixtureData,
  user: SignerWithAddress,
  poolId: number,
  stakeAmount: any,
  durationToWait: number,
  description: string,
) {
  console.log(`🧪 Testing ${description}...`);

  // Record initial balance
  const initialBalance = await fixtureData.tokenizinToken.balanceOf(user.address);

  // Stake tokens
  await fixtureData.tokenizinToken
    .connect(user)
    .approve(await fixtureData.TigerStaking.getAddress(), stakeAmount);
  // Use correct function name: stake() instead of.stake()
  await fixtureData.TigerStaking
    .connect(user)
    .stake(poolId, stakeAmount);
  console.log(
    `📥 Staked ${formatEther(stakeAmount)} TPT in pool ${poolId}`,
  );

  // Advance time
  if (durationToWait > 0) {
    await ethers.provider.send("evm_increaseTime", [durationToWait]);
    await ethers.provider.send("evm_mine", []);
    console.log(`⏰ Advanced time by ${durationToWait / (24 * 60 * 60)} days`);
  }

  // Attempt withdrawal - RWAStaking uses claimRewards(stakeId) after stake matures
  try {
    // Get user's stake to check if it's mature
    const userStakes = await fixtureData.TigerStaking.getUserStakes(user.address);
    if (userStakes.length === 0) {
      return { success: false, error: "No stakes found" };
    }

    // Find stake in this pool and get its actual index in userStakes array
    const poolStakes = userStakes.filter((s: any) => Number(s.poolId) === poolId);
    if (poolStakes.length === 0) {
      return { success: false, error: "No stakes found in pool" };
    }

    // Find the actual stake index in the userStakes array
    let stakeId = -1;
    for (let i = 0; i < userStakes.length; i++) {
      if (Number(userStakes[i].poolId) === poolId && !userStakes[i].claimed) {
        stakeId = i;
        break;
      }
    }

    if (stakeId < 0) {
      return { success: false, error: "No unclaimed stake found" };
    }

    const stake = userStakes[stakeId];
    const currentTime = await time.latest();
    
    // If stake not mature, advance time to maturity
    if (currentTime < Number(stake.endTime)) {
      const timeNeeded = Number(stake.endTime) - currentTime + 1;
      await ethers.provider.send("evm_increaseTime", [timeNeeded]);
      await ethers.provider.send("evm_mine", []);
    }

    // Get pending rewards and fund contract if needed
    const pendingRewards = await fixtureData.TigerStaking.getPendingRewards(user.address, stakeId);
    
    if (pendingRewards > 0n) {
      // Fund the staking contract with rewards before claiming
      const stakingContractBalance = await fixtureData.tokenizinToken.balanceOf(
        await fixtureData.TigerStaking.getAddress()
      );
      
      if (stakingContractBalance < pendingRewards) {
        // Transfer additional tokens to cover rewards (deployer has tokens from deployment)
        const tokensNeeded = pendingRewards - stakingContractBalance;
        const [deployer] = await ethers.getSigners();
        await fixtureData.tokenizinToken
          .connect(deployer)
          .transfer(
            await fixtureData.TigerStaking.getAddress(),
            tokensNeeded
          );
      }
    }

    await fixtureData.TigerStaking.connect(user).claimRewards(stakeId);
    const finalBalance = await fixtureData.tokenizinToken.balanceOf(user.address);
    const difference = finalBalance - initialBalance;

    if (difference > 0n) {
      console.log(
        `✅ Withdrawal successful with rewards: ${formatEther(
          difference,
        )} TPT`,
      );
      return { success: true, rewards: difference };
    } else {
      console.log(`⚠️ Withdrawal successful but no rewards earned`);
      return { success: true, rewards: 0n };
    }
  } catch (error: any) {
    console.log(`❌ Withdrawal failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export const PROXY_TEST_CONFIG = {
  DEFAULT_POOL: {
    minStaked: parseEther("100"),
    apy: 1200, // 12%
    cap: 0, // Unlimited
    lockDuration: 0, // No lock for flexi pools
    allowPartialWithdraw: true,
  },
  FUNDING_AMOUNTS: {
    SMALL: parseEther("1000"),
    MEDIUM: parseEther("10000"),
    LARGE: parseEther("100000"),
    MEGA: parseEther("1000000"),
  },
  TIER_CONFIG: {
    PENALTY: { duration: 0, multiplier: 0, name: "Penalty" },
    BRONZE: { duration: 30 * 24 * 60 * 60, multiplier: 10000, name: "Bronze" },
    SILVER: { duration: 90 * 24 * 60 * 60, multiplier: 12500, name: "Silver" },
    GOLD: { duration: 180 * 24 * 60 * 60, multiplier: 15000, name: "Gold" },
    PLATINUM: {
      duration: 365 * 24 * 60 * 60,
      multiplier: 20000,
      name: "Platinum",
    },
  },
  DURATIONS: {
    FLEXIBLE: 0,
    DAYS_7: 7 * 24 * 60 * 60,
    DAYS_30: 30 * 24 * 60 * 60,
    DAYS_90: 90 * 24 * 60 * 60,
    DAYS_180: 180 * 24 * 60 * 60,
    DAYS_365: 365 * 24 * 60 * 60,
  },
};
