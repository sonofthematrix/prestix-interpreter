import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { applyCompatibilityWrapper } from "./contract-compatibility";
import { deployTokenizinTokenUpgradeable } from "./token-deployment"; 

// Contract deployment utilities for testing

export interface rwaStakingFixtureData {
  // Core contracts
  tokenizinToken: any;
  rewardDistributor: any;
  rwaStaking: any;
  rwaRevenue: any;

  // Deployment metadata
  deploymentInfo: {
    network: string;
    timestamp: number;
    gasUsed: {
      tokenizinToken: any;
      rewardDistributor: any;
      rwaStaking: any;
      rwaRevenue: any;
    };
    poolCount: number;
    defaultPoolId: number;
  };

  // Configuration constants
  config: {
    TOKEN_DECIMALS: number;
    ONE_YEAR_SECONDS: number;
    HUNDRED_PERCENT_BPS: number;
    MAX_UINT128: any;
    SAFE_TIMESTAMP: number;
  };
}

/**
 * Deploy complete rwaStaking ecosystem optimized for testing and Sepolia deployment
 */
export async function deployRWAStakingEcosystem(
  signers: SignerWithAddress[],
): Promise<rwaStakingFixtureData> {
  const [deployer, treasury] = signers;

  console.log("🚀 Deploying rwaStaking ecosystem for testing...");

  const gasUsed: any = {};
  const currentTimestamp = Math.floor(Date.now() / 1000);

  // Configuration constants
  const config = {
    TOKEN_DECIMALS: 18,
    ONE_YEAR_SECONDS: 365 * 24 * 60 * 60,
    HUNDRED_PERCENT_BPS: 10000,
    MAX_UINT128: ethers.toBigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"), 
    SAFE_TIMESTAMP: currentTimestamp,
  };

  // Step 1: Deploy TPT Token as upgradeable contract with UUPS proxy (production pattern)
  console.log("📦 Step 1: Deploying TokenizinToken...");  
  const { token: tokenizinToken, proxyAddress } = await deployTokenizinTokenUpgradeable(deployer, {
    minBalance: ethers.parseEther("3000000"), // 3M tokens minimum for testing
  });
  
  // NOTE: TokenizinToken upgradeable version doesn't have updateTaxRates or setMaxWalletExemption
  // Tax and max wallet functionality is not implemented in the upgradeable version
  
  gasUsed.tokenizinToken = (await tokenizinToken.deploymentTransaction())?.gasLimit;
  console.log(`✅ TPT Token deployed: ${proxyAddress}`);

  // Step 2: Deploy RewardDistributor directly (not via proxy) - contracts are not upgradeable
  // Direct deployment ensures deployer is the admin
  console.log("📦 Step 2: Deploying RWARewardDistributor...");
  const RWARewardDistributorFactory = await ethers.getContractFactory(
    "RWARewardDistributor",
  );
  const rewardDistributor = await RWARewardDistributorFactory.deploy(
    await tokenizinToken.getAddress(),
    treasury.address,
    ethers.parseEther("1000"), // initial reward pool
  );
  await rewardDistributor.waitForDeployment();
  gasUsed.rewardDistributor = (await rewardDistributor.deploymentTransaction())?.gasLimit;
  console.log("✅ RewardDistributor deployed:", await rewardDistributor.getAddress());

  // Step 3: Deploy RWARevenue directly (not via proxy) - contracts are not upgradeable
  // Direct deployment ensures deployer is the admin
  console.log("📦 Step 3: Deploying RWARevenue...");
  const rwaRevenueFactory = await ethers.getContractFactory("RWARevenue");
  const rwaRevenue = await rwaRevenueFactory.deploy(
    await tokenizinToken.getAddress(),
    await rewardDistributor.getAddress(),
  );
  await rwaRevenue.waitForDeployment();
  gasUsed.rwaRevenue = (await rwaRevenue.deploymentTransaction())?.gasLimit;
  console.log("✅ rwaRevenue deployed:", await rwaRevenue.getAddress());

  // Step 4: Deploy RWAStaking directly (not upgradeable, uses constructor)
  console.log("📦 Step 4: Deploying RWAStaking...");
  const rwaStakingFactory = await ethers.getContractFactory("RWAStaking");
  
  // Ensure all addresses are valid before deploying
  const tokenizinTokenAddress = await tokenizinToken.getAddress();
  const rewardDistributorAddr = await rewardDistributor.getAddress();
  const rwaRevenueAddr = await rwaRevenue.getAddress();
  if (!tokenizinTokenAddress || !rewardDistributorAddr || !rwaRevenueAddr) {
    throw new Error("Invalid contract addresses for RWAStaking deployment");
  }
  
  const rwaStaking = await rwaStakingFactory.deploy(
    tokenizinTokenAddress, // _tokenizinToken
    rwaRevenueAddr, // _rwaRevenue
    rewardDistributorAddr, // _rewardDistributor
  );
  await rwaStaking.waitForDeployment();
  
  // Ensure tigerStaking is properly initialized
  if (!rwaStaking) {
    throw new Error("tigerStaking contract failed to initialize");
  }
  gasUsed.rwaStaking =
    (await rwaStaking.deploymentTransaction())?.gasLimit;
  console.log(
    "✅ RWAStaking deployed:",
    await rwaStaking.getAddress(),
  );

  // Step 5: Initialize contracts with proper interface
  console.log("🔧 Step 5: Initializing contracts...");

  // Initialize RWARevenue with staking address
  await rwaRevenue.initialize(
    await rwaStaking.getAddress(), // _rwaStaking
  );

  // Step 6: Setup token permissions and funding
  console.log("🔧 Step 6: Configuring permissions and funding...");

  // NOTE: TigerPalaceToken upgradeable version doesn't have setMaxWalletExemption or setTaxExemption
  // Max wallet and tax functionality is not implemented in the upgradeable version
  // Transfers will work normally without exemptions
  
  const rewardDistributorAddress = await rewardDistributor.getAddress();

  // Fund RewardDistributor with sufficient tokens
  const rewardFunding = ethers.parseEther("1000000"); // 1M RWATGR
  await tokenizinToken.transfer(rewardDistributorAddress, rewardFunding);

  // Note: RWARewardDistributor doesn't have approveERC20 function
  // Tokens are transferred directly to contracts that need them

  // Get pool information
  // getStats() returns (uint256 _totalStaked, uint256 _totalRewardsDistributed, uint256 _poolCount)
  const [totalStaked, totalRewardsDistributed, poolCount] = await rwaStaking.getStats();
  // Pools start at ID 1 (not 0) because nextPoolId starts at 1
  const defaultPoolId = poolCount > 0n ? 1 : -1;

  console.log("✅ rwaStaking ecosystem deployed and configured!");
  console.log(
    `📊 Default pool created: ${
      defaultPoolId >= 0 ? "Yes" : "No"
    } (ID: ${defaultPoolId})`,
  );

  // Apply compatibility wrapper for legacy function names
  const wrapped = applyCompatibilityWrapper({
    tokenizinToken: tokenizinToken,
    rewardDistributor,
    RWAStaking: rwaStaking,
    rwaRevenue: rwaRevenue,
  });

  // Ensure wrapped contracts are valid
  if (!wrapped.RWAStaking && !rwaStaking) {
    throw new Error("rwaStaking contract is null after wrapping");
  }

  return {
    tokenizinToken,
    rewardDistributor,
    rwaStaking: wrapped.RWAStaking || rwaStaking, // Use wrapped version if available, fallback to original
    rwaRevenue: wrapped.rwaRevenue || rwaRevenue, // Use wrapped version if available, fallback to original
    deploymentInfo: {
      network: "test",
      timestamp: Date.now(),
      gasUsed,
      poolCount: Number(poolCount),
      defaultPoolId,
    },
    config,
  };
}

