#!/usr/bin/env tsx
/**
 * Create Properties in Database
 * 
 * Creates properties in the database with matching IDs from seed data
 * so that the sync script can update them with on-chain asset IDs and token addresses.
 * 
 * Usage:
 *   cd smart-contracts
 *   bun run tsx scripts/create-properties-in-database.ts
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const rootPath = path.resolve(__dirname, '../../..');
const seedDataFile = path.join(__dirname, '../seed-data.json');
const resultsFile = path.join(__dirname, '../seed-assets-registration-results.json');

// Import ZenStack client
let createClient: any;
let getSystemUser: any;

try {
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function(id: string) {
    if (id.startsWith('@/zenstack/')) {
      const resolved = id.replace('@/zenstack/', path.join(rootPath, 'zenstack/'));
      return originalRequire.call(this, resolved);
    } else if (id.startsWith('@/')) {
      const resolved = id.replace('@/', path.join(rootPath, 'src/'));
      return originalRequire.call(this, resolved);
    }
    return originalRequire.call(this, id);
  };
  
  const dbModule = require(path.join(rootPath, 'src/lib/db.ts'));
  createClient = dbModule.createClient;
  
  try {
    const systemUserModule = require(path.join(rootPath, 'src/lib/utils/system-user.ts'));
    getSystemUser = systemUserModule.getSystemUser;
  } catch {
    getSystemUser = async () => ({
      id: 'xronr0y2ule1my2abd0wfulc',
      role: 'admin',
      email: 'system@TKNZN.pro',
    });
  }
} catch (error: any) {
  console.error('❌ Could not import ZenStack client:', error.message);
  process.exit(1);
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   CREATE PROPERTIES IN DATABASE                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(seedDataFile)) {
    console.error(`❌ Seed data file not found: ${seedDataFile}`);
    process.exit(1);
  }

  if (!fs.existsSync(resultsFile)) {
    console.error(`❌ Registration results file not found: ${resultsFile}`);
    console.error(`   Please run register-seed-assets-onchain.ts first`);
    process.exit(1);
  }

  const seedData = JSON.parse(fs.readFileSync(seedDataFile, 'utf-8'));
  const results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));

  console.log(`📂 Loaded ${seedData.properties.length} properties from seed data`);
  console.log(`📂 Loaded ${results.results.length} registration results\n`);

  const systemUser = await getSystemUser().catch(() => ({
    id: 'xronr0y2ule1my2abd0wfulc',
    role: 'admin',
    email: 'system@TKNZN.pro',
  }));
  const db = createClient(systemUser);

  console.log(`📊 Creating properties in database...\n`);

  for (let i = 0; i < seedData.properties.length; i++) {
    const property = seedData.properties[i];
    const result = results.results.find((r: any) => r.propertyId === property.id);

    if (!result || !result.success) {
      console.log(`⚠️  Skipping ${property.id}: No successful registration found`);
      continue;
    }

    try {
      // Check if property already exists
      const existing = await db.realEstateAsset.findUnique({
        where: { id: property.id },
      });

      // Convert BigInt values to numbers for database (schema expects numbers)
      const priceWei = ethers.parseEther(property.price.toString());
      const tokenPriceWei = ethers.parseEther(property.tokenPrice.toString());
      
      // Convert to numbers (database schema expects numbers, not BigInt)
      const priceNumber = Number(priceWei);
      const tokenPriceNumber = Number(tokenPriceWei);
      const totalTokensNumber = Number(property.totalTokens);
      const availableTokensNumber = totalTokensNumber; // Initially all tokens available
      
      if (existing) {
        console.log(`   ⏩ Property ${property.id} already exists, updating...`);
        await db.realEstateAsset.update({
          where: { id: property.id },
          data: {
            title: property.title,
            description: property.description,
            assetType: property.propertyType,
            location: property.location,
            price: priceNumber,
            tokenPrice: tokenPriceNumber,
            totalTokens: totalTokensNumber,
            availableTokens: availableTokensNumber,
            tokenContractAddress: result.tokenAddress,
            status: 'ACTIVE',
          },
        });
        console.log(`   ✅ Updated property ${property.id} (Asset ID: ${result.assetId})`);
      } else {
        // Find or create owner user by wallet address
        let ownerUserId = 'system'; // Default fallback
        try {
          // Try to find user by wallet address
          const ownerUser = await db.user.findFirst({
            where: { walletAddress: property.owner },
          });
          if (ownerUser) {
            ownerUserId = ownerUser.id;
          } else {
            console.log(`   ⚠️  User with wallet ${property.owner} not found, using system user`);
          }
        } catch {
          // If user lookup fails, use system user
        }
        
        // Create new property
        await db.realEstateAsset.create({
          data: {
            id: property.id,
            title: property.title,
            description: property.description,
            assetType: property.propertyType,
            location: property.location,
            price: priceNumber,
            tokenPrice: tokenPriceNumber,
            totalTokens: totalTokensNumber,
            availableTokens: availableTokensNumber,
            tokenContractAddress: result.tokenAddress,
            imageUrl: '', // Required field, set empty for now
            status: 'ACTIVE',
            ownerId: ownerUserId,
          },
        });
        console.log(`   ✅ Created property ${property.id}: ${property.title} (Asset ID: ${result.assetId})`);
      }
    } catch (error: any) {
      console.error(`   ❌ Failed to create/update ${property.id}: ${error.message}`);
    }
  }

  console.log(`\n✅ Database update complete!\n`);
}

// Import ethers for parsing
const { ethers } = require('ethers');

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });

