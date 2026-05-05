/**
 * Simple Contract Database Check
 *
 * Checks what contracts are in the database without using complex services.
 */

import 'dotenv/config';
import { createClient } from '../../../src/lib/db';

const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN' as const,
  name: 'System Admin'
};

async function main() {
  console.log('📊 SIMPLE CONTRACT DATABASE CHECK\n');

  try {
    const db = createClient(systemUser);

    // Get all contracts
    const contracts = await db.deployedContract.findMany({
      select: {
        id: true,
        contractAddress: true,
        contractName: true,
        contractType: true,
        isActive: true,
        createdAt: true
      }
    });

    console.log(`Found ${contracts.length} contracts in database:\n`);

    for (const contract of contracts) {
      console.log(`🔹 ${contract.contractType}`);
      console.log(`   Address: ${contract.contractAddress}`);
      console.log(`   Name: ${contract.contractName || 'N/A'}`);
      console.log(`   Active: ${contract.isActive}`);
      console.log(`   Created: ${contract.createdAt.toISOString()}`);
      console.log('');
    }

    // Get ABI count
    const abiCount = await db.contractABI.count();
    console.log(`📋 Total contract ABIs stored: ${abiCount}`);

    await db.$disconnect();

  } catch (error) {
    console.error('❌ Error checking database:', error);
    console.error('Stack:', error.stack);
  }
}

main();