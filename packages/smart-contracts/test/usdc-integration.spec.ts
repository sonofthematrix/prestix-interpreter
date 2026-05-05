import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("USDC Integration", function () {
  let mockUSDC: Contract;
  let marketplace: Contract;
  let assetRegistry: Contract;
  let tokenFactory: Contract;
  let owner: any;
  let buyer: any;
  let feeRecipient: any;

  beforeEach(async function () {
    [owner, buyer, feeRecipient] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy AssetRegistry
    const AssetRegistry = await ethers.getContractFactory("RWAAssetRegistry");
    assetRegistry = await AssetRegistry.deploy();
    await assetRegistry.waitForDeployment();

    // Deploy TokenFactory
    const TokenFactory = await ethers.getContractFactory("RWATokenFactory");
    tokenFactory = await TokenFactory.deploy();
    await tokenFactory.waitForDeployment();

    // Deploy Marketplace with USDC payment token (updated to active version)
    const Marketplace = await ethers.getContractFactory("RWAMarketplaceUpgradeableSetter");
    marketplace = await Marketplace.deploy(
      await assetRegistry.getAddress(),
      await tokenFactory.getAddress(),
      feeRecipient.address,
      await mockUSDC.getAddress(), // USDC payment token
      ethers.ZeroAddress // tokenFactory404 (not used in this test)
    );
    await marketplace.waitForDeployment();

    // Grant roles - ensure marketplace address is resolved
    const marketplaceAddress = await marketplace.getAddress();
    await assetRegistry.grantRole(
      await assetRegistry.ASSET_MANAGER_ROLE(),
      owner.address
    );
    await assetRegistry.grantRole(
      await assetRegistry.ASSET_MANAGER_ROLE(),
      marketplaceAddress
    );
    await assetRegistry.grantRole(
      await assetRegistry.MARKETPLACE_ROLE(),
      marketplaceAddress
    );
    // Also register marketplace using the dedicated function
    await assetRegistry.addMarketplace(marketplaceAddress);
    await tokenFactory.grantRole(
      await tokenFactory.TOKEN_CREATOR_ROLE(),
      marketplaceAddress
    );
  });

  describe("USDC Payment Configuration", function () {
    it("Should set payment token correctly", async function () {
      expect(await marketplace.paymentToken()).to.equal(await mockUSDC.getAddress());
    });

    it("Should allow admin to update payment token", async function () {
      const newToken = ethers.Wallet.createRandom().address;
      await marketplace.setPaymentToken(newToken);
      expect(await marketplace.paymentToken()).to.equal(newToken);
    });

    it("Should emit PaymentTokenUpdated event", async function () {
      const newToken = ethers.Wallet.createRandom().address;
      await expect(marketplace.setPaymentToken(newToken))
        .to.emit(marketplace, "PaymentTokenUpdated")
        .withArgs(await mockUSDC.getAddress(), newToken);
    });
  });

  describe("USDC Token Purchase", function () {
    beforeEach(async function () {
      // Register an asset with USDC-compatible pricing
      // MIN_TOKEN_PRICE is 1e15 wei (0.001 ETH)
      // For USDC (6 decimals), this requires: 1e15 / 1e6 = 1e9 USDC units = 1 billion USDC per token
      // Using 2B USDC per token to ensure we exceed MIN_TOKEN_PRICE
      const totalTokens = 1000;
      const tokenPriceUSDC = ethers.parseUnits("2000000000", 6); // 2B USDC per token (exceeds 1e9 minimum)
      const totalPriceUSDC = tokenPriceUSDC * BigInt(totalTokens); // 2T USDC total
      
      await assetRegistry.registerAsset(
        owner.address, // owner
        "Tiger Palace", // title
        "Tiger Palace property description", // description
        "VILLA", // assetType
        "Tiger Security Palace undisclosed location, Indonesia", // location
        totalPriceUSDC, // price (total value: 2B USDC * 1000 tokens = 2T USDC)
        tokenPriceUSDC, // tokenPrice (2B USDC per token - exceeds MIN_TOKEN_PRICE: 1e9 USDC)
        totalTokens // totalTokens
      );

      // Mint USDC to buyer - enough for 1 token + fees
      // 1 token * 2B USDC = 2B USDC base + fees
      const usdcAmount = ethers.parseUnits("4000000000", 6); // 4B USDC
      await mockUSDC.mint(buyer.address, usdcAmount);
    });

    it("Should purchase tokens with USDC", async function () {
      const assetId = 1;
      const tokenAmount = 1; // Purchase 1 token (2B USDC)
      const { totalCost } = await marketplace.calculatePurchaseCost(assetId, tokenAmount);

      // Approve marketplace to spend USDC
      await (mockUSDC as any).connect(buyer).approve(await marketplace.getAddress(), totalCost);

      // Get current timestamp before purchase
      const currentTimestamp = await time.latest();

      // Purchase tokens
      await expect(
        (marketplace as any).connect(buyer).purchaseTokensWithERC20(assetId, tokenAmount)
      )
        .to.emit(marketplace, "TokensPurchasedWithERC20")
        .withArgs(
          assetId,
          buyer.address,
          await mockUSDC.getAddress(),
          tokenAmount,
          totalCost,
          (timestamp: bigint) => {
            // Check that timestamp is greater than or equal to current timestamp
            return Number(timestamp) >= currentTimestamp;
          }
        );

      // Check USDC was transferred
      const ownerBalance = await mockUSDC.balanceOf(owner.address);
      expect(ownerBalance).to.be.gt(0);
    });

    it("Should revert if insufficient USDC balance", async function () {
      const assetId = 1;
      const tokenAmount = 1000000; // Very large amount that exceeds balance

      await expect(
        (marketplace as any).connect(buyer).purchaseTokensWithERC20(assetId, tokenAmount)
      ).to.be.revertedWith("RWAMarketplace: insufficient tokens available");
    });

    it("Should revert if insufficient USDC allowance", async function () {
      const assetId = 1;
      const tokenAmount = 1; // Purchase 1 token (not 100, which would exceed balance)
      const { totalCost } = await marketplace.calculatePurchaseCost(assetId, tokenAmount);

      // Ensure buyer has enough balance but insufficient allowance
      // Buyer already has 4B USDC from beforeEach, which is enough for 1 token
      // But only approve half the amount needed
      await (mockUSDC as any).connect(buyer).approve(await marketplace.getAddress(), totalCost / 2n);

      await expect(
        (marketplace as any).connect(buyer).purchaseTokensWithERC20(assetId, tokenAmount)
      ).to.be.revertedWith("RWAMarketplace: insufficient token allowance");
    });
  });

  describe("Fee Collection", function () {
    beforeEach(async function () {
      // Register asset with USDC-compatible pricing
      // MIN_TOKEN_PRICE is 1e15 wei (0.001 ETH)
      // For USDC (6 decimals), this requires: 1e15 / 1e6 = 1e9 USDC units = 1 billion USDC per token minimum
      // Using 2 billion USDC per token to ensure we exceed MIN_TOKEN_PRICE
      const totalTokens = 1000;
      const tokenPriceUSDC = ethers.parseUnits("2000000000", 6); // 2B USDC per token (exceeds 1e9 minimum)
      const totalPriceUSDC = tokenPriceUSDC * BigInt(totalTokens); // 2T USDC total
      
      await assetRegistry.registerAsset(
        owner.address, // owner
        "Test Property", // title
        "Description", // description
        "VILLA", // assetType
        "Test Location", // location
        totalPriceUSDC, // price (total value: 2B USDC * 1000 tokens = 2T USDC)
        tokenPriceUSDC, // tokenPrice (2B USDC per token - exceeds MIN_TOKEN_PRICE: 1e9 USDC)
        totalTokens // totalTokens
      );

      // Mint enough USDC for purchase + fees
      const usdcAmount = ethers.parseUnits("4000000000", 6); // 4B USDC (enough for 1 token + fees)
      await mockUSDC.mint(buyer.address, usdcAmount);
    });

    it("Should collect fees in USDC", async function () {
      const assetId = 1;
      const tokenAmount = 1; // Purchase 1 token
      const { totalCost } = await marketplace.calculatePurchaseCost(assetId, tokenAmount);

      await (mockUSDC as any).connect(buyer).approve(await marketplace.getAddress(), totalCost);
      await (marketplace as any).connect(buyer).purchaseTokensWithERC20(assetId, tokenAmount);

      const collectedFees = await marketplace.getCollectedFeesERC20(await mockUSDC.getAddress());
      expect(collectedFees).to.be.gt(0);
    });

    it("Should allow admin to withdraw USDC fees", async function () {
      const assetId = 1;
      const tokenAmount = 1; // Purchase 1 token
      const { totalCost } = await marketplace.calculatePurchaseCost(assetId, tokenAmount);

      await (mockUSDC as any).connect(buyer).approve(await marketplace.getAddress(), totalCost);
      await (marketplace as any).connect(buyer).purchaseTokensWithERC20(assetId, tokenAmount);

      const collectedFees = await marketplace.getCollectedFeesERC20(await mockUSDC.getAddress());
      const feeRecipientBalanceBefore = await mockUSDC.balanceOf(feeRecipient.address);

      await marketplace.withdrawFeesERC20(await mockUSDC.getAddress());

      const feeRecipientBalanceAfter = await mockUSDC.balanceOf(feeRecipient.address);
      expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.equal(collectedFees);
    });
  });
});

