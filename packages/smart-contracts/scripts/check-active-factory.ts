#!/usr/bin/env tsx

/**
 * Check Active Factory by Querying Marketplace
 * 
 * This script checks which ERC404 factory is currently configured in the marketplace
 */

import 'dotenv/config';
import { ethers } from 'hardhat';
import hre from 'hardhat';

const MARKETPLACE_ADDRESS = '0x0b6a1BFCEf896d004Edd376A798c57F2B797e307'; // From deployed-addresses-fresh.json

const FACTORY_ADDRESSES = {
  OLD: '0x9cb9C7E12D104aa8e75D0d7681ce8b7d15084656',
  NEW: '0xdc4A8BbeC696287E44262b3fE4c2605a0C59929F',
  FIXED: '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b',
};

async function checkActiveFactory() {
  console.log('🔍 Checking Active Factory Configuration\n');

  const provider = hre.ethers.provider;
  const network = await provider.getNetwork();
  
  if (Number(network.chainId) !== 11155111) {
    console.error('❌ This script must be run on Sepolia network');
    process.exit(1);
  }

  // Marketplace ABI for getTokenFactory404
  const marketplaceABI = [
    'function getTokenFactory404() view returns (address)',
    'function tokenFactory404() view returns (address)',
  ];

  try {
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, marketplaceABI, provider);
    
    let factoryAddress: string;
    try {
      factoryAddress = await marketplace.getTokenFactory404();
    } catch {
      factoryAddress = await marketplace.tokenFactory404();
    }

    console.log(`📍 Marketplace Address: ${MARKETPLACE_ADDRESS}`);
    console.log(`🏭 Configured Factory 404: ${factoryAddress}\n`);

    // Determine which version it is
    const normalizedFactory = factoryAddress.toLowerCase();
    const factoryName = Object.entries(FACTORY_ADDRESSES).find(
      ([_, addr]) => addr.toLowerCase() === normalizedFactory
    )?.[0] || 'UNKNOWN';

    console.log('📊 FACTORY IDENTIFICATION:');
    console.log('='.repeat(60));
    console.log(`   Address: ${factoryAddress}`);
    console.log(`   Label: ${factoryName}`);
    
    if (factoryName === 'FIXED') {
      console.log(`   ✅ Version: RWATokenFactory404Fixed (CORRECT)`);
      console.log(`   ✅ Has mintTokens() fix: YES`);
      console.log(`   ✅ Validates allowance: YES`);
      console.log(`   ✅ Validates balance: YES`);
    } else if (factoryName === 'OLD' || factoryName === 'NEW') {
      console.log(`   ⚠️  Version: RWATokenFactory404 (OLD)`);
      console.log(`   ❌ Has mintTokens() fix: NO`);
      console.log(`   ❌ Validates allowance: NO`);
      console.log(`   ❌ Validates balance: NO`);
      console.log(`\n⚠️  WARNING: Marketplace is using OLD factory!`);
      console.log(`   Recommendation: Update marketplace to use FIXED factory.`);
    } else {
      console.log(`   ❓ Version: UNKNOWN`);
      console.log(`   Address not in known list.`);
    }

    return { factoryAddress, factoryName };

  } catch (error: any) {
    console.error('❌ Error checking marketplace:', error.message);
    process.exit(1);
  }
}

checkActiveFactory()
  .then(() => {
    console.log('\n✅ Active factory check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
