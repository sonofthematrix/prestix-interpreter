/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import hre from "hardhat";
const { ethers } = hre as any;
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MaxUint256, parseEther, ZeroAddress } from "ethers";

describe("RewardDistributor Contract", function () {
  let rewardDistributor: any;
  let tokenizinToken: any;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let spender: SignerWithAddress;

  beforeEach(async () => {
    [owner, treasury, user1, user2, spender] = await ethers.getSigners();

    // Deploy TigerPalaceToken using upgradeable pattern (production pattern)
    const { deployTigerPalaceTokenUpgradeable } = require("./utils/token-deployment");
    const { token } = await deployTigerPalaceTokenUpgradeable(owner, {
      minBalance: parseEther("11000000"), // 11M tokens minimum
    });
    tokenizinToken = token;
    
    // NOTE: TigerPalaceToken doesn't have updateTaxRates function
    // Tax functionality is not implemented in the upgradeable version

    // Deploy RewardDistributor directly (not via proxy) to ensure deployer has DEFAULT_ADMIN_ROLE
    // RWARewardDistributor constructor requires parameters
    rewardDistributor = await (
      await ethers.getContractFactory("RWARewardDistributor")
    ).deploy(
      await tokenizinToken.getAddress(),
      treasury.address,
      parseEther("1000"),
    );
    await rewardDistributor.waitForDeployment();

    // NOTE: TigerPalaceToken doesn't have setMaxWalletExemption or setTaxExemption functions
    // Upgradeable token doesn't have max wallet/tax restrictions
    
    // Transfer some tokens to the reward distributor for testing
    await tokenizinToken.transfer(await rewardDistributor.getAddress(), parseEther("10000"));

    // execTransaction removed; no target/selector whitelisting
  });

  describe("Access Control", () => {
    it("should only allow admin to pause/unpause", async () => {
      // RWARewardDistributor uses AccessControl, not Ownable
      // Only DEFAULT_ADMIN_ROLE can pause
      await expect(rewardDistributor.connect(user1).pause()).to.be.reverted;

      // Admin (deployer) can pause
      await rewardDistributor.pause();
      expect(await rewardDistributor.paused()).to.be.true;

      // Only admin can unpause
      await expect(rewardDistributor.connect(user1).unpause()).to.be.reverted;

      // Admin can unpause
      await rewardDistributor.unpause();
      expect(await rewardDistributor.paused()).to.be.false;
    });
  });

  describe("Pausable Functionality", () => {
    it("should prevent operations when paused", async () => {
      await rewardDistributor.pause();

      // When paused, operations that require whenNotPaused modifier should revert
      // For example, addRewards requires whenNotPaused
      await expect(
        rewardDistributor.addRewards(parseEther("100"), "test"),
      ).to.be.reverted;

      await rewardDistributor.unpause();
    });
  });
});