/**
 * Setup optimized test environment for RWAStaking
 */
export async function setupRWAStakingTestEnvironment(
  fixtureData: rwaStakingFixtureData,
  users: SignerWithAddress[],
  options: {
    fundingAmount?: any;
    setupApprovals?: boolean;
    approvalAmount?: any;
    excludeFromFees?: boolean;
  } = {},
) {
  const {
    fundingAmount = ethers.parseEther("100000"),
    setupApprovals = true,
    approvalAmount = ethers.MaxUint256,
    excludeFromFees = true,
  } = options;

  console.log("🔧 Setting up RWAStaking test environment...");

  // Fund and configure users
  for (const user of users) {
    // NOTE: TokenizinToken upgradeable version doesn't have setMaxWalletExemption or setTaxExemption
    // Max wallet and tax functionality is not implemented in the upgradeable version
    // Transfers will work normally without exemptions

    // Fund user with test tokens
    await fixtureData.tokenizinToken.transfer(user.address, fundingAmount);

    // Setup approvals for staking
    if (setupApprovals) {
      await fixtureData.tokenizinToken
        .connect(user)
        .approve(await fixtureData.rwaStaking.getAddress(), approvalAmount);
    }
  }

  console.log(`✅ Test environment setup completed for ${users.length} users!`);
}

/**
 * Create production-ready pools for testing
 */
