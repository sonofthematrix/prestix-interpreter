#!/usr/bin/env tsx
/**
 * Sync On-Chain Assets to Database
 * 
 * This script updates the database with on-chain asset IDs and token addresses
 * after registering properties on-chain.
 * 
 * Usage:
 *   cd smart-contracts
 *   bun run tsx scripts/sync-assets-to-database.ts [registration-results.json]
 * 
 * Environment Variables Required:
 *   - DATABASE_URL (PostgreSQL connection string)
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env and .env.local
dotenv.config(); // Load .env
dotenv.config({ path: '.env.local' }); // Load .env.local (overrides .env)
dotenv.config({ path: path.join(__dirname, '../.env.local') }); // Also check parent directory

interface RegistrationResult {
  propertyId: string;
  assetId: number;
  tokenAddress: string;
  success: boolean;
  error?: string;
  txHash?: string;
}

interface RegistrationResults {
  network: string;
  timestamp: string;
  results: RegistrationResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * Update database with on-chain asset information using ZenStack
 */
async function updateDatabase(results: RegistrationResult[]): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.warn('⚠️  DATABASE_URL not set. Skipping database update.');
    return;
  }
  
  const successful = results.filter(r => r.success);
  
  if (successful.length === 0) {
    console.log('⚠️  No successful registrations to sync.');
    return;
  }
  
  console.log(`\n📊 Updating database with ${successful.length} assets...\n`);
  
  // Import ZenStack client
  const rootPath = path.resolve(__dirname, '../../..');
  let createClient: any;
  let getSystemUser: any;
  
  try {
    // Add root path to require resolution for @/ alias
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function(id: string) {
      if (id.startsWith('@/zenstack/')) {
        // Resolve @/zenstack/* to zenstack/* in root
        const resolved = id.replace('@/zenstack/', path.join(rootPath, 'zenstack/'));
        return originalRequire.call(this, resolved);
      } else if (id.startsWith('@/')) {
        // Resolve @/* to src/* in root
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
    console.error('   Falling back to API endpoint...');
    createClient = null;
  }
  
  // Option 1: Use ZenStack client (preferred)
  if (createClient) {
    try {
      // Use fallback system user for script execution (no session context)
      let systemUser;
      try {
        systemUser = await getSystemUser();
      } catch {
        // Fallback: create a simple system user for script execution
        systemUser = {
          id: 'xronr0y2ule1my2abd0wfulc',
          role: 'admin',
          email: 'system@TKNZN.pro',
        };
      }
      const db = createClient(systemUser);
      
      for (const result of successful) {
        try {
          // Try to update first (if property exists)
          await db.realEstateAsset.update({
            where: {
              id: result.propertyId,
            },
            data: {
              tokenContractAddress: result.tokenAddress,
              status: 'ACTIVE',
            },
          });
          console.log(`   ✅ Updated property ${result.propertyId}: Asset ID ${result.assetId}, Token ${result.tokenAddress}`);
        } catch (updateError: any) {
          if (updateError.code === 'P2025' || updateError.message?.includes('not found')) {
            // Property doesn't exist - log warning but continue
            console.warn(`   ⚠️  Property ${result.propertyId} not found in database. Skipping update.`);
            console.warn(`      To sync this asset, create the property in the database first with ID: ${result.propertyId}`);
          } else {
            throw updateError;
          }
        }
      }
      
      console.log(`\n✅ Successfully updated ${successful.length} properties in database`);
      return;
    } catch (error: any) {
      console.error('❌ Error updating with ZenStack:', error.message);
      console.error('   Falling back to API endpoint...');
    }
  }
  
  // Option 2: Use API endpoint (fallback)
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    for (const result of successful) {
      const response = await fetch(`${apiUrl}/api/real-estate-assets/${result.propertyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenContractAddress: result.tokenAddress,
          // Add assetId to metadata or custom field if API supports it
          metadata: {
            blockchainAssetId: result.assetId,
            tokenAddress: result.tokenAddress,
            registeredAt: new Date().toISOString(),
          },
        }),
      });
      
      if (response.ok) {
        console.log(`   ✅ Updated property ${result.propertyId}: Asset ID ${result.assetId}`);
      } else {
        const errorText = await response.text();
        console.error(`   ❌ Failed to update property ${result.propertyId}: ${response.statusText}`);
        console.error(`      ${errorText.substring(0, 100)}`);
      }
    }
  } catch (error: any) {
    console.error('❌ Error updating via API:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   SYNC ON-CHAIN ASSETS TO DATABASE                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const resultsFile = process.argv[2] || path.join(__dirname, '../seed-assets-registration-results.json');
  
  if (!fs.existsSync(resultsFile)) {
    console.error(`❌ Results file not found: ${resultsFile}`);
    console.error(`   Run registration script first: bun run tsx scripts/register-seed-assets-onchain.ts`);
    process.exit(1);
  }
  
  console.log(`📂 Loading registration results from: ${resultsFile}\n`);
  
  const data = fs.readFileSync(resultsFile, 'utf-8');
  const results: RegistrationResults = JSON.parse(data);
  
  console.log(`📊 Registration Summary:`);
  console.log(`   Network: ${results.network}`);
  console.log(`   Timestamp: ${results.timestamp}`);
  console.log(`   Total: ${results.summary.total}`);
  console.log(`   Successful: ${results.summary.successful}`);
  console.log(`   Failed: ${results.summary.failed}\n`);
  
  if (results.summary.successful === 0) {
    console.log('⚠️  No successful registrations to sync.');
    process.exit(0);
  }
  
  // Update database
  await updateDatabase(results.results);
  
  console.log('\n✅ Database sync complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Verify assets are visible in frontend');
  console.log('   2. Test token purchases on marketplace');
  console.log('   3. Monitor on-chain events for transactions\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  });

