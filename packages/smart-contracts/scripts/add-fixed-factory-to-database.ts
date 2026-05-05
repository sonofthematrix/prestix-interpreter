#!/usr/bin/env tsx

/**
 * Add Fixed Factory to Database
 * 
 * Adds the RWATokenFactory404Fixed contract to the database.
 * 
 * Usage:
 *   bun run scripts/add-fixed-factory-to-database.ts
 */

import 'dotenv/config';
import { createClient } from '../../../src/lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

// System user for database operations
const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN' as const,
  name: 'System Admin'
};

// Fixed factory address
const FIXED_FACTORY_ADDRESS = '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b';
const SEPOLIA_NETWORK_ID = '11155111';

async function main() {
  console.log('🏭 Adding Fixed Factory to Database');
  console.log('════════════════════════════════════════════════════════════\n');

  const db = createClient(systemUser);

  try {
    // Check if contract already exists
    const existing = await db.deployedContract.findFirst({
      where: {
        contractAddress: FIXED_FACTORY_ADDRESS.toLowerCase() as any,
        networkId: SEPOLIA_NETWORK_ID as any,
      } as any,
    });

    if (existing) {
      console.log('✅ Fixed factory already exists in database');
      console.log(`   ID: ${existing.id}`);
      console.log(`   Name: ${existing.contractName}`);
      console.log(`   Type: ${existing.contractType}`);
      console.log(`   Active: ${existing.isActive ? 'YES' : 'NO'}\n`);
      return;
    }

    // Read the ABI file for RWATokenFactory404Fixed
    const abiPath = join(
      process.cwd(),
      'packages/smart-contracts/artifacts/contracts/core/RWATokenFactory404Fixed.sol/RWATokenFactory404Fixed.json'
    );

    let abiData;
    try {
      abiData = JSON.parse(readFileSync(abiPath, 'utf8'));
    } catch (error: any) {
      console.log('⚠️  Could not read ABI file, using placeholder');
      abiData = { abi: [] };
    }

    const abi = abiData.abi || [];
    const abiHash = createHash('sha256').update(JSON.stringify(abi)).digest('hex');

    // Update existing ERC404_FACTORY record (unique constraint on networkId + contractType)
    console.log('📝 Updating ERC404_FACTORY record...');
    
    // Find existing ERC404_FACTORY
    const existingFactory = await db.deployedContract.findFirst({
      where: {
        contractType: 'ERC404_FACTORY' as any,
        networkId: SEPOLIA_NETWORK_ID as any,
      } as any,
    });

    if (existingFactory) {
      console.log(`   Found existing ERC404_FACTORY: ${existingFactory.contractAddress}`);
      console.log(`   Updating to fixed factory address...`);
    }

    const contract = await db.deployedContract.updateMany({
      where: {
        contractType: { equals: 'ERC404_FACTORY' } as any,
        networkId: { equals: SEPOLIA_NETWORK_ID } as any,
      },
      data: {
        contractAddress: FIXED_FACTORY_ADDRESS.toLowerCase() as any,
        contractName: 'RWATokenFactory404Fixed',
        deployedBy: '0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047', // Admin wallet
        deploymentTx: '0x0000000000000000000000000000000000000000000000000000000000000000', // Placeholder
        deploymentBlock: BigInt(0), // Placeholder
        deployedAt: new Date(),
        abiHash,
        version: '1.0.0',
        isActive: true,
        isVerified: false, // Will be verified on Etherscan
        isUpgradeable: false,
      } as any,
    });

    console.log(`✅ Contract updated in database`);
    console.log(`   Updated ${contract.count} record(s)`);
    console.log(`   Address: ${FIXED_FACTORY_ADDRESS}\n`);

    // Verify the update
    const updatedContract = await db.deployedContract.findFirst({
      where: {
        contractType: 'ERC404_FACTORY' as any,
        networkId: SEPOLIA_NETWORK_ID as any,
      } as any,
    });

    if (updatedContract) {
      console.log(`✅ Verification: Contract address is ${updatedContract.contractAddress}`);
    }

    // Add ABI if we have it
    if (abi.length > 0) {
      console.log('📝 Creating ABI record...');
      const abiRecord = await db.contractABI.create({
        data: {
          contractAddress: FIXED_FACTORY_ADDRESS.toLowerCase() as any,
          abi: abi,
          abiHash: abiHash,
          verifiedAt: new Date(),
          verificationSource: 'artifacts',
          contractName: 'RWATokenFactory404Fixed',
          totalFunctions: abi.filter((item: any) => item.type === 'function').length,
          totalEvents: abi.filter((item: any) => item.type === 'event').length,
        } as any,
      });

      console.log('✅ ABI added to database');
      console.log(`   Functions: ${abi.filter((item: any) => item.type === 'function').length}`);
      console.log(`   Events: ${abi.filter((item: any) => item.type === 'event').length}\n`);
    } else {
      console.log('⚠️  No ABI data available - ABI record not created\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Fixed factory added to database successfully!');
    console.log(`   Address: ${FIXED_FACTORY_ADDRESS}`);
    console.log(`   Name: RWATokenFactory404Fixed`);
    console.log(`   Type: ERC404_FACTORY`);
    console.log(`   Status: ACTIVE\n`);

  } catch (error: any) {
    console.error('❌ Failed to add fixed factory:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
