#!/usr/bin/env tsx

/**
 * Verify and Grant TOKEN_CREATOR_ROLE on Fixed Factory
 * 
 * Verifies that the marketplace has TOKEN_CREATOR_ROLE on the fixed factory
 * and grants it if missing.
 * 
 * Usage:
 *   bun run hardhat run scripts/verify-grant-factory-role.ts --network sepolia
 */

import 'dotenv/config';
import { ethers } from 'hardhat';
import hre from 'hardhat';

// Deployed addresses
const MARKETPLACE_ADDRESS = '0x0b6a1BFCEf896d004Edd376A798c57F2B797e307'; // Proxy address
const FIXED_FACTORY_ADDRESS = '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b'; // RWATokenFactory404Fixed

const FACTORY_ABI = [
  'function grantRole(bytes32 role, address account)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function TOKEN_CREATOR_ROLE() view returns (bytes32)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
] as const;

async function main() {
  console.log('🔐 Verify and Grant TOKEN_CREATOR_ROLE');
  console.log('════════════════════════════════════════════════════════════\n');

  const network = await hre.ethers.provider.getNetwork();
  
  if (Number(network.chainId) !== 11155111) {
    console.error('❌ This script must be run on Sepolia network');
    console.error(`   Current network chainId: ${network.chainId}`);
    process.exit(1);
  }

  try {
    // Get signer
    const [signer] = await hre.ethers.getSigners();
    console.log(`👤 Signer Address: ${signer.address}\n`);

    // Connect to fixed factory
    const factory = new ethers.Contract(FIXED_FACTORY_ADDRESS, FACTORY_ABI, signer);

    console.log(`📋 Marketplace: ${MARKETPLACE_ADDRESS}`);
    console.log(`🏭 Fixed Factory: ${FIXED_FACTORY_ADDRESS}\n`);

    // Get TOKEN_CREATOR_ROLE
    const TOKEN_CREATOR_ROLE = await factory.TOKEN_CREATOR_ROLE();
    console.log(`📊 TOKEN_CREATOR_ROLE: ${TOKEN_CREATOR_ROLE}\n`);

    // Check if marketplace has the role
    const hasRole = await factory.hasRole(TOKEN_CREATOR_ROLE, MARKETPLACE_ADDRESS);
    
    if (hasRole) {
      console.log('✅ Marketplace already has TOKEN_CREATOR_ROLE on fixed factory');
      console.log('   No action needed.\n');
      return;
    }

    console.log('⚠️  Marketplace does NOT have TOKEN_CREATOR_ROLE');
    console.log('   Granting role...\n');

    // Check if signer has DEFAULT_ADMIN_ROLE
    const DEFAULT_ADMIN_ROLE = await factory.DEFAULT_ADMIN_ROLE();
    const signerHasAdminRole = await factory.hasRole(DEFAULT_ADMIN_ROLE, signer.address);
    
    if (!signerHasAdminRole) {
      console.error('❌ Signer does not have DEFAULT_ADMIN_ROLE on factory');
      console.error('   Cannot grant TOKEN_CREATOR_ROLE without admin role');
      console.error(`   Signer: ${signer.address}`);
      console.error(`   Role: ${DEFAULT_ADMIN_ROLE}`);
      process.exit(1);
    }

    console.log('✅ Signer has DEFAULT_ADMIN_ROLE\n');

    // Grant TOKEN_CREATOR_ROLE to marketplace
    console.log('⚙️  Granting TOKEN_CREATOR_ROLE to marketplace...');
    const tx = await factory.grantRole(TOKEN_CREATOR_ROLE, MARKETPLACE_ADDRESS);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log(`   Waiting for confirmation...\n`);

    const receipt = await tx.wait();
    console.log(`✅ TOKEN_CREATOR_ROLE granted successfully!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}\n`);

    // Verify role was granted
    const hasRoleAfter = await factory.hasRole(TOKEN_CREATOR_ROLE, MARKETPLACE_ADDRESS);
    if (hasRoleAfter) {
      console.log('✅ Verification successful!');
      console.log(`   Marketplace now has TOKEN_CREATOR_ROLE on fixed factory\n`);
    } else {
      console.log('❌ Verification failed');
      console.log(`   Role grant may not have succeeded\n`);
      process.exit(1);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 TOKEN_CREATOR_ROLE configuration complete!');
    console.log('\n📋 Summary:');
    console.log(`   Factory: ${FIXED_FACTORY_ADDRESS}`);
    console.log(`   Marketplace: ${MARKETPLACE_ADDRESS}`);
    console.log(`   Role: TOKEN_CREATOR_ROLE`);
    console.log(`   Status: ✅ GRANTED\n`);

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    if (error.message.includes('AccessControl')) {
      console.error('\n💡 Ensure signer wallet has DEFAULT_ADMIN_ROLE on the factory contract');
    }
    if (error.reason) {
      console.error(`   Reason: ${error.reason}`);
    }
    if (error.transaction) {
      console.error(`   Transaction: ${error.transaction.hash}`);
    }
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
