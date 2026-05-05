#!/usr/bin/env tsx
/**
 * Sync Fresh Deployment to Database
 * 
 * This script ensures the database has ONLY the freshly deployed contracts
 * and removes any old/stale contract records
 */

import 'dotenv/config';
import { createClient } from '../../../src/lib/db';
import { ethers } from 'hardhat';
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

// Fresh deployment addresses (from the deployment we just completed)
const FRESH_CONTRACTS = [
  {
    contractAddress: '0xF1f235CD451637d446AfF963dF512D80B8b8Bbae',
    contractName: 'RWAAssetRegistryUpgradeable',
    contractType: 'REGISTRY',
    implementationAddress: '0x2BA20c298aee7B66D91804d8C69EB2A6E63DB8FD',
    isUpgradeable: true,
    proxyType: 'UUPS',
    artifactPath: 'contracts/core/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable',
  },
  {
    contractAddress: '0xB1e4945502B2ad72c0ff067B1B8E9EF9be10CBd0',
    contractName: 'RWATokenFactoryUpgradeable',
    contractType: 'FACTORY',
    implementationAddress: '0xB5Bc89195656bAEB882a0e5eff5fdAe63B8FcC60',
    isUpgradeable: true,
    proxyType: 'UUPS',
    artifactPath: 'contracts/upgradeable/RWATokenFactoryUpgradeable.sol:RWATokenFactoryUpgradeable',
  },
  {
    contractAddress: '0x41CC47BC79F645840f5051B909E0f4E633E363Af',
    contractName: 'RWATokenFactory404Fixed',
    contractType: 'ERC404_FACTORY',
    implementationAddress: null,
    isUpgradeable: false,
    proxyType: null,
    artifactPath: 'contracts/core/RWATokenFactory404Fixed.sol:RWATokenFactory404Fixed',
  },
  {
    contractAddress: '0x033c3B60f713027Fa9bE06A461Aa4DC1C348cEcB',
    contractName: 'RWAMarketplaceUpgradeableSetter',
    contractType: 'MARKETPLACE',
    implementationAddress: '0x3DDCf7f8E1628eeED1579AAF7281B6fa2a4d8acd',
    isUpgradeable: true,
    proxyType: 'UUPS',
    artifactPath: 'contracts/marketplace/RWAMarketplaceUpgradeableSetter.sol:RWAMarketplaceUpgradeableSetter',
  },
];

