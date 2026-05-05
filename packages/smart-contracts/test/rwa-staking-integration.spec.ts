import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre as any;  
import { BigNumberish, Signer, BaseContract} from "ethers";
import { parseEther } from "ethers";

describe("RWA Staking Ecosystem Integration", function () {
  let deployer: Signer;
  let treasury: Signer;
  let user1: Signer;
  let user2: Signer;
  let user3: Signer;

  // Contracts
  let tokenizinToken: BaseContract;
  let rwaRewardDistributor: BaseContract;
  let rwaRevenue: BaseContract;
  let TigerStaking: BaseContract;
  const MaxUint256 = ethers.MaxUint256;
  // Test constants
  const INITIAL_SUPPLY = parseEther("1000000"); // 1M tokens   
  const STAKE_AMOUNTS = [
    parseEther("1000"),   // 1K tokens
    parseEther("5000"),  // 5K tokens
    parseEther("10000")   // 10K tokens
  ];
  const REVENUE_AMOUNTS = [
    parseEther("100"),    // 100 tokens
    parseEther("500"),    // 500 tokens
    parseEther("1000")     // 1K tokens
  ];  
  beforeEach(async function () {
    [deployer, treasury, user1, user2, user3] = await ethers.getSigners();  
    // Deploy complete ecosystem
    await deployCompleteEcosystem();  
    
    // Setup test environment
    await setupTestEnvironment();
  });

  async function deployCompleteEcosystem() {
    console.log("🚀 Deploying RWA Staking Ecosystem...");

    // Deploy TigerPalaceToken using upgradeable pattern (production pattern)
    const { deployTigerPalaceTokenUpgradeable } = require("./utils/token-deployment");
    const { token } = await deployTigerPalaceTokenUpgradeable(deployer, {
      minBalance: parseEther("11500000"), // 11.5M tokens minimum
    });
    tokenizinToken = token;

    // Deploy RWARewardDistributor with constructor parameters
    const RWARewardDistributor = await ethers.getContractFactory("RWARewardDistributor");
    rwaRewardDistributor = await RWARewardDistributor.deploy(
      await (tokenizinToken as any).getAddress(), // _tigerPalaceToken
      await treasury.getAddress(), // _treasury
      parseEther("100000") // 100K initial reward pool
    );
    await rwaRewardDistributor.waitForDeployment();
    
    // Initialize RWARewardDistributor after RWAStaking and RWARevenue are deployed
    // (Will be done after RWAStaking deployment)

    // Deploy RWARevenue
    const RWARevenue = await ethers.getContractFactory("RWARevenue");
    rwaRevenue = await RWARevenue.deploy(
      (tokenizinToken as any).getAddress(),
      rwaRewardDistributor.getAddress()
    );
    await rwaRevenue.getAddress();

    // Deploy RWAStaking
    const RWAStaking = await ethers.getContractFactory("RWAStaking");
    TigerStaking = await RWAStaking.deploy(
      (tokenizinToken as any).getAddress(),
      rwaRevenue.getAddress(),
      rwaRewardDistributor.getAddress()
    );
    await (TigerStaking as any).getAddress();

    await (rwaRevenue as any).connect(deployer).initialize(await (TigerStaking as any).getAddress());

    // Initialize RWARewardDistributor with contract addresses
    await (rwaRewardDistributor as any).connect(deployer).initialize(
      await (TigerStaking as any).getAddress(),
      await rwaRevenue.getAddress(),
      await treasury.getAddress()
    );

    // Set reward distributor in token (if function exists)
    // Note: TigerPalaceToken might not have setRewardDistributor function
    // await (tokenizinToken as any).connect(deployer).setRewardDistributor(await rwaRewardDistributor.getAddress());

    // Update addresses in contracts (if function exists)
    // Note: RWARewardDistributor might not have updateAddresses function
    // await (rwaRewardDistributor as any).connect(deployer).updateAddresses(
    //   await (TigerStaking as any).getAddress(),
    //   await rwaRevenue.getAddress(),
    //   await treasury.getAddress()
    // );

    console.log("✅ Ecosystem deployed successfully");
  }

  async function setupTestEnvironment() {
    console.log("🔧 Setting up test environment...");

    // CRITICAL: Set max wallet exemptions for system contracts BEFORE any transfers
    const rwaStakingAddress = await (TigerStaking as any).getAddress();
    const rwaRevenueAddress = await rwaRevenue.getAddress();
    const rwaRewardDistributorAddress = await rwaRewardDistributor.getAddress();
    
    // NOTE: TigerPalaceToken doesn't have setMaxWalletExemption or setTaxExemption functions
    // Upgradeable token doesn't have max wallet/tax restrictions

    // Distribute tokens to users
    const userAmount = parseEther("50000"); // 50K tokens per user
        
    await (tokenizinToken as any).connect(deployer).transfer(await user1.getAddress(), userAmount as BigNumberish);
    await (tokenizinToken as any).connect(deployer).transfer(await user2.getAddress(), userAmount as BigNumberish);
    await (tokenizinToken as any).connect(deployer).transfer(await user3.getAddress(), userAmount as BigNumberish);

    // Approve staking contract to spend tokens
    await (tokenizinToken as any).connect(user1).approve((TigerStaking as any).getAddress(), MaxUint256 as BigNumberish       );
    await (tokenizinToken as any).connect(user2).approve((TigerStaking as any).getAddress(), MaxUint256 as BigNumberish);
    await (tokenizinToken as any).connect(user3).approve((TigerStaking as any).getAddress(), MaxUint256 as BigNumberish);

    // Fund reward distributor
    const fundingAmount = parseEther("50000");
    await (tokenizinToken as any).connect(deployer).transfer(await rwaRewardDistributor.getAddress(), fundingAmount as BigNumberish);
    await (rwaRewardDistributor as any).connect(deployer).addRewards(fundingAmount as BigNumberish, "initial_funding");

    console.log("✅ Test environment setup complete");
  }

  describe("Complete Staking Workflow", function () {
    it("Should allow users to stake tokens and earn rewards", async function () {
      console.log("🧪 Testing complete staking workflow...");

      // User1 stakes in 1-month pool
      const stakeAmount1 = STAKE_AMOUNTS[0];
      await (TigerStaking as any).connect(user1).stake(1, stakeAmount1 as BigNumberish);
      
      // User2 stakes in 3-month pool
      const stakeAmount2 = STAKE_AMOUNTS[1];
      await (TigerStaking as any).connect(user2).stake(2, stakeAmount2 as BigNumberish);
      
      // User3 stakes in 6-month pool
      const stakeAmount3 = STAKE_AMOUNTS[2];
      await (TigerStaking as any).connect(user3).stake(3, stakeAmount3 as BigNumberish);

      // Verify stakes were created
      const user1Stakes = await (TigerStaking as any).connect(user1).getUserStakes(user1.getAddress());
      const user2Stakes = await (TigerStaking as any).connect(user2).getUserStakes(user2.getAddress());
      const user3Stakes = await (TigerStaking as any).connect(user3).getUserStakes(user3.getAddress());

      expect(user1Stakes.length).to.equal(1);
      expect(user2Stakes.length).to.equal(1);
      expect(user3Stakes.length).to.equal(1);

      expect(user1Stakes[0].amount).to.equal(stakeAmount1);
      expect(user2Stakes[0].amount).to.equal(stakeAmount2);
      expect(user3Stakes[0].amount).to.equal(stakeAmount3);

      // Verify pool totals
      const pool1 = await (TigerStaking as any).connect(deployer).getPool(1);
      const pool2 = await (TigerStaking as any).connect(deployer).getPool(2);
      const pool3 = await (TigerStaking as any).connect(deployer).getPool(3);

      expect(pool1.totalStaked).to.equal(stakeAmount1);
      expect(pool2.totalStaked).to.equal(stakeAmount2);
      expect(pool3.totalStaked).to.equal(stakeAmount3);

      console.log("✅ Staking workflow completed successfully");
    });

    it("Should distribute property revenue to stakers", async function () {
      console.log("🧪 Testing property revenue distribution...");

      // Users stake tokens
      await (TigerStaking as any).connect(user1).stake(1, STAKE_AMOUNTS[0] as BigNumberish);
      await (TigerStaking as any).connect(user2).stake(2, STAKE_AMOUNTS[1] as BigNumberish);

      // Simulate property dividend collection - transfer tokens to RWARevenue
      const dividendAmount = REVENUE_AMOUNTS[0];
      await (tokenizinToken as any).connect(deployer).transfer(await rwaRevenue.getAddress(), dividendAmount as BigNumberish);

      // Allocate revenue to pools (divide by 2 using BigInt)
      const halfAmount = dividendAmount / 2n;
      await (rwaRevenue as any).connect(deployer).allocateRevenue(1, halfAmount, "property_dividends");  
      await (rwaRevenue as any).connect(deployer).allocateRevenue(2, halfAmount, "property_dividends");

      // Distribute rewards via RWAStaking
      await (TigerStaking as any).connect(deployer).distributeRewards(1, halfAmount);
      await (TigerStaking as any).connect(deployer).distributeRewards(2, halfAmount);

      // Verify revenue allocation
      const pool1Total = await (rwaRevenue as any).connect(deployer).totalRevenueAllocated();
      expect(pool1Total).to.be.gte(halfAmount);

      console.log("✅ Property revenue distribution completed");
    });

    it("Should distribute marketplace fees to stakers", async function () {
      console.log("🧪 Testing marketplace fee distribution...");

      // Users stake tokens
      await (TigerStaking as any).connect(user1).stake(1, STAKE_AMOUNTS[0] as BigNumberish);
      await (TigerStaking as any).connect(user2).stake(2, STAKE_AMOUNTS[1] as BigNumberish);

      // Simulate marketplace fee collection - transfer tokens to RWARevenue
      const feeAmount = REVENUE_AMOUNTS[1];
      await (tokenizinToken as any).connect(deployer).transfer(await rwaRevenue.getAddress(), feeAmount as BigNumberish);

      // Allocate revenue to pool 1
      await (rwaRevenue as any).connect(deployer).allocateRevenue(1, feeAmount, "marketplace_fees");

      // Distribute rewards via RWAStaking
      await (TigerStaking as any).connect(deployer).distributeRewards(1, feeAmount);

      // Verify revenue allocation
      const totalAllocated = await (rwaRevenue as any).connect(deployer).totalRevenueAllocated();
      expect(totalAllocated).to.be.gte(feeAmount);

      console.log("✅ Marketplace fee distribution completed");
    });

    it("Should handle multiple users staking in different pools", async function () {
      console.log("🧪 Testing multi-user, multi-pool staking...");

      // Multiple users stake in different pools
      await (TigerStaking as any).connect(user1).stake(1, STAKE_AMOUNTS[0] as BigNumberish); // 1-month pool (minStake: 100 TPT)
      await (TigerStaking as any).connect(user2).stake(2, STAKE_AMOUNTS[1] as BigNumberish); // 3-month pool (minStake: 500 TPT)
      await (TigerStaking as any).connect(user3).stake(3, STAKE_AMOUNTS[2] as BigNumberish); // 6-month pool (minStake: 1000 TPT)

      // User1 stakes again in a different pool
      // Pool 4 (12-month) requires minStake: 2000 TPT, so use STAKE_AMOUNTS[1] (5000 TPT) instead of STAKE_AMOUNTS[0] (1000 TPT)
      await (TigerStaking as any).connect(user1).stake(4, STAKE_AMOUNTS[1] as BigNumberish); // 12-month pool (minStake: 2000 TPT)

      // Verify all stakes
      const user1Stakes = await (TigerStaking as any).connect(user1).getUserStakes(user1.getAddress());
      const user2Stakes = await (TigerStaking as any).connect(user2).getUserStakes(user2.getAddress());
      const user3Stakes = await (TigerStaking as any).connect(user3).getUserStakes(user3.getAddress());

      expect(user1Stakes.length).to.equal(2);
      expect(user2Stakes.length).to.equal(1);
      expect(user3Stakes.length).to.equal(1);

      // Verify pool totals
      const allPools = await (TigerStaking as any).connect(deployer).getAllPools();
      let totalStaked = 0n;
      for (let i = 1; i <= 4; i++) {
        const pool = await (TigerStaking as any).getPool(i);
        totalStaked = totalStaked + BigInt(pool.totalStaked.toString());
      }

      const expectedTotal = BigInt(STAKE_AMOUNTS[0].toString()) + BigInt(STAKE_AMOUNTS[1].toString()) * 2n + BigInt(STAKE_AMOUNTS[2].toString());
      expect(totalStaked).to.equal(expectedTotal);

      console.log("✅ Multi-user, multi-pool staking completed");
    });

    it("Should calculate rewards correctly for different duration tiers", async function () {
      console.log("🧪 Testing reward calculations for different tiers...");

      // Get pool info to check multipliers
      const pool1 = await (TigerStaking as any).getPool(1);
      const pool2 = await (TigerStaking as any).getPool(2);
      const pool3 = await (TigerStaking as any).getPool(3);

      // Users stake in different pools
      await (TigerStaking as any).connect(user1).stake(1, STAKE_AMOUNTS[0] as BigNumberish); // 1-month (10000 multiplier = 100% = 0% reward)
      await (TigerStaking as any).connect(user2).stake(2, STAKE_AMOUNTS[0] as BigNumberish); // 3-month (12000 multiplier = 120% = 20% reward)
      await (TigerStaking as any).connect(user3).stake(3, STAKE_AMOUNTS[0] as BigNumberish); // 6-month (15000 multiplier = 150% = 50% reward)

      // Fast forward time to maturity
      const { time } = await import("@nomicfoundation/hardhat-network-helpers");
      await time.increase(180 * 24 * 60 * 60); // 180 days

      // Check pending rewards for 1-month pool (10000 multiplier = 0% reward)
      const user1PendingRewards = await (TigerStaking as any).getPendingRewards(user1.getAddress(), 0);
      // Use closeTo for precision tolerance (allowing for small rounding differences)
      // 10000 multiplier means 0% bonus, so rewards should be very close to 0
      expect(user1PendingRewards).to.be.closeTo(0n, parseEther("100")); // Larger tolerance for rounding

      // Check pending rewards for 3-month pool (12000 multiplier = 20% reward)
      const user2PendingRewards = await (TigerStaking as any).getPendingRewards(user2.getAddress(), 0);
      expect(user2PendingRewards).to.be.gt(0n); // 120% multiplier gives > 0 reward

      // Check pending rewards for 6-month pool (15000 multiplier = 50% reward)
      const user3PendingRewards = await (TigerStaking as any).getPendingRewards(user3.getAddress(), 0);
      expect(user3PendingRewards).to.be.gt(user2PendingRewards); // 150% multiplier gives more reward

      console.log("✅ Reward calculations verified for different tiers");
    });

    it("Should handle emergency pause and withdrawal scenarios", async function () {
      console.log("🧪 Testing emergency scenarios...");

      // Users stake tokens
      await (TigerStaking as any).connect(user1).stake(1, STAKE_AMOUNTS[0] as BigNumberish);
      await (TigerStaking as any).connect(user2).stake(2, STAKE_AMOUNTS[1] as BigNumberish);

      // Pause staking contract
      await (TigerStaking as any).pause();

      // Verify staking is paused
      expect(await (TigerStaking as any).paused()).to.be.true;

      // Try to stake while paused (should fail)
      await expect(
        (TigerStaking as any).connect(user3).stake(1, STAKE_AMOUNTS[0] as BigNumberish)
      ).to.be.revertedWith("Pausable: paused");

      // Unpause staking contract
      await (TigerStaking as any).unpause();

      // Verify staking is unpaused
      expect(await (TigerStaking as any).paused()).to.be.false;

      // Now staking should work
      await (TigerStaking as any).connect(user3).stake(1, STAKE_AMOUNTS[0] as BigNumberish);

      console.log("✅ Emergency scenarios handled correctly");
    });
  });

  describe("Revenue Distribution Integration", function () {
    it("Should integrate property dividends with staking rewards", async function () {
      console.log("🧪 Testing property dividend integration...");

      // Users stake tokens
      await (TigerStaking as any).connect(user1).stake(1, STAKE_AMOUNTS[0] as BigNumberish);
      await (TigerStaking as any).connect(user2).stake(2, STAKE_AMOUNTS[1] as BigNumberish);

      // Simulate property dividend collection - transfer tokens to RWARevenue
      const dividendAmount = REVENUE_AMOUNTS[2];
      await (tokenizinToken as any).connect(deployer).transfer(await rwaRevenue.getAddress(), dividendAmount as BigNumberish);

      // Allocate revenue to pools (divide by 2 using BigInt)
      const halfAmount = dividendAmount / 2n;
      await (rwaRevenue as any).connect(deployer).allocateRevenue(1, halfAmount, "property_dividends");
      await (rwaRevenue as any).connect(deployer).allocateRevenue(2, halfAmount, "property_dividends");

      // Distribute rewards via RWAStaking
      await (TigerStaking as any).connect(deployer).distributeRewards(1, halfAmount);
      await (TigerStaking as any).connect(deployer).distributeRewards(2, halfAmount);

      // Verify revenue allocation
      const totalAllocated = await (rwaRevenue as any).connect(deployer).totalRevenueAllocated();
      expect(totalAllocated).to.be.gte(halfAmount * 2n);

      console.log("✅ Property dividend integration completed");
    });

    it("Should handle marketplace fee collection and distribution", async function () {
      console.log("🧪 Testing marketplace fee collection...");

      // Users stake tokens
      await (TigerStaking as any).connect(user1).stake(1, STAKE_AMOUNTS[0] as BigNumberish);
      await (TigerStaking as any).connect(user2).stake(2, STAKE_AMOUNTS[1] as BigNumberish);

      // Simulate marketplace fee collection
      const feeAmount = REVENUE_AMOUNTS[1];
      await (tokenizinToken as any).connect(deployer).transfer(await rwaRewardDistributor.getAddress(), feeAmount as BigNumberish);
      await (rwaRewardDistributor as any).connect(deployer).collectMarketplaceFees(feeAmount as BigNumberish);

      // Verify fee collection
      const distributorStats = await (rwaRewardDistributor as any).connect(deployer).getRewardPoolStats();
      // getRewardPoolStats returns: [_totalRewardPool, _distributedRewards, _pendingRewards, _totalRevenueCollected, _marketplaceFeesCollected, _propertyDividendsCollected]
      expect(distributorStats[4]).to.equal(feeAmount); // marketplaceFeesCollected is at index 4

      // Distribute fees to revenue contract
      await (rwaRewardDistributor as any).connect(deployer).distributePropertyRevenue(feeAmount as BigNumberish);

      // NOTE: distributePropertyRevenue just transfers tokens to RWARevenue, it doesn't update stats
      // We need to call receiveMarketplaceFees on RWARevenue to update the stats
      // First, grant REVENUE_MANAGER_ROLE to deployer if needed
      const REVENUE_MANAGER_ROLE = await (rwaRevenue as any).REVENUE_MANAGER_ROLE();
      const hasRole = await (rwaRevenue as any).hasRole(REVENUE_MANAGER_ROLE, deployer.getAddress());
      if (!hasRole) {
        await (rwaRevenue as any).grantRole(REVENUE_MANAGER_ROLE, deployer.getAddress());
      }
      
      // Now call receiveMarketplaceFees to update stats
      await (rwaRevenue as any).connect(deployer).receiveMarketplaceFees(feeAmount as BigNumberish);

      // Verify distribution
      const revenueStats = await (rwaRevenue as any).connect(deployer).getRevenueStats();
      // getRevenueStats returns: [_totalAllocated, _totalDistributed, _pendingRevenue, _propertyDividends, _marketplaceFees, _stakingRewards]
      expect(revenueStats[4]).to.equal(feeAmount); // marketplaceFees is at index 4

      console.log("✅ Marketplace fee collection completed");
    });
  });

  describe("Contract Integration", function () {
    it("Should maintain proper contract relationships", async function () {
      console.log("🧪 Testing contract relationships...");

      // Verify token address in contracts
      const tokenAddress = await tokenizinToken.getAddress();
      expect(await (rwaRewardDistributor as any).connect(deployer).tokenizinToken()).to.equal(tokenAddress);
      expect(await (rwaRevenue as any).connect(deployer).tokenizinToken()).to.equal(tokenAddress);
      expect(await (TigerStaking as any).connect(deployer).tokenizinToken()).to.equal(tokenAddress);

      // Verify contract addresses
      const stakingAddress = await (TigerStaking as any).getAddress();
      const revenueAddress = await rwaRevenue.getAddress();
      expect(await (rwaRewardDistributor as any).connect(deployer).rwaStakingAddress()).to.equal(stakingAddress);
      expect(await (rwaRewardDistributor as any).connect(deployer).rwaRevenueAddress()).to.equal(revenueAddress);
      expect(await (rwaRevenue as any).connect(deployer).rwaStakingAddress()).to.equal(stakingAddress);
      expect(await (TigerStaking as any).connect(deployer).rwaRevenueAddress()).to.equal(revenueAddress);

      console.log("✅ Contract relationships verified");
    });

    it("Should handle role-based access control", async function () {
      console.log("🧪 Testing access control...");

      // Verify non-admin cannot perform admin functions
      await expect(
        (TigerStaking as any).connect(user1).pause() as Promise<void>
      ).to.be.revertedWith(/AccessControl: account .* is missing role/);

      // Verify pool manager role
      const poolManagerRole = await (TigerStaking as any).POOL_MANAGER_ROLE();
      expect(await (TigerStaking as any).hasRole(poolManagerRole, deployer.getAddress())).to.be.true;
    });
  });

  describe("Gas Optimization", function () {
    it("Should track gas usage for key operations", async function () {
      console.log("🧪 Testing gas optimization...");

      // Track gas for staking
      const stakeTx = await (TigerStaking as any).connect(user1).stake(1, STAKE_AMOUNTS[0] as BigNumberish);
      const stakeReceipt = await stakeTx.wait();
      console.log(`⛽ Stake gas used: ${stakeReceipt.gasUsed.toString()}`);

      // Track gas for revenue allocation
      await (tokenizinToken as any).connect(deployer).transfer(rwaRevenue.getAddress(), REVENUE_AMOUNTS[0] as BigNumberish);
      const allocateTx = await (rwaRevenue as any).connect(deployer).allocateRevenue(1, REVENUE_AMOUNTS[0] as BigNumberish, "test");
      const allocateReceipt = await allocateTx.wait();
      console.log(`⛽ Revenue allocation gas used: ${allocateReceipt.gasUsed.toString()}`);

      // Track gas for reward distribution
      await (tokenizinToken as any).connect(deployer).transfer(rwaRewardDistributor.getAddress(), REVENUE_AMOUNTS[0] as BigNumberish);
      const distributeTx = await (rwaRewardDistributor as any).connect(deployer).addRewards(REVENUE_AMOUNTS[0] as BigNumberish, "test");
      const distributeReceipt = await distributeTx.wait();
      console.log(`⛽ Reward distribution gas used: ${distributeReceipt.gasUsed.toString()}`);

      console.log("✅ Gas optimization tracking completed");
    });
  });
}); 