#!/usr/bin/env tsx

/**
 * Update Factory Database Status
 * 
 * Updates the database to mark the fixed factory as active and old factory as inactive.
 * 
 * Usage:
 *   bun run scripts/update-factory-database.ts
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

// Deployed addresses
const FIXED_FACTORY_ADDRESS = '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b'; // RWATokenFactory404Fixed
const OLD_FACTORY_ADDRESS = '0xdc4A8BbeC696287E44262b3fE4c2605a0C59929F'; // RWATokenFactory404 (old)
const SEPOLIA_NETWORK_ID = '11155111';

async function main() {
  console.log('💾 Update Factory Database Status');
  console.log('════════════════════════════════════════════════════════════\n');

  const db = createClient(systemUser);

  try {
    console.log(`📋 Fixed Factory: ${FIXED_FACTORY_ADDRESS}`);
    console.log(`📋 Old Factory: ${OLD_FACTORY_ADDRESS}`);
    console.log(`📋 Network: Sepolia (${SEPOLIA_NETWORK_ID})\n`);

    // Find fixed factory
    const fixedFactory = await db.deployedContract.findFirst({
      where: {
        contractAddress: FIXED_FACTORY_ADDRESS.toLowerCase() as any,
        networkId: SEPOLIA_NETWORK_ID as any,
      } as any,
    });

    if (!fixedFactory) {
      console.log('⚠️  Fixed factory not found in database');
      console.log(`   Address: ${FIXED_FACTORY_ADDRESS}`);
      console.log('   You may need to add it first.\n');
    } else {
      console.log(`✅ Found fixed factory in database:`);
      console.log(`   ID: ${fixedFactory.id}`);
      console.log(`   Name: ${fixedFactory.contractName}`);
      console.log(`   Type: ${fixedFactory.contractType}`);
      console.log(`   Current Status: ${fixedFactory.isActive ? 'ACTIVE' : 'INACTIVE'}\n`);

      // Activate fixed factory
      if (!fixedFactory.isActive) {
        console.log('🔄 Activating fixed factory...');
        await db.deployedContract.update({
          where: { id: fixedFactory.id },
          data: { isActive: true },
        });
        console.log('✅ Fixed factory activated\n');
      } else {
        console.log('✅ Fixed factory is already active\n');
      }
    }

    // Find old factory
    const oldFactory = await db.deployedContract.findFirst({
      where: {
        contractAddress: OLD_FACTORY_ADDRESS.toLowerCase() as any,
        networkId: SEPOLIA_NETWORK_ID as any,
      } as any,
    });

    if (!oldFactory) {
      console.log('⚠️  Old factory not found in database');
      console.log(`   Address: ${OLD_FACTORY_ADDRESS}`);
      console.log('   This is expected if it was never added.\n');
    } else {
      console.log(`✅ Found old factory in database:`);
      console.log(`   ID: ${oldFactory.id}`);
      console.log(`   Name: ${oldFactory.contractName}`);
      console.log(`   Type: ${oldFactory.contractType}`);
      console.log(`   Current Status: ${oldFactory.isActive ? 'ACTIVE' : 'INACTIVE'}\n`);

      // Deactivate old factory
      if (oldFactory.isActive) {
        console.log('🔄 Deactivating old factory...');
        await db.deployedContract.update({
          where: { id: oldFactory.id },
          data: { isActive: false },
        });
        console.log('✅ Old factory deactivated\n');
      } else {
        console.log('✅ Old factory is already inactive\n');
      }
    }

    // Find all ERC404_FACTORY contracts
    const allERC404Factories = await db.deployedContract.findMany({
      where: {
        contractType: 'ERC404_FACTORY' as any,
        networkId: SEPOLIA_NETWORK_ID as any,
      } as any,
      select: {
        id: true,
        contractAddress: true,
        contractName: true,
        isActive: true,
      },
    });

    console.log('📊 All ERC404_FACTORY Contracts:');
    console.log('='.repeat(60));
    for (const factory of allERC404Factories) {
      const isFixed = factory.contractAddress.toLowerCase() === FIXED_FACTORY_ADDRESS.toLowerCase();
      const isOld = factory.contractAddress.toLowerCase() === OLD_FACTORY_ADDRESS.toLowerCase();
      const label = isFixed ? ' (FIXED)' : isOld ? ' (OLD)' : '';
      const status = factory.isActive ? '✅ ACTIVE' : '❌ INACTIVE';
      console.log(`   ${status} ${factory.contractName}${label}`);
      console.log(`      Address: ${factory.contractAddress}`);
    }
    console.log('');

    // Verify final state
    const activeFactories = allERC404Factories.filter(f => f.isActive);
    const fixedFactoryActive = activeFactories.some(
      f => f.contractAddress.toLowerCase() === FIXED_FACTORY_ADDRESS.toLowerCase()
    );
    const oldFactoryActive = activeFactories.some(
      f => f.contractAddress.toLowerCase() === OLD_FACTORY_ADDRESS.toLowerCase()
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (fixedFactoryActive && !oldFactoryActive) {
      console.log('🎉 Database update successful!');
      console.log('   ✅ Fixed factory is ACTIVE');
      console.log('   ✅ Old factory is INACTIVE');
      console.log('   ✅ Database matches marketplace configuration\n');
    } else {
      console.log('⚠️  Database state:');
      console.log(`   Fixed factory active: ${fixedFactoryActive ? '✅' : '❌'}`);
      console.log(`   Old factory active: ${oldFactoryActive ? '⚠️' : '✅'}`);
      if (!fixedFactoryActive) {
        console.log('\n   ⚠️  Fixed factory should be active but is not');
      }
      if (oldFactoryActive) {
        console.log('\n   ⚠️  Old factory should be inactive but is still active');
      }
    }

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
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
