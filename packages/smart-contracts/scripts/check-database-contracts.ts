/**
 * Simple script to check what contracts are in the database
 */

import 'dotenv/config';
import { getContractAddresses, getContractABIByType } from '../../../src/lib/services/contract-database-service';

async function main() {
  console.log('📊 CHECKING DATABASE CONTRACTS\n');

  try {
    const contracts = await getContractAddresses();
    console.log(`Found ${contracts.length} contracts in database:\n`);
 
    for (const contract of contracts) {
      console.log(`🔹 ${contract.contractType}`);
      console.log(`   Address: ${contract.contractAddress}`);
      console.log(`   Name: ${contract.contractName || 'N/A'}`);

      // Check if ABI exists
      try {
        const abi = await getContractABIByType(contract.contractType);
        console.log(`   ABI: ${abi ? abi.length + ' functions' : 'MISSING'}`);
      } catch (error) {
        console.log(`   ABI: ERROR - ${error}`);
      }
    }
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

main();