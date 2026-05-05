#!/usr/bin/env tsx
/**
 * List Database Contracts
 * 
 * Shows exactly what's in the database currently
 */

import 'dotenv/config';
import { createClient } from '../../../src/lib/db';

// System user for database operations
const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN' as const,
  name: 'System Admin'
};

const NETWORK_ID = '11155111'; // Sepolia

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   CURRENT DATABASE STATE                                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const db = createClient(systemUser);

  // Load ALL contracts (active and inactive)
  const allContracts = await db.deployedContract.findMany({
    where: { networkId: NETWORK_ID } as any,
    orderBy: { deployedAt: 'desc' },
  });

  console.log(`📊 Total Contracts for Sepolia: ${allContracts.length}\n`);

  // Group by active status
  const activeContracts = allContracts.filter(c => c.isActive);
  const inactiveContracts = allContracts.filter(c => !c.isActive);

  console.log(`✅ Active Contracts: ${activeContracts.length}`);
  console.log(`❌ Inactive Contracts: ${inactiveContracts.length}\n`);

  // Show active contracts
  if (activeContracts.length > 0) {
    console.log("╭──── ACTIVE CONTRACTS ────────────────────────────────────╮\n");
    
    for (const c of activeContracts) {
      console.log(`   ${c.contractType.padEnd(20)} ${c.contractAddress}`);
      console.log(`      Name: ${c.contractName}`);
      console.log(`      Deployed: ${c.deployedAt.toISOString()}`);
      console.log(`      Verified: ${c.isVerified ? '✅' : '❌'}`);
      if (c.implementationAddress) {
        console.log(`      Implementation: ${c.implementationAddress}`);
      }
      console.log();
    }
  }

  // Show inactive contracts (most recent 5)
  if (inactiveContracts.length > 0) {
    console.log("╭──── INACTIVE CONTRACTS (Most Recent 5) ──────────────────╮\n");
    
    const recentInactive = inactiveContracts.slice(0, 5);
    for (const c of recentInactive) {
      console.log(`   ${c.contractType.padEnd(20)} ${c.contractAddress}`);
      console.log(`      Name: ${c.contractName}`);
      console.log(`      Deployed: ${c.deployedAt.toISOString()}`);
      console.log();
    }
    
    if (inactiveContracts.length > 5) {
      console.log(`   ... and ${inactiveContracts.length - 5} more inactive contracts\n`);
    }
  }

  // Check ABIs
  const abis = await db.contractABI.findMany({
    where: { networkId: NETWORK_ID } as any,
  });

  console.log(`\n📋 Contract ABIs: ${abis.length} total\n`);

  const activeContractAddresses = activeContracts.map(c => c.contractAddress.toLowerCase());
  const abisForActiveContracts = abis.filter(a => 
    activeContractAddresses.includes(a.contractAddress.toLowerCase())
  );

  console.log(`   ABIs for active contracts: ${abisForActiveContracts.length}/${activeContracts.length}\n`);

  // Summary
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   SUMMARY                                                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log(`   Total Contracts (Sepolia):  ${allContracts.length}`);
  console.log(`   Active Contracts:           ${activeContracts.length}`);
  console.log(`   Inactive Contracts:         ${inactiveContracts.length}`);
  console.log(`   Total ABIs:                 ${abis.length}`);
  console.log(`   ABIs for Active Contracts:  ${abisForActiveContracts.length}\n`);

  if (activeContracts.length === 0) {
    console.log("   ⚠️  WARNING: No active contracts found!");
    console.log("   This means all contracts were marked as inactive.");
    console.log("   You may need to review and reactivate the correct contracts.\n");
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Failed:", error);
  process.exit(1);
});
