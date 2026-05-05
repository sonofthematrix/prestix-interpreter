import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  deployCompleteEcosystemWithProxies,
  setupProxyTestEnvironment,
  ProxyFixtureData,
} from "./utils/proxy-fixture";

describe("🚨TigerRevenue - Error Handling & Emergency Functions", function () {
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
    it("Should revert when non-owner tries to pause", async function () {
      await expect(fixtureData.rwaRevenue.connect(nonOwner).pause()).to.be
        .reverted;
    });

    it("Should revert when non-owner tries to unpause", async function () {
      await fixtureData.rwaRevenue.pause();

      await expect(fixtureData.rwaRevenue.connect(nonOwner).unpause()).to
        .be.reverted;
    });
  });

  describe("🚫 Input Validation Error Handling", function () {

    it("Should revert with RWARevenue: invalid amount when allocating revenue with zero amount", async function () {
      // Create a pool first so pool validation passes
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        30 * 24 * 60 * 60, // 30 days duration
        120000, // 1200% multiplier (1200 basis points)
        ethers.parseEther("100"), // minStake: 100 TPT
      );

      // Transfer tokens to revenue contract first
      const amount = ethers.parseEther("1000");
      await fixtureData.tokenizinToken
        .connect(owner)
        .transfer(await fixtureData.rwaRevenue.getAddress(), amount);

      await expect(
        fixtureData.rwaRevenue.connect(owner).allocateRevenue(1, 0, "test"),
      ).to.be.revertedWith("RWARevenue: invalid amount");
    });

    // REMOVED: Tests for claimRevenueForUser and claimRevenue - these functions don't exist
    // Revenue claiming is handled by RWAStaking.claimRewards(stakeId), not RWARevenue
  });

  describe("🔧 Pause and System State Error Handling", function () {
    it("Should successfully pause and unpause", async function () {
      // Initially not paused
      expect(await fixtureData.rwaRevenue.paused()).to.be.false;

      // Pause - get the contract directly to avoid wrapper issues
      const rwaRevenueContract = await ethers.getContractAt(
        "RWARevenue",
        await fixtureData.rwaRevenue.getAddress()
      );
      const pauseTx = await rwaRevenueContract.pause();
      await expect(pauseTx)
        .to.emit(rwaRevenueContract, "Paused")
        .withArgs(owner.address);
      expect(await fixtureData.rwaRevenue.paused()).to.be.true;

      // Transfer tokens to revenue contract first
      const amount = ethers.parseEther("1000");
      await fixtureData.tokenizinToken
        .connect(owner)
        .transfer(await fixtureData.rwaRevenue.getAddress(), amount);

      // Create a pool first
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        30 * 24 * 60 * 60, // 30 days duration
        120000, // 1200% multiplier
        ethers.parseEther("100"), // minStake: 100 TPT
      );

      // Operations should revert when paused
      await expect(
        fixtureData.rwaRevenue.connect(owner).allocateRevenue(1, amount, "test")
      ).to.be.revertedWith("Pausable: paused");

      // Unpause
      const unpauseTx = await rwaRevenueContract.unpause();
      await expect(unpauseTx)
        .to.emit(rwaRevenueContract, "Unpaused")
        .withArgs(owner.address);
      expect(await fixtureData.rwaRevenue.paused()).to.be.false;
    });

    

    it("Should revert pausing when already paused", async function () {
      await fixtureData.rwaRevenue.pause();

      await expect(fixtureData.rwaRevenue.pause()).to.be.revertedWith(
        "Pausable: paused",
      );
    });

    it("Should revert unpausing when not paused", async function () {
      await expect(fixtureData.rwaRevenue.unpause()).to.be.revertedWith(
        "Pausable: not paused",
      );
    });
  });

  describe("💰 Revenue Operations Error Handling", function () {
    beforeEach(async function () {
      // Create pool for testing viaTigerStaking
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        30 * 24 * 60 * 60, // 30 days duration
        120000, // 1200% multiplier
        ethers.parseEther("100"), // minStake: 100 TPT
      );

      // Fund users to stake
      await fixtureData.tokenizinToken.transfer(
        user1.address,
        ethers.parseEther("1000"),
      );
      await fixtureData.tokenizinToken.transfer(
        user2.address,
        ethers.parseEther("1000"),
      );

      // Approve staking
      await fixtureData.tokenizinToken
        .connect(user1)
        .approve(
          fixtureData.TigerStaking.address,
          ethers.parseEther("1000"),
        );
      await fixtureData.tokenizinToken
        .connect(user2)
        .approve(
          fixtureData.TigerStaking.address,
          ethers.parseEther("1000"),
        );

      // Stake some tokens in the created pool
      await fixtureData.TigerStaking
        .connect(user1)
        .stake(1, ethers.parseEther("500"));
      await fixtureData.TigerStaking
        .connect(user2)
        .stake(1, ethers.parseEther("300"));
    });

    it("Should handle revenue allocation to valid pool", async function () {
      // Transfer tokens to revenue contract first
      const amount = ethers.parseEther("1000");
      await fixtureData.tokenizinToken
        .connect(owner)
        .transfer(await fixtureData.rwaRevenue.getAddress(), amount);

      await expect(
        fixtureData.rwaRevenue.connect(owner).allocateRevenue(1, amount, "test")
      ).to.not.be.reverted;
    });

    

    it("Should handle revenue queries correctly", async function () {
      // Query pending revenue (returns 0 as it's not tracked per-user)
      const pendingRevenue =
        await fixtureData.TigerStaking.getRevenuePending(user1.address, 1);
      expect(pendingRevenue).to.equal(0n);

      // Query total allocated
      const totalAllocated = await fixtureData.rwaRevenue.totalRevenueAllocated();
      expect(totalAllocated).to.be.gte(0n);
    });

    
  });

  describe("📊 View Functions and State Queries", function () {
    beforeEach(async function () {
      // Create pool for testing
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        30 * 24 * 60 * 60, // 30 days duration
        120000, // 1200% multiplier
        ethers.parseEther("100"), // minStake: 100 TPT
      );
    });

    it("Should correctly report pause status", async function () {
      expect(await fixtureData.rwaRevenue.paused()).to.be.false;

      await fixtureData.rwaRevenue.pause();
      expect(await fixtureData.rwaRevenue.paused()).to.be.true;

      await fixtureData.rwaRevenue.unpause();
      expect(await fixtureData.rwaRevenue.paused()).to.be.false;
    });
    it("Should correctly report contract addresses", async function () {
      const stakingAddress = await fixtureData.rwaRevenue.rwaStakingAddress();
      expect(stakingAddress).to.equal(
        await fixtureData.TigerStaking.getAddress()
      );

      const distributorAddress = await fixtureData.rwaRevenue.rewardDistributorAddress();
      expect(distributorAddress).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("🔄 Edge Cases and Integration Scenarios", function () {
    beforeEach(async function () {
      // Create pool for testing
      await fixtureData.TigerStaking.createPool(
        "Test Pool",
        30 * 24 * 60 * 60, // 30 days duration
        120000, // 1200% multiplier
        ethers.parseEther("100"), // minStake: 100 TPT
      );

      // Fund users and stake
      await fixtureData.tokenizinToken.transfer(
        user1.address,
        ethers.parseEther("1000"),
      );
      await fixtureData.tokenizinToken
        .connect(user1)
        .approve(
          fixtureData.TigerStaking.address,
          ethers.parseEther("1000"),
        );
      await fixtureData.TigerStaking
        .connect(user1) 
        .stake(1, ethers.parseEther("500"));
    });

    it("Should handle multiple revenue allocations", async function () {
      // Transfer tokens to revenue contract first
      const amount1 = ethers.parseEther("1000");
      const amount2 = ethers.parseEther("500");
      await fixtureData.tokenizinToken
        .connect(owner)
        .transfer(await fixtureData.rwaRevenue.getAddress(), amount1 + amount2);

      // Allocate revenue multiple times
      await fixtureData.rwaRevenue.connect(owner).allocateRevenue(1, amount1, "test");
      await fixtureData.rwaRevenue.connect(owner).allocateRevenue(1, amount2, "test");

      const totalAllocated = await fixtureData.rwaRevenue.totalRevenueAllocated();
      expect(totalAllocated).to.equal(amount1 + amount2);
    });

    it("Should maintain state consistency across pause/unpause cycles", async function () {
      // Transfer tokens to revenue contract first
      const amount = ethers.parseEther("1000");
      await fixtureData.tokenizinToken
        .connect(owner)
        .transfer(await fixtureData.rwaRevenue.getAddress(), amount);

      // Allocate revenue before pausing
      await fixtureData.rwaRevenue.connect(owner).allocateRevenue(1, amount, "test");
      const allocatedBefore = await fixtureData.rwaRevenue.totalRevenueAllocated();

      // Pause
      await fixtureData.rwaRevenue.pause();
      const allocatedDuringPause = await fixtureData.rwaRevenue.totalRevenueAllocated();
      expect(allocatedDuringPause).to.equal(allocatedBefore);

      // Unpause
      await fixtureData.rwaRevenue.unpause();
      const allocatedAfter = await fixtureData.rwaRevenue.totalRevenueAllocated();
      expect(allocatedAfter).to.equal(allocatedBefore);
    });


    it("Should handle zero revenue scenarios", async function () {
      // Query pending revenue for user with no revenue allocated
      // Use rwaGetPendingRevenue(poolId, user) from compatibility wrapper
      const pendingRevenue = await fixtureData.TigerStaking.rwaGetPendingRevenue(1, user1.address);
      expect(pendingRevenue).to.equal(0n);

      // Query total allocated (no parameter - returns total across all pools)
      const totalAllocated = await fixtureData.rwaRevenue.totalRevenueAllocated();
      expect(totalAllocated).to.be.gte(0n);
    });
  });
});
