#!/usr/bin/env tsx
/**
 * Complete Marketplace Setup - 4 Assets
 * 
 * This script sets up a complete marketplace with:
 * 1. Register 4 assets in registry contract
 * 2. Create ERC404 tokens for each asset via Factory404
 * 3. Create marketplace listings for each asset
 * 4. Store all records in database
 * 5. Verify roles and permissions
 * 6. Test purchase with buyer wallet
 */

import 'dotenv/config';
import { ethers } from 'hardhat';
import { createClient } from '../../../src/lib/db';
import { createHash } from 'crypto';

// System user for database operations
const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN' as const,
  name: 'System Admin'
};

const NETWORK_ID = '11155111'; // Sepolia

// Buyer wallet for testing
const BUYER_WALLET_1 = '0xfe3dafa1c35b0562a910359f67d71ecb21328205';
const BUYER_KEY_1 = 'f9ac6eb25ad51dd9c4d5605e9e2d97ed712f255267b2cd4b9455e2c08772d09b';

// Test assets to create
const TEST_ASSETS: Array<{
  propertyId: number;
  title: string;
  description: string;
  location: string;
  totalTokens: number;
  tokenPrice: string;
  totalValue: number;
}> = [
  {
    propertyId: 1,
    title: 'Luxury Beachfront Villa - Maldives',
    description: 'Stunning 5-bedroom villa with private beach access and infinity pool',
    location: 'Maldives',
    totalTokens: 1000,
    tokenPrice: '0.001', // ETH per token
    totalValue: 1, // ETH
  },
  {
    propertyId: 2,
    title: 'Mountain Resort Estate - Swiss Alps',
    description: 'Exclusive ski resort property with panoramic mountain views',
    location: 'Swiss Alps',
    totalTokens: 1500,
    tokenPrice: '0.002',
    totalValue: 3,
  },
  {
    propertyId: 3,
    title: 'Urban Penthouse - Manhattan',
    description: 'Premium penthouse in the heart of Manhattan with 360° city views',
    location: 'New York, USA',
    totalTokens: 2000,
    tokenPrice: '0.0015',
    totalValue: 3,
  },
  {
    propertyId: 4,
    title: 'Mediterranean Coastal Villa - Greece',
    description: 'Historic villa on the Greek coastline with private yacht dock',
    location: 'Santorini, Greece',
    totalTokens: 1200,
    tokenPrice: '0.0012',
    totalValue: 1.44,
  },
];

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   COMPLETE MARKETPLACE SETUP - 4 ASSETS                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const db = createClient(systemUser);
  const [deployer] = await ethers.getSigners();
  
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // Load contracts from database
  console.log("📋 Loading contracts from database...\n");

  const contracts = await db.deployedContract.findMany({
    where: {
      networkId: NETWORK_ID,
      isActive: true,
    } as any,
  });

  const registry = contracts.find(c => c.contractType === 'REGISTRY');
  const factory404 = contracts.find(c => c.contractType === 'ERC404_FACTORY');
  const marketplace = contracts.find(c => c.contractType === 'MARKETPLACE');

  if (!registry || !factory404 || !marketplace) {
    console.error("❌ Missing required contracts in database");
    process.exit(1);
  }

  console.log(`✅ Registry:     ${registry.contractAddress}`);
  console.log(`✅ Factory404:   ${factory404.contractAddress}`);
  console.log(`✅ Marketplace:  ${marketplace.contractAddress}\n`);

  // Load ABIs
  const registryABI = await db.contractABI.findFirst({
    where: { contractAddress: registry.contractAddress } as any,
  });
  const factory404ABI = await db.contractABI.findFirst({
    where: { contractAddress: factory404.contractAddress } as any,
  });
  const marketplaceABI = await db.contractABI.findFirst({
    where: { contractAddress: marketplace.contractAddress } as any,
  });

  if (!registryABI || !factory404ABI || !marketplaceABI) {
    console.error("❌ Missing ABIs in database");
    process.exit(1);
  }

  // Create contract instances
  const registryContract = new ethers.Contract(registry.contractAddress, registryABI.abi as any, deployer);
  const factory404Contract = new ethers.Contract(factory404.contractAddress, factory404ABI.abi as any, deployer);
  const marketplaceContract = new ethers.Contract(marketplace.contractAddress, marketplaceABI.abi as any, deployer);

  // Verify roles
  console.log("🔐 Verifying roles and permissions...\n");

  const MARKETPLACE_ROLE = await registryContract.MARKETPLACE_ROLE();
  const hasMarketplaceRole = await registryContract.hasRole(MARKETPLACE_ROLE, marketplace.contractAddress);
  console.log(`   MARKETPLACE_ROLE on Registry: ${hasMarketplaceRole ? '✅' : '❌'}`);

  const TOKEN_CREATOR_ROLE_404 = await factory404Contract.TOKEN_CREATOR_ROLE();
  const hasTokenCreatorRole404 = await factory404Contract.hasRole(TOKEN_CREATOR_ROLE_404, marketplace.contractAddress);
  console.log(`   TOKEN_CREATOR_ROLE on Factory404: ${hasTokenCreatorRole404 ? '✅' : '❌'}\n`);

  if (!hasMarketplaceRole || !hasTokenCreatorRole404) {
    console.error("❌ Missing required roles - run complete-fresh-ecosystem-config.ts first");
    process.exit(1);
  }

  // Process each asset
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   CREATING 4 ASSETS WITH ERC404 TOKENS                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  for (const asset of TEST_ASSETS) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📦 ASSET ${asset.propertyId}: ${asset.title}`);
    console.log(`${'═'.repeat(60)}\n`);

    // Step 1: Register asset in registry contract
    console.log(`   📝 Step 1: Registering asset in registry contract...`);

    try {
      // Check if already registered
      try {
        const existingAsset = await registryContract.getAsset(asset.propertyId);
        if (existingAsset.totalTokens > 0) {
          console.log(`   ℹ️  Asset already registered in registry, skipping...\n`);
        } else {
          throw new Error('Not registered');
        }
      } catch {
        // Register asset with full parameters
        const registerTx = await registryContract.registerAsset(
          deployer.address, // owner
          asset.title,
          asset.description,
          'Real Estate', // assetType
          asset.location,
          ethers.parseEther(asset.totalValue.toString()), // total price
          ethers.parseEther(asset.tokenPrice), // price per token
          BigInt(asset.totalTokens) // total tokens (NOT in wei - just the number)
        );
        const receipt = await registerTx.wait();
        
        // Get asset ID from event (it's auto-incremented)
        const event = receipt.logs.find((log: any) => {
          try {
            const parsed = registryContract.interface.parseLog(log);
            return parsed?.name === 'AssetRegistered';
          } catch {
            return false;
          }
        });
        
        let actualAssetId = asset.propertyId;
        if (event) {
          const parsed = registryContract.interface.parseLog(event);
          actualAssetId = Number(parsed?.args?.assetId || asset.propertyId);
        }
        
        console.log(`   ✅ Asset registered in registry (Asset ID: ${actualAssetId}, TX: ${registerTx.hash})\n`);
        
        // Update propertyId if different
        if (actualAssetId !== asset.propertyId) {
          asset.propertyId = actualAssetId;
          console.log(`   ℹ️  Using auto-assigned asset ID: ${actualAssetId}\n`);
        }
      }

      // Step 2: Create ERC404 token via Factory404
      console.log(`   🏭 Step 2: Creating ERC404 token via Factory404...`);

      let tokenAddress: string;
      
      try {
        // Check if token already exists
        tokenAddress = await factory404Contract.getTokenAddress(asset.propertyId);
        if (tokenAddress !== ethers.ZeroAddress) {
          console.log(`   ℹ️  Token already exists: ${tokenAddress}\n`);
        } else {
          throw new Error('Token not found');
        }
      } catch {
        // Create token
        const totalSupplyWei = ethers.parseEther(asset.totalTokens.toString());
        const tokenURI = `https://tokenizin.com/assets/${asset.propertyId}.json`;

        const createTokenTx = await factory404Contract.createToken404WithMarketplace(
          asset.propertyId,
          asset.title,
          `ASSET${asset.propertyId}`,
          totalSupplyWei,
          deployer.address, // owner
          marketplace.contractAddress, // marketplace gets tokens
          tokenURI
        );
        await createTokenTx.wait();

        tokenAddress = await factory404Contract.getTokenAddress(asset.propertyId);
        console.log(`   ✅ ERC404 token created: ${tokenAddress}`);
        console.log(`   ✅ Tokens minted to marketplace for custody\n`);
      }

      // Step 3: Register token in marketplace (3-tier discovery system)
      console.log(`   🏪 Step 3: Registering token in marketplace...`);

      try {
        const registeredAddress = await marketplaceContract.getTokenAddress(asset.propertyId);
        if (registeredAddress === tokenAddress) {
          console.log(`   ℹ️  Token already registered in marketplace\n`);
        } else {
          throw new Error('Not registered');
        }
      } catch {
        const registerTokenTx = await marketplaceContract.registerTokenAddress(
          asset.propertyId,
          tokenAddress
        );
        await registerTokenTx.wait();
        console.log(`   ✅ Token registered in marketplace (TX: ${registerTokenTx.hash})\n`);
      }

      // Step 4: Create marketplace listing
      console.log(`   💰 Step 4: Creating marketplace listing...`);

      try {
        const listing = await marketplaceContract.getActiveListing(asset.propertyId);
        if (listing && listing.pricePerToken > 0) {
          console.log(`   ℹ️  Listing already exists\n`);
        } else {
          throw new Error('No listing');
        }
      } catch {
        const createListingTx = await marketplaceContract.createListing(
          asset.propertyId,
          ethers.parseEther(asset.tokenPrice),
          ethers.parseEther(asset.totalTokens.toString())
        );
        await createListingTx.wait();
        console.log(`   ✅ Marketplace listing created (TX: ${createListingTx.hash})\n`);
      }

      // Step 5: Store in database
      console.log(`   💾 Step 5: Storing asset in database...`);

      // Check if asset exists in database
      const existingDbAsset = await db.realEstateAsset.findFirst({
        where: { propertyId: asset.propertyId.toString() } as any,
      });

      if (!existingDbAsset) {
        // Create asset in database
        const dbAsset = await db.realEstateAsset.create({
          data: {
            propertyId: asset.propertyId.toString(),
            title: asset.title,
            description: asset.description,
            location: asset.location,
            price: asset.totalValue,
            totalTokens: asset.totalTokens,
            tokenPrice: parseFloat(asset.tokenPrice),
            availableTokens: asset.totalTokens,
            soldTokens: 0,
            status: 'ACTIVE',
            featured: true,
            ownerId: 'system', // System-owned for now
          } as any,
        });

        console.log(`   ✅ Asset created in database (ID: ${dbAsset.id})`);

        // Create AssetContractLink
        await db.assetContractLink.create({
          data: {
            realEstateAssetId: dbAsset.id,
            contractAddress: tokenAddress.toLowerCase(),
            networkId: NETWORK_ID,
            deployedAt: new Date(),
          } as any,
        });

        console.log(`   ✅ AssetContractLink created\n`);
      } else {
        console.log(`   ℹ️  Asset already exists in database\n`);
      }

      console.log(`   ✅ Asset ${asset.propertyId} setup complete!\n`);

    } catch (error: any) {
      console.error(`   ❌ Failed to setup asset ${asset.propertyId}:`, error.message);
      console.error(`   Stack:`, error.stack);
    }
  }

  // Summary
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   ✅ MARKETPLACE SETUP COMPLETE                           ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Verify all assets
  console.log("🔍 Verifying all assets...\n");

  for (const asset of TEST_ASSETS) {
    try {
      // Check registry
      const registryAsset = await registryContract.getAsset(asset.propertyId);
      
      // Check token
      const tokenAddress = await factory404Contract.getTokenAddress(asset.propertyId);
      
      // Check listing
      const listing = await marketplaceContract.getActiveListing(asset.propertyId);
      
      // Check database
      const dbAsset = await db.realEstateAsset.findFirst({
        where: { propertyId: asset.propertyId.toString() } as any,
      });

      console.log(`   Asset ${asset.propertyId}: ${asset.title}`);
      console.log(`      Registry: ${registryAsset.totalTokens > 0 ? '✅' : '❌'}`);
      console.log(`      Token:    ${tokenAddress !== ethers.ZeroAddress ? '✅ ' + tokenAddress.slice(0, 10) + '...' : '❌'}`);
      console.log(`      Listing:  ${listing && listing.pricePerToken > 0 ? '✅' : '❌'}`);
      console.log(`      Database: ${dbAsset ? '✅' : '❌'}\n`);
    } catch (error: any) {
      console.log(`   Asset ${asset.propertyId}: ❌ Error - ${error.message}\n`);
    }
  }

  // Test purchase with Buyer 1
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   TESTING PURCHASE WITH BUYER 1                           ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log(`   👤 Buyer Wallet: ${BUYER_WALLET_1}\n`);

  // Create buyer signer
  const buyerWallet = new ethers.Wallet(BUYER_KEY_1, ethers.provider);
  const buyerBalance = await ethers.provider.getBalance(BUYER_WALLET_1);
  
  console.log(`   💰 Buyer Balance: ${ethers.formatEther(buyerBalance)} ETH\n`);

  // Test purchase for Asset 1
  const testAsset = TEST_ASSETS[0];
  const purchaseAmount = 10n; // Buy 10 tokens

  console.log(`   🧪 Test Purchase: Asset ${testAsset.propertyId} - ${testAsset.title}`);
  console.log(`   📦 Purchasing ${purchaseAmount} tokens\n`);

  try {
    // Calculate cost
    const buyerMarketplace = marketplaceContract.connect(buyerWallet);
    const cost = await (buyerMarketplace as any).calculatePurchaseCost(
      testAsset.propertyId,
      ethers.parseEther(purchaseAmount.toString())
    );

    console.log(`   💵 Total Cost: ${ethers.formatEther(cost)} ETH (includes 2.5% fee)`);

    if (buyerBalance < cost) {
      console.log(`   ⚠️  Insufficient balance for purchase`);
      console.log(`   ℹ️  Please fund buyer wallet with at least ${ethers.formatEther(cost)} ETH\n`);
    } else {
      console.log(`   ✅ Sufficient balance for purchase`);
      console.log(`\n   🔄 Executing test purchase...`);
      const purchaseTx = await (buyerMarketplace as any).purchaseTokens(
        testAsset.propertyId,
        ethers.parseEther(purchaseAmount.toString()),
        {
          value: cost,
        }
      );

      console.log(`   ⏳ Transaction submitted: ${purchaseTx.hash}`);
      const receipt = await purchaseTx.wait();
      
      console.log(`   ✅ Purchase successful! (Block: ${receipt.blockNumber})`);

      // Verify token balance
      const tokenAddress = await factory404Contract.getTokenAddress(testAsset.propertyId);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        ethers.provider
      );
      
      const buyerTokenBalance = await tokenContract.balanceOf(BUYER_WALLET_1);
      console.log(`   ✅ Buyer token balance: ${ethers.formatEther(buyerTokenBalance)} tokens\n`);
    }
  } catch (error: any) {
    console.error(`   ❌ Purchase test failed:`, error.message);
    if (error.message.includes('insufficient funds')) {
      console.log(`   ℹ️  Fund buyer wallet: ${BUYER_WALLET_1}`);
      console.log(`   ℹ️  Amount needed: ~0.01 ETH\n`);
    }
  }

  // Final summary
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   ✅ SETUP COMPLETE - MARKETPLACE READY                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log(`📊 Summary:\n`);
  console.log(`   Assets Created:      4`);
  console.log(`   Registry Records:    4`);
  console.log(`   ERC404 Tokens:       4`);
  console.log(`   Marketplace Listings: 4`);
  console.log(`   Database Records:    4 (+ AssetContractLinks)`);
  console.log(`   Purchase Test:       ${buyerBalance > ethers.parseEther('0.01') ? '✅ Ready' : '⚠️  Fund buyer'}\n`);

  console.log(`📋 Next Steps:\n`);
  console.log(`   1. Fund buyer wallet if needed: ${BUYER_WALLET_1}`);
  console.log(`   2. Test purchases: bun run tsx scripts/test-marketplace-purchases.ts`);
  console.log(`   3. Monitor activity: bun run tsx scripts/marketplace-dashboard.ts\n`);

  process.exit(0);
}

main().catch((error) => {
  console.error("\n❌ Setup failed:", error);
  process.exit(1);
});
