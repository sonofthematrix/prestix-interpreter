#!/usr/bin/env tsx

/**
 * Find Holder Private Key
 * 
 * Checks environment variables to find which private key corresponds to the token holder address.
 * 
 * Usage:
 *   bun run scripts/find-holder-private-key.ts
 */

import 'dotenv/config';
import { ethers } from 'ethers';

const TOKEN_HOLDER_ADDRESS = '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';

const ENV_VARS_TO_CHECK = [
  'ADMIN_PRIVATE_KEY',
  'PRIVATE_KEY',
  'TGR_DEPLOY_PRVT_KEY',
  'DEPLOYER_PRIVATE_KEY',
  'HOLDER_KEY',
  'SELLER_PRIVATE_KEY',
  'TOKEN_OWNER_KEY',
];

async function main() {
  console.log('🔍 Finding Token Holder Private Key');
  console.log('════════════════════════════════════════════════════════════\n');
  console.log(`Token Holder Address: ${TOKEN_HOLDER_ADDRESS}\n`);

  const matches: Array<{ envVar: string; address: string }> = [];

  for (const envVar of ENV_VARS_TO_CHECK) {
    const privateKey = process.env[envVar];
    if (privateKey) {
      try {
        const wallet = new ethers.Wallet(privateKey);
        const address = wallet.address;
        
        console.log(`${envVar}:`);
        console.log(`   Address: ${address}`);
        
        if (address.toLowerCase() === TOKEN_HOLDER_ADDRESS.toLowerCase()) {
          console.log(`   ✅ MATCH! This is the token holder address`);
          matches.push({ envVar, address });
        } else {
          console.log(`   ❌ Not a match`);
        }
        console.log('');
      } catch (error: any) {
        console.log(`${envVar}:`);
        console.log(`   ⚠️  Invalid private key format`);
        console.log('');
      }
    } else {
      console.log(`${envVar}:`);
      console.log(`   ⚠️  Not set`);
      console.log('');
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (matches.length > 0) {
    console.log(`\n✅ Found ${matches.length} matching private key(s):\n`);
    for (const match of matches) {
      console.log(`   ${match.envVar} → ${match.address}`);
    }
    console.log('\nYou can use this to transfer tokens:');
    console.log(`${matches[0].envVar}=<value> BUYER_WALLET_1=0x... ASSET_IDS=1,2,3 \\`);
    console.log(`bun run hardhat run scripts/transfer-tokens-for-testing.ts --network sepolia\n`);
  } else {
    console.log('\n❌ No matching private key found in environment variables.');
    console.log('\nOptions:');
    console.log('1. Check if the holder address matches any deployer/admin wallet');
    console.log('2. Add the holder\'s private key to .env.local as HOLDER_KEY');
    console.log('3. Use a different method to acquire tokens for testing\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
