#!/usr/bin/env tsx
/**
 * Activate Fresh Deployment Contracts
 * 
 * Reactivates the freshly deployed contracts in the database
 * and ensures they have complete ABIs
 */

import 'dotenv/config';
import { createClient } from '../../../src/lib/db';
import hre from 'hardhat';
import { createHash } from 'crypto';

// System user for database operations
const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN' as const,
  name: 'System Admin'
};

const NETWORK_ID = '11155111'; // Sepolia

// Fresh deployment contracts (from successful deployment)
const FRESH_CONTRACTS = [
  {
    address: '0xF1f235CD451637d446AfF963dF512D80B8b8Bbae',
    type: 'REGISTRY',
    name: 'RWAAssetRegistryUpgradeable',
    implementation: '0x2BA20c298aee7B66D91804d8C69EB2A6E63DB8FD',
    artifactPath: 'contracts/core/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable',
  },
  {
    address: '0xB1e4945502B2ad72c0ff067B1B8E9EF9be10CBd0',
    type: 'FACTORY',
    name: 'RWATokenFactoryUpgradeable',
    implementation: '0xB5Bc89195656bAEB882a0e5eff5fdAe63B8FcC60',
    artifactPath: 'contracts/upgradeable/RWATokenFactoryUpgradeable.sol:RWATokenFactoryUpgradeable',
  },
  {
    address: '0x41CC47BC79F645840f5051B909E0f4E633E363Af',
    type: 'ERC404_FACTORY',
    name: 'RWATokenFactory404Fixed',
    implementation: null,
    artifactPath: 'contracts/core/RWATokenFactory404Fixed.sol:RWATokenFactory404Fixed',
  },
  {
    address: '0x033c3B60f713027Fa9bE06A461Aa4DC1C348cEcB',
    type: 'MARKETPLACE',
    name: 'RWAMarketplaceUpgradeableSetter',
    implementation: '0x3DDCf7f8E1628eeED1579AAF7281B6fa2a4d8acd',
    artifactPath: 'contracts/marketplace/RWAMarketplaceUpgradeableSetter.sol:RWAMarketplaceUpgradeableSetter',
  },
];

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   ACTIVATE FRESH DEPLOYMENT CONTRACTS                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const db = createClient(systemUser);

  // Process each fresh contract
  for (const fresh of FRESH_CONTRACTS) {
    console.log(`\n📦 Processing ${fresh.type}...`);
    console.log(`   Address: ${fresh.address}`);

    // Check if exists in database
    const existing = await db.deployedContract.findFirst({
      where: {
        networkId: NETWORK_ID,
        contractType: fresh.type,
      } as any,
    });

    if (existing) {
      // Update to use fresh address and mark as active
      console.log(`   ℹ️  Found existing record, updating...`);
      
      await db.deployedContract.update({
        where: { id: existing.id },
        data: {
          contractAddress: fresh.address.toLowerCase(),
          contractName: fresh.name,
          implementationAddress: fresh.implementation,
          isActive: true,
          isVerified: true,
        } as any,
      });
      
      console.log(`   ✅ Contract reactivated with fresh address`);
    } else {
      console.log(`   ℹ️  No existing record found`);
    }

    // Ensure ABI exists
    const existingABI = await db.contractABI.findFirst({
      where: {
        contractAddress: fresh.address.toLowerCase(),
        networkId: NETWORK_ID,
      } as any,
    });

    if (!existingABI) {
      console.log(`   📋 Adding ABI for ${fresh.type}...`);
      
      try {
        // Read artifact
        const artifact = await hre.artifacts.readArtifact(fresh.artifactPath);
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

        await db.contractABI.create({
          data: {
            contractAddress: fresh.address.toLowerCase(),
            networkId: NETWORK_ID,
            abi: abi,
            parsedFunctions: parsedFunctions,
            parsedEvents: events,
            parsedErrors: errors.length > 0 ? errors : null,
            isVerified: true,
            contractName: fresh.name,
            totalFunctions: functions.length,
            totalEvents: events.length,
            hasPayable: functions.some((f: any) => f.stateMutability === 'payable'),
            hasView: parsedFunctions.read.length > 0,
            hasPure: functions.some((f: any) => f.stateMutability === 'pure'),
            syncStatus: 'synced',
          } as any,
        });

        console.log(`   ✅ ABI added (${functions.length} functions, ${events.length} events)`);
      } catch (error: any) {
        console.error(`   ❌ Failed to add ABI:`, error.message);
      }
    } else {
      console.log(`   ✅ ABI already exists`);
    }
  }

  // Summary
  console.log("\n\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   ✅ ACTIVATION COMPLETE                                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const activeContracts = await db.deployedContract.findMany({
    where: {
      networkId: NETWORK_ID,
      isActive: true,
    } as any,
  });

  const activeABIs = await db.contractABI.findMany({
    where: {
      networkId: NETWORK_ID,
      contractAddress: {
        in: FRESH_CONTRACTS.map(c => c.address.toLowerCase()),
      } as any,
    } as any,
  });

  console.log(`   Active Contracts: ${activeContracts.length}/4 ${activeContracts.length === 4 ? '✅' : '❌'}`);
  console.log(`   ABIs Available:   ${activeABIs.length}/4 ${activeABIs.length === 4 ? '✅' : '❌'}\n`);

  if (activeContracts.length === 4 && activeABIs.length === 4) {
    console.log(`   ✅ All fresh contracts activated with ABIs!`);
    console.log(`\n   📋 Next: bun run tsx scripts/export-abis-for-frontend.ts\n`);
  } else {
    console.log(`   ⚠️  Some contracts or ABIs missing, review above\n`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Failed:", error);
  process.exit(1);
});