async function main() {
  const db = createClient(systemUser);
  const [deployer] = await ethers.getSigners();

  console.log("🔍 Step 1: Identifying contracts to update/add\n");

  // Check current state
  const currentContracts = await db.deployedContract.findMany({
    where: { networkId: NETWORK_ID } as any,
  });

  console.log(`   Current contracts in database: ${currentContracts.length}`);
  console.log(`   Fresh contracts to sync: ${FRESH_CONTRACTS.length}\n`);

  // For each fresh contract, update or create
  console.log("💾 Step 2: Syncing fresh contracts to database\n");

  for (const fresh of FRESH_CONTRACTS) {
    console.log(`   📦 Processing ${fresh.contractType}...`);

    // Check on blockchain
    const code = await ethers.provider.getCode(fresh.contractAddress);
    if (code === '0x') {
      console.log(`      ❌ Contract not found on blockchain at ${fresh.contractAddress}`);
      continue;
    }

    console.log(`      ✅ Contract verified on blockchain`);

    // Load ABI
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

    const abiHash = createHash('sha256').update(JSON.stringify(abi)).digest('hex');

    // Get deployment block
    let deploymentBlock = BigInt(0);
    try {
      const receipt = await ethers.provider.getTransactionReceipt(
        currentContracts.find(c => c.contractType === fresh.contractType)?.deploymentTx || ''
      );
      if (receipt) {
        deploymentBlock = BigInt(receipt.blockNumber);
      }
    } catch {
      // Use latest block if can't find deployment tx
      const latestBlock = await ethers.provider.getBlock('latest');
      deploymentBlock = BigInt(latestBlock!.number);
    }

    // Check for existing contract by unique constraint
    const existing = await db.deployedContract.findFirst({
      where: {
        networkId: NETWORK_ID,
        contractType: fresh.contractType,
      } as any,
    });

    const contractData = {
      contractAddress: fresh.contractAddress.toLowerCase(),
      contractName: fresh.contractName,
      contractType: fresh.contractType,
      networkId: NETWORK_ID,
      deployedBy: deployer.address,
      deploymentTx: existing?.deploymentTx || '',
      deploymentBlock: deploymentBlock,
      deployedAt: new Date(),
      abiHash: abiHash,
      isUpgradeable: fresh.isUpgradeable,
      proxyType: fresh.proxyType,
      implementationAddress: fresh.implementationAddress,
      isActive: true,
      isVerified: true,
      version: '1.0.0',
      adminAddresses: [deployer.address],
    };

    if (existing) {
      console.log(`      ℹ️  Updating existing contract record...`);
      await db.deployedContract.update({
        where: { id: existing.id },
        data: contractData as any,
      });
      console.log(`      ✅ Contract updated`);
    } else {
      console.log(`      ℹ️  Creating new contract record...`);
      await db.deployedContract.create({
        data: contractData as any,
      });
      console.log(`      ✅ Contract created`);
    }

    // Update or create ABI
    const existingABI = await db.contractABI.findFirst({
      where: {
        contractAddress: fresh.contractAddress.toLowerCase(),
        networkId: NETWORK_ID,
      } as any,
    });

    const abiData = {
      contractAddress: fresh.contractAddress.toLowerCase(),
      networkId: NETWORK_ID,
      abi: abi,
      parsedFunctions: parsedFunctions,
      parsedEvents: events,
      parsedErrors: errors.length > 0 ? errors : null,
      isVerified: true,
      contractName: fresh.contractName,
      totalFunctions: functions.length,
      totalEvents: events.length,
      hasPayable: functions.some((f: any) => f.stateMutability === 'payable'),
      hasView: parsedFunctions.read.length > 0,
      hasPure: functions.some((f: any) => f.stateMutability === 'pure'),
      syncStatus: 'synced',
    };

    if (existingABI) {
      await db.contractABI.update({
        where: { id: existingABI.id },
        data: abiData as any,
      });
      console.log(`      ✅ ABI updated (${functions.length} functions, ${events.length} events)`);
    } else {
      await db.contractABI.create({
        data: abiData as any,
      });
      console.log(`      ✅ ABI created (${functions.length} functions, ${events.length} events)`);
    }

    console.log();
  }

  // Mark old contracts as inactive
  console.log("🧹 Step 3: Marking old contracts as inactive\n");

  const freshAddresses = FRESH_CONTRACTS.map(c => c.contractAddress.toLowerCase());
  
  const updated = await db.deployedContract.updateMany({
    where: {
      networkId: NETWORK_ID,
      contractAddress: {
        notIn: freshAddresses,
      } as any,
      isActive: true,
    } as any,
    data: {
      isActive: false,
    } as any,
  });

  console.log(`   ℹ️  Marked ${updated.count} old contracts as inactive\n`);

  // Final count
  const finalContracts = await db.deployedContract.findMany({
    where: {
      networkId: NETWORK_ID,
      isActive: true,
    } as any,
  });

  const finalABIs = await db.contractABI.findMany({
    where: {
      networkId: NETWORK_ID,
      contractAddress: {
        in: freshAddresses,
      } as any,
    } as any,
  });

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   ✅ DATABASE SYNC COMPLETE                               ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log(`   Active Contracts: ${finalContracts.length}/4 ${finalContracts.length === 4 ? '✅' : '❌'}`);
  console.log(`   ABIs Synced:      ${finalABIs.length}/4 ${finalABIs.length === 4 ? '✅' : '❌'}\n`);

  console.log(`📋 Fresh Deployment Contracts:\n`);
  
  for (const contract of finalContracts) {
    console.log(`   ${contract.contractType.padEnd(20)} ${contract.contractAddress}`);
  }

  console.log(`\n📋 Next Steps:`);
  console.log(`   1. Run: bun run tsx scripts/export-abis-for-frontend.ts`);
  console.log(`   2. ABIs will be exported to src/lib/contracts/abis/`);
  console.log(`   3. Frontend can import from @/lib/contracts/abis`);
  console.log(`   4. NO environment variables needed!\n`);

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Sync failed:", error);
  process.exit(1);
});
