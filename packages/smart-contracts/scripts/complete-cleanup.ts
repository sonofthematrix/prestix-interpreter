#!/usr/bin/env tsx
/**
 * COMPLETE CLEANUP SCRIPT
 * 
 * Removes ALL traces of previous deployments:
 * 1. Build artifacts (artifacts/, cache/, .openzeppelin/)
 * 2. Deployment records (deployed-addresses*.json)
 * 3. Database records (deployed_contracts, contract_abis, asset_contract_links)
 * 4. Environment variable references
 * 
 * ⚠️ WARNING: This is a destructive operation!
 * This will COMPLETELY WIPE all deployment history.
 * 
 * Usage:
 *   cd packages/smart-contracts
 *   bun run tsx scripts/complete-cleanup.ts
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '../../../src/lib/db';

// System user for database operations
const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN' as const,
  name: 'System Admin'
};

const SMART_CONTRACTS_DIR = path.join(__dirname, '..');
const ROOT_DIR = path.join(__dirname, '../../..');

async function cleanupBuildArtifacts() {
  console.log('🧹 STEP 1: Cleaning Build Artifacts\n');
  
  const artifactDirs = [
    path.join(SMART_CONTRACTS_DIR, 'artifacts'),
    path.join(SMART_CONTRACTS_DIR, 'cache'),
    path.join(SMART_CONTRACTS_DIR, '.openzeppelin'),
    path.join(SMART_CONTRACTS_DIR, 'typechain-types'),
  ];

  for (const dir of artifactDirs) {
    if (fs.existsSync(dir)) {
      console.log(`   🗑️  Removing: ${path.relative(ROOT_DIR, dir)}`);
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`   ✅ Removed: ${path.relative(ROOT_DIR, dir)}`);
    } else {
      console.log(`   ℹ️  Not found: ${path.relative(ROOT_DIR, dir)}`);
    }
  }
  
  console.log();
}

async function cleanupDeploymentRecords() {
  console.log('🧹 STEP 2: Cleaning Deployment Records\n');
  
  const deploymentFiles = [
    path.join(SMART_CONTRACTS_DIR, 'deployed-addresses.json'),
    path.join(SMART_CONTRACTS_DIR, 'deployed-addresses-fresh.json'),
    path.join(SMART_CONTRACTS_DIR, 'deployed-addresses-proxy.json'),
    path.join(SMART_CONTRACTS_DIR, 'deployed-addresses-proxy copy.json'),
  ];

  for (const file of deploymentFiles) {
    if (fs.existsSync(file)) {
      console.log(`   🗑️  Removing: ${path.relative(ROOT_DIR, file)}`);
      fs.unlinkSync(file);
      console.log(`   ✅ Removed: ${path.relative(ROOT_DIR, file)}`);
    } else {
      console.log(`   ℹ️  Not found: ${path.relative(ROOT_DIR, file)}`);
    }
  }
  
  console.log();
}

async function cleanupDatabaseRecords() {
  console.log('🧹 STEP 3: Cleaning Database Records\n');
  
  try {
    const db = createClient(systemUser);
    
    // Clean asset_contract_links (must be first due to foreign keys)
    console.log('   🗑️  Deleting asset_contract_links for Sepolia...');
    const deletedLinks = await db.assetContractLink.deleteMany({
      where: {
        networkId: '11155111' // Sepolia
      } as any
    });
    console.log(`   ✅ Deleted ${deletedLinks.count} asset contract links\n`);

    // Clean contract_abis for Sepolia
    console.log('   🗑️  Deleting contract ABIs for Sepolia...');
    const deletedAbis = await db.contractABI.deleteMany({
      where: {
        networkId: '11155111' // Sepolia
      } as any
    });
    console.log(`   ✅ Deleted ${deletedAbis.count} contract ABIs\n`);

    // Clean deployed_contracts for Sepolia
    console.log('   🗑️  Deleting deployed contracts for Sepolia...');
    const deletedContracts = await db.deployedContract.deleteMany({
      where: {
        networkId: '11155111' // Sepolia
      } as any
    });
    console.log(`   ✅ Deleted ${deletedContracts.count} deployed contracts\n`);

    console.log('   ✅ Database cleanup complete!\n');
  } catch (error: any) {
    console.error('   ❌ Database cleanup failed:', error.message);
    throw error;
  }
}

async function cleanupEnvironmentVariables() {
  console.log('🧹 STEP 4: Environment Variables Cleanup Instructions\n');
  
  console.log('   ⚠️  Manual Step Required: Update .env.local\n');
  console.log('   Remove or comment out these variables:');
  console.log('   - NEXT_PUBLIC_RWA_ASSET_REGISTRY');
  console.log('   - NEXT_PUBLIC_RWA_TOKEN_FACTORY');
  console.log('   - NEXT_PUBLIC_RWA_TOKEN_FACTORY_404');
  console.log('   - NEXT_PUBLIC_RWA_MARKETPLACE');
  console.log('   - NEXT_PUBLIC_RWA_MARKETPLACE_SETTER');
  console.log('   - PROXY_ADMIN_ADDRESS\n');
  
  console.log('   📝 After fresh deployment, you will need to update these with new addresses.\n');
}

async function verifyCleanup() {
  console.log('🔍 STEP 5: Verifying Cleanup\n');
  
  // Check build artifacts
  const artifactDirs = [
    'artifacts',
    'cache',
    '.openzeppelin',
  ].map(dir => path.join(SMART_CONTRACTS_DIR, dir));
  
  let allClean = true;
  
  for (const dir of artifactDirs) {
    if (fs.existsSync(dir)) {
      console.log(`   ❌ Still exists: ${path.relative(ROOT_DIR, dir)}`);
      allClean = false;
    } else {
      console.log(`   ✅ Removed: ${path.relative(ROOT_DIR, dir)}`);
    }
  }
  
  // Check deployment files
  const deploymentFiles = [
    'deployed-addresses.json',
    'deployed-addresses-fresh.json',
  ].map(file => path.join(SMART_CONTRACTS_DIR, file));
  
  for (const file of deploymentFiles) {
    if (fs.existsSync(file)) {
      console.log(`   ❌ Still exists: ${path.relative(ROOT_DIR, file)}`);
      allClean = false;
    } else {
      console.log(`   ✅ Removed: ${path.relative(ROOT_DIR, file)}`);
    }
  }
  
  // Check database
  try {
    const db = createClient(systemUser);
    const contractCount = await db.deployedContract.count({
      where: { networkId: '11155111' } as any
    });
    
    if (contractCount > 0) {
      console.log(`   ❌ Database still has ${contractCount} contracts for Sepolia`);
      allClean = false;
    } else {
      console.log(`   ✅ Database cleaned (0 contracts for Sepolia)`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not verify database: ${error.message}`);
  }
  
  console.log();
  
  if (allClean) {
    console.log('✅ Cleanup verification PASSED - System is clean!\n');
  } else {
    console.log('⚠️  Cleanup verification found issues - Some manual cleanup may be needed\n');
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   COMPLETE CLEANUP - REMOVE ALL DEPLOYMENT TRACES         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('⚠️  WARNING: This will DELETE:\n');
  console.log('   • All build artifacts (artifacts/, cache/, .openzeppelin/)');
  console.log('   • All deployment records (deployed-addresses*.json)');
  console.log('   • All database records for Sepolia network');
  console.log('   • (Manual) Environment variable references\n');
  
  console.log('📋 Target Network: Sepolia (Chain ID: 11155111)\n');
  
  // Wait 3 seconds for user to cancel if needed
  console.log('⏳ Starting cleanup in 3 seconds... (Ctrl+C to cancel)\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Step 1: Build artifacts
    await cleanupBuildArtifacts();
    
    // Step 2: Deployment records
    await cleanupDeploymentRecords();
    
    // Step 3: Database records
    await cleanupDatabaseRecords();
    
    // Step 4: Environment variables (instructions only)
    await cleanupEnvironmentVariables();
    
    // Step 5: Verify cleanup
    await verifyCleanup();
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ CLEANUP COMPLETE - SYSTEM READY FOR FRESH DEPLOY     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 Next Steps:\n');
    console.log('   1. Review and update .env.local (remove old contract addresses)');
    console.log('   2. Run: bun run tsx scripts/deploy-complete-fresh-ecosystem.ts');
    console.log('   3. Update .env.local with new contract addresses');
    console.log('   4. Verify contracts on Etherscan\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ CLEANUP FAILED:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
