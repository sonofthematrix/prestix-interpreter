#!/usr/bin/env tsx

/**
 * Set Token Factory 404 on Marketplace
 * 
 * Sets the tokenFactory404 address on the RWAMarketplaceUpgradeableSetter contract.
 * This updates the marketplace to use the FIXED factory (RWATokenFactory404Fixed).
 * 
 * Usage:
 *   bun run hardhat run scripts/set-marketplace-factory404.ts --network sepolia
 */

import 'dotenv/config';
import { ethers } from 'hardhat';
import hre from 'hardhat';

// Deployed addresses from investigation
const MARKETPLACE_ADDRESS = '0x0b6a1BFCEf896d004Edd376A798c57F2B797e307'; // Proxy address
const FIXED_FACTORY_ADDRESS = '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b'; // RWATokenFactory404Fixed

const MARKETPLACE_ABI = [
  'function setTokenFactory404(address newFactory404)',
  'function getTokenFactory404() view returns (address)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
] as const;

async function main() {
  console.log('🔧 Set Token Factory 404 on Marketplace');
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

    // Connect to marketplace
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

    console.log(`📋 Marketplace: ${MARKETPLACE_ADDRESS}`);
    console.log(`🏭 Fixed Factory: ${FIXED_FACTORY_ADDRESS}\n`);

    // Check current value
    const currentFactory404 = await marketplace.getTokenFactory404();
    console.log(`📊 Current tokenFactory404: ${currentFactory404}`);
    
    if (currentFactory404.toLowerCase() === FIXED_FACTORY_ADDRESS.toLowerCase()) {
      console.log('✅ Factory 404 is already set to FIXED factory!\n');
      return;
    }

    if (currentFactory404 !== ethers.ZeroAddress) {
      console.log(`⚠️  Factory 404 is currently set to: ${currentFactory404}`);
      console.log(`   This will be updated to FIXED factory: ${FIXED_FACTORY_ADDRESS}\n`);
    } else {
      console.log(`ℹ️  Factory 404 is not currently set (address(0))`);
      console.log(`   Setting to FIXED factory: ${FIXED_FACTORY_ADDRESS}\n`);
    }

    // Check if signer has DEFAULT_ADMIN_ROLE
    const DEFAULT_ADMIN_ROLE = await marketplace.DEFAULT_ADMIN_ROLE();
    const hasAdminRole = await marketplace.hasRole(DEFAULT_ADMIN_ROLE, signer.address);
    
    if (!hasAdminRole) {
      console.error('❌ Signer address does not have DEFAULT_ADMIN_ROLE');
      console.error('   Cannot set tokenFactory404 without admin role');
      console.error(`   Signer: ${signer.address}`);
      console.error(`   Role: ${DEFAULT_ADMIN_ROLE}`);
      process.exit(1);
    }

    console.log('✅ Signer has DEFAULT_ADMIN_ROLE\n');

    // Set factory 404
    console.log('⚙️  Setting tokenFactory404 to FIXED factory...');
    const tx = await marketplace.setTokenFactory404(FIXED_FACTORY_ADDRESS);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log(`   Waiting for confirmation...\n`);

    const receipt = await tx.wait();
    console.log(`✅ Factory 404 set successfully!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}\n`);

    // Verify
    const newFactory404 = await marketplace.getTokenFactory404();
    if (newFactory404.toLowerCase() === FIXED_FACTORY_ADDRESS.toLowerCase()) {
      console.log('✅ Verification successful!');
      console.log(`   tokenFactory404: ${newFactory404}`);
      console.log(`   ✅ Marketplace now using FIXED factory (RWATokenFactory404Fixed)\n`);
    } else {
      console.log('❌ Verification failed');
      console.log(`   Expected: ${FIXED_FACTORY_ADDRESS}`);
      console.log(`   Got: ${newFactory404}\n`);
      process.exit(1);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Token Factory 404 configured successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Verify marketplace has TOKEN_CREATOR_ROLE on fixed factory');
    console.log('   2. Test token creation with fixed factory');
    console.log('   3. Update database to mark fixed factory as active\n');

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    if (error.message.includes('AccessControl')) {
      console.error('\n💡 Ensure signer wallet has DEFAULT_ADMIN_ROLE on the marketplace contract');
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
