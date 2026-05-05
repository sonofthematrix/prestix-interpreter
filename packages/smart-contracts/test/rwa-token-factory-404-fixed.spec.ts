import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { deployTokenizinTokenUpgradeable } from "./utils/token-deployment";

/**
 * Tests for RWATokenFactory404Fixed
 * 
 * This test suite verifies the FIXED version which:
 * - Validates allowance before transfers
 * - Validates balance before transfers
 * - Transfers existing tokens instead of minting new ones
 * - Prevents supply inflation
 */
describe("RWATokenFactory404Fixed", function () {
  let factory404Fixed: Contract;
  let assetRegistry: Contract;
  let owner: any;
  let user: any;
  let tokenAddress: string;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy AssetRegistry
    const AssetRegistry = await ethers.getContractFactory("RWAAssetRegistry");
    assetRegistry = await AssetRegistry.deploy();
    await assetRegistry.waitForDeployment();

    // Deploy RWATokenFactory404Fixed
    const Factory404Fixed = await ethers.getContractFactory("RWATokenFactory404Fixed");
    factory404Fixed = await Factory404Fixed.deploy();
    await factory404Fixed.waitForDeployment();

    // Grant roles
    await assetRegistry.grantRole(
      await assetRegistry.ASSET_MANAGER_ROLE(),
      owner.address
    );
    await factory404Fixed.grantRole(
      await factory404Fixed.TOKEN_CREATOR_ROLE(),
      owner.address
    );

    // Register asset and create token
    await assetRegistry.registerAsset(
      owner.address,
      "Test Property",
      "Description",
      "VILLA",
      "Location",
      ethers.parseEther("1000000"),
      ethers.parseEther("1000"),
      1000
    );

    const tx = await (factory404Fixed as any).connect(owner).createToken404(
      1,
      "Test Token",
      "TEST",
      ethers.parseEther("1000"),
      owner.address,
      "https://example.com/metadata"
    );

    const receipt = await tx.wait();
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = factory404Fixed.interface.parseLog(log);
        return parsed?.name === 'Token404Created';
      } catch {
        return false;
      }
    });
    const parsed = factory404Fixed.interface.parseLog(event!);
    tokenAddress = parsed?.args.tokenAddress;
  });

  describe("mintTokens() - Fixed Implementation", function () {
    let token: Contract;

    beforeEach(async function () {
      const RWAToken404Fixed = await ethers.getContractFactory("RWAToken404Fixed");
      token = RWAToken404Fixed.attach(tokenAddress);
    });

    it("Should transfer tokens from owner to buyer (not mint)", async function () {
      // Owner should have all tokens initially
      const ownerBalanceBefore = await token.balanceOf(owner.address);
      expect(ownerBalanceBefore).to.equal(ethers.parseEther("1000"));

      // Approve factory to transfer tokens
      await (token as any).connect(owner).approve(await factory404Fixed.getAddress(), ethers.parseEther("100"));

      // Transfer tokens via factory
      await (factory404Fixed as any).connect(owner).mintTokens(1, user.address, ethers.parseEther("100"));

      // Verify balances
      const ownerBalanceAfter = await token.balanceOf(owner.address);
      const userBalance = await token.balanceOf(user.address);

      expect(ownerBalanceAfter).to.equal(ethers.parseEther("900")); // Owner lost 100
      expect(userBalance).to.equal(ethers.parseEther("100")); // User gained 100
      
      // Total supply should remain the same
      const totalSupply = await token.totalSupply();
      expect(totalSupply).to.equal(ethers.parseEther("1000"));
    });

    it("Should revert if allowance is insufficient", async function () {
      // Don't approve factory
      // Try to transfer more than approved (0)
      await expect(
        (factory404Fixed as any).connect(owner).mintTokens(1, user.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(factory404Fixed, "InsufficientAllowance");
    });

    it("Should revert if owner balance is insufficient", async function () {
      // Approve factory
      await (token as any).connect(owner).approve(await factory404Fixed.getAddress(), ethers.parseEther("1000"));

      // Transfer all tokens to another address first
      await (token as any).connect(owner).transfer(user.address, ethers.parseEther("1000"));

      // Now owner has 0 balance, try to transfer via factory
      await expect(
        (factory404Fixed as any).connect(owner).mintTokens(1, user.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(factory404Fixed, "InsufficientBalance");
    });

    it("Should revert if allowance is less than requested amount", async function () {
      // Approve only 50 tokens
      await (token as any).connect(owner).approve(await factory404Fixed.getAddress(), ethers.parseEther("50"));

      // Try to transfer 100 tokens
      await expect(
        (factory404Fixed as any).connect(owner).mintTokens(1, user.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(factory404Fixed, "InsufficientAllowance");
    });

    it("Should maintain total supply integrity", async function () {
      const initialSupply = await token.totalSupply();
      expect(initialSupply).to.equal(ethers.parseEther("1000"));

      // Approve and transfer
      await (token as any).connect(owner).approve(await factory404Fixed.getAddress(), ethers.parseEther("500"));
      await (factory404Fixed as any).connect(owner).mintTokens(1, user.address, ethers.parseEther("500"));

      // Total supply should remain the same
      const finalSupply = await token.totalSupply();
      expect(finalSupply).to.equal(initialSupply);
      expect(finalSupply).to.equal(ethers.parseEther("1000"));
    });
  });

  describe("Token Creation", function () {
    it("Should create ERC-404 token successfully", async function () {
      const assetId = 2;
      const name = "Tiger Palace Property #404 Fixed";
      const symbol = "TPP404F";
      const totalSupply = ethers.parseEther("2000");
      const tokenURI = "https://example.com/metadata/404-fixed";

      // Register new asset
      await assetRegistry.registerAsset(
        owner.address,
        "Test Property 2",
        "Description 2",
        "VILLA",
        "Location 2",
        ethers.parseEther("2000000"),
        ethers.parseEther("2000"),
        2000
      );

      const tx = await (factory404Fixed as any).connect(owner).createToken404(
        assetId,
        name,
        symbol,
        totalSupply,
        owner.address,
        tokenURI
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = factory404Fixed.interface.parseLog(log);
          return parsed?.name === 'Token404Created';
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      const parsed = factory404Fixed.interface.parseLog(event!);
      expect(parsed?.args.assetId).to.equal(assetId);
      expect(parsed?.args.name).to.equal(name);
      expect(parsed?.args.symbol).to.equal(symbol);
      expect(parsed?.args.tokenURI).to.equal(tokenURI);

      // Verify token address
      const newTokenAddress = parsed?.args.tokenAddress;
      expect(newTokenAddress).to.not.equal(ethers.ZeroAddress);

      // Verify token is valid
      const isValid = await factory404Fixed.isValidToken(newTokenAddress);
      expect(isValid).to.be.true;

      // Verify owner is tracked
      const RWAToken404Fixed = await ethers.getContractFactory("RWAToken404Fixed");
      const newToken = RWAToken404Fixed.attach(newTokenAddress);
      const ownerBalance = await newToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(totalSupply);
    });
  });

  describe("createToken404WithMarketplace", function () {
    let marketplace: Contract;

    beforeEach(async function () {
      // Deploy a mock marketplace for testing
      const Marketplace = await ethers.getContractFactory("RWAMarketplace");
      marketplace = await Marketplace.deploy(
        await assetRegistry.getAddress(),
        ethers.ZeroAddress, // ERC20 factory
        owner.address, // fee recipient
        ethers.ZeroAddress, // paymentToken
        await factory404Fixed.getAddress() // ERC404 factory
      );
      await marketplace.waitForDeployment();

      // Grant marketplace TOKEN_CREATOR_ROLE
      const TOKEN_CREATOR_ROLE = await factory404Fixed.TOKEN_CREATOR_ROLE();
      await factory404Fixed.grantRole(TOKEN_CREATOR_ROLE, await marketplace.getAddress());
    });

    it("Should mint tokens to marketplace when marketplace address provided", async function () {
      const assetId = 3;
      const name = "Marketplace Token";
      const symbol = "MPT";
      const totalSupply = ethers.parseEther("5000");
      const tokenURI = "https://example.com/marketplace-token";

      // Register new asset
      await assetRegistry.registerAsset(
        owner.address,
        "Marketplace Property",
        "Description",
        "VILLA",
        "Location",
        ethers.parseEther("5000000"),
        ethers.parseEther("5"),
        5000
      );

      // Create token with marketplace custody
      const tx = await (factory404Fixed as any).connect(owner).createToken404WithMarketplace(
        assetId,
        name,
        symbol,
        totalSupply,
        owner.address, // owner receives payment
        await marketplace.getAddress(), // marketplace receives tokens
        tokenURI
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = factory404Fixed.interface.parseLog(log);
          return parsed?.name === 'Token404Created';
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      const parsed = factory404Fixed.interface.parseLog(event!);
      const newTokenAddress = parsed?.args.tokenAddress;

      // Verify token details
      expect(parsed?.args.assetId).to.equal(assetId);
      expect(parsed?.args.name).to.equal(name);
      expect(parsed?.args.symbol).to.equal(symbol);
      expect(parsed?.args.tokenURI).to.equal(tokenURI);

      // Get token contract
      const RWAToken404Fixed = await ethers.getContractFactory("RWAToken404Fixed");
      const newToken = RWAToken404Fixed.attach(newTokenAddress);

      // Verify marketplace owns all tokens
      const marketplaceBalance = await newToken.balanceOf(await marketplace.getAddress());
      expect(marketplaceBalance).to.equal(totalSupply);

      // Verify owner has no tokens
      const ownerBalance = await newToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(0);

      // Verify total supply
      const totalSupplyCheck = await newToken.totalSupply();
      expect(totalSupplyCheck).to.equal(totalSupply);
    });

    it("Should mint tokens to owner when marketplace is zero address", async function () {
      const assetId = 4;
      const totalSupply = ethers.parseEther("3000");

      // Register new asset
      await assetRegistry.registerAsset(
        owner.address,
        "Owner Property",
        "Description",
        "VILLA",
        "Location",
        ethers.parseEther("3000000"),
        ethers.parseEther("3"),
        3000
      );

      // Create token without marketplace (backward compatibility)
      const tx = await (factory404Fixed as any).connect(owner).createToken404WithMarketplace(
        assetId,
        "Owner Token",
        "OWN",
        totalSupply,
        owner.address,
        ethers.ZeroAddress, // No marketplace
        "https://example.com/owner-token"
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = factory404Fixed.interface.parseLog(log);
          return parsed?.name === 'Token404Created';
        } catch {
          return false;
        }
      });

      const parsed = factory404Fixed.interface.parseLog(event!);
      const newTokenAddress = parsed?.args.tokenAddress;

      const RWAToken404Fixed = await ethers.getContractFactory("RWAToken404Fixed");
      const newToken = RWAToken404Fixed.attach(newTokenAddress);

      // Verify owner owns all tokens
      const ownerBalance = await newToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(totalSupply);

      // Verify marketplace has no tokens
      const marketplaceBalance = await newToken.balanceOf(await marketplace.getAddress());
      expect(marketplaceBalance).to.equal(0);
    });

    it("Should not approve factory when tokens minted to marketplace", async function () {
      const assetId = 5;
      const totalSupply = ethers.parseEther("1000");

      // Register new asset
      await assetRegistry.registerAsset(
        owner.address,
        "No Approval Property",
        "Description",
        "VILLA",
        "Location",
        ethers.parseEther("1000000"),
        ethers.parseEther("1"),
        1000
      );

      // Create token with marketplace custody
      const tx = await (factory404Fixed as any).connect(owner).createToken404WithMarketplace(
        assetId,
        "No Approval Token",
        "NAT",
        totalSupply,
        owner.address,
        await marketplace.getAddress(),
        "https://example.com/no-approval-token"
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = factory404Fixed.interface.parseLog(log);
          return parsed?.name === 'Token404Created';
        } catch {
          return false;
        }
      });

      const parsed = factory404Fixed.interface.parseLog(event!);
      const newTokenAddress = parsed?.args.tokenAddress;

      const RWAToken404Fixed = await ethers.getContractFactory("RWAToken404Fixed");
      const newToken = RWAToken404Fixed.attach(newTokenAddress);

      // Check that factory has no allowance from marketplace
      const factoryAllowance = await newToken.allowance(
        await marketplace.getAddress(),
        await factory404Fixed.getAddress()
      );
      expect(factoryAllowance).to.equal(0);
    });

    it("Should approve factory when tokens minted to owner (backward compatibility)", async function () {
      const assetId = 6;
      const totalSupply = ethers.parseEther("1000");

      // Register new asset
      await assetRegistry.registerAsset(
        owner.address,
        "Approval Property",
        "Description",
        "VILLA",
        "Location",
        ethers.parseEther("1000000"),
        ethers.parseEther("1"),
        1000
      );

      // Create token without marketplace (backward compatibility)
      const tx = await (factory404Fixed as any).connect(owner).createToken404WithMarketplace(
        assetId,
        "Approval Token",
        "APT",
        totalSupply,
        owner.address,
        ethers.ZeroAddress, // No marketplace
        "https://example.com/approval-token"
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = factory404Fixed.interface.parseLog(log);
          return parsed?.name === 'Token404Created';
        } catch {
          return false;
        }
      });

      const parsed = factory404Fixed.interface.parseLog(event!);
      const newTokenAddress = parsed?.args.tokenAddress;

      const RWAToken404Fixed = await ethers.getContractFactory("RWAToken404Fixed");
      const newToken = RWAToken404Fixed.attach(newTokenAddress);

      // Check that factory has allowance from owner (backward compatibility)
      const factoryAllowance = await newToken.allowance(
        owner.address,
        await factory404Fixed.getAddress()
      );
      expect(factoryAllowance).to.equal(totalSupply);
    });
  });

  describe("View Functions", function () {
    it("Should return token address for asset", async function () {
      const tokenAddress = await factory404Fixed.getTokenAddress(1);
      expect(tokenAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should return asset ID for token", async function () {
      const tokenAddress = await factory404Fixed.getTokenAddress(1);
      const assetId = await factory404Fixed.getAssetId(tokenAddress);
      expect(assetId).to.equal(1);
    });

    it("Should return all tokens", async function () {
      const tokens = await factory404Fixed.getAllTokens();
      expect(tokens.length).to.equal(1);
      expect(tokens[0]).to.not.equal(ethers.ZeroAddress);
    });

    it("Should verify token validity", async function () {
      const tokenAddress = await factory404Fixed.getTokenAddress(1);
      const isValid = await factory404Fixed.isValidToken(tokenAddress);
      expect(isValid).to.be.true;

      const invalidAddress = ethers.Wallet.createRandom().address;
      const isInvalid = await factory404Fixed.isValidToken(invalidAddress);
      expect(isInvalid).to.be.false;
    });
  });
});
