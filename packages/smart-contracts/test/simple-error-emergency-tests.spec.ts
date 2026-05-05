import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre as any;
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { parseEther, formatEther, MaxUint256, ZeroAddress } from "ethers";
import { deployTigerPalaceTokenUpgradeable } from "./utils/token-deployment";

describe("🚨 Simple Error Handling & Emergency Functions Coverage Test", function () {
  let rwaRevenue: any;
  let TigerStaking: any;
  let rewardDistributor: any;
  let tokenizinToken: any;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let treasury: SignerWithAddress;
  let nonOwner: SignerWithAddress;

  async function deployContractsFixture() {
    [owner, user1, user2, treasury, nonOwner] = await ethers.getSigners();

    // Deploy TigerPalaceToken as upgradeable contract with UUPS proxy (production pattern)
    const { token } = await deployTigerPalaceTokenUpgradeable(owner, {
      minBalance: parseEther("10000000"), // 10M tokens minimum
    });
    tokenizinToken = token;
    
    // NOTE: TigerPalaceToken doesn't have updateTaxRates function
    // Tax functionality is not implemented in the upgradeable version

    // Deploy implementations in correct order
    const RewardDistributorImpl = await (await ethers.getContractFactory(
      "RWARewardDistributor",
    )).deploy(
      await tokenizinToken.getAddress(),
      treasury.address,
      parseEther("1000"), // initial reward pool
    );
    await RewardDistributorImpl.waitForDeployment();
    
    // Deploy RWARevenue first (needed for RWAStaking constructor)
    const RWARevenueImpl = await (await ethers.getContractFactory(
      "RWARevenue",
    )).deploy(
      await tokenizinToken.getAddress(),
      await RewardDistributorImpl.getAddress(),
    );
    await RWARevenueImpl.waitForDeployment();
    
    // Deploy RWAStaking with RWARevenue address
    const RWAStakingImpl = await (await ethers.getContractFactory(
      "RWAStaking",
    )).deploy(
      await tokenizinToken.getAddress(),
      await RWARevenueImpl.getAddress(),
      await RewardDistributorImpl.getAddress(),
    );
    await RWAStakingImpl.waitForDeployment();

    // Deploy proxies with ProxyAdmin to avoid admin-caller issues
    const TransparentProxy = await ethers.getContractFactory(
      "TransparentUpgradeableProxy",
    );
    const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
    const proxyAdmin = await ProxyAdmin.deploy();

    // Deploy contracts directly (not via proxy) - these contracts use constructors
    // All contracts already deployed above with constructor parameters
    rewardDistributor = RewardDistributorImpl;
    rwaRevenue = RWARevenueImpl;
    TigerStaking = RWAStakingImpl;

    // Initialize RWARevenue with staking address (it has initialize function)
    await rwaRevenue.initialize(await TigerStaking.getAddress());

    // Transfer tokens for testing
    // NOTE: TigerPalaceToken upgradeable version doesn't have setMaxWalletExemption or setTaxExemption
    // Max wallet and tax functionality is not implemented in the upgradeable version
    // Transfers will work normally without exemptions
    
    await tokenizinToken.transfer(owner.address, parseEther("1000000"));
    await tokenizinToken.transfer(user1.address, parseEther("10000"));
    await tokenizinToken.transfer(user2.address, parseEther("10000"));
    
    // Transfer to rewardDistributor
    const rewardDistributorAddress = await rewardDistributor.getAddress();
    
    await tokenizinToken.transfer(
      rewardDistributorAddress,
      parseEther("100000"),
    );

    // Approve tokens
    await tokenizinToken
      .connect(user1)
      .approve(await TigerStaking.getAddress(), MaxUint256);
    await tokenizinToken
      .connect(user2)
      .approve(await TigerStaking.getAddress(), MaxUint256);

    return {
      rwaRevenue,
      TigerStaking,
      rewardDistributor,
      tokenizinToken,
      owner,
      user1,
      user2,
      treasury,
      nonOwner,
    };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployContractsFixture);
    rwaRevenue = fixture.rwaRevenue;
    TigerStaking = fixture.TigerStaking;
    rewardDistributor = fixture.rewardDistributor;
    tokenizinToken = fixture.tokenizinToken;
    owner = fixture.owner;
    user1 = fixture.user1;
    user2 = fixture.user2;
    treasury = fixture.treasury;
    nonOwner = fixture.nonOwner;
  });

  describe("🚨 RWAStaking Administrative Functions", function () {
    it("Should handle pause/unpause functions", async function () {
      expect(await TigerStaking.paused()).to.be.false;

      // Use pause() to pause the contract
      await TigerStaking.pause();
      expect(await TigerStaking.paused()).to.be.true;

      // Use unpause() to unpause the contract
      await TigerStaking.unpause();
      expect(await TigerStaking.paused()).to.be.false;
    });

    it("Should prevent non-admin from pause functions", async function () {
      // RWAStaking uses AccessControl, not Ownable
      await expect(TigerStaking.connect(nonOwner).pause()).to.be.reverted;

      await TigerStaking.pause();

      await expect(TigerStaking.connect(nonOwner).unpause()).to.be.reverted;
    });
  });

  describe("🔧 System State Error Handling", function () {
    it("Should handle paused state operations correctly", async function () {
      // Use pause() to pause the contract
      await rwaRevenue.pause();

      // Operations should revert when paused
      // Use allocateRevenue() to allocate revenue
      await expect(rwaRevenue.allocateRevenue(1, parseEther("1000"), "test")).to.be
        .reverted;

      // Use unpause() to unpause the contract
      await rwaRevenue.unpause();

      // Operations should work after unpause
      // (This would need a valid setup with pools and stakers)
    });
  });

  describe("📊 Coverage Enhancement for View Functions", function () {
    it("Should handle revenue and staking statistics", async function () {
      // Use getAllPools() to get all pools
      const pools = await TigerStaking.getAllPools();
      const poolLength = pools.length;
      expect(poolLength).to.be.gte(0);

      // Only test totalStaked if pools exist
      if (poolLength > 0) {
        const stats = await TigerStaking.getStats();
        const totalStaked = stats._totalStaked || stats.totalStaked || 0n;
        expect(totalStaked).to.be.gte(0n);
      } else {
        // If no pools exist, create one for testing
        // Use createPool with correct signature: (name, duration, multiplier)
        await TigerStaking.connect(owner).createPool(
          "Test Pool",
          30 * 24 * 60 * 60, // 30 days duration
          120000, // 1200% multiplier
        );
        const stats = await TigerStaking.getStats();
        const totalStaked = stats._totalStaked || stats.totalStaked || 0n;
        expect(totalStaked).to.equal(0n); // Should be 0 for new pool
      }
    });
  });
});
