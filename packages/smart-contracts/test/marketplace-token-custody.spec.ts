import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { parseEther, formatEther, ZeroAddress } from "ethers";

/**
 * Marketplace Token Custody Tests
 * 
 * Tests the new marketplace token custody architecture where:
 * - Tokens are minted directly to the marketplace contract
 * - Marketplace transfers tokens from its own balance to buyers
 * - No approval mechanism needed (marketplace owns tokens)
 */
describe("Marketplace Token Custody", function () {
  let factory404Fixed: Contract;
  let marketplace: Contract;
  let assetRegistry: Contract;
  let deployer: SignerWithAddress;
  let assetOwner: SignerWithAddress;
  let buyer: SignerWithAddress;
  let feeRecipient: SignerWithAddress;
  let tokenAddress: string;
  let token: Contract;

  beforeEach(async function () {
    [deployer, assetOwner, buyer, feeRecipient] = await ethers.getSigners();

    // Deploy AssetRegistry (non-upgradeable - restored for testing)
    const AssetRegistry = await ethers.getContractFactory("RWAAssetRegistry");
    assetRegistry = await AssetRegistry.deploy();
    await assetRegistry.waitForDeployment();

    // Deploy ERC20 Factory (required by marketplace constructor, even if not used)
    const ERC20Factory = await ethers.getContractFactory("RWATokenFactory");
    const erc20Factory = await ERC20Factory.deploy();
    await erc20Factory.waitForDeployment();

    // Deploy RWATokenFactory404Fixed
    const Factory404Fixed = await ethers.getContractFactory("RWATokenFactory404Fixed");
    factory404Fixed = await Factory404Fixed.deploy();
    await factory404Fixed.waitForDeployment();

    // Deploy Marketplace (non-upgradeable with custody fixes)
    const Marketplace = await ethers.getContractFactory("RWAMarketplace");
    marketplace = await Marketplace.deploy(
      await assetRegistry.getAddress(),
      await erc20Factory.getAddress(), // ERC20 factory
      feeRecipient.address, // fee recipient
      ZeroAddress, // paymentToken
      await factory404Fixed.getAddress() // ERC404 factory
    );
    await marketplace.waitForDeployment();

    // Grant roles
    const ASSET_MANAGER_ROLE = await assetRegistry.ASSET_MANAGER_ROLE();
    await assetRegistry.grantRole(ASSET_MANAGER_ROLE, assetOwner.address);

    const MARKETPLACE_ROLE = await assetRegistry.MARKETPLACE_ROLE();
    await assetRegistry.grantRole(MARKETPLACE_ROLE, await marketplace.getAddress());

    const TOKEN_CREATOR_ROLE = await factory404Fixed.TOKEN_CREATOR_ROLE();
    await factory404Fixed.grantRole(TOKEN_CREATOR_ROLE, await marketplace.getAddress());
    await factory404Fixed.grantRole(TOKEN_CREATOR_ROLE, assetOwner.address);

      // Register asset
      // NOTE: RWAMarketplace (non-upgradeable) expects tokenPrice in ETH wei format
      // Minimum token price is 0.001 ETH (1e15 wei)
      await (assetRegistry as any).connect(assetOwner).registerAsset(
        assetOwner.address,
        "Test Property",
        "Test Description",
        "VILLA",
        "Test Location",
        parseEther("1000000"), // totalPrice (ETH)
        parseEther("0.001"), // tokenPrice (ETH wei: 0.001 ETH per token, minimum allowed)
        1000 // totalTokens
      );
  });

  describe("createToken404WithMarketplace", function () {
    it("Should mint tokens to marketplace when marketplace address provided", async function () {
      const assetId = 1;
      const name = "Test Token";
      const symbol = "TEST";
      const totalSupply = parseEther("1000");
      const tokenURI = "https://example.com/metadata";

      // Create token with marketplace custody
      const tx = await (factory404Fixed as any).connect(assetOwner).createToken404WithMarketplace(
        assetId,
        name,
        symbol,
        totalSupply,
        assetOwner.address, // owner (receives payment)
        await marketplace.getAddress(), // marketplace (receives tokens)
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
      tokenAddress = parsed.args.tokenAddress;

      // Get token contract
      const RWAToken404Fixed = await ethers.getContractFactory("RWAToken404Fixed");
      token = RWAToken404Fixed.attach(tokenAddress);

      // Verify marketplace owns all tokens
      const marketplaceBalance = await token.balanceOf(await marketplace.getAddress());
      expect(marketplaceBalance).to.equal(totalSupply);

      // Verify owner has no tokens
      const ownerBalance = await token.balanceOf(assetOwner.address);
      expect(ownerBalance).to.equal(0);

      // Verify total supply
      const totalSupplyCheck = await token.totalSupply();
      expect(totalSupplyCheck).to.equal(totalSupply);
    });

    it("Should mint tokens to owner when marketplace is zero address", async function () {
      const assetId = 2;
      const name = "Test Token 2";
      const symbol = "TEST2";
      const totalSupply = parseEther("2000");
      const tokenURI = "https://example.com/metadata2";

      // Register new asset
      await (assetRegistry as any).connect(assetOwner).registerAsset(
        assetOwner.address,
        "Test Property 2",
        "Test Description 2",
        "VILLA",
        "Test Location 2",
        parseEther("2000000"),
        parseEther("2"),
        2000
      );

      // Create token without marketplace (backward compatibility)
      const tx = await (factory404Fixed as any).connect(assetOwner).createToken404WithMarketplace(
        assetId,
        name,
        symbol,
        totalSupply,
        assetOwner.address,
        ZeroAddress, // No marketplace - backward compatibility
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

      const parsed = factory404Fixed.interface.parseLog(event!);
      const tokenAddress2 = parsed.args.tokenAddress;

      const RWAToken404Fixed = await ethers.getContractFactory("RWAToken404Fixed");
      const token2 = RWAToken404Fixed.attach(tokenAddress2);

      // Verify owner owns all tokens (backward compatibility)
      const ownerBalance = await token2.balanceOf(assetOwner.address);
      expect(ownerBalance).to.equal(totalSupply);

      // Verify marketplace has no tokens
      const marketplaceBalance = await token2.balanceOf(await marketplace.getAddress());
      expect(marketplaceBalance).to.equal(0);
    });

    it("Should not approve factory when tokens minted to marketplace", async function () {
      const assetId = 3;
      const totalSupply = parseEther("1000");

      // Register new asset
      await (assetRegistry as any).connect(assetOwner).registerAsset(
        assetOwner.address,
        "Test Property 3",
        "Test Description 3",
        "VILLA",
        "Test Location 3",
        parseEther("1000000"),
        parseEther("1"),
        1000
      );

      // Create token with marketplace custody
      const tx = await (factory404Fixed as any).connect(assetOwner).createToken404WithMarketplace(
        assetId,
        "Test Token 3",
        "TEST3",
        totalSupply,
        assetOwner.address,
        await marketplace.getAddress(),
        "https://example.com/metadata3"
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
      const tokenAddress3 = parsed.args.tokenAddress;

      const RWAToken404Fixed = await ethers.getContractFactory("RWAToken404Fixed");
      const token3 = RWAToken404Fixed.attach(tokenAddress3);

      // Check that factory has no allowance (should be 0 when minted to marketplace)
      const factoryAllowance = await token3.allowance(
        await marketplace.getAddress(),
        await factory404Fixed.getAddress()
      );
      expect(factoryAllowance).to.equal(0);
    });
  });

  describe("Marketplace Purchase Flow", function () {
    beforeEach(async function () {
      // Create token with marketplace custody
      const tx = await (factory404Fixed as any).connect(assetOwner).createToken404WithMarketplace(
        1,
        "Test Token",
        "TEST",
        parseEther("1000"),
        assetOwner.address,
        await marketplace.getAddress(),
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
      tokenAddress = parsed.args.tokenAddress;

      const RWAToken404Fixed = await ethers.getContractFactory("RWAToken404Fixed");
      token = RWAToken404Fixed.attach(tokenAddress);
    });

    it("Should transfer tokens from marketplace balance to buyer", async function () {
      // tokenAmount should be in token units (not wei) for ERC404 tokens
      // 100 tokens = 100 * 1e18 wei for ERC404
      const purchaseAmount = parseEther("100"); // 100 tokens in wei
      
      // Verify marketplace has tokens
      const marketplaceBalanceBefore = await token.balanceOf(await marketplace.getAddress());
      expect(marketplaceBalanceBefore).to.equal(parseEther("1000"));

      // Calculate purchase cost
      const [totalCost] = await marketplace.calculatePurchaseCost(1, purchaseAmount);

      // Purchase tokens
      await (marketplace as any).connect(buyer).purchaseTokens(1, purchaseAmount, {
        value: totalCost
      });

      // Verify buyer received tokens
      const buyerBalance = await token.balanceOf(buyer.address);
      expect(buyerBalance).to.equal(purchaseAmount);

      // Verify marketplace balance decreased
      const marketplaceBalanceAfter = await token.balanceOf(await marketplace.getAddress());
      expect(marketplaceBalanceAfter).to.equal(parseEther("900"));

      // Verify total supply unchanged
      const totalSupply = await token.totalSupply();
      expect(totalSupply).to.equal(parseEther("1000"));
    });

    it("Should revert if marketplace has insufficient balance", async function () {
      // Register new asset with 2000 totalTokens (more than what we'll mint to marketplace)
      // AssetId 1 is already registered in beforeEach, so this will be assetId 2
      const assetId = 2;
      await (assetRegistry as any).connect(assetOwner).registerAsset(
        assetOwner.address,
        "Test Property 3",
        "Test Description 3",
        "VILLA",
        "Test Location 3",
        parseEther("1000000"),
        parseEther("0.001"),
        2000 // totalTokens - more than what we'll mint to marketplace
      );

      // Create token but only mint 1000 tokens to marketplace (not 2000)
      const name3 = "Test Token 3";
      const symbol3 = "TEST3";
      const totalSupply3 = parseEther("1000"); // Only 1000 tokens, not 2000
      const tokenURI3 = "https://example.com/metadata3";

      const tx3 = await (factory404Fixed as any).connect(assetOwner).createToken404WithMarketplace(
        assetId,
        name3,
        symbol3,
        totalSupply3,
        assetOwner.address,
        await marketplace.getAddress(),
        tokenURI3
      );
      await tx3.wait();

      const purchaseAmount = parseEther("2000"); // More than marketplace has (1000)

      const [totalCost] = await marketplace.calculatePurchaseCost(assetId, purchaseAmount);

      await expect(
        (marketplace as any).connect(buyer).purchaseTokens(assetId, purchaseAmount, {
          value: totalCost
        })
      ).to.be.revertedWith("RWAMarketplace: insufficient marketplace token balance");
    });

    it("Should handle multiple purchases correctly", async function () {
      const purchase1 = parseEther("100");
      const purchase2 = parseEther("200");
      const purchase3 = parseEther("300");

      // First purchase
      const [cost1] = await (marketplace as any).calculatePurchaseCost(1, purchase1);
      await (marketplace as any).connect(buyer).purchaseTokens(1, purchase1, { value: cost1 });

      // Second purchase
      const [cost2] = await (marketplace as any).calculatePurchaseCost(1, purchase2);
      await (marketplace as any).connect(buyer).purchaseTokens(1, purchase2, { value: cost2 });

      // Third purchase
      const [cost3] = await (marketplace as any).calculatePurchaseCost(1, purchase3);
      await (marketplace as any).connect(buyer).purchaseTokens(1, purchase3, { value: cost3 });

      // Verify buyer has all purchased tokens
      const buyerBalance = await token.balanceOf(buyer.address);
      expect(buyerBalance).to.equal(purchase1 + purchase2 + purchase3);

      // Verify marketplace balance
      const marketplaceBalance = await token.balanceOf(await marketplace.getAddress());
      expect(marketplaceBalance).to.equal(parseEther("400")); // 1000 - 100 - 200 - 300
    });

    it("Should send payment to asset owner, not marketplace", async function () {
      const purchaseAmount = parseEther("100");
      const [totalCost, marketplaceFee] = await (marketplace as any).calculatePurchaseCost(1, purchaseAmount);

      const ownerBalanceBefore = await ethers.provider.getBalance(assetOwner.address);

      // Purchase tokens
      const tx = await (marketplace as any).connect(buyer).purchaseTokens(1, purchaseAmount, {
        value: totalCost
      });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const ownerBalanceAfter = await ethers.provider.getBalance(assetOwner.address);
      const ownerReceived = ownerBalanceAfter - ownerBalanceBefore + BigInt(gasUsed.toString());

      // Owner should receive totalCost - marketplaceFee
      const expectedOwnerReceipt = totalCost - marketplaceFee;
      expect(ownerReceived).to.be.closeTo(expectedOwnerReceipt, parseEther("0.01")); // Allow small variance
    });
  });

  describe("Marketplace Token Creation via _createToken", function () {
    it("Should create ERC404 token minted to marketplace when factory available", async function () {
      // Register new asset
      await (assetRegistry as any).connect(assetOwner).registerAsset(
        assetOwner.address,
        "New Property",
        "New Description",
        "VILLA",
        "New Location",
        parseEther("1000000"),
        parseEther("1"),
        1000
      );

      // Purchase tokens (this will trigger _createToken internally)
      const purchaseAmount = parseEther("50");
      const [totalCost] = await (marketplace as any).calculatePurchaseCost(2, purchaseAmount);

      await (marketplace as any).connect(buyer).purchaseTokens(2, purchaseAmount, {
        value: totalCost
      });

      // Get token address from factory
      const tokenAddress2 = await factory404Fixed.getTokenAddress(2);
      expect(tokenAddress2).to.not.equal(ZeroAddress);

      const RWAToken404Fixed = await ethers.getContractFactory("RWAToken404Fixed");
      const token2 = RWAToken404Fixed.attach(tokenAddress2);

      // Verify marketplace owns tokens (minus what was purchased)
      const marketplaceBalance = await token2.balanceOf(await marketplace.getAddress());
      expect(marketplaceBalance).to.equal(parseEther("950")); // 1000 - 50

      // Verify buyer received tokens
      const buyerBalance = await token2.balanceOf(buyer.address);
      expect(buyerBalance).to.equal(purchaseAmount);
    });
  });

  describe("Backward Compatibility", function () {
    it("Should support createToken404 (calls createToken404WithMarketplace with zero address)", async function () {
      // Register new asset
      await (assetRegistry as any).connect(assetOwner).registerAsset(
        assetOwner.address,
        "Backward Compat Property",
        "Description",
        "VILLA",
        "Location",
        parseEther("1000000"),
        parseEther("1"),
        1000
      );

      // Use old createToken404 function
      const tx = await (factory404Fixed as any).connect(assetOwner).createToken404(
        3,
        "Backward Token",
        "BACK",
        parseEther("1000"),
        assetOwner.address,
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

      expect(event).to.not.be.undefined;
      const parsed = factory404Fixed.interface.parseLog(event!);
      const tokenAddress3 = parsed.args.tokenAddress;

      const RWAToken404Fixed = await ethers.getContractFactory("RWAToken404Fixed");
      const token3 = RWAToken404Fixed.attach(tokenAddress3);

      // Should mint to owner (backward compatibility)
      const ownerBalance = await token3.balanceOf(assetOwner.address);
      expect(ownerBalance).to.equal(parseEther("1000"));
    });
  });
});
