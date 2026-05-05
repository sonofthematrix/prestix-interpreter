#!/usr/bin/env tsx
/**
 * Add Missing ABIs for Fresh Deployment
 * 
 * Adds ABIs to the database for contracts that don't have them yet
 */

import 'dotenv/config';
import { createClient } from '../../../src/lib/db';
import { ethers } from 'hardhat';
import hre from 'hardhat';

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
  console.log("║   ADD MISSING ABIs FOR FRESH DEPLOYMENT                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const db = createClient(systemUser);

  // Load all deployed contracts
  const contracts = await db.deployedContract.findMany({
    where: {
      networkId: NETWORK_ID,
      isActive: true,
    } as any,
  });

  console.log(`📋 Found ${contracts.length} deployed contracts\n`);

  // Check which contracts have ABIs
  const abis = await db.contractABI.findMany({
    where: { networkId: NETWORK_ID } as any,
  });

  console.log(`📋 Found ${abis.length} existing ABIs\n`);

  // Find contracts without ABIs
  const contractsWithoutABIs = contracts.filter(c => 
    !abis.some(a => a.contractAddress.toLowerCase() === c.contractAddress.toLowerCase())
  );

  console.log(`⚠️  ${contractsWithoutABIs.length} contracts missing ABIs:\n`);

  for (const contract of contractsWithoutABIs) {
    console.log(`   ${contract.contractType.padEnd(20)} ${contract.contractAddress}`);
  }

  console.log();

  // Add ABIs for our freshly deployed contracts
  const freshContracts = [
    {
      type: 'ERC404_FACTORY',
      name: 'RWATokenFactory404Fixed',
      artifactPath: 'contracts/core/RWATokenFactory404Fixed.sol:RWATokenFactory404Fixed',
    },
    {
      type: 'REGISTRY',
      name: 'RWAAssetRegistryUpgradeable',
      artifactPath: 'contracts/core/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable',
    },
    {
      type: 'FACTORY',
      name: 'RWATokenFactoryUpgradeable',
      artifactPath: 'contracts/upgradeable/RWATokenFactoryUpgradeable.sol:RWATokenFactoryUpgradeable',
    },
    {
      type: 'MARKETPLACE',
      name: 'RWAMarketplaceUpgradeableSetter',
      artifactPath: 'contracts/marketplace/RWAMarketplaceUpgradeableSetter.sol:RWAMarketplaceUpgradeableSetter',
    },
  ];

  for (const { type, name, artifactPath } of freshContracts) {
    const contract = contracts.find(c => c.contractType === type);
    
    if (!contract) {
      console.log(`   ⚠️  Contract ${type} not found in database, skipping...`);
      continue;
    }

    const existingABI = abis.find(a => a.contractAddress.toLowerCase() === contract.contractAddress.toLowerCase());
    
    if (existingABI) {
      console.log(`   ℹ️  ABI already exists for ${type}, skipping...`);
      continue;
    }

    console.log(`\n   📦 Adding ABI for ${type}...`);

    try {
      // Read artifact
      const artifact = await hre.artifacts.readArtifact(artifactPath);
      const abi = artifact.abi;

      // Parse ABI
      const functions = abi.filter((item: any) => item.type === 'function');
      const events = abi.filter((item: any) => item.type === 'event');
      const errors = abi.filter((item: any) => item.type === 'error');

      const parsedFunctions = {
        read: functions.filter((f: any) => ['view', 'pure'].includes(f.stateMutability)),
        write: functions.filter((f: any) => !['view', 'pure'].includes(f.stateMutability)),
        all: functions,
      };

      // Store in database
      await db.contractABI.create({
        data: {
          contractAddress: contract.contractAddress.toLowerCase(),
          networkId: NETWORK_ID,
          abi: abi,
          parsedFunctions: parsedFunctions,
          parsedEvents: events,
          parsedErrors: errors.length > 0 ? errors : null,
          isVerified: true,
          contractName: name,
          totalFunctions: functions.length,
          totalEvents: events.length,
          hasPayable: functions.some((f: any) => f.stateMutability === 'payable'),
          hasView: parsedFunctions.read.length > 0,
          hasPure: functions.some((f: any) => f.stateMutability === 'pure'),
        } as any,
      });

      console.log(`   ✅ ABI added for ${type} (${functions.length} functions, ${events.length} events)`);

    } catch (error: any) {
      console.error(`   ❌ Failed to add ABI for ${type}:`, error.message);
    }
  }

  // Summary
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   ✅ ABI UPDATE COMPLETE                                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Recount
  const updatedABIs = await db.contractABI.findMany({
    where: { networkId: NETWORK_ID } as any,
  });

  console.log(`   Total ABIs: ${updatedABIs.length}/${contracts.length}\n`);

  console.log(`📋 Next Step:`);
  console.log(`   Run: bun run tsx scripts/export-abis-for-frontend.ts\n`);

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
