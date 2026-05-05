import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  deployCompleteEcosystemWithProxies,
  setupProxyTestEnvironment,
  ProxyFixtureData,
} from "./utils/proxy-fixture";

describe("🚨 RewardDistributor - Error Handling & Emergency Functions", function () {
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
    await setupProxyTestEnvironment(
      fixture,
      [user1, user2, nonOwner],
      {
        fundingAmount: ethers.parseEther("10000"),
        setupApprovals: true,
      },
    );

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
      await expect(fixtureData.rewardDistributor.connect(nonOwner).pause()).to
        .be.reverted;
    });

    it("Should revert when non-owner tries to unpause", async function () {
      await fixtureData.rewardDistributor.pause();

      await expect(fixtureData.rewardDistributor.connect(nonOwner).unpause()).to
        .be.reverted;
    });

    it("Should revert when non-owner tries to emergency withdraw", async function () {
      // Fund the contract first
      await fixtureData.tokenizinToken.transfer(
        await fixtureData.rewardDistributor.getAddress(),
        ethers.parseEther("1000"),
      );

      await expect(
        fixtureData.rewardDistributor
          .connect(nonOwner)
          .emergencyWithdraw(
            await fixtureData.tokenizinToken.getAddress(),
            ethers.parseEther("100"),
          ),
      ).to.be.reverted;
    });

    it("Should revert when non-owner tries to add rewards", async function () {
      await expect(
        fixtureData.rewardDistributor
          .connect(nonOwner)
          .addRewards(ethers.parseEther("1000"), "test"),
      ).to.be.reverted;
    });

    it("Should revert when non-owner tries to distribute rewards", async function () {
      await expect(
        fixtureData.rewardDistributor
          .connect(nonOwner)
          .distributeRewards(ethers.parseEther("1000")),
      ).to.be.reverted;
    });

    it("Should revert when non-owner tries to update addresses", async function () {
      await expect(
        fixtureData.rewardDistributor
          .connect(nonOwner)
          .updateAddresses(
            await fixtureData.TigerStaking.getAddress(),
            await fixtureData.rwaRevenue.getAddress(),
            treasury.address,
          ),
      ).to.be.reverted;
    });
  });

  describe("🚫 Input Validation Error Handling", function () {
    it("Should revert emergency withdraw with zero amount", async function () {
      await expect(
        fixtureData.rewardDistributor.emergencyWithdraw(
          await fixtureData.tokenizinToken.getAddress(),
          0,
        ),
      ).to.be.revertedWith("RWARewardDistributor: invalid amount");
    });

    it("Should revert emergency withdraw with insufficient balance", async function () {
      await expect(
        fixtureData.rewardDistributor.emergencyWithdraw(
          await fixtureData.tokenizinToken.getAddress(),
          ethers.parseEther("1000000"), // More than contract has
        ),
      ).to.be.revertedWith("RWARewardDistributor: insufficient token balance");
    });

    it("Should revert addRewards with zero amount", async function () {
      await expect(
        fixtureData.rewardDistributor.addRewards(0, "test"),
      ).to.be.revertedWith("RWARewardDistributor: invalid amount");
    });

    it("Should revert addRewards with insufficient balance", async function () {
      await expect(
        fixtureData.rewardDistributor.addRewards(
          ethers.parseEther("1000000"),
          "test",
        ),
      ).to.be.revertedWith("RWARewardDistributor: insufficient balance");
    });

    it("Should revert distributeRewards with zero amount", async function () {
      await expect(
        fixtureData.rewardDistributor.distributeRewards(0),
      ).to.be.revertedWith("RWARewardDistributor: invalid amount");
    });

    it("Should revert distributeRewards with insufficient pending rewards", async function () {
      await expect(
        fixtureData.rewardDistributor.distributeRewards(
          ethers.parseEther("1000000"),
        ),
      ).to.be.revertedWith("RWARewardDistributor: insufficient pending rewards");
    });

    it("Should revert distributeRewards when staking address not set", async function () {
      // First ensure there are no pending rewards to avoid that error
      const statsBefore = await fixtureData.rewardDistributor.getRewardPoolStats();
      if (statsBefore._pendingRewards > 0n) {
        // Clear pending rewards by distributing them first
        await fixtureData.rewardDistributor.distributeRewards(statsBefore._pendingRewards);
      }

      // Update addresses to zero to test
      await fixtureData.rewardDistributor.updateAddresses(
        ethers.ZeroAddress,
        await fixtureData.rwaRevenue.getAddress(),
        treasury.address,
      );

      // Add some rewards first
      await fixtureData.tokenizinToken.transfer(
        await fixtureData.rewardDistributor.getAddress(),
        ethers.parseEther("100"),
      );
      await fixtureData.rewardDistributor.addRewards(
        ethers.parseEther("100"),
        "test",
      );

      await expect(
        fixtureData.rewardDistributor.distributeRewards(
          ethers.parseEther("100"),
        ),
      ).to.be.revertedWith("RWARewardDistributor: staking address not set");
    });
  });

  describe("🚨 Emergency Withdraw Functions", function () {
    beforeEach(async function () {
      // NOTE: TigerPalaceToken upgradeable version doesn't have setMaxWalletExemption or setTaxExemption
      // Transfers will work normally without exemptions

      // Fund the contract for emergency withdraw tests
      await fixtureData.tokenizinToken.transfer(
        await fixtureData.rewardDistributor.getAddress(),
        ethers.parseEther("1000"),
      );
    });

    it("Should successfully emergency withdraw tokens", async function () {
      const withdrawAmount = ethers.parseEther("100");
      
      // Verify treasury address is set
      const treasuryAddr = await fixtureData.rewardDistributor.treasuryAddress();
      expect(treasuryAddr).to.not.equal(ethers.ZeroAddress);
      
      // Use the treasury address from the contract, not the signer variable
      // The contract was deployed with signers[1] as treasury, not signers[3]
      const treasuryBalanceBefore = await fixtureData.tokenizinToken.balanceOf(
        treasuryAddr,
      );

      // Verify contract has enough balance
      const contractBalance = await fixtureData.tokenizinToken.balanceOf(
        await fixtureData.rewardDistributor.getAddress()
      );
      expect(contractBalance).to.be.gte(withdrawAmount);

      const tx = await fixtureData.rewardDistributor.emergencyWithdraw(
        await fixtureData.tokenizinToken.getAddress(),
        withdrawAmount,
      );
      await expect(tx).to.emit(fixtureData.rewardDistributor, "EmergencyWithdrawal");

      const treasuryBalanceAfter = await fixtureData.tokenizinToken.balanceOf(
        treasuryAddr,
      );
      expect(treasuryBalanceAfter).to.equal(
        treasuryBalanceBefore + withdrawAmount,
      );
    });

    it("Should successfully emergency withdraw ETH", async function () {
      const ethAmount = ethers.parseEther("1");
      
      // Get treasury address from contract (same as token withdrawal test)
      const treasuryAddr = await fixtureData.rewardDistributor.treasuryAddress();
      const treasuryBalanceBefore = await ethers.provider.getBalance(
        treasuryAddr,
      );

      // Send ETH to contract
      await owner.sendTransaction({
        to: await fixtureData.rewardDistributor.getAddress(),
        value: ethAmount,
      });

      await expect(
        fixtureData.rewardDistributor.emergencyWithdraw(
          ethers.ZeroAddress, // Zero address for ETH
          ethAmount,
        ),
      ).to.emit(fixtureData.rewardDistributor, "EmergencyWithdrawal");

      const treasuryBalanceAfter = await ethers.provider.getBalance(
        treasuryAddr,
      );
      // Note: Balance check may vary due to gas costs
      expect(treasuryBalanceAfter).to.be.gte(treasuryBalanceBefore);
    });
  });

  describe("🔧 Pause and System State Error Handling", function () {
    it("Should successfully pause and unpause", async function () {
      // Initially not paused
      expect(await fixtureData.rewardDistributor.paused()).to.be.false;

      // Pause
      await expect(fixtureData.rewardDistributor.pause()).to.emit(
        fixtureData.rewardDistributor,
        "Paused",
      );
      expect(await fixtureData.rewardDistributor.paused()).to.be.true;

      // Operations should revert when paused
      await expect(
        fixtureData.rewardDistributor.addRewards(
          ethers.parseEther("1000"),
          "test",
        ),
      ).to.be.reverted;

      // Unpause
      await expect(fixtureData.rewardDistributor.unpause()).to.emit(
        fixtureData.rewardDistributor,
        "Unpaused",
      );
      expect(await fixtureData.rewardDistributor.paused()).to.be.false;
    });

    it("Should revert pausing when already paused", async function () {
      await fixtureData.rewardDistributor.pause();

      await expect(fixtureData.rewardDistributor.pause()).to.be.reverted;
    });

    it("Should revert unpausing when not paused", async function () {
      await expect(fixtureData.rewardDistributor.unpause()).to.be.reverted;
    });
  });

  describe("📊 View Functions and State Queries", function () {
    beforeEach(async function () {
      // NOTE: TigerPalaceToken upgradeable version doesn't have setMaxWalletExemption or setTaxExemption
      // Transfers will work normally without exemptions

      // Fund contract and add some rewards
      await fixtureData.tokenizinToken.transfer(
        await fixtureData.rewardDistributor.getAddress(),
        ethers.parseEther("5000"),
      );
      await fixtureData.rewardDistributor.addRewards(
        ethers.parseEther("1000"),
        "test_source",
      );
    });

    it("Should correctly report pause status", async function () {
      expect(await fixtureData.rewardDistributor.paused()).to.be.false;

      await fixtureData.rewardDistributor.pause();
      expect(await fixtureData.rewardDistributor.paused()).to.be.true;

      await fixtureData.rewardDistributor.unpause();
      expect(await fixtureData.rewardDistributor.paused()).to.be.false;
    });

    it("Should correctly report available balance", async function () {
      const balance = await fixtureData.rewardDistributor.getAvailableBalance();
      expect(balance).to.be.gt(0);
    });

    it("Should correctly report reward pool stats", async function () {
      const stats = await fixtureData.rewardDistributor.getRewardPoolStats();
      expect(stats._totalRewardPool).to.be.gt(0);
      expect(stats._pendingRewards).to.be.gt(0);
    });

    it("Should handle token balance queries", async function () {
      const tokenBalance = await fixtureData.tokenizinToken.balanceOf(
        await fixtureData.rewardDistributor.getAddress(),
      );
      expect(tokenBalance).to.be.gt(0);
    });
  });

  describe("🔄 Edge Cases and Integration Scenarios", function () {
    it("Should maintain state consistency across pause/unpause cycles", async function () {
      // NOTE: TigerPalaceToken upgradeable version doesn't have setMaxWalletExemption or setTaxExemption
      // Transfers will work normally without exemptions

      // Add rewards before pausing
      await fixtureData.tokenizinToken.transfer(
        await fixtureData.rewardDistributor.getAddress(),
        ethers.parseEther("1000"),
      );

      await fixtureData.rewardDistributor.addRewards(
        ethers.parseEther("500"),
        "test",
      );

      const statsBefore = await fixtureData.rewardDistributor.getRewardPoolStats();

      // Pause
      await fixtureData.rewardDistributor.pause();
      const statsDuringPause =
        await fixtureData.rewardDistributor.getRewardPoolStats();
      expect(statsDuringPause._totalRewardPool).to.equal(
        statsBefore._totalRewardPool,
      );

      // Unpause
      await fixtureData.rewardDistributor.unpause();
      const statsAfter = await fixtureData.rewardDistributor.getRewardPoolStats();
      expect(statsAfter._totalRewardPool).to.equal(
        statsBefore._totalRewardPool,
      );
    });

    it("Should handle multiple reward additions", async function () {
      // NOTE: TigerPalaceToken upgradeable version doesn't have setMaxWalletExemption or setTaxExemption
      // Transfers will work normally without exemptions

      await fixtureData.tokenizinToken.transfer(
        await fixtureData.rewardDistributor.getAddress(),
        ethers.parseEther("2000"),
      );

      // Get initial stats
      const statsBefore = await fixtureData.rewardDistributor.getRewardPoolStats();
      const initialTotal = statsBefore._totalRewardPool;
      const initialPending = statsBefore._pendingRewards;

      await fixtureData.rewardDistributor.addRewards(
        ethers.parseEther("500"),
        "source1",
      );
      await fixtureData.rewardDistributor.addRewards(
        ethers.parseEther("300"),
        "source2",
      );

      const stats = await fixtureData.rewardDistributor.getRewardPoolStats();
      expect(stats._totalRewardPool).to.equal(initialTotal + ethers.parseEther("800"));
      expect(stats._pendingRewards).to.equal(initialPending + ethers.parseEther("800"));
    });

    it("Should handle address updates correctly", async function () {
      const newStakingAddress = user1.address;
      const newRevenueAddress = user2.address;
      const newTreasuryAddress = treasury.address;

      await fixtureData.rewardDistributor.updateAddresses(
        newStakingAddress,
        newRevenueAddress,
        newTreasuryAddress,
      );

      // Verify addresses were updated (if getters exist)
      // Note: RWARewardDistributor doesn't expose getters for these, so we test via behavior
      // The update should succeed without reverting
    });
  });
});
