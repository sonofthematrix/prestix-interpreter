#!/usr/bin/env tsx
/**
 * Update Asset Contract Links
 * 
 * Ensures all AssetContractLink records are properly created for the 4 assets
 */

import 'dotenv/config';
import { createClient } from '../../../src/lib/db';
import { ethers } from 'hardhat';

// System user for database operations
const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN' as const,
  name: 'System Admin'
};

const NETWORK_ID = '11155111'; // Sepolia

// Token addresses from deployment
const ASSET_TOKENS = [
  { assetId: 1, tokenAddress: '0x883BeD27A00f4513AC52606f3fc7Aeb398AA717d' },
  { assetId: 2, tokenAddress: '0xaCfF6abcd5e04E2ae792cBcd8fD87A15dCC04789' },
  { assetId: 3, tokenAddress: '0xFd25B46C4eC742Ea04a2E5450A001D18f7De2251' },
  { assetId: 4, tokenAddress: '0x2F74DBEb8f96fBe5779AdDdD4Dfb39b93722BC3c' },
];

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   UPDATE ASSET CONTRACT LINKS                             ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const db = createClient(systemUser);

  for (const { assetId, tokenAddress } of ASSET_TOKENS) {
    console.log(`   📦 Asset ${assetId}: ${tokenAddress}`);

    // Find asset in database
    const asset = await db.realEstateAsset.findFirst({
      where: { propertyId: assetId.toString() } as any,
    });

    if (!asset) {
      console.log(`      ⚠️  Asset not found in database, skipping...\n`);
      continue;
    }

    // Check if link exists
    const existingLink = await db.assetContractLink.findFirst({
      where: { realEstateAssetId: asset.id } as any,
    });

    if (existingLink) {
      // Update if address changed
      if (existingLink.contractAddress.toLowerCase() !== tokenAddress.toLowerCase()) {
        await db.assetContractLink.update({
          where: { id: existingLink.id },
          data: {
            contractAddress: tokenAddress.toLowerCase(),
            networkId: NETWORK_ID,
            deployedAt: new Date(),
          } as any,
        });
        console.log(`      ✅ Link updated\n`);
      } else {
        console.log(`      ✅ Link already exists\n`);
      }
    } else {
      // Create new link
      await db.assetContractLink.create({
        data: {
          realEstateAssetId: asset.id,
          contractAddress: tokenAddress.toLowerCase(),
          networkId: NETWORK_ID,
          deployedAt: new Date(),
        } as any,
      });
      console.log(`      ✅ Link created\n`);
    }
  }

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   ✅ ASSET CONTRACT LINKS UPDATED                         ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Update failed:", error);
  process.exit(1);
});
