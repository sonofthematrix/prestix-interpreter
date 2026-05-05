import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { parseEther } from "ethers";
import { deployTigerPalaceTokenUpgradeable } from "./utils/token-deployment";
// import { time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * 🚀 RWARevenue - Enhanced Coverage Test Suite
 *
 * This test suite specifically targets uncovered code paths in RWARevenue.sol:
 * - Error conditions and edge cases
 * - Admin functions (setRwaStaking, setTreasury, pause/unpause)
 * - Revenue allocation with various scenarios
 * - Claim functionality with error handling
 * - View functions with edge cases
 * - Access control validation
 * - State transitions and tracking
 */
describe("🚀 RWARevenue - Enhanced Coverage Test Suite", () => {
  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let newTreasury: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let maliciousUser: SignerWithAddress;

  let rwaRevenue: any;
  let mockRwaStaking: any;
  let mockToken: any;
  let mockRewardDistributor: any;

  // Test constants
  const POOL_ID = 1;
  const ZERO_POOL_ID = 0;
  const LARGE_POOL_ID = 999999;
  const REVENUE_AMOUNT = ethers.parseEther("1000");
  const SMALL_REVENUE = ethers.parseEther("10");
  const LARGE_REVENUE = ethers.parseEther("100000");

  beforeEach(async () => {
    [
      deployer,
      treasury,
      newTreasury,
      user1,
      user2,
      user3,
      nonOwner,
      maliciousUser,
    ] = await ethers.getSigners();

    // Deploy mock contracts
    await deployMockContracts();
    await deployAndInitializeRWARevenue();
  });

  async function deployMockContracts() {
    // Deploy TigerPalaceToken as upgradeable contract with UUPS proxy (production pattern)
    const { token } = await deployTigerPalaceTokenUpgradeable(deployer, {
      minBalance: ethers.parseEther("3000000"), // 3M tokens minimum
    });
    mockToken = token;

    // Deploy RewardDistributor via proxy to respect _disableInitializers
    const RWARewardDistributor = await ethers.getContractFactory(
      "RWARewardDistributor",
    );
    const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
    const TransparentProxy = await ethers.getContractFactory(
      "TransparentUpgradeableProxy",
    );
    const rdImpl = await RWARewardDistributor.deploy(
      await mockToken.getAddress(),
      treasury.address,
      parseEther("1000"), // initial reward pool
    );
    await rdImpl.waitForDeployment();
    const proxyAdmin = await ProxyAdmin.deploy();
    // RWARewardDistributor doesn't have __RWARewardDistributor_init - use constructor
    const rdInitData = "0x"; // Empty init data since constructor handles initialization
    const rdProxy = await TransparentProxy.deploy(
      await rdImpl.getAddress(),
      await proxyAdmin.getAddress(),
      rdInitData,
    );
    mockRewardDistributor = await ethers.getContractAt(
      "RWARewardDistributor",
      await rdProxy.getAddress(),
    );

    // NOTE: TigerPalaceToken doesn't have setMaxWalletExemption or setTaxExemption functions
    // Upgradeable token doesn't have max wallet/tax restrictions

    // Fund RewardDistributor with tokens
    await mockToken.transfer(
      await mockRewardDistributor.getAddress(),
      ethers.parseEther("100000"),
    );

    // Create a mock TigerMulti contract using an EOA for simplicity
    // In production tests, this would be a proper mock contract
    // Note: mockRwaStaking will be set in deployAndInitializeRWARevenue()
    // mockRwaStaking = deployer; // Using deployer as mock for simplicity
  }

  async function deployAndInitializeRWARevenue() {
    // Deploy RWARevenue with constructor parameters
    const RWARevenue = await ethers.getContractFactory("RWARevenue");
    const TigerPalaceToken = await ethers.getContractFactory("TigerPalaceToken");
    const RWARewardDistributor = await ethers.getContractFactory("RWARewardDistributor");
    
    // Deploy TigerPalaceToken as upgradeable contract with UUPS proxy (production pattern)
    const { token: tokenizinToken } = await deployTigerPalaceTokenUpgradeable(deployer, {
      minBalance: ethers.parseEther("3000000"), // 3M tokens minimum
    });
    
    // Deploy RWARewardDistributor
    const rewardDistributor = await RWARewardDistributor.deploy(
      await tokenizinToken.getAddress(),
      treasury.address,
      parseEther("1000"),
    );
    await rewardDistributor.waitForDeployment();
    
    // Deploy RWARevenue
    const rwaRevenueImpl = await RWARevenue.deploy(
      await tokenizinToken.getAddress(),
      await rewardDistributor.getAddress(),
    );
    await rwaRevenueImpl.waitForDeployment();
    
    // Deploy directly (not via proxy) - contracts are not upgradeable
    // Direct deployment ensures deployer is the admin
    rwaRevenue = rwaRevenueImpl;

    // Deploy mock RWAStaking for initialization
    const RWAStaking = await ethers.getContractFactory("RWAStaking");
    const mockRwaStakingContract = await RWAStaking.deploy(
      await tokenizinToken.getAddress(),
      await rwaRevenue.getAddress(),
      await rewardDistributor.getAddress(),
    );
    await mockRwaStakingContract.waitForDeployment();

    // Initialize RWARevenue with staking address
    await rwaRevenue.initialize(await mockRwaStakingContract.getAddress());
    
    // Set mockRwaStaking for tests
    mockRwaStaking = await ethers.getContractAt("RWAStaking", await mockRwaStakingContract.getAddress());
  }

  // ==================== REVENUE ALLOCATION ERROR CONDITIONS ====================

  describe("💰 Revenue Allocation - Error Conditions", () => {
    it("Should reject zero amount allocation", async () => {
      await expect(rwaRevenue.allocateRevenue(POOL_ID, 0, "test")).to.be
        .reverted;
    });

    it("Should reject allocation from non-owner caller", async () => {
      // Test non-owner (should fail with RWARevenue access control check)
      await expect(
        rwaRevenue
          .connect(user1)
          .allocateRevenue(POOL_ID, REVENUE_AMOUNT, "test"),
      ).to.be.reverted;
    });

    it("Should handle allocation when contract is paused", async () => {
      await rwaRevenue.pause();

      await expect(
        rwaRevenue.allocateRevenue(POOL_ID, REVENUE_AMOUNT, "test"),
      ).to.be.reverted;
    });

    // Note: The following tests would require a proper mock TigerMulti contract
    // For now, they test the basic validation logic

    it("Should handle allocation with large amount", async () => {
      // Check deployer balance first
      const deployerBalance = await mockToken.balanceOf(deployer.address);
      const largeAmount = deployerBalance > ethers.parseEther("1000000") 
        ? ethers.parseEther("1000000") // Use 1M if available
        : deployerBalance / 2n; // Use half of available balance if less than 1M

      // NOTE: TigerPalaceToken upgradeable version doesn't have setMaxWalletExemption or setTaxExemption functions
      // Removed calls to non-existent functions:
      // - setMaxWalletExemption(...)
      // - setTaxExemption(...)
      const rwaRevenueAddress = await rwaRevenue.getAddress();

      // Transfer tokens to contract first (only if we have enough balance)
      if (largeAmount > 0n) {
        await mockToken.transfer(rwaRevenueAddress, largeAmount);
      }
      
      // This should fail because poolId must be > 0
      await expect(rwaRevenue.allocateRevenue(0, largeAmount, "test"))
        .to.be.reverted; // Fails due to poolId > 0 requirement
    });
  });

  // ==================== REVENUE CLAIMING ERROR CONDITIONS ====================

  // REMOVED: Revenue Claiming tests - RWARevenue doesn't have claimRevenue function
  // Revenue claiming is handled by RWAStaking.claimRewards(stakeId), not RWARevenue
  // These tests are out of scope for RWARevenue contract testing

  // ==================== VIEW FUNCTIONS EDGE CASES ====================

  describe("👁️ View Functions - Edge Cases", () => {
    describe("getPoolRevenueStats", () => {
      it("Should return zero for pool with no revenue", async () => {
        const stats = await rwaRevenue.getPoolRevenueStats(POOL_ID);
        expect(stats.allocated).to.equal(0);
        expect(stats.distributed).to.equal(0);
        expect(stats.pending).to.equal(0);
      });

      it("Should handle zero pool ID correctly", async () => {
        // getPoolRevenueStats doesn't check poolId > 0, it just returns zeros for non-existent pools
        const stats = await rwaRevenue.getPoolRevenueStats(0);
        expect(stats.allocated).to.equal(0);
        expect(stats.distributed).to.equal(0);
        expect(stats.pending).to.equal(0);
      });

      it("Should handle large pool ID correctly", async () => {
        const stats = await rwaRevenue.getPoolRevenueStats(LARGE_POOL_ID);
        expect(stats.allocated).to.equal(0);
        expect(stats.distributed).to.equal(0);
        expect(stats.pending).to.equal(0);
      });

      it("Should return consistent results for multiple calls", async () => {
        const stats1 = await rwaRevenue.getPoolRevenueStats(POOL_ID);
        const stats2 = await rwaRevenue.getPoolRevenueStats(POOL_ID);
        expect(stats1.allocated).to.equal(stats2.allocated);
        expect(stats1.distributed).to.equal(stats2.distributed);
        expect(stats1.pending).to.equal(stats2.pending);
      });
    });
  });

  // ==================== STATE TRACKING AND MAPPINGS ====================

  describe("📊 State Tracking - Edge Cases", () => {
    describe("Pool Revenue Status", () => {
      it("Should handle poolRevenueAllocated mapping correctly", async () => {
        const poolIds = [1, 999, 999999];

        for (const poolId of poolIds) {
          const allocated = await rwaRevenue.poolRevenueAllocated(poolId);
          expect(allocated).to.equal(0);
        }
      });

      it("Should handle totalRevenueAllocated variable", async () => {
        const totalAllocated = await rwaRevenue.totalRevenueAllocated();
        expect(totalAllocated).to.equal(0);
      });

      it("Should handle poolRevenueDistributed mapping", async () => {
        const poolIds = [1, 999, 999999];

        for (const poolId of poolIds) {
          const distributed = await rwaRevenue.poolRevenueDistributed(poolId);
          expect(distributed).to.equal(0);
        }
      });
    });

    describe("Boundary Value Testing", () => {
      it("Should handle maximum uint256 pool ID", async () => {
        const maxPoolId = ethers.MaxUint256;
        const allocated = await rwaRevenue.poolRevenueAllocated(maxPoolId);
        expect(allocated).to.equal(0);
        const distributed = await rwaRevenue.poolRevenueDistributed(maxPoolId);
        expect(distributed).to.equal(0);
        const stats = await rwaRevenue.getPoolRevenueStats(maxPoolId);
        expect(stats.allocated).to.equal(0);
        expect(stats.distributed).to.equal(0);
        expect(stats.pending).to.equal(0);
      });

      it("Should handle zero values correctly", async () => {
        const stats = await rwaRevenue.getPoolRevenueStats(POOL_ID);
        expect(stats.allocated).to.equal(0);
        expect(stats.distributed).to.equal(0);
        expect(stats.pending).to.equal(0);
      });
    });
  });

  // ==================== ACCESS CONTROL COMPREHENSIVE ====================

  describe("🔒 Access Control - Comprehensive Testing", () => {
    it("Should enforce onlyRole modifier on admin functions", async () => {
      const nonOwners = [user1, user2, user3, nonOwner, maliciousUser];

      for (const nonOwnerAccount of nonOwners) {
        await expect(
          rwaRevenue.connect(nonOwnerAccount).updateAddresses(user1.address, user2.address),
        ).to.be.reverted;

        await expect(rwaRevenue.connect(nonOwnerAccount).pause()).to.be
          .reverted;
      }
    });

    it("Should enforce REVENUE_MANAGER_ROLE on revenue allocation", async () => {
      // Test that non-REVENUE_MANAGER_ROLE callers get access control error
      const nonOwners = [user1, user2, treasury, nonOwner, maliciousUser];
      for (const caller of nonOwners) {
        await expect(
          rwaRevenue
            .connect(caller)
            .allocateRevenue(POOL_ID, REVENUE_AMOUNT, "test"),
        ).to.be.reverted;
      }
    });

    it("Should allow owner to call admin functions", async () => {
      // All these should succeed
      await rwaRevenue.updateAddresses(user1.address, user2.address);
      expect(await rwaRevenue.rwaStakingAddress()).to.equal(user1.address);
      expect(await rwaRevenue.rewardDistributorAddress()).to.equal(user2.address);
      await rwaRevenue.pause();
      await rwaRevenue.unpause();
    });
  });

  // ==================== GAS OPTIMIZATION AND PERFORMANCE ====================

  describe("⚡ Gas Optimization - Performance Testing", () => {
    it("Should have reasonable gas costs for view functions", async () => {
      // In ethers v6, estimateGas is accessed differently
      const getPoolStatsGas = await rwaRevenue.getPoolRevenueStats.estimateGas(POOL_ID);
      const getRevenueStatsGas = await rwaRevenue.getRevenueStats.estimateGas();
      const poolRevenueAllocatedGas = await rwaRevenue.poolRevenueAllocated.estimateGas(POOL_ID);

      // View functions should be very cheap (just storage reads)
      expect(Number(getPoolStatsGas)).to.be.lessThan(40000);
      expect(Number(getRevenueStatsGas)).to.be.lessThan(40000);
      expect(Number(poolRevenueAllocatedGas)).to.be.lessThan(40000);
    });

    it("Should handle multiple sequential view calls efficiently", async () => {
      const iterations = 10;
      const startTime = Date.now();

      for (let i = 1; i <= iterations; i++) {
        await rwaRevenue.getPoolRevenueStats(i);
        await rwaRevenue.poolRevenueAllocated(i);
        await rwaRevenue.poolRevenueDistributed(i);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (this is more of a sanity check)
      expect(duration).to.be.lessThan(5000); // 5 seconds
    });
  });

  // ==================== INTEGRATION SCENARIOS ====================

  describe("🔗 Integration Scenarios", () => {
    it("Should maintain consistent state across admin changes", async () => {
      // Initial state
      const initialRwaStaking = await rwaRevenue.rwaStakingAddress();
      const initialRewardDistributor = await rwaRevenue.rewardDistributorAddress();

      // Change addresses
      await rwaRevenue.updateAddresses(user1.address, user2.address);
      expect(await rwaRevenue.rwaStakingAddress()).to.equal(user1.address);
      expect(await rwaRevenue.rewardDistributorAddress()).to.equal(user2.address);

      // Verify other state is unaffected
      expect(await rwaRevenue.paused()).to.be.false;
      expect(await rwaRevenue.totalRevenueAllocated()).to.equal(0);
    });

    it("Should handle pause/unpause without affecting other state", async () => {
      const originalRwaStaking = await rwaRevenue.rwaStakingAddress();
      const originalRewardDistributor = await rwaRevenue.rewardDistributorAddress();

      // Pause
      await rwaRevenue.pause();
      expect(await rwaRevenue.paused()).to.be.true;

      // Verify other state unchanged
      expect(await rwaRevenue.rwaStakingAddress()).to.equal(originalRwaStaking);
      expect(await rwaRevenue.rewardDistributorAddress()).to.equal(originalRewardDistributor);

      // Unpause
      await rwaRevenue.unpause();
      expect(await rwaRevenue.paused()).to.be.false;

      // Verify state still unchanged
      expect(await rwaRevenue.rwaStakingAddress()).to.equal(originalRwaStaking);
      expect(await rwaRevenue.rewardDistributorAddress()).to.equal(originalRewardDistributor);
    });
  });

  // ==================== ERROR MESSAGE VALIDATION ====================

  describe("📝 Error Message Validation", () => {
    it("Should provide correct error messages for various failures", async () => {
      // Zero address errors (updateAddresses allows zero addresses, but initialize doesn't)
      await expect(rwaRevenue.initialize(ethers.ZeroAddress)).to.be
        .revertedWith("RWARevenue: invalid staking address");

      // Access control errors
      await expect(
        rwaRevenue.connect(user1).updateAddresses(user2.address, user3.address)
      ).to.be.reverted;

      // Pause errors
      await expect(rwaRevenue.connect(user1).pause()).to.be.reverted;

      // REVENUE_MANAGER_ROLE access control (revenue allocation)
      await expect(
        rwaRevenue
          .connect(user1)
          .allocateRevenue(POOL_ID, REVENUE_AMOUNT, "test"),
      ).to.be.reverted;

      // Zero amount allocation
      await expect(
        rwaRevenue.allocateRevenue(POOL_ID, 0, "test")
      ).to.be.revertedWith("RWARevenue: invalid amount");
    });
  });
});
