import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { reset } from "@nomicfoundation/hardhat-network-helpers";
import { deployCompleteEcosystemWithProxies } from "./utils/proxy-fixture";
import { OptimizedEcosystemFixture } from "./utils/optimized-contract-fixture";

/**
 * 🧪 Minimal Staking Test - Updated for Optimized Contract
 *
 * This test validates minimal staking setup using the simplified
 * contract interface after optimization changes.
 */
describe("Minimal Staking Test", () => {
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let treasury: SignerWithAddress;

  let tokenizinToken: any;
  let tigerStaking: any;
  let tigerRevenue: any;
  let rewardDistributor: any;

  beforeEach(async () => {
    // Reset Hardhat network state to ensure fresh contracts for each test
    await reset();
    [deployer, user1, treasury] = await ethers.getSigners();

    // Deploy TigerPalaceToken using upgradeable pattern (production pattern)
    const { deployTigerPalaceTokenUpgradeable } = require("./utils/token-deployment");
    const { token } = await deployTigerPalaceTokenUpgradeable(deployer, {
      minBalance: ethers.parseEther("11000000"), // 11M tokens minimum
    });
    tokenizinToken = token;
    
    // NOTE: TigerPalaceToken doesn't have updateTaxRates function
    // Tax functionality is not implemented in the upgradeable version
    const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
    const TransparentProxy = await ethers.getContractFactory(
      "TransparentUpgradeableProxy",
    );
    const proxyAdmin = await ProxyAdmin.deploy();
    // Deploy RWARewardDistributor with constructor parameters
    const RWARewardDistributor = await ethers.getContractFactory("RWARewardDistributor");
    rewardDistributor = await RWARewardDistributor.deploy(
      await tokenizinToken.getAddress(),
      treasury.address,
      ethers.parseEther("1000"), // initial reward pool
    );
    await rewardDistributor.waitForDeployment();

    // Deploy RWARevenue with constructor parameters
    const RWARevenue = await ethers.getContractFactory("RWARevenue");
    tigerRevenue = await RWARevenue.deploy(
      await tokenizinToken.getAddress(),
      await rewardDistributor.getAddress(),
    );
    await tigerRevenue.waitForDeployment();

    // Deploy RWAStaking with constructor parameters
    const RWAStaking = await ethers.getContractFactory("RWAStaking");
    tigerStaking = await RWAStaking.deploy(
      await tokenizinToken.getAddress(),
      await tigerRevenue.getAddress(),
      await rewardDistributor.getAddress(),
    );
    await tigerStaking.waitForDeployment();

    // Initialize RWARevenue with staking address (RWAStaking doesn't have initialize - uses constructor)
    await tigerRevenue.initialize(await tigerStaking.getAddress());

    // NOTE: TigerPalaceToken doesn't have setMaxWalletExemption or setTaxExemption functions
    // Upgradeable token doesn't have max wallet/tax restrictions
    const rewardDistributorAddress = await rewardDistributor.getAddress();
    const tigerStakingAddress = await tigerStaking.getAddress();

    // RWAStaking creates default pools in constructor (pools 1-4)
    // We can use pool 1 (1 Month Staking) or create a new one
    // For minimal test, let's use the default pool 1

    // Fund users minimally (use transfer instead of multisend)
    await tokenizinToken.transfer(user1.address, ethers.parseEther("100"));
    await tokenizinToken
      .connect(user1)
      .approve(tigerStakingAddress, ethers.parseEther("100"));
  });

  it("Should demonstrate simplified pool interface", async () => {
    // Verify the default pools were created in constructor
    // getStats() returns (uint256 _totalStaked, uint256 _totalRewardsDistributed, uint256 _poolCount)
    const [totalStaked, totalRewardsDistributed, poolCount] = await tigerStaking.getStats();
    expect(poolCount).to.be.gte(1); // At least 1 default pool

    // Verify pool info (pools start at ID 1, not 0)
    const poolInfo = await tigerStaking.getPool(1);
    expect(poolInfo.active).to.be.true;
    expect(poolInfo.duration).to.be.gt(0);
    expect(poolInfo.multiplier).to.be.gte(10000); // At least 100% (10000 basis points)
    expect(poolInfo.name).to.be.a("string");
    expect(poolInfo.poolId).to.equal(1);

    console.log("✅ Simplified pool interface verified");
    console.log(`  Pool ID: ${poolInfo.poolId}`);
    console.log(`  Pool Name: ${poolInfo.name}`);
    console.log(`  Duration: ${poolInfo.duration} seconds`);
    console.log(`  Multiplier: ${poolInfo.multiplier} basis points`);
  });
});
