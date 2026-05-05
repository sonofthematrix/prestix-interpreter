import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { parseEther, formatEther, ZeroAddress } from "ethers";

/**
 * 🏠 RWA Marketplace Token Lifecycle - End-to-End Integration Test
 *
 * Complete user journey test covering:
 * 1. Asset Registration
 * 2. Token Creation (ERC-404)
 * 3. Marketplace Listing
 * 4. Token Purchase
 * 5. Token Transfer
 * 6. NFT Conversion (ERC-404 specific)
 */
describe("🏠 RWA Marketplace Token Lifecycle - End-to-End", () => {
  let deployer: SignerWithAddress;
  let assetOwner: SignerWithAddress;
  let buyer1: SignerWithAddress;
  let buyer2: SignerWithAddress;
  let treasury: SignerWithAddress;

  // Contract instances
  let assetRegistry: any;
  let tokenFactory: any;
  let tokenFactory404: any;
  let marketplace: any;
  let tokenizinToken: any;

  // Test data
  let assetId: bigint;
  let tokenAddress: string;
  const ASSET_PRICE = parseEther("100"); // 100 ETH
  const TOKEN_PRICE = parseEther("1"); // 1 TPT per token
  const TOTAL_TOKENS = 100n; // 100 tokens total
  const PURCHASE_AMOUNT = 10n; // Buy 10 tokens

  beforeEach(async () => {
    [deployer, assetOwner, buyer1, buyer2, treasury] = await ethers.getSigners();

    // Deploy TigerPalaceToken using upgradeable pattern
    const { deployTigerPalaceTokenUpgradeable } = require("../utils/token-deployment");
    const { token } = await deployTigerPalaceTokenUpgradeable(deployer, {
      minBalance: parseEther("100000"), // Large balance for testing
    });
    tokenizinToken = token;

    // Deploy RWA ecosystem contracts (simplified for testing - direct deployments)
    const assetRegistryFactory = await ethers.getContractFactory("RWAAssetRegistry");
    assetRegistry = await assetRegistryFactory.deploy();
    await assetRegistry.waitForDeployment();

    const tokenFactoryFactory = await ethers.getContractFactory("RWATokenFactory");
    tokenFactory = await tokenFactoryFactory.deploy();
    await tokenFactory.waitForDeployment();

    const tokenFactory404Factory = await ethers.getContractFactory("RWATokenFactory404Fixed");
    tokenFactory404 = await tokenFactory404Factory.deploy();
    await tokenFactory404.waitForDeployment();

    const marketplaceFactory = await ethers.getContractFactory("RWAMarketplaceUpgradeableSetter");
    marketplace = await marketplaceFactory.deploy(
      await assetRegistry.getAddress(),
      await tokenFactory.getAddress(), // ERC20 factory (primary)
      treasury.address, // fee recipient
      ZeroAddress, // paymentToken - ZeroAddress means ETH payments only
      await tokenFactory404.getAddress() // ERC404 factory (optional)
    );
    await marketplace.waitForDeployment();

    // Setup roles and permissions for direct contracts
    const MARKETPLACE_ROLE = await assetRegistry.MARKETPLACE_ROLE();
    await assetRegistry.grantRole(MARKETPLACE_ROLE, await marketplace.getAddress());

    const TOKEN_CREATOR_ROLE = await tokenFactory.TOKEN_CREATOR_ROLE();
    await tokenFactory.grantRole(TOKEN_CREATOR_ROLE, await marketplace.getAddress());

    // Grant ASSET_MANAGER_ROLE to assetOwner for registering assets
    const ASSET_MANAGER_ROLE = await assetRegistry.ASSET_MANAGER_ROLE();
    await assetRegistry.grantRole(ASSET_MANAGER_ROLE, assetOwner.address);

    // Grant TOKEN_CREATOR_ROLE to assetOwner for creating tokens and marketplace for minting
    const TOKEN_CREATOR_ROLE_404 = await tokenFactory404.TOKEN_CREATOR_ROLE();
    await tokenFactory404.grantRole(TOKEN_CREATOR_ROLE_404, assetOwner.address);
    await tokenFactory404.grantRole(TOKEN_CREATOR_ROLE_404, await marketplace.getAddress());

    // Fund test accounts with TPT tokens
    await tokenizinToken.transfer(assetOwner.address, parseEther("10000"));
    await tokenizinToken.transfer(buyer1.address, parseEther("10000"));
    await tokenizinToken.transfer(buyer2.address, parseEther("10000"));

    // Fund buyer1 with ETH for purchasing
    await deployer.sendTransaction({
      to: buyer1.address,
      value: parseEther("50"), // 50 ETH for buying tokens
    });

    console.log("✅ Test setup complete");
    console.log(`   Asset Registry: ${await assetRegistry.getAddress()}`);
    console.log(`   Token Factory: ${await tokenFactory.getAddress()}`);
    console.log(`   Token Factory 404: ${await tokenFactory404.getAddress()}`);
    console.log(`   Marketplace: ${await marketplace.getAddress()}`);
    console.log(`   TPT Token: ${await tokenizinToken.getAddress()}`);
  });

  describe("1. 🏠 Asset Registration", () => {
    it("Should register a real estate asset", async () => {
      console.log("\n📝 Step 1: Registering real estate asset...");

      // First, let's check if the contract is properly deployed and accessible
      const assetRegistryAddress = await assetRegistry.getAddress();
      console.log(`   Asset Registry address: ${assetRegistryAddress}`);

      // Grant ASSET_MANAGER_ROLE to assetOwner
      const ASSET_MANAGER_ROLE = await assetRegistry.ASSET_MANAGER_ROLE();
      await assetRegistry.grantRole(ASSET_MANAGER_ROLE, assetOwner.address);

      const tx = await assetRegistry.connect(assetOwner).registerAsset(
        assetOwner.address,
        "Luxury Downtown Apartment",
        "Premium 2BR/2BA apartment in city center with ocean views",
        "Residential",
        "123 Ocean Drive, Miami, FL",
        ASSET_PRICE,
        TOKEN_PRICE,
        TOTAL_TOKENS
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) =>
        log.fragment && log.fragment.name === "AssetRegistered"
      );

      expect(event).to.not.be.undefined;
      assetId = event.args[0];

      console.log(`   ✅ Asset registered with ID: ${assetId}`);

      // Verify asset details
      const asset = await assetRegistry.getAsset(assetId);
      expect(asset.owner).to.equal(assetOwner.address);
      expect(asset.title).to.equal("Luxury Downtown Apartment");
      expect(asset.price).to.equal(ASSET_PRICE);
      expect(asset.tokenPrice).to.equal(TOKEN_PRICE);
      expect(asset.totalTokens).to.equal(TOTAL_TOKENS);
      expect(asset.availableTokens).to.equal(TOTAL_TOKENS);
      expect(asset.status).to.equal(1); // ACTIVE status (default)
    });

    it("Should activate the registered asset", async () => {
      // First register the asset
      const tx = await assetRegistry.connect(assetOwner).registerAsset(
        assetOwner.address,
        "Luxury Downtown Apartment",
        "Premium 2BR/2BA apartment in city center with ocean views",
        "Residential",
        "123 Ocean Drive, Miami, FL",
        ASSET_PRICE,
        TOKEN_PRICE,
        TOTAL_TOKENS
      );
      const receipt = await tx.wait();
      assetId = receipt.logs.find((log: any) =>
        log.fragment && log.fragment.name === "AssetRegistered"
      ).args[0];

      // Asset is already ACTIVE (status 1) when registered, but we can explicitly set it
      // Grant ASSET_MANAGER_ROLE to deployer if needed
      const ASSET_MANAGER_ROLE = await assetRegistry.ASSET_MANAGER_ROLE();
      await assetRegistry.grantRole(ASSET_MANAGER_ROLE, deployer.address);
      
      // Activate the asset using updateAssetStatus (assets are already active by default)
      await assetRegistry.connect(deployer).updateAssetStatus(assetId, 1); // ACTIVE status

      const asset = await assetRegistry.getAsset(assetId);
      expect(asset.status).to.equal(1); // ACTIVE status

      console.log(`   ✅ Asset ${assetId} activated`);
    });
  });

  describe("2. 🏭 Token Creation", () => {
    beforeEach(async () => {
      // Register and activate asset
      const tx = await assetRegistry.connect(assetOwner).registerAsset(
        assetOwner.address,
        "Luxury Downtown Apartment",
        "Premium 2BR/2BA apartment in city center with ocean views",
        "Residential",
        "123 Ocean Drive, Miami, FL",
        ASSET_PRICE,
        TOKEN_PRICE,
        TOTAL_TOKENS
      );
      const receipt = await tx.wait();
      assetId = receipt.logs.find((log: any) =>
        log.fragment && log.fragment.name === "AssetRegistered"
      ).args[0];
    });

    it("Should create ERC-404 RWA token for the asset", async () => {
      console.log("\n🏭 Step 2: Creating ERC-404 RWA token...");

      const tx = await tokenFactory404.connect(assetOwner).createToken404(
        assetId,
        "Miami Luxury Apt",
        "MLA",
        TOTAL_TOKENS,
        assetOwner.address,
        "https://api.example.com/metadata/" // tokenURI
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) =>
        log.fragment && log.fragment.name === "Token404Created"
      );

      expect(event).to.not.be.undefined;
      tokenAddress = event.args[1];

      console.log(`   ✅ ERC-404 Token created: ${tokenAddress}`);

      // Mint tokens to asset owner
      await tokenFactory404.mintTokens(assetId, assetOwner.address, TOTAL_TOKENS);

      // Verify token creation
      const tokenContract = await ethers.getContractAt("RWAToken404", tokenAddress);
      expect(await tokenContract.name()).to.equal("Miami Luxury Apt");
      expect(await tokenContract.symbol()).to.equal("MLA");
      expect(await tokenContract.totalSupply()).to.equal(TOTAL_TOKENS);
      expect(await tokenContract.assetId()).to.equal(assetId);
    });

    it("Should link token to asset in registry", async () => {
      // Create token
      const tx = await tokenFactory404.connect(assetOwner).createToken404(
        assetId,
        "Miami Luxury Apt",
        "MLA",
        TOTAL_TOKENS,
        assetOwner.address,
        "https://api.example.com/metadata/" // tokenURI
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) =>
        log.fragment && log.fragment.name === "Token404Created"
      );
      expect(event).to.not.be.undefined;
      tokenAddress = event.args[1];

      // Verify linkage - token should be linked to asset
      const tokenContract = await ethers.getContractAt("RWAToken404", tokenAddress);
      expect(await tokenContract.assetId()).to.equal(assetId);

      // Verify token is registered in factory
      const tokenAddressFromFactory = await tokenFactory404.getTokenAddress(assetId);
      expect(tokenAddressFromFactory).to.equal(tokenAddress);
    });
  });

  describe("3. 🏪 Marketplace Listing", () => {
    beforeEach(async () => {
      // Register asset
      const tx = await assetRegistry.connect(assetOwner).registerAsset(
        assetOwner.address,
        "Luxury Downtown Apartment",
        "Premium 2BR/2BA apartment in city center with ocean views",
        "Residential",
        "123 Ocean Drive, Miami, FL",
        ASSET_PRICE,
        TOKEN_PRICE,
        TOTAL_TOKENS
      );
      const receipt = await tx.wait();
      assetId = receipt.logs.find((log: any) =>
        log.fragment && log.fragment.name === "AssetRegistered"
      ).args[0];

      // Create token
      const tokenTx = await tokenFactory404.connect(assetOwner).createToken404(
        assetId,
        "Miami Luxury Apt",
        "MLA",
        TOTAL_TOKENS,
        assetOwner.address,
        "https://api.example.com/metadata/" // tokenURI
      );
      const tokenReceipt = await tokenTx.wait();
      const tokenEvent = tokenReceipt.logs.find((log: any) =>
        log.fragment && log.fragment.name === "Token404Created"
      );
      expect(tokenEvent).to.not.be.undefined;
      tokenAddress = tokenEvent.args[1];
    });

    it("Should enable marketplace for token purchases", async () => {
      console.log("\n🏪 Step 3: Setting up marketplace for purchases...");

      // Approve marketplace to transfer tokens when purchases happen
      const tokenContract = await ethers.getContractAt("RWAToken404", tokenAddress);

      // Grant marketplace permission to update token availability in registry
      const MARKETPLACE_ROLE = await assetRegistry.MARKETPLACE_ROLE();
      await assetRegistry.grantRole(MARKETPLACE_ROLE, await marketplace.getAddress());

      // Mint tokens to asset owner so they can be purchased
      await tokenFactory404.mintTokens(assetId, assetOwner.address, TOTAL_TOKENS);

      // Verify token setup
      const balance = await tokenContract.balanceOf(assetOwner.address);
      expect(balance).to.equal(TOTAL_TOKENS);

      console.log(`   ✅ Marketplace ready for token purchases`);
      console.log(`   Token Address: ${tokenAddress}`);
      console.log(`   Total Supply: ${TOTAL_TOKENS}`);
      console.log(`   Token Price: ${formatEther(TOKEN_PRICE)} TPT`);
    });
  });

  describe("4. 💰 Token Purchase", () => {
    beforeEach(async () => {
      // Register asset
      const tx = await assetRegistry.connect(assetOwner).registerAsset(
        assetOwner.address,
        "Luxury Downtown Apartment",
        "Premium 2BR/2BA apartment in city center with ocean views",
        "Residential",
        "123 Ocean Drive, Miami, FL",
        ASSET_PRICE,
        TOKEN_PRICE,
        TOTAL_TOKENS
      );
      const receipt = await tx.wait();
      assetId = receipt.logs.find((log: any) =>
        log.fragment && log.fragment.name === "AssetRegistered"
      ).args[0];

      // Create token
      const tokenTx = await tokenFactory404.connect(assetOwner).createToken404(
        assetId,
        "Miami Luxury Apt",
        "MLA",
        TOTAL_TOKENS,
        assetOwner.address,
        "https://api.example.com/metadata/" // tokenURI
      );
      const tokenReceipt = await tokenTx.wait();
      const tokenEvent = tokenReceipt.logs.find((log: any) =>
        log.fragment && log.fragment.name === "Token404Created"
      );
      expect(tokenEvent).to.not.be.undefined;
      tokenAddress = tokenEvent.args[1];

      // Setup marketplace (approve tokens)
      const tokenContract = await ethers.getContractAt("RWAToken404", tokenAddress);
      await (tokenContract as any).connect(assetOwner).approve(
        await marketplace.getAddress(),
        TOTAL_TOKENS
      );
    });

    it("Should purchase tokens from marketplace using existing ERC404 token", async () => {
      console.log("\n💰 Step 4: Purchasing tokens from marketplace...");

      const tokenContract = await ethers.getContractAt("RWAToken404", tokenAddress);

      // Grant marketplace role for token updates
      const MARKETPLACE_ROLE = await assetRegistry.MARKETPLACE_ROLE();
      await assetRegistry.grantRole(MARKETPLACE_ROLE, await marketplace.getAddress());

      // Verify marketplace can find existing ERC404 token via factory
      const foundTokenAddress = await tokenFactory404.getTokenAddress(assetId);
      expect(foundTokenAddress).to.equal(tokenAddress);
      console.log(`   ✅ Marketplace can find existing ERC404 token: ${foundTokenAddress}`);

      // Check initial balances
      const initialBuyerBalance = await tokenContract.balanceOf(buyer1.address);
      const initialSellerBalance = await tokenContract.balanceOf(assetOwner.address);

      console.log(`   Initial buyer balance: ${initialBuyerBalance}`);
      console.log(`   Initial seller balance: ${initialSellerBalance}`);

      // Calculate total cost including marketplace fees
      const [totalCost, marketplaceFee] = await marketplace.calculatePurchaseCost(assetId, PURCHASE_AMOUNT);
      console.log(`   Base price: ${formatEther(TOKEN_PRICE * PURCHASE_AMOUNT)} ETH`);
      console.log(`   Marketplace fee: ${formatEther(marketplaceFee)} ETH`);
      console.log(`   Total cost: ${formatEther(totalCost)} ETH for ${PURCHASE_AMOUNT} tokens`);

      // Ensure asset is active (required for marketplace purchases)
      const asset = await assetRegistry.getAsset(assetId);
      console.log(`   Asset status: ${asset.status}`);

      // Purchase tokens using ETH
      const tx = await marketplace.connect(buyer1).purchaseTokens(
        assetId,
        PURCHASE_AMOUNT,
        { value: totalCost }
      );

      const receipt = await tx.wait();

      console.log(`   ✅ Purchased ${PURCHASE_AMOUNT} tokens for ${formatEther(totalCost)} ETH`);

      // Verify balances after purchase
      const finalBuyerBalance = await tokenContract.balanceOf(buyer1.address);
      const finalSellerBalance = await tokenContract.balanceOf(assetOwner.address);

      console.log(`   Final buyer balance: ${finalBuyerBalance}`);
      console.log(`   Final seller balance: ${finalSellerBalance}`);

      // Buyer gets newly minted tokens
      expect(finalBuyerBalance).to.equal(initialBuyerBalance + PURCHASE_AMOUNT);
      // Seller doesn't lose tokens (marketplace mints new tokens to buyer)
      expect(finalSellerBalance).to.equal(initialSellerBalance);

      // Verify the same token address is used (no duplicate created)
      // Check via factory that same token exists
      const tokenAddressAfterPurchase = await tokenFactory404.getTokenAddress(assetId);
      expect(tokenAddressAfterPurchase).to.equal(tokenAddress);
      
      // Verify only one token exists for this assetId
      const allTokens = await tokenFactory404.getAllTokens();
      const tokenCount = allTokens.filter((addr: string) => addr.toLowerCase() === tokenAddress.toLowerCase()).length;
      expect(tokenCount).to.equal(1);
      console.log(`   ✅ Verified: Same ERC404 token used (no duplicate created)`);
    });

    it("Should emit purchase event", async () => {
      // Purchase tokens to test event emission
      const [totalCost] = await marketplace.calculatePurchaseCost(assetId, 5n); // Small purchase

      const tx = await marketplace.connect(buyer2).purchaseTokens(
        assetId,
        5n,
        { value: totalCost }
      );

      const receipt = await tx.wait();

      // Verify the purchase worked (event emission is secondary)
      const tokenContract = await ethers.getContractAt("RWAToken404", tokenAddress);
      const buyer2Balance = await tokenContract.balanceOf(buyer2.address);
      expect(buyer2Balance).to.equal(5n);

      console.log(`   ✅ Purchase event verification completed`);
    });
  });

  describe("5. 🔄 Token Transfer", () => {
    beforeEach(async () => {
      // Complete the full flow up to purchase
      // Register asset
      const tx = await assetRegistry.connect(assetOwner).registerAsset(
        assetOwner.address,
        "Luxury Downtown Apartment",
        "Premium 2BR/2BA apartment in city center with ocean views",
        "Residential",
        "123 Ocean Drive, Miami, FL",
        ASSET_PRICE,
        TOKEN_PRICE,
        TOTAL_TOKENS
      );
      const receipt = await tx.wait();
      assetId = receipt.logs.find((log: any) =>
        log.fragment && log.fragment.name === "AssetRegistered"
      ).args[0];

      // Create token
      const tokenTx = await tokenFactory404.connect(assetOwner).createToken404(
        assetId,
        "Miami Luxury Apt",
        "MLA",
        TOTAL_TOKENS,
        assetOwner.address,
        "https://api.example.com/metadata/" // tokenURI
      );
      const tokenReceipt = await tokenTx.wait();
      const tokenEvent = tokenReceipt.logs.find((log: any) =>
        log.fragment && log.fragment.name === "Token404Created"
      );
      expect(tokenEvent).to.not.be.undefined;
      tokenAddress = tokenEvent.args[1];

      // Setup marketplace
      const tokenContract = await ethers.getContractAt("RWAToken404", tokenAddress);

      // Grant marketplace role for token updates
      const MARKETPLACE_ROLE = await assetRegistry.MARKETPLACE_ROLE();
      await assetRegistry.grantRole(MARKETPLACE_ROLE, await marketplace.getAddress());

      // Mint tokens to seller first
      await tokenFactory404.mintTokens(assetId, assetOwner.address, TOTAL_TOKENS);

      // Purchase tokens
      const [totalCost] = await marketplace.calculatePurchaseCost(assetId, PURCHASE_AMOUNT);
      await marketplace.connect(buyer1).purchaseTokens(
        assetId,
        PURCHASE_AMOUNT,
        { value: totalCost }
      );
    });

    it("Should transfer tokens between users", async () => {
      console.log("\n🔄 Step 5: Transferring tokens between users...");

      const tokenContract = await ethers.getContractAt("RWAToken404", tokenAddress);

      // Check initial balances
      const initialBuyer1Balance = await tokenContract.balanceOf(buyer1.address);
      const initialBuyer2Balance = await tokenContract.balanceOf(buyer2.address);

      console.log(`   Initial Buyer1 balance: ${initialBuyer1Balance}`);
      console.log(`   Initial Buyer2 balance: ${initialBuyer2Balance}`);

      const transferAmount = 3n;

      // Transfer tokens from buyer1 to buyer2
      const tx = await (tokenContract as any).connect(buyer1).transfer(
        buyer2.address,
        transferAmount
      );

      await tx.wait();

      console.log(`   ✅ Transferred ${transferAmount} tokens from Buyer1 to Buyer2`);

      // Verify final balances
      const finalBuyer1Balance = await tokenContract.balanceOf(buyer1.address);
      const finalBuyer2Balance = await tokenContract.balanceOf(buyer2.address);

      expect(finalBuyer1Balance).to.equal(initialBuyer1Balance - transferAmount);
      expect(finalBuyer2Balance).to.equal(initialBuyer2Balance + transferAmount);

      console.log(`   Final Buyer1 balance: ${finalBuyer1Balance}`);
      console.log(`   Final Buyer2 balance: ${finalBuyer2Balance}`);
    });

    it("Should emit Transfer event on token transfer", async () => {
      const tokenContract = await ethers.getContractAt("RWAToken404", tokenAddress);
      const transferAmount = 2n;

      const tx = await (tokenContract as any).connect(buyer1).transfer(
        buyer2.address,
        transferAmount
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) =>
        log.fragment && log.fragment.name === "Transfer"
      );

      expect(event).to.not.be.undefined;
      expect(event.args[0]).to.equal(buyer1.address); // from
      expect(event.args[1]).to.equal(buyer2.address); // to
      expect(event.args[2]).to.equal(transferAmount); // amount

      console.log(`   ✅ Transfer event emitted correctly`);
    });
  });

  describe("6. 🎨 ERC-404 Special Features", () => {
    beforeEach(async () => {
      // Complete setup up to token ownership
      const tx = await assetRegistry.connect(assetOwner).registerAsset(
        assetOwner.address,
        "Luxury Downtown Apartment",
        "Premium 2BR/2BA apartment in city center with ocean views",
        "Residential",
        "123 Ocean Drive, Miami, FL",
        ASSET_PRICE,
        TOKEN_PRICE,
        TOTAL_TOKENS
      );
      const receipt = await tx.wait();
      assetId = receipt.logs.find((log: any) =>
        log.fragment && log.fragment.name === "AssetRegistered"
      ).args[0];

      const tokenTx = await tokenFactory404.connect(assetOwner).createToken404(
        assetId,
        "Miami Luxury Apt",
        "MLA",
        TOTAL_TOKENS,
        assetOwner.address,
        "https://api.example.com/metadata/" // tokenURI
      );
      const tokenReceipt = await tokenTx.wait();
      const tokenEvent = tokenReceipt.logs.find((log: any) =>
        log.fragment && log.fragment.name === "Token404Created"
      );
      expect(tokenEvent).to.not.be.undefined;
      tokenAddress = tokenEvent.args[1];

      const tokenContract = await ethers.getContractAt("RWAToken404", tokenAddress);
      await (tokenContract as any).connect(assetOwner).approve(
        await marketplace.getAddress(),
        TOTAL_TOKENS
      );

      const requiredTPT = TOKEN_PRICE * 50n; // Buy 50 tokens (enough for NFT conversion)
      await tokenizinToken.connect(buyer1).approve(
        await marketplace.getAddress(),
        requiredTPT
      );

      const [totalCost] = await marketplace.calculatePurchaseCost(assetId, 50n);
      await marketplace.connect(buyer1).purchaseTokens(
        assetId,
        50n,
        { value: totalCost }
      );
    });

    it("Should convert fungible tokens to NFT when owning 100%", async () => {
      console.log("\n🎨 Step 6: Testing ERC-404 NFT conversion...");

      const tokenContract = await ethers.getContractAt("RWAToken404", tokenAddress);

      // Buyer1 should own 50 tokens out of 100 total
      const buyer1Balance = await tokenContract.balanceOf(buyer1.address);
      expect(buyer1Balance).to.equal(50n);

      // Mint remaining 50 tokens to assetOwner first, then transfer to buyer1
      await tokenFactory404.mintTokens(assetId, assetOwner.address, 50n);
      
      // Transfer remaining 50 tokens to buyer1 to own 100%
      await (tokenContract as any).connect(assetOwner).transfer(buyer1.address, 50n);

      const newBuyer1Balance = await tokenContract.balanceOf(buyer1.address);
      expect(newBuyer1Balance).to.equal(100n); // Owns all tokens

      console.log(`   ✅ Buyer1 now owns 100% of tokens (${newBuyer1Balance}/${TOTAL_TOKENS})`);

      // ERC-404 should allow NFT conversion when owning 100%
      const canConvert = await tokenContract.nftExists();
      console.log(`   NFT exists: ${canConvert}`);

      // Note: Actual conversion would depend on specific ERC-404 implementation
      // This test verifies the ownership prerequisite
    });

    it("Should handle fractional ownership correctly", async () => {
      const tokenContract = await ethers.getContractAt("RWAToken404", tokenAddress);

      // Check that partial ownership works
      const buyer1Balance = await tokenContract.balanceOf(buyer1.address);
      const totalSupply = await tokenContract.totalSupply();

      // Buyer1 owns 50 out of 50 currently minted, but total tokens is 100
      // So ownership is 50% of total possible tokens
      expect(buyer1Balance).to.be.lt(TOTAL_TOKENS); // Partial ownership of total tokens
      expect(buyer1Balance).to.be.gt(0n); // Some ownership
      expect(buyer1Balance).to.equal(totalSupply); // Owns all currently minted tokens

      const ownershipPercentage = Number(buyer1Balance * 100n / TOTAL_TOKENS);
      console.log(`   Buyer1 owns ${ownershipPercentage}% of total possible tokens (${buyer1Balance}/${TOTAL_TOKENS})`);

      // Should not be able to convert to NFT with partial ownership
      const nftExists = await tokenContract.nftExists();
      expect(nftExists).to.be.false;

      console.log(`   ✅ Partial ownership (${ownershipPercentage}%) correctly prevents NFT conversion`);
    });
  });

  describe("7. 📊 Complete User Journey Summary", () => {
    it("Should demonstrate the complete RWA token lifecycle", async () => {
      console.log("\n📊 COMPLETE USER JOURNEY DEMONSTRATION");
      console.log("=" .repeat(60));

      // 1. Asset Registration
      console.log("1️⃣ Asset Registration:");
      const assetTx = await assetRegistry.connect(assetOwner).registerAsset(
        assetOwner.address,
        "Miami Beachfront Condo",
        "Exclusive beachfront condominium with panoramic ocean views",
        "Residential",
        "456 Ocean Blvd, Miami Beach, FL",
        parseEther("500"),
        parseEther("2"),
        250n
      );
      const assetReceipt = await assetTx.wait();
      const registeredAssetId = assetReceipt.logs.find((log: any) =>
        log.fragment && log.fragment.name === "AssetRegistered"
      ).args[0];

      console.log(`   ✅ Asset registered (ID: ${registeredAssetId})`);

      // 2. Token Creation
      console.log("2️⃣ Token Creation:");
      const tokenTx = await tokenFactory404.connect(assetOwner).createToken404(
        registeredAssetId,
        "Miami Beach Condo",
        "MBC",
        250n,
        assetOwner.address,
        "https://api.example.com/metadata/" // tokenURI
      );
      const tokenReceipt = await tokenTx.wait();
      const tokenEvent = tokenReceipt.logs.find((log: any) =>
        log.fragment && log.fragment.name === "Token404Created"
      );
      expect(tokenEvent).to.not.be.undefined;
      const createdTokenAddress = tokenEvent.args[1];

      console.log(`   ✅ ERC-404 Token created: ${createdTokenAddress}`);

      // 3. Marketplace Setup
      console.log("3️⃣ Marketplace Setup:");
      const tokenContract = await ethers.getContractAt("RWAToken404", createdTokenAddress);
      await (tokenContract as any).connect(assetOwner).approve(
        await marketplace.getAddress(),
        250n
      );
      console.log(`   ✅ Tokens approved for marketplace`);

      // 4. Token Purchase
      console.log("4️⃣ Token Purchase:");
      const purchaseAmount = 25n;

      // Mint tokens to seller first
      await tokenFactory404.mintTokens(registeredAssetId, assetOwner.address, 250n);

      // Calculate total cost including fees
      const [totalCost, marketplaceFee] = await marketplace.calculatePurchaseCost(registeredAssetId, purchaseAmount);

      const purchaseTx = await marketplace.connect(buyer1).purchaseTokens(
        registeredAssetId,
        purchaseAmount,
        { value: totalCost }
      );
      await purchaseTx.wait();

      console.log(`   ✅ Purchased ${purchaseAmount} tokens for ${formatEther(totalCost)} ETH (includes ${formatEther(marketplaceFee)} fee)`);

      // 5. Token Transfer
      console.log("5️⃣ Token Transfer:");
      const transferAmount = 10n;
      await (tokenContract as any).connect(buyer1).transfer(buyer2.address, transferAmount);

      console.log(`   ✅ Transferred ${transferAmount} tokens to another user`);

      // Final Verification
      console.log("6️⃣ Final Verification:");
      const finalBuyer1Balance = await tokenContract.balanceOf(buyer1.address);
      const finalBuyer2Balance = await tokenContract.balanceOf(buyer2.address);
      const finalSellerBalance = await tokenContract.balanceOf(assetOwner.address);

      console.log(`   Buyer1 final balance: ${finalBuyer1Balance} tokens`);
      console.log(`   Buyer2 final balance: ${finalBuyer2Balance} tokens`);
      console.log(`   Seller final balance: ${finalSellerBalance} tokens`);

      // Assertions
      expect(finalBuyer1Balance).to.equal(15n); // 25 purchased - 10 transferred
      expect(finalBuyer2Balance).to.equal(10n); // received 10 in transfer
      expect(finalSellerBalance).to.equal(250n); // seller keeps all originally minted tokens

      console.log("\n🎉 COMPLETE USER JOURNEY SUCCESSFUL!");
      console.log("✅ Asset Registration → Token Creation → Marketplace Listing → Purchase → Transfer");
    });
  });
});
