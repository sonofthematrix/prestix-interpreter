import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { parseEther, ZeroAddress } from "ethers";

/**
 * RWA Asset Registry Tests
 *
 * Tests the RWAAssetRegistry contract functionality:
 * - Asset registration and management
 * - Access control and permissions
 * - Asset status updates
 * - Marketplace role integration
 * - Asset data validation
 */

describe("RWAAssetRegistry", function () {
  let assetRegistry: any;
  let deployer: SignerWithAddress;
  let assetOwner: SignerWithAddress;
  let marketplace: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  // Test data
  const ASSET_ID_1 = 1n;
  const ASSET_ID_2 = 2n;
  const TOTAL_TOKENS = 1000; // 1000 tokens (not wei)
  const TOKEN_PRICE = parseEther("10"); // 10 ETH per token
  const ASSET_NAME = "Test Property Asset";
  const ASSET_SYMBOL = "TPA";

  beforeEach(async function () {
    [deployer, assetOwner, marketplace, unauthorized] = await ethers.getSigners();

    // Deploy AssetRegistry
    const AssetRegistry = await ethers.getContractFactory("RWAAssetRegistry");
    assetRegistry = await AssetRegistry.deploy();
    await assetRegistry.waitForDeployment();

    // Grant roles
    await assetRegistry.grantRole(await assetRegistry.MARKETPLACE_ROLE(), marketplace.address);
    await assetRegistry.grantRole(await assetRegistry.ASSET_MANAGER_ROLE(), assetOwner.address);
    await assetRegistry.grantRole(await assetRegistry.ASSET_MANAGER_ROLE(), marketplace.address);
  });

  describe("Asset Registration", function () {
    it("should register a new asset successfully", async function () {
      await expect(
        assetRegistry.connect(assetOwner).registerAsset(
          assetOwner.address, // owner
          ASSET_NAME, // title
          "Test property description", // description
          "PROPERTY", // assetType
          "Test Location", // location
          parseEther("100000"), // price (100k ETH)
          TOKEN_PRICE, // tokenPrice
          TOTAL_TOKENS // totalTokens
        )
      ).to.emit(assetRegistry, "AssetRegistered");

      // Verify asset data
      const asset = await assetRegistry.getAsset(1); // First asset gets ID 1 (counter starts at 1)
      expect(asset.totalTokens).to.equal(BigInt(TOTAL_TOKENS));
      expect(asset.availableTokens).to.equal(TOTAL_TOKENS);
      expect(asset.tokenPrice).to.equal(TOKEN_PRICE);
      expect(asset.title).to.equal(ASSET_NAME);
      expect(asset.owner).to.equal(assetOwner.address);
      expect(asset.status).to.equal(1); // ACTIVE
    });

    it("should allow multiple asset registrations", async function () {
      // Register first asset
      await expect(
        assetRegistry.connect(assetOwner).registerAsset(
          assetOwner.address, // owner
          ASSET_NAME, // title
          "Test property description", // description
          "PROPERTY", // assetType
          "Test Location", // location
          parseEther("100000"), // price (100k ETH)
          TOKEN_PRICE, // tokenPrice
          TOTAL_TOKENS // totalTokens
        )
      ).to.emit(assetRegistry, "AssetRegistered");

      // Register second asset (should succeed)
      await expect(
        assetRegistry.connect(assetOwner).registerAsset(
          assetOwner.address, // owner
          "Second Asset", // title
          "Second property description", // description
          "PROPERTY", // assetType
          "Second Location", // location
          parseEther("200000"), // price (200k ETH)
          parseEther("20"), // tokenPrice
          2000 // totalTokens
        )
      ).to.emit(assetRegistry, "AssetRegistered");

      // Verify both assets exist
      const asset1 = await assetRegistry.getAsset(1);
      const asset2 = await assetRegistry.getAsset(2);

      expect(asset1.title).to.equal(ASSET_NAME);
      expect(asset2.title).to.equal("Second Asset");
      expect(asset1.totalTokens).to.equal(BigInt(TOTAL_TOKENS));
      expect(asset2.totalTokens).to.equal(BigInt(2000));
    });

    it("should reject registration with zero total tokens", async function () {
      await expect(
        assetRegistry.connect(assetOwner).registerAsset(
          assetOwner.address, // owner
          ASSET_NAME, // title
          "Test property description", // description
          "PROPERTY", // assetType
          "Test Location", // location
          parseEther("100000"), // price (100k ETH)
          TOKEN_PRICE, // tokenPrice
          0 // totalTokens (zero - should fail)
        )
      ).to.be.revertedWith("RWAAssetRegistry: invalid total tokens");
    });

    it("should reject registration with zero token price", async function () {
      await expect(
        assetRegistry.connect(assetOwner).registerAsset(
          assetOwner.address, // owner
          ASSET_NAME, // title
          "Test property description", // description
          "PROPERTY", // assetType
          "Test Location", // location
          parseEther("100000"), // price (100k ETH)
          0, // tokenPrice (zero - should fail)
          TOTAL_TOKENS // totalTokens
        )
      ).to.be.revertedWith("RWAAssetRegistry: token price too low");
    });

    it("should reject registration with empty name", async function () {
      await expect(
        assetRegistry.connect(assetOwner).registerAsset(
          assetOwner.address, // owner
          "", // title (empty - should fail)
          "Test property description", // description
          "PROPERTY", // assetType
          "Test Location", // location
          parseEther("100000"), // price (100k ETH)
          TOKEN_PRICE, // tokenPrice
          TOTAL_TOKENS // totalTokens
        )
      ).to.be.revertedWith("RWAAssetRegistry: invalid title");
    });

    it("should reject registration with zero address owner", async function () {
      await expect(
        assetRegistry.connect(assetOwner).registerAsset(
          ZeroAddress, // owner (zero address - should fail)
          ASSET_NAME, // title
          "Test property description", // description
          "PROPERTY", // assetType
          "Test Location", // location
          parseEther("100000"), // price (100k ETH)
          TOKEN_PRICE, // tokenPrice
          TOTAL_TOKENS // totalTokens
        )
      ).to.be.revertedWith("RWAAssetRegistry: invalid owner");
    });
  });

  describe("Asset Updates", function () {
    beforeEach(async function () {
      // Register asset for update tests
      await assetRegistry.connect(assetOwner).registerAsset(
        assetOwner.address, // owner
        ASSET_NAME, // title
        "Test property description", // description
        "PROPERTY", // assetType
        "Test Location", // location
        parseEther("100000"), // price (100k ETH)
        TOKEN_PRICE, // tokenPrice
        TOTAL_TOKENS // totalTokens
      );
    });

    it("should update asset price by owner", async function () {
      const newTokenPrice = parseEther("15");

      await expect(
        assetRegistry.connect(assetOwner).updateAsset(
          ASSET_ID_1,
          parseEther("100000"), // newPrice (same as original)
          newTokenPrice // newTokenPrice
        )
      ).to.emit(assetRegistry, "AssetUpdated");

      const asset = await assetRegistry.getAsset(ASSET_ID_1);
      expect(asset.tokenPrice).to.equal(newTokenPrice);
    });

    it("should update asset status by marketplace", async function () {
      await expect(
        assetRegistry.connect(marketplace).updateAssetStatus(ASSET_ID_1, 2) // SOLD_OUT
      ).to.emit(assetRegistry, "AssetStatusChanged");

      const asset = await assetRegistry.getAsset(ASSET_ID_1);
      expect(asset.status).to.equal(2);
    });

    it("should update token availability by marketplace", async function () {
      const soldTokens = 100; // 100 tokens (not wei)

      // Update token availability
      await assetRegistry.connect(marketplace).updateTokenAvailability(ASSET_ID_1, soldTokens);

      const asset = await assetRegistry.getAsset(ASSET_ID_1);
      expect(asset.availableTokens).to.equal(BigInt(TOTAL_TOKENS - soldTokens));
      expect(asset.soldTokens).to.equal(BigInt(soldTokens));
    });

    it("should reject price update by non-owner", async function () {
      const newTokenPrice = parseEther("15");

      await expect(
        assetRegistry.connect(unauthorized).updateAsset(
          ASSET_ID_1,
          parseEther("100000"), // newPrice (same)
          newTokenPrice // newTokenPrice
        )
      ).to.be.revertedWith("RWAAssetRegistry: unauthorized");
    });

    it("should reject status update by non-marketplace", async function () {
        await expect(
          assetRegistry.connect(unauthorized).updateAssetStatus(ASSET_ID_1, 2)
        ).to.be.revertedWith("AccessControl: account");
    });

    it("should reject availability update by non-marketplace", async function () {
      const soldTokens = 100; // 100 tokens (not wei)

      await expect(
        assetRegistry.connect(unauthorized).updateTokenAvailability(ASSET_ID_1, soldTokens)
      ).to.be.reverted; // AccessControl revert
    });

    it("should reject price update to zero", async function () {
      await expect(
        assetRegistry.connect(assetOwner).updateAsset(
          ASSET_ID_1,
          parseEther("100000"), // valid price
          0 // zero tokenPrice - should fail
        )
      ).to.be.revertedWith("RWAAssetRegistry: token price too low");
    });

    it("should reject overselling tokens", async function () {
      const tooManyTokens = TOTAL_TOKENS + 1; // 1 more token than available

      await expect(
        assetRegistry.connect(marketplace).updateTokenAvailability(ASSET_ID_1, tooManyTokens)
      ).to.be.revertedWith("RWAAssetRegistry: insufficient tokens");
    });
  });

  describe("Asset Queries", function () {
    beforeEach(async function () {
      // Register multiple assets
      await assetRegistry.connect(assetOwner).registerAsset(
        assetOwner.address, // owner
        ASSET_NAME, // title
        "Test property description", // description
        "PROPERTY", // assetType
        "Test Location", // location
        parseEther("100000"), // price (100k ETH)
        TOKEN_PRICE, // tokenPrice
        TOTAL_TOKENS // totalTokens
      );

      await assetRegistry.connect(assetOwner).registerAsset(
        assetOwner.address, // owner
        "Second Asset", // title
        "Second property description", // description
        "PROPERTY", // assetType
        "Second Location", // location
        parseEther("200000"), // price (200k ETH)
        parseEther("20"), // tokenPrice
        2000 // totalTokens
      );
    });

    it("should return correct asset data", async function () {
      const asset = await assetRegistry.getAsset(ASSET_ID_1);

      expect(asset.id).to.equal(ASSET_ID_1);
      expect(asset.totalTokens).to.equal(BigInt(TOTAL_TOKENS));
      expect(asset.availableTokens).to.equal(TOTAL_TOKENS);
      expect(asset.tokenPrice).to.equal(TOKEN_PRICE);
      expect(asset.name).to.equal(ASSET_NAME);
      expect(asset.symbol).to.equal(ASSET_SYMBOL);
      expect(asset.owner).to.equal(assetOwner.address);
      expect(asset.status).to.equal(1); // ACTIVE
    });

    it("should return all assets", async function () {
      const assets = await assetRegistry.getAllAssets();
      expect(assets.length).to.equal(2);

      const asset1 = assets.find((a: any) => a.id === ASSET_ID_1);
      const asset2 = assets.find((a: any) => a.id === ASSET_ID_2);

      expect(asset1).to.not.be.undefined;
      expect(asset2).to.not.be.undefined;
      expect(asset1.name).to.equal(ASSET_NAME);
      expect(asset2.name).to.equal("Second Asset");
    });

    it("should return assets by owner", async function () {
      const ownerAssets = await assetRegistry.getAssetsByOwner(assetOwner.address);
      expect(ownerAssets.length).to.equal(2);

      ownerAssets.forEach((asset: any) => {
        expect(asset.owner).to.equal(assetOwner.address);
      });
    });

    it("should return assets by status", async function () {
      const activeAssets = await assetRegistry.getAssetsByStatus(1); // ACTIVE
      expect(activeAssets.length).to.equal(2);

      // Change one asset status
      await assetRegistry.connect(marketplace).updateAssetStatus(ASSET_ID_1, 2); // SOLD_OUT

      const soldOutAssets = await assetRegistry.getAssetsByStatus(2); // SOLD_OUT
      expect(soldOutAssets.length).to.equal(1);
      expect(soldOutAssets[0].id).to.equal(ASSET_ID_1);
    });

    it("should revert on non-existent asset", async function () {
      await expect(
        assetRegistry.getAsset(999n)
      ).to.be.revertedWith("Asset not registered");
    });
  });

  describe("Access Control", function () {
    it("should grant and revoke marketplace role", async function () {
      const MARKETPLACE_ROLE = await assetRegistry.MARKETPLACE_ROLE();

      // Grant role
      await assetRegistry.grantRole(MARKETPLACE_ROLE, marketplace.address);
      expect(await assetRegistry.hasRole(MARKETPLACE_ROLE, marketplace.address)).to.be.true;

      // Revoke role
      await assetRegistry.revokeRole(MARKETPLACE_ROLE, marketplace.address);
      expect(await assetRegistry.hasRole(MARKETPLACE_ROLE, marketplace.address)).to.be.false;
    });

    it("should restrict role management to admin", async function () {
      const MARKETPLACE_ROLE = await assetRegistry.MARKETPLACE_ROLE();

      await expect(
        assetRegistry.connect(unauthorized).grantRole(MARKETPLACE_ROLE, unauthorized.address)
      ).to.be.revertedWith("AccessControl:");
    });

    it("should allow owner to renounce roles", async function () {
      const MARKETPLACE_ROLE = await assetRegistry.MARKETPLACE_ROLE();

      await assetRegistry.connect(marketplace).renounceRole(MARKETPLACE_ROLE, marketplace.address);
      expect(await assetRegistry.hasRole(MARKETPLACE_ROLE, marketplace.address)).to.be.false;
    });
  });

  describe("Emergency Controls", function () {
    beforeEach(async function () {
      // Register asset for emergency tests
      await assetRegistry.connect(assetOwner).registerAsset(
        assetOwner.address, // owner
        ASSET_NAME, // title
        "Test property description", // description
        "PROPERTY", // assetType
        "Test Location", // location
        parseEther("100000"), // price (100k ETH)
        TOKEN_PRICE, // tokenPrice
        TOTAL_TOKENS // totalTokens
      );
    });

    it("should pause and unpause contract", async function () {
      // Pause contract
      await assetRegistry.pause();
      expect(await assetRegistry.paused()).to.be.true;

      // Try operations while paused
      await expect(
        assetRegistry.connect(assetOwner).registerAsset(
          ASSET_ID_2,
          TOTAL_TOKENS,
          "New Asset",
          "NEW",
          TOKEN_PRICE,
          assetOwner.address
        )
      ).to.be.revertedWith("Pausable: paused");

      // Unpause contract
      await assetRegistry.unpause();
      expect(await assetRegistry.paused()).to.be.false;

      // Operations should work again
      await expect(
        assetRegistry.connect(assetOwner).registerAsset(
          ASSET_ID_2,
          TOTAL_TOKENS,
          "New Asset",
          "NEW",
          TOKEN_PRICE,
          assetOwner.address
        )
      ).to.emit(assetRegistry, "AssetRegistered");
    });

    it("should restrict pause/unpause to owner", async function () {
      await expect(
        assetRegistry.connect(unauthorized).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
        assetRegistry.connect(unauthorized).unpause()
      ).to.be.revertedWith("AccessControl: account");
    });
  });

  describe("Events", function () {
    it("should emit AssetRegistered event", async function () {
      const newAssetId = await assetRegistry.getTotalAssets();
      await expect(
        assetRegistry.connect(assetOwner).registerAsset(
          assetOwner.address, // owner
          "Event Test Asset", // title
          "Description", // description
          "PROPERTY", // assetType
          "Location", // location
          parseEther("50000"), // price
          parseEther("5"), // tokenPrice
          500 // totalTokens
        )
      ).to.emit(assetRegistry, "AssetRegistered");
    });

    it("should emit AssetUpdated event", async function () {
      // Register asset first
      await assetRegistry.connect(assetOwner).registerAsset(
        assetOwner.address, // owner
        ASSET_NAME, // title
        "Test property description", // description
        "PROPERTY", // assetType
        "Test Location", // location
        parseEther("100000"), // price (100k ETH)
        TOKEN_PRICE, // tokenPrice
        TOTAL_TOKENS // totalTokens
      );

      const newTokenPrice = parseEther("15");
      const newTotalAssetPrice = parseEther("150000"); // Corresponds to 15 ETH token price for 10000 tokens

      await expect(
        assetRegistry.connect(assetOwner).updateAsset(ASSET_ID_1, newTotalAssetPrice, newTokenPrice)
      ).to.emit(assetRegistry, "AssetUpdated");
    });

    it("should emit AssetStatusChanged event", async function () {
      // Register asset first
      await assetRegistry.connect(assetOwner).registerAsset(
        assetOwner.address, // owner
        ASSET_NAME, // title
        "Test property description", // description
        "PROPERTY", // assetType
        "Test Location", // location
        parseEther("100000"), // price (100k ETH)
        TOKEN_PRICE, // tokenPrice
        TOTAL_TOKENS // totalTokens
      );

      await expect(
        assetRegistry.connect(marketplace).updateAssetStatus(ASSET_ID_1, 2)
      ).to.emit(assetRegistry, "AssetStatusChanged");
    });

    it("should emit AssetStatusChanged event on token availability update", async function () {
      // Register asset first
      await assetRegistry.connect(assetOwner).registerAsset(
        assetOwner.address, // owner
        ASSET_NAME, // title
        "Test property description", // description
        "PROPERTY", // assetType
        "Test Location", // location
        parseEther("100000"), // price (100k ETH)
        TOKEN_PRICE, // tokenPrice
        TOTAL_TOKENS // totalTokens
      );

      const soldTokens = 100; // In token units, not wei

      await expect(
        assetRegistry.connect(marketplace).updateTokenAvailability(ASSET_ID_1, soldTokens)
      ).to.emit(assetRegistry, "AssetStatusChanged");
    });
  });
});