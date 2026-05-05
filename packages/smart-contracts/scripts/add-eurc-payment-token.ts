#!/usr/bin/env tsx

/**
 * Add EURC as Allowed Payment Token
 * 
 * This script adds EURC to the marketplace's allowed payment tokens list.
 */

import 'dotenv/config';
import { ethers } from 'hardhat';

const MARKETPLACE_PROXY = '0x033c3B60f713027Fa9bE06A461Aa4DC1C348cEcB';
const EURC_ADDRESS = '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4';
const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const TKNZN_ADDRESS = '0x064682F1555d3baD3Dab5eDD0DEe45372F23a570';

async function main() {
  console.log('🚀 Adding EURC as Allowed Payment Token...\n');

  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer:', deployer.address);
  console.log('📍 Marketplace:', MARKETPLACE_PROXY);

  // Connect to marketplace
  const marketplace = await ethers.getContractAt('RWAMarketplaceUpgradeableSetterV2', MARKETPLACE_PROXY);

  // Step 1: Check current status
  console.log('\n📋 Step 1: Checking current payment token status...');
  
  const tokens = [
    { name: 'USDC', address: USDC_ADDRESS },
    { name: 'EURC', address: EURC_ADDRESS },
    { name: 'TKNZN', address: TKNZN_ADDRESS },
  ];
  
  for (const token of tokens) {
    const isAllowed = await marketplace.allowedPaymentTokens(token.address);
    console.log(`   ${token.name} (${token.address}): ${isAllowed ? '✅ ALLOWED' : '❌ NOT ALLOWED'}`);
  }

  // Step 2: Add EURC if not already allowed
  console.log('\n📋 Step 2: Adding EURC if needed...');
  
  const isEURCAllowed = await marketplace.allowedPaymentTokens(EURC_ADDRESS);
  
  if (isEURCAllowed) {
    console.log('✅ EURC is already allowed in marketplace');
  } else {
    console.log(`➕ Adding EURC (${EURC_ADDRESS})...`);
    
    try {
      const addTokenTx = await marketplace.addPaymentToken(EURC_ADDRESS);
      console.log('⏳ Transaction sent:', addTokenTx.hash);
      console.log('   Waiting for confirmation...');
      
      const receipt = await addTokenTx.wait();
      console.log('✅ EURC added successfully!');
      console.log('   Block:', receipt.blockNumber);
      console.log('   Gas used:', receipt.gasUsed.toString());
    } catch (error: any) {
      console.error('❌ Failed to add EURC:', error.message);
      
      if (error.message.includes('missing revert data')) {
        console.error('\n💡 Possible causes:');
        console.error('   - Wallet does not have DEFAULT_ADMIN_ROLE');
        console.error('   - Function does not exist (contract not upgraded?)');
        console.error('   - Contract is paused or has other restrictions');
      }
      
      throw error;
    }
  }

  // Step 3: Verify final configuration
  console.log('\n📋 Step 3: Verifying final payment token configuration...');
  
  for (const token of tokens) {
    const isAllowed = await marketplace.allowedPaymentTokens(token.address);
    console.log(`   ${token.name}: ${isAllowed ? '✅ ALLOWED' : '❌ NOT ALLOWED'}`);
  }

  console.log('\n🎉 Payment token configuration complete!');
}

main()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
