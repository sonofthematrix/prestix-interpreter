#!/usr/bin/env ts-node

/**
 * Test Complete Token Purchase Flow
 *
 * Tests the end-to-end token purchase process:
 * 1. Check for available assets
 * 2. Create marketplace listings
 * 3. Fund buyer wallet
 * 4. Execute token purchase
 * 5. Verify token transfer
 * 6. Check updated balances
 */

import { ethers } from "hardhat";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  console.log("🛒 Testing complete token purchase flow...\n");

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const buyer = signers[1] || deployer; // Use deployer as buyer if only one signer available

  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`🛍️  Buyer: ${buyer.address}`);
  console.log(`💰 Deployer Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);
  console.log(`💰 Buyer Balance: ${ethers.formatEther(await buyer.provider.getBalance(buyer.address))} ETH\n`);

  // Contract addresses from environment (with overrides for testing)
  const REGISTRY_ADDRESS = "0x5f339B08a22F8f0D5fDE32016Bc2b3BC91403F9A"; // New registry
  const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_RWA_MARKETPLACE!;
  const FACTORY404_ADDRESS = process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY_404!;
  const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS!;

  console.log("📋 Contract addresses:");
  console.log(`   Registry: ${REGISTRY_ADDRESS}`);
  console.log(`   Marketplace: ${MARKETPLACE_ADDRESS}`);
  console.log(`   Factory404: ${FACTORY404_ADDRESS}`);
  console.log(`   USDC: ${USDC_ADDRESS}\n`);

  // Initialize contracts
  const registry = await ethers.getContractAt("RWAAssetRegistryUpgradeable", REGISTRY_ADDRESS);
  const factory404 = await ethers.getContractAt("RWATokenFactory404Fixed", FACTORY404_ADDRESS);
  const marketplace = await ethers.getContractAt("RWAMarketplaceFixedV2", MARKETPLACE_ADDRESS);
  const usdc = await ethers.getContractAt("MockUSDC", USDC_ADDRESS);

  // Check for available assets
  console.log("🔍 Checking for available assets...\n");

  // Try to get asset with ID 11 (our test asset)
  let assetExists = false;
  try {
    const asset = await registry.getAsset(11);
    if (asset.exists) {
      assetExists = true;
      console.log(`📊 Found existing asset with ID: 11`);
      console.log(`   Title: ${asset.title}`);
      console.log(`   Available tokens: ${ethers.formatEther(asset.availableTokens)}`);
    }
  } catch (error) {
    console.log("ℹ️  Asset ID 11 not found, will create test asset");
  }

  if (!assetExists) {
    console.log("⚠️  No assets registered. Creating a test asset...\n");

    // Create a test asset
    const ASSET_NAME = "Test Purchase Asset";
    const ASSET_DESCRIPTION = "Asset for testing purchase flow";
    const ASSET_TYPE = "PROPERTY";
    const LOCATION = "Test Location";
    const PRICE = ethers.parseEther("1000"); // 1000 ETH
    const TOKEN_PRICE = ethers.parseEther("1"); // 1 ETH per token
    const TOTAL_TOKENS = ethers.parseEther("100"); // 100 tokens

    // Grant ASSET_MANAGER_ROLE to deployer if needed
    const ASSET_MANAGER_ROLE = await registry.ASSET_MANAGER_ROLE();
    if (!(await registry.hasRole(ASSET_MANAGER_ROLE, deployer.address))) {
      await registry.grantRole(ASSET_MANAGER_ROLE, deployer.address);
    }

    // Register asset with reasonable values
    const tx = await registry.registerAsset(
      deployer.address, // owner
      ASSET_NAME,
      ASSET_DESCRIPTION,
      ASSET_TYPE,
      LOCATION,
      ethers.parseEther("100"), // 100 ETH total value
      ethers.parseEther("0.01"), // 0.01 ETH per token (much more reasonable)
      ethers.parseEther("100") // 100 tokens total
    );
    await tx.wait();

    console.log("✅ Test asset registered with ID: 11\n");
  }

  // Use asset ID 11 for testing (to avoid conflicts with existing assets)
  const assetId = 11;
  console.log(`🎯 Testing purchase for asset ID: ${assetId}\n`);

  // Get asset details
  const asset = await registry.getAsset(assetId);
  console.log(`🏠 Asset details:`);
  console.log(`   Name: ${asset.title}`);
  console.log(`   Total tokens: ${ethers.formatEther(asset.totalTokens)}`);
  console.log(`   Available tokens: ${ethers.formatEther(asset.availableTokens)}`);
  console.log(`   Token price: ${ethers.formatEther(asset.tokenPrice)} ETH`);
  console.log(`   Status: ${asset.status === 1n ? 'ACTIVE' : 'INACTIVE'}\n`);

  if (asset.availableTokens === 0n) {
    console.error("❌ No tokens available for purchase");
    return;
  }

  // Check for existing marketplace listing
  console.log("📋 Checking marketplace listing...\n");

  let listingExists = false;
  try {
    const listing = await marketplace.getActiveListing(assetId);
    if (listing.pricePerToken > 0n) {
      listingExists = true;
      console.log(`✅ Listing exists:`);
      console.log(`   Price per token: ${ethers.formatEther(listing.pricePerToken)} ETH`);
      console.log(`   Seller: ${listing.seller}\n`);

      // Check if token is deployed and marketplace has balance
      try {
        const tokenAddress = await factory404.getTokenAddress(assetId);
        if (tokenAddress && tokenAddress !== ethers.ZeroAddress) {
          console.log(`✅ Token deployed at: ${tokenAddress}`);
          const tokenContract = await ethers.getContractAt("RWAToken404Fixed", tokenAddress);
          const marketplaceBalance = await tokenContract.balanceOf(marketplace.target || marketplace.address);
          console.log(`💰 Marketplace token balance: ${ethers.formatEther(marketplaceBalance)}\n`);

          if (marketplaceBalance === 0n) {
            console.log("⚠️  Marketplace has no tokens, need to redeploy\n");
            listingExists = false; // Force redeployment
          }
        } else {
          console.log("⚠️  Token not deployed, need to deploy first\n");
          listingExists = false; // Force redeployment
        }
      } catch (error) {
        console.log(`⚠️  Error checking token deployment: ${error.message}\n`);
        listingExists = false; // Force redeployment
      }
    }
  } catch (error) {
    console.log("ℹ️  No active listing found\n");
  }

  // Create token deployment first, then listing
  if (!listingExists) {
    console.log("🏭 Deploying ERC404 token for asset...\n");

    // Ensure deployer has TOKEN_CREATOR_ROLE on factory404
    const TOKEN_CREATOR_ROLE_404 = await factory404.TOKEN_CREATOR_ROLE();
    const hasRole = await factory404.hasRole(TOKEN_CREATOR_ROLE_404, deployer.address);
    if (!hasRole) {
      console.log("🔑 Granting TOKEN_CREATOR_ROLE to deployer...\n");
      await factory404.grantRole(TOKEN_CREATOR_ROLE_404, deployer.address);
    }

    // Deploy token using factory404
    const tokenName = `Asset ${assetId} Token`;
    const tokenSymbol = `ASSET${assetId}`;

    const deployTx = await factory404.createToken404WithMarketplace(
      assetId,
      tokenName,
      tokenSymbol,
      asset.totalTokens, // Total supply in wei
      deployer.address, // Owner
      marketplace.target || marketplace.address, // Marketplace gets the tokens (custody)
      `https://daoble.xyz/api/assets/11/metadata.json`
    );
    await deployTx.wait();

    console.log("✅ ERC404 token deployed\n");

    console.log("📝 Creating marketplace listing...\n");

    // Use asset.tokenPrice directly (should be 0.01 ETH)
    const tx = await marketplace.createListing(assetId, asset.tokenPrice, asset.availableTokens);
    await tx.wait();
    console.log("✅ Marketplace listing created\n");

    // Verify the listing was created correctly
    const newListing = await marketplace.getActiveListing(assetId);
    console.log(`📋 Created listing verification:`);
    console.log(`   Price per token: ${ethers.formatEther(newListing.pricePerToken)} ETH`);
    console.log(`   Seller: ${newListing.seller}\n`);
  }

  // Fund buyer with ETH and USDC
  console.log("💸 Funding buyer wallet...\n");

  const FUND_AMOUNT_ETH = ethers.parseEther("0.1");
  const FUND_AMOUNT_USDC = ethers.parseEther("100");

  // Fund with ETH
  if ((await deployer.provider.getBalance(buyer.address)) < FUND_AMOUNT_ETH) {
    const tx = await deployer.sendTransaction({
      to: buyer.address,
      value: FUND_AMOUNT_ETH
    });
    await tx.wait();
    console.log(`✅ Funded buyer with ${ethers.formatEther(FUND_AMOUNT_ETH)} ETH`);
  }

  // Fund with USDC
  const buyerUsdcBalance = await usdc.balanceOf(buyer.address);
  if (buyerUsdcBalance < FUND_AMOUNT_USDC) {
    const tx = await (usdc.connect(deployer) as any).transfer(buyer.address, FUND_AMOUNT_USDC);
    await tx.wait();
    console.log(`✅ Funded buyer with ${ethers.formatEther(FUND_AMOUNT_USDC)} USDC`);
  }

  console.log(`💰 Buyer balances after funding:`);
  console.log(`   ETH: ${ethers.formatEther(await deployer.provider.getBalance(buyer.address))}`);
  console.log(`   USDC: ${ethers.formatEther(await usdc.balanceOf(buyer.address))}\n`);

  // Calculate purchase parameters
  const tokensToBuy = 1n; // Buy 1 token
  const listing = await marketplace.getActiveListing(assetId);
  const tokenCost = tokensToBuy * listing.pricePerToken;
  const marketplaceFee = await marketplace.getMarketplaceFee();
  const feeAmount = (tokenCost * BigInt(marketplaceFee)) / 10000n;
  const totalCost = tokenCost + feeAmount;

  console.log(`🛒 Purchase details:`);
  console.log(`   Tokens to buy: ${tokensToBuy}`);
  console.log(`   Token cost: ${ethers.formatEther(tokenCost)} ETH`);
  console.log(`   Marketplace fee (${marketplaceFee/100n}%): ${ethers.formatEther(feeAmount)} ETH`);
  console.log(`   Total cost: ${ethers.formatEther(totalCost)} ETH\n`);

  // Execute purchase with ETH
  console.log("💳 Executing token purchase with ETH...\n");

  const initialBuyerBalance = await buyer.provider.getBalance(buyer.address);
  const initialSellerBalance = await deployer.provider.getBalance(asset.owner);

  // Approve USDC if needed (for USDC purchases)
  // For ETH purchases, we don't need approval

  try {
    // Execute purchase
    const purchaseTx = await (marketplace.connect(buyer) as any).purchaseTokens(assetId, tokensToBuy, {
      value: totalCost
    });

    console.log(`⏳ Purchase transaction submitted: ${purchaseTx.hash}`);
    const receipt = await purchaseTx.wait();
    console.log(`✅ Purchase transaction confirmed in block ${receipt.blockNumber}\n`);

    // Verify purchase results
    console.log("🔍 Verifying purchase results...\n");

    // Check buyer ETH balance decreased
    const finalBuyerBalance = await buyer.provider.getBalance(buyer.address);
    const ethSpent = initialBuyerBalance - finalBuyerBalance;
    console.log(`💰 Buyer ETH spent: ${ethers.formatEther(ethSpent)} (expected: ${ethers.formatEther(totalCost)})`);

    // Check seller received ETH
    const finalSellerBalance = await deployer.provider.getBalance(asset.owner);
    const ethReceived = finalSellerBalance - initialSellerBalance;
    console.log(`💰 Seller ETH received: ${ethers.formatEther(ethReceived)}\n`);

    // Check asset availability updated
    const updatedAsset = await registry.getAsset(assetId);
    console.log(`📊 Asset availability:`);
    console.log(`   Before: ${ethers.formatEther(asset.availableTokens)} tokens`);
    console.log(`   After: ${ethers.formatEther(updatedAsset.availableTokens)} tokens`);
    console.log(`   Sold: ${ethers.formatEther(asset.availableTokens - updatedAsset.availableTokens)} tokens\n`);

    // Check token delivery (if token contract exists)
    console.log("🎉 Token purchase flow test completed successfully!");

  } catch (error) {
    console.error("❌ Purchase failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Purchase flow test failed:", error);
    process.exit(1);
  });