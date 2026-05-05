#!/usr/bin/env tsx
/**
 * Query Seed Data from Database
 * 
 * This script queries the database for all RealEstateAsset and Investment records
 * and exports them in a format suitable for on-chain registration.
 * 
 * Usage:
 *   cd smart-contracts
 *   bun run tsx scripts/query-seed-data.ts [output-file.json]
 * 
 * Environment Variables Required:
 *   - DATABASE_URL (PostgreSQL connection string)
 * 
 * Note: This script must be run from the project root (not smart-contracts directory)
 * to access the ZenStack schema and lib/db utilities.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// Import ZenStack client - adjust path based on where script is run from
// If running from smart-contracts/, we need to go up to root
const rootPath = path.resolve(__dirname, '../../..');

// Try to import createClient using require (works better with tsx)
let createClient: any;
let getSystemUser: any;

try {
  // Add root path to require resolution
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function(id: string) {
    if (id.startsWith('@/')) {
      const resolved = id.replace('@/', path.join(rootPath, 'src/'));
      return originalRequire.call(this, resolved);
    }
    return originalRequire.call(this, id);
  };
  
  // Try to import
  const dbModule = require(path.join(rootPath, 'src/lib/db.ts'));
  createClient = dbModule.createClient;
  
  // Try to import getSystemUser
  try {
    const systemUserModule = require(path.join(rootPath, 'src/lib/utils/system-user.ts'));
    getSystemUser = systemUserModule.getSystemUser;
  } catch {
    // Fallback: create a simple system user
    getSystemUser = async () => ({
      id: 'xronr0y2ule1my2abd0wfulc',
      role: 'admin',
      email: 'system@TKNZN.pro',
    });
  }
} catch (error: any) {
  console.warn('⚠️  Could not import ZenStack client. Will use API endpoint or example data.');
  console.warn(`   Error: ${error.message}`);
  console.warn(`   Note: Make sure to run this script from project root or set up proper module resolution`);
  createClient = null;
}

interface SeedProperty {
  id?: string;
  title: string;
  description: string;
  propertyType: string;
  location: string;
  price: string | number;
  tokenPrice: string | number;
  totalTokens: string | number;
  owner?: string;
  images?: string[];
  features?: string[];
  metadata?: Record<string, any>;
}

interface SeedInvestment {
  id?: string;
  propertyId: string;
  investorAddress: string;
  amount: string | number;
  tokens: string | number;
  metadata?: Record<string, any>;
}

interface SeedData {
  properties: SeedProperty[];
  investments?: SeedInvestment[];
}

/**
 * Query properties from database using ZenStack
 */