export async function createTestPools(
  fixtureData: rwaStakingFixtureData,
  deployer: SignerWithAddress,
): Promise<number[]> {
  console.log("🏊 Creating test pools...");

  const { rwaStaking, config } = fixtureData;
  const poolIds: number[] = [];

  // Pool 1: High apy Short Term Pool
  // createPool(name, duration, multiplier) - multiplier in basis points
  const pool1Tx = await rwaStaking.connect(deployer).createPool(
    "High APY Short Term Pool",
    1, // Minimum duration (1 second)
    150000, // 1500% multiplier in basis points (15% APY)
    ethers.parseEther("100"), // minStake: 100 TPT
  );
  await pool1Tx.wait();

  // Pool 2: Low apy Long Term Pool
  const pool2Tx = await rwaStaking.connect(deployer).createPool(
    "Low APY Long Term Pool",
    90 * 24 * 60 * 60, // 90 days
    80000, // 800% multiplier in basis points (8% APY)
    ethers.parseEther("100"), // minStake: 100 TPT
  );
  await pool2Tx.wait();

  // Pool 3: Testing Pool with Short Durations
    const pool3Tx = await rwaStaking.connect(deployer).createPool(
    "Testing Pool Short Duration",
    1, // Minimum duration
    200000, // 2000% multiplier in basis points (20% APY)
    ethers.parseEther("100"), // minStake: 100 TPT
  );
  await pool3Tx.wait();

  // Get pool count to determine created pool IDs
  // getStats() returns (uint256 _totalStaked, uint256 _totalRewardsDistributed, uint256 _poolCount)
  const [, , currentPoolCount] = await rwaStaking.getStats();
  const startingPoolId = fixtureData.deploymentInfo.poolCount + 1; // Pools start at 1

  for (let i = startingPoolId; i <= Number(currentPoolCount); i++) {
    poolIds.push(i);
  }

  console.log(
    `✅ Created ${poolIds.length} test pools: [${poolIds.join(", ")}]`,
  );
  return poolIds;
}

/**
 * Verify deployment integrity
 */
export async function verifyrwaStakingDeployment(
  fixtureData: rwaStakingFixtureData,
): Promise<boolean> {
  try {
    console.log("🔍 Verifying rwaStaking deployment...");

    const { tokenizinToken, rewardDistributor, rwaStaking, rwaRevenue } =
      fixtureData;

    // Check tigerStaking configuration
    // These are public state variables (accessible as properties/functions)
    const acceptedToken = await rwaStaking.tokenizinToken();
    const rewardDistributorAddr =
      await rwaStaking.rewardDistributorAddress();
    const rwaRevenueAddr = await rwaStaking.rwaRevenueAddress();

    // Check tigerRevenue configuration
    const rwaMultiAddr = await rwaRevenue.rwaMulti();

    // Verify cross-references
    const tokenizinTokenAddress = await tokenizinToken.getAddress();
    const rewardDistributorAddress = await rewardDistributor.getAddress();
    const rwaRevenueAddress = await rwaRevenue.getAddress();  
    const rwaStakingAddress = await rwaStaking.getAddress();
    
    const isValid =
      acceptedToken === tokenizinTokenAddress &&
      rewardDistributorAddr === rewardDistributorAddress &&
      rwaRevenueAddr === rwaRevenueAddress &&
      rwaMultiAddr === rwaStakingAddress;

    if (isValid) {
      console.log("✅ Deployment verification: PASSED");
      console.log(`  • Token: ${acceptedToken}`);
      console.log(`  • RewardDistributor: ${rewardDistributorAddr}`);
      console.log(`  • rwaRevenue: ${rwaRevenueAddr}`);
    } else {
      console.error("❌ Deployment verification: FAILED");
    }

    return isValid;
  } catch (error) {
    console.error("❌ Deployment verification failed:", error);
    return false;
  }
}

// Test configuration constants
export const RWA_TEST_CONFIG = {
  FUNDING_AMOUNTS: {
    SMALL: ethers.parseEther("1000"),
    MEDIUM: ethers.parseEther("10000"),
    LARGE: ethers.parseEther("100000"),
    MEGA: ethers.parseEther("1000000"),
  },
  STAKE_AMOUNTS: {
    MIN: ethers.parseEther("100"),
    STANDARD: ethers.parseEther("1000"),
    LARGE: ethers.parseEther("10000"),
    WHALE: ethers.parseEther("100000"),
  },
  TIME_CONSTANTS: {
    MINUTE: 60,
    HOUR: 60 * 60,
    DAY: 24 * 60 * 60,
    WEEK: 7 * 24 * 60 * 60,
    MONTH: 30 * 24 * 60 * 60,
    YEAR: 365 * 24 * 60 * 60,
  },
  APY_VALUES: {
    LOW: 500, // 5%
    MEDIUM: 1000, // 10%
    HIGH: 1500, // 15%
    EXTREME: 2000, // 20%
  },
  GAS_SETTINGS: {
    DEPLOYMENT: {
      gasLimit: 8000000,
      maxFeePerGas: ethers.parseUnits("50", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
    },
    OPERATIONS: {
      gasLimit: 500000,
      maxFeePerGas: ethers.parseUnits("30", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
    },
  },
};
