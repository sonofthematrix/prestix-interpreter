import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import {
  deployCompleteEcosystemWithProxies,
  setupProxyTestEnvironment,
  ProxyFixtureData,
} from "./utils/proxy-fixture";

describe("🚨TigerStaking - Error Handling & Emergency Functions", function () {
  let fixtureData: ProxyFixtureData;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let treasury: SignerWithAddress;
  let nonOwner: SignerWithAddress;

  async function deployContractsFixture() {
    const signers = await ethers.getSigners();
    [owner, user1, user2, treasury, nonOwner] = signers;

    // Deploy complete ecosystem with proxy pattern
    const fixture = await deployCompleteEcosystemWithProxies(signers);

    // Setup test environment for users
    await setupProxyTestEnvironment(fixture, [user1, user2, nonOwner], {
      fundingAmount: ethers.parseEther("10000"),
      setupApprovals: true,
    });

    return {
      fixtureData: fixture,
      owner,
      user1,
      user2,
      treasury,
      nonOwner,
    };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployContractsFixture);
    fixtureData = fixture.fixtureData;
    owner = fixture.owner;
    user1 = fixture.user1;
    user2 = fixture.user2;
    treasury = fixture.treasury;
    nonOwner = fixture.nonOwner;
  });

  describe("🔐 Access Control Error Handling", function () {
    it("Should revert when non-owner tries to create pool", async function () {
      await expect(
        fixtureData.TigerStaking
          .connect(nonOwner)
          .createPool("Pool 1", 86400, 12000, ethers.parseEther("100")), // duration in seconds, multiplier in basis points, minStake
      ).to.be.reverted;
    });

    it("Should revert when non-owner tries to create another pool", async function () {
      // Create pool first
      await fixtureData.TigerStaking.createPool(
        "Pool 1",
        86400, // 1 day
        12000, // 120% multiplier (12000 basis points)
        ethers.parseEther("100"), // minStake: 100 TPT
      );

      await expect(
        fixtureData.TigerStaking
          .connect(nonOwner)
          .createPool("Pool 2", 86400, 15000, ethers.parseEther("100")),
      ).to.be.reverted;
    });

    it("Should revert when non-owner tries to update addresses", async function () {
      await expect(
        fixtureData.TigerStaking
          .connect(nonOwner)
          .updateAddresses(user1.address, user2.address),
      ).to.be.reverted;
    });

    it("Should revert when non-owner tries to pause", async function () {
      await expect(fixtureData.TigerStaking.connect(nonOwner).pause()).to.be
        .reverted;
    });

    it("Should revert when non-owner tries to unpause", async function () {
      await fixtureData.TigerStaking.pause();

      await expect(fixtureData.TigerStaking.connect(nonOwner).unpause()).to
        .be.reverted;
    });

    it("Should revert when non-owner tries to update pool config", async function () {
      // Create pool first
      await fixtureData.TigerStaking.createPool("Pool 1", 86400, 12000, ethers.parseEther("100"));
      
      await expect(
        fixtureData.TigerStaking
          .connect(nonOwner)
          .updatePoolConfig(1, true, 15000, ethers.parseEther("100")),
      ).to.be.reverted;
    });

    it("Should revert when non-owner tries to distribute rewards", async function () {
      // Create pool first
      await fixtureData.TigerStaking.createPool("Pool 1", 86400, 12000, ethers.parseEther("100"));
      
      await expect(
        fixtureData.TigerStaking
          .connect(nonOwner)
          .distributeRewards(1, ethers.parseEther("1000")),
      ).to.be.reverted;
    });
  });

  describe("🚫 Input Validation Error Handling", function () {
    it("Should revert when creating pool with invalid parameters", async function () {
      // Test zero duration
      await expect(fixtureData.TigerStaking.createPool("Pool 1", 0, 12000, ethers.parseEther("100"))).to.be
        .reverted;

      // Test zero multiplier
      await expect(
        fixtureData.TigerStaking.createPool(
          "Pool 1",
          86400,
          0,
          ethers.parseEther("100"),
        ),
      ).to.be.reverted;

      // Test multiplier below minimum (10000 = 100%)
      await expect(
        fixtureData.TigerStaking.createPool(
          "Pool 1",
          86400,
          5000, // 50% multiplier (below 100%)
          ethers.parseEther("100"),
        ),
      ).to.be.reverted;
      
      // Test zero minStake
      await expect(
        fixtureData.TigerStaking.createPool(
          "Pool 1",
          86400,
          12000,
          0, // Zero minStake should revert
        ),
      ).to.be.reverted;
    });

    it("Should revert when staking in non-existent pool", async function () {
      await expect(
        fixtureData.TigerStaking
          .connect(user1)
          .stake(999, ethers.parseEther("100")),
      ).to.be.reverted;
    });

    it("Should revert when staking zero amount", async function () {
      // Create pool first
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        86400,
        12000,
        ethers.parseEther("100"), // minStake: 100 TPT
      );

      await expect(fixtureData.TigerStaking.connect(user1).stake(1, 0))
        .to.be.reverted;
    });

    it("Should revert when claiming rewards before stake matures", async function () {
      // Create pool first
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        86400,
        12000,
        ethers.parseEther("100"), // minStake: 100 TPT
      );

      await fixtureData.TigerStaking
        .connect(user1)
        .stake(1, ethers.parseEther("200"));

      // Try to claim rewards before stake matures
      await expect(
        fixtureData.TigerStaking
          .connect(user1)
          .claimRewards(0),
      ).to.be.revertedWith("RWAStaking: stake not matured");
    });

    
  });

  describe("🎯 Pool State Error Handling", function () {
    it("Should revert operations on inactive pools", async function () {
      // Create pool
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        86400,
        12000,
        ethers.parseEther("100"), // minStake: 100 TPT
      );

      // Deactivate pool
      const pool1 = await fixtureData.TigerStaking.getPool(1);
      await fixtureData.TigerStaking.updatePoolConfig(1, false, 12000, pool1.minStake);

      // Should revert staking in inactive pool
      await expect(
        fixtureData.TigerStaking
          .connect(user1)
          .stake(1, ethers.parseEther("200")),
      ).to.be.revertedWith("RWAStaking: pool not active");
    });

    it("Should handle pool capacity limits", async function () {
      // Create pool
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        86400,
        12000,
        ethers.parseEther("100"), // minStake: 100 TPT
      );

      // First stake should work
      await fixtureData.TigerStaking
        .connect(user1)
        .stake(1, ethers.parseEther("300"));

      // Test staking behavior with multiple users
      await fixtureData.TigerStaking
        .connect(user2)
        .stake(1, ethers.parseEther("300"));
    });

    it("Should revert updating non-existent pool", async function () {
      await expect(fixtureData.TigerStaking.updatePoolConfig(999, true, 15000, ethers.parseEther("100")))
        .to.be.reverted;
    });

    it("Should handle pool info retrieval for non-existent pool", async function () {
      // getPool doesn't revert, it returns an empty struct for non-existent pools
      // Check that pool doesn't exist by verifying poolId is 0 or name is empty
      const poolInfo = await fixtureData.TigerStaking.getPool(999);
      expect(poolInfo.poolId).to.equal(0); // Non-existent pools have poolId = 0
    });
  });

  describe("💰 Revenue Operations Error Handling", function () {
    beforeEach(async function () {
      // Create pool for testing
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        86400,
        12000,
        ethers.parseEther("100"), // minStake: 100 TPT
      );
    });

    it("Should handle pending rewards queries for invalid scenarios", async function () {
      // Non-existent stake should revert
      await expect(
        fixtureData.TigerStaking.getPendingRewards(user1.address, 999)
      ).to.be.revertedWith("RWAStaking: invalid stake ID");

      // User with no stakes should revert when querying stakeId 0
      await expect(
        fixtureData.TigerStaking.getPendingRewards(user1.address, 0)
      ).to.be.revertedWith("RWAStaking: invalid stake ID");
    });
  });

  describe("🔄 Staking Operations Error Handling", function () {
    beforeEach(async function () {
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        86400,
        12000,
        ethers.parseEther("100"), // minStake: 100 TPT
      );
    });

    it("Should revert staking with insufficient token balance", async function () {
      // Try to stake more than user has
      await expect(
        fixtureData.TigerStaking
          .connect(user1)
          .stake(1, ethers.parseEther("20000")),
      ).to.be.reverted;
    });

    it("Should revert staking without token approval", async function () {
      // Reset approval
      await fixtureData.tokenizinToken
        .connect(user1)
        .approve(await fixtureData.TigerStaking.getAddress(), 0);

      await expect(
        fixtureData.TigerStaking
          .connect(user1)
          .stake(1, ethers.parseEther("200")),
      ).to.be.reverted;
    });

    it("Should handle claiming rewards with no stakes", async function () {
      await expect(
        fixtureData.TigerStaking
          .connect(user1)
          .claimRewards(0),
      ).to.be.reverted;
    });

    it("Should handle stake info queries for non-existent stakes", async function () {
      // Query stake info for user with no stakes
      await expect(
        fixtureData.TigerStaking.getUserStake(user1.address, 0),
      ).to.be.reverted;
    });

    it("Should handle user stakes queries correctly", async function () {
      // User with no stakes - getUserStakes returns an array, not a tuple
      const userStakesArray = await fixtureData.TigerStaking.getUserStakes(
        user1.address,
      );
      expect(userStakesArray.length).to.equal(0);
      
      // Calculate total staked from array
      const totalUserStaked = userStakesArray.reduce((sum: bigint, stake: any) => {
        return sum + BigInt(stake.amount.toString());
      }, 0n);
      expect(totalUserStaked).to.equal(0);
      
      // Count active stakes (not claimed and not expired)
      const currentTime = await time.latest();
      const activeStakes = userStakesArray.filter((stake: any) => {
        return !stake.claimed && Number(stake.endTime) > currentTime;
      }).length;
      expect(activeStakes).to.equal(0);
    });
  });

  describe("🚨 Emergency & Administrative Functions", function () {
    beforeEach(async function () {
      // Create pool for testing
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        86400,
        12000,
        ethers.parseEther("100"), // minStake: 100 TPT
      );
    });

    it("Should successfully pause and unpause contract", async function () {
      // Initially not paused
      expect(await fixtureData.TigerStaking.paused()).to.be.false;

      // Pause contract
      await fixtureData.TigerStaking.pause();
      expect(await fixtureData.TigerStaking.paused()).to.be.true;

      // User operations should revert when paused
      // Use revertedWith instead of revertedWithCustomError for OpenZeppelin errors
      await expect(
        fixtureData.TigerStaking
          .connect(user1)
          .stake(1, ethers.parseEther("100")),
      ).to.be.revertedWith("Pausable: paused");

      // Unpause contract
      await fixtureData.TigerStaking.unpause();
      expect(await fixtureData.TigerStaking.paused()).to.be.false;
    });

    it("Should handle address updates", async function () {
      const newRewardDistributor = user1.address;
      const newRevenue = user2.address;

      // Update addresses - note: updateAddresses takes (rwaRevenue, rewardDistributor) in that order
      await fixtureData.TigerStaking.updateAddresses(newRevenue, newRewardDistributor);

      // Verify the update directly (skip event checking due to wrapper)
      const updatedRewardDistributor = await fixtureData.TigerStaking.rewardDistributorAddress();
      const updatedRevenue = await fixtureData.TigerStaking.rwaRevenueAddress();
      
      expect(updatedRewardDistributor).to.equal(newRewardDistributor);
      expect(updatedRevenue).to.equal(newRevenue);
    });

    it("Should revert pausing when already paused", async function () {
      await fixtureData.TigerStaking.pause();

      await expect(fixtureData.TigerStaking.pause()).to.be.revertedWith("Pausable: paused");
    });

    it("Should revert unpausing when not paused", async function () {
      await expect(fixtureData.TigerStaking.unpause()).to.be.revertedWith("Pausable: not paused");
    });
  });

  describe("🎲 Pool Configuration Error Handling", function () {
    it("Should revert creating pool with invalid parameters", async function () {
      // Test zero duration
      await expect(fixtureData.TigerStaking.createPool("Pool", 0, 12000, ethers.parseEther("100"))).to.be
        .reverted;

      // Test zero multiplier
      await expect(fixtureData.TigerStaking.createPool("Pool", 86400, 0, ethers.parseEther("100"))).to.be
        .reverted;

      // Test multiplier below minimum (10000 = 100%)
      await expect(fixtureData.TigerStaking.createPool("Pool", 86400, 5000, ethers.parseEther("100"))).to.be
        .reverted;
    });

    it("Should handle pool creation and configuration", async function () {
      // Get current pool count before creating
      const [, , poolCountBefore] = await fixtureData.TigerStaking.getStats();
      const expectedPoolId = Number(poolCountBefore) + 1;
      
      // Create a pool
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        86400,
        12000,
        ethers.parseEther("100"), // minStake: 100 TPT
      );

      // Get pool info using the actual pool ID
      const poolInfo = await fixtureData.TigerStaking.getPool(expectedPoolId);
      expect(poolInfo.active).to.be.true;
      expect(poolInfo.duration).to.equal(86400);
      expect(poolInfo.multiplier).to.equal(12000);
    });

    it("Should handle updating pool configuration", async function () {
      // Get current pool count before creating
      const [, , poolCountBefore] = await fixtureData.TigerStaking.getStats();
      const expectedPoolId = Number(poolCountBefore) + 1;
      
      // Create pool first
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        86400,
        12000,
        ethers.parseEther("100"), // minStake: 100 TPT
      );

      // Update pool config using the actual pool ID
      const pool = await fixtureData.TigerStaking.getPool(expectedPoolId);
      await fixtureData.TigerStaking.updatePoolConfig(expectedPoolId, false, 15000, pool.minStake);

      // Verify update
      const poolInfo = await fixtureData.TigerStaking.getPool(expectedPoolId);
      expect(poolInfo.active).to.be.false;
      expect(poolInfo.multiplier).to.equal(15000);
    });

    it("Should handle getting all pools", async function () {
      // Get all pools
      const allPools = await fixtureData.TigerStaking.getAllPools();
      expect(allPools.length).to.be.gte(1); // At least default pool
    });
  });

  describe("📊 Statistics and View Functions Error Handling", function () {
    beforeEach(async function () {
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        86400,
        12000,
        ethers.parseEther("100"), // minStake: 100 TPT
      );
    });

    it("Should handle total staked queries correctly", async function () {
      // Get stats
      const [totalStaked, totalRewardsDistributed, poolCount] = await fixtureData.TigerStaking.getStats();
      expect(totalStaked).to.equal(0);
      expect(poolCount).to.be.gte(1);

      // After staking
      await fixtureData.TigerStaking
        .connect(user1)
        .stake(1, ethers.parseEther("200"));

      const [totalStakedAfter] = await fixtureData.TigerStaking.getStats();
      expect(totalStakedAfter).to.equal(ethers.parseEther("200"));
    });

    it("Should handle user stakes queries", async function () {
      // User with no stakes - getUserStakes returns an array, not a tuple
      const userStakesArray = await fixtureData.TigerStaking.getUserStakes(user1.address);
      expect(userStakesArray.length).to.equal(0);
      
      // Calculate total staked from array
      const totalUserStaked = userStakesArray.reduce((sum: bigint, stake: any) => {
        return sum + BigInt(stake.amount.toString());
      }, 0n);
      expect(totalUserStaked).to.equal(0);

      // After staking
      await fixtureData.TigerStaking
        .connect(user1)
        .stake(1, ethers.parseEther("200"));

      const userStakesAfter = await fixtureData.TigerStaking.getUserStakes(user1.address);
      expect(userStakesAfter.length).to.equal(1);
      
      const totalUserStakedAfter = userStakesAfter.reduce((sum: bigint, stake: any) => {
        return sum + BigInt(stake.amount.toString());
      }, 0n);
      expect(totalUserStakedAfter).to.equal(ethers.parseEther("200"));
    });

    it("Should handle pool info queries", async function () {
      // Get current pool count before creating
      const [, , poolCountBefore] = await fixtureData.TigerStaking.getStats();
      const expectedPoolId = Number(poolCountBefore) + 1;
      
      // Create pool
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        86400,
        12000,
        ethers.parseEther("100"), // minStake: 100 TPT
      );
      
      // Get pool info using the actual pool ID
      const poolInfo = await fixtureData.TigerStaking.getPool(expectedPoolId);
      expect(poolInfo.active).to.be.true;
      expect(poolInfo.duration).to.equal(86400);
      expect(poolInfo.multiplier).to.equal(12000);

      // Invalid pool should return empty struct (poolId = 0)
      const invalidPool = await fixtureData.TigerStaking.getPool(999);
      expect(invalidPool.poolId).to.equal(0);
    });

    it("Should handle getStats correctly", async function () {
      const [totalStaked, totalRewardsDistributed, poolCount] = await fixtureData.TigerStaking.getStats();
      expect(totalStaked).to.be.a("bigint");
      expect(totalRewardsDistributed).to.be.a("bigint");
      expect(poolCount).to.be.gte(1);
    });

    it("Should handle pool stakers count correctly", async function () {
      // Empty pool - getUserStakes returns an array
      const userStakesArray = await fixtureData.TigerStaking.getUserStakes(user1.address);
      const currentTime = await time.latest();
      const activeStakes = userStakesArray.filter((stake: any) => {
        return !stake.claimed && Number(stake.endTime) > currentTime;
      }).length;
      expect(activeStakes).to.equal(0);

      // Add staker
      await fixtureData.TigerStaking
        .connect(user1)
        .stake(1, ethers.parseEther("200"));

      const userStakesAfter = await fixtureData.TigerStaking.getUserStakes(user1.address);
      const activeStakesAfter = userStakesAfter.filter((stake: any) => {
        return !stake.claimed && Number(stake.endTime) > currentTime;
      }).length;
      expect(activeStakesAfter).to.equal(1);
    });
  });

  describe("🔧 Mathematical Edge Cases", function () {
    beforeEach(async function () {
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        86400,
        12000,
        ethers.parseEther("100"), // minStake: 100 TPT
      );
    });

    it("Should handle time-based calculations correctly", async function () {
      await fixtureData.TigerStaking
        .connect(user1)
        .stake(1, ethers.parseEther("200"));

      // Fast forward time
      await time.increase(3600 * 24 * 30); // 30 days

      // Get stake info to verify time calculations
      const stakeInfo = await fixtureData.TigerStaking.getUserStake(
        user1.address,
        0,
      );
      expect(stakeInfo.amount).to.equal(ethers.parseEther("200"));
    });
  });

  describe("🎪 Integration Error Scenarios", function () {
    it("Should handle pool state validation", async function () {
      // Get current pool count before creating
      const [, , poolCountBefore] = await fixtureData.TigerStaking.getStats();
      const expectedPoolId = Number(poolCountBefore) + 1;
      
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        86400,
        12000,
        ethers.parseEther("100"), // minStake: 100 TPT
      );

      // Get pool info to validate state using the actual pool ID
      const poolInfo = await fixtureData.TigerStaking.getPool(expectedPoolId);
      expect(poolInfo.active).to.be.true;
      expect(poolInfo.duration).to.equal(86400);

      // Invalid pool should return empty struct (poolId = 0)
      const invalidPool = await fixtureData.TigerStaking.getPool(999);
      expect(invalidPool.poolId).to.equal(0);
    });

    it("Should handle individual stake reward claims", async function () {
      // Get current pool count to determine pool ID
      const [, , poolCount] = await fixtureData.TigerStaking.getStats();
      const poolId = Number(poolCount) + 1;
      
      // Create a pool with multiplier > 10000 to ensure rewards > 0
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        86400, // 1 day duration
        12000, // 120% multiplier = 20% reward (not 100% which gives 0)
        ethers.parseEther("100"), // minStake: 100 TPT
      );

      await fixtureData.TigerStaking
        .connect(user1)
        .stake(poolId, ethers.parseEther("200"));

      // Advance time so stake matures
      const userStake = await fixtureData.TigerStaking.getUserStake(user1.address, 0);
      const currentTime = await time.latest();
      const endTime = Number(userStake.endTime);
      if (currentTime < endTime) {
        await time.increase(endTime - currentTime + 1);
      }

      // Check pending rewards before claiming
      // Rewards are calculated based on multiplier: amount * multiplier / 10000 - amount
      // For 200 tokens with 12000 multiplier: 200 * 12000 / 10000 - 200 = 240 - 200 = 40 tokens
      const pendingRewards = await fixtureData.TigerStaking.getPendingRewards(user1.address, 0);
      
      // Verify rewards are calculated correctly
      const expectedRewards = ethers.parseEther("200") * 12000n / 10000n - ethers.parseEther("200");
      expect(pendingRewards).to.equal(expectedRewards);
      expect(pendingRewards).to.be.gt(0);

      // Transfer tokens to staking contract for reward distribution
      // claimRewards requires the staking contract to have tokens
      const rewardAmount = pendingRewards;
      await fixtureData.tokenizinToken
        .connect(owner)
        .transfer(await fixtureData.TigerStaking.getAddress(), rewardAmount);

      // Now rewards should be available to claim
      await expect(
        fixtureData.TigerStaking
          .connect(user1)
          .claimRewards(0),
      ).to.not.be.reverted;
    });
  });
});