async function queryPropertiesFromDatabase(): Promise<SeedProperty[]> {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.warn('⚠️  DATABASE_URL not set. Using example data.');
    return getExampleProperties();
  }
  
  // Option 1: Use ZenStack client (preferred)
  if (createClient) {
    try {
      console.log('📊 Querying database using ZenStack...');
      const systemUser = await getSystemUser();
      const db = createClient(systemUser);
      
      // Query RealEstateAsset where tokenContractAddress is null (not yet on-chain)
      const properties = await db.realEstateAsset.findMany({
        where: {
          tokenContractAddress: null, // Only get properties not yet on-chain
          status: {
            not: 'DRAFT', // Exclude draft properties
          },
        },
        select: {
          id: true,
          title: true,
          description: true,
          assetType: true,
          location: true,
          price: true,
          tokenPrice: true,
          totalTokens: true,
          ownerId: true,
          owner: {
            select: {
              walletAddress: true,
            },
          },
        },
      });
      
      const propertiesArray = properties as any[];
      console.log(`   ✅ Found ${propertiesArray.length} properties to register`);
      
      return propertiesArray.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        propertyType: p.assetType, // Map assetType to propertyType
        location: p.location || 'Unknown',
        price: p.price.toString(),
        tokenPrice: p.tokenPrice.toString(),
        totalTokens: p.totalTokens.toString(),
        owner: p.owner?.walletAddress || p.ownerId, // Use wallet address if available
      }));
    } catch (error: any) {
      console.error('❌ Error querying with ZenStack:', error.message);
      console.error('   Stack:', error.stack?.substring(0, 200));
    }
  }
  
  // Option 2: Use API endpoint (fallback)
  try {
    console.log('📊 Trying API endpoint...');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/real-estate-assets?tokenContractAddress=null`);
    
    if (response.ok) {
      const data = await response.json() as any[];
      console.log(`   ✅ Found ${data.length} properties via API`);
      return data.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        propertyType: p.assetType || p.propertyType,
        location: p.location || 'Unknown',
        price: p.price.toString(),
        tokenPrice: p.tokenPrice.toString(),
        totalTokens: p.totalTokens.toString(),
        owner: p.owner?.walletAddress || p.ownerId,
      }));
    }
  } catch (error: any) {
    console.error('❌ Error querying API:', error.message);
  }
  
  // Fallback to example data
  console.warn('⚠️  Could not query database. Using example data.');
  return getExampleProperties();
}

/**
 * Query investments from database using ZenStack
 */
async function queryInvestmentsFromDatabase(): Promise<SeedInvestment[]> {
  if (!createClient) {
    return [];
  }
  
  try {
    const systemUser = await getSystemUser();
    const db = createClient(systemUser);
    
    const investments = await db.investment.findMany({
      where: {
        realEstateAsset: {
          tokenContractAddress: null, // Only investments for properties not yet on-chain
        },
      },
      select: {
        id: true,
        realEstateAssetId: true,
        investor: {
          select: {
            walletAddress: true,
          },
        },
        amount: true,
        tokenAmount: true,
      },
    });
    
    return investments.map((inv: any) => ({
      id: inv.id,
      propertyId: inv.realEstateAssetId,
      investorAddress: inv.investor?.walletAddress || '',
      amount: inv.amount.toString(),
      tokens: inv.tokenAmount.toString(),
    }));
  } catch (error: any) {
    console.error('❌ Error querying investments:', error.message);
    return [];
  }
}

/**
 * Get example properties (for testing)
 */
function getExampleProperties(): SeedProperty[] {
  return [
    {
      title: "Luxury Villa in Monaco",
      description: "Premium waterfront villa with panoramic sea views, private beach access, and world-class amenities",
      propertyType: "VILLA",
      location: "Monaco, Monaco",
      price: "5000000", // 5M ETH equivalent
      tokenPrice: "0.1", // 0.1 ETH per token
      totalTokens: "50000000", // 50M tokens
    },
    {
      title: "Commercial Office Building",
      description: "Modern office complex in prime business district with high occupancy rates",
      propertyType: "COMMERCIAL",
      location: "Dubai, UAE",
      price: "10000000", // 10M ETH equivalent
      tokenPrice: "0.2", // 0.2 ETH per token
      totalTokens: "50000000", // 50M tokens
    },
    {
      title: "Luxury Yacht",
      description: "Premium yacht with state-of-the-art facilities and crew",
      propertyType: "YACHT",
      location: "Mediterranean Sea",
      price: "3000000", // 3M ETH equivalent
      tokenPrice: "0.05", // 0.05 ETH per token
      totalTokens: "60000000", // 60M tokens
    },
  ];
}

/**
 * Main function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   QUERY SEED DATA FROM DATABASE                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const outputFile = process.argv[2] || path.join(__dirname, '../seed-data.json');
  
  console.log(`📂 Querying database for seed data...\n`);
  
  const properties = await queryPropertiesFromDatabase();
  const investments = await queryInvestmentsFromDatabase();
  
  const seedData: SeedData = {
    properties,
    investments: investments.length > 0 ? investments : undefined,
  };
  
  console.log(`✅ Found ${properties.length} properties`);
  if (investments.length > 0) {
    console.log(`✅ Found ${investments.length} investments\n`);
  }
  
  // Save to file
  fs.writeFileSync(outputFile, JSON.stringify(seedData, null, 2));
  console.log(`📄 Seed data saved to: ${outputFile}\n`);
  
  // Display summary
  console.log('📊 Summary:');
  properties.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.title} (${p.propertyType})`);
    console.log(`      Location: ${p.location}`);
    console.log(`      Price: ${p.price} ETH`);
    console.log(`      Tokens: ${p.totalTokens} @ ${p.tokenPrice} ETH each\n`);
  });
  
  console.log('✅ Seed data query complete!');
  console.log(`\n📝 Next step: Run registration script:`);
  console.log(`   bun run tsx scripts/register-seed-assets-onchain.ts ${outputFile}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Query failed:', error);
    process.exit(1);
  });

