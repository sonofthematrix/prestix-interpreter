#!/usr/bin/env tsx

/**
 * Verify Marketplace Contract 0x6B228DB6917167504B615E0Ca157C7a3be5b48d3
 * 
 * Uses Hardhat's programmatic API to properly handle array parameters
 */

import hre from 'hardhat';

const CONTRACT_ADDRESS = '0x6B228DB6917167504B615E0Ca157C7a3be5b48d3';
const CONTRACT_PATH = 'contracts/marketplace/RWAMarketplaceFixed.sol:RWAMarketplaceFixed';

// Constructor arguments extracted from contract state
const CONSTRUCTOR_ARGS = [
  '0x05bdB3eFb41755a248F70eCAC32001D21EEc5558', // assetRegistry_
  '0xa6548231bbbfaC07AcD7f58bb64a0BE817402490', // tokenFactory_
  '0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047', // feeRecipient
  [], // initialPaymentTokens_ (empty array - ETH only)
  '0x09255e956f179aF8ee57Dba7b665C1c44aAE21Bb'  // tokenFactory404_
];

async function main() {
  console.log('🔍 VERIFYING MARKETPLACE CONTRACT ON ETHERSCAN');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`Contract Path: ${CONTRACT_PATH}`);
  console.log(`Network: sepolia`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check Etherscan API key
  const etherscanApiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
  if (!etherscanApiKey) {
    console.error('❌ ETHERSCAN_API_KEY not set in environment');
    process.exit(1);
  }

  console.log('📋 Constructor Arguments:');
  CONSTRUCTOR_ARGS.forEach((arg, i) => {
    if (Array.isArray(arg)) {
      console.log(`   ${i + 1}. initialPaymentTokens_ (array): ${JSON.stringify(arg)}`);
    } else {
      console.log(`   ${i + 1}. ${arg}`);
    }
  });
  console.log('');

  try {
    console.log('🚀 Starting verification...\n');
    
    // Set network explicitly
    await hre.run('verify:verify', {
      address: CONTRACT_ADDRESS,
      contract: CONTRACT_PATH,
      constructorArguments: CONSTRUCTOR_ARGS,
    }, {
      network: 'sepolia'
    });

    console.log('\n✅ CONTRACT VERIFIED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}#code`);
    console.log('═══════════════════════════════════════════════════════════════');
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    
    if (errorMessage.includes('Already Verified') || 
        errorMessage.includes('already verified') ||
        errorMessage.includes('Contract source code already verified')) {
      console.log('\n✅ CONTRACT ALREADY VERIFIED');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}#code`);
      console.log('═══════════════════════════════════════════════════════════════');
    } else {
      console.error('\n❌ VERIFICATION FAILED');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error(`Error: ${errorMessage}`);
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('\n💡 Manual Verification Instructions:');
      console.error('   1. Visit: https://sepolia.etherscan.io/verifyContract');
      console.error(`   2. Enter contract address: ${CONTRACT_ADDRESS}`);
      console.error(`   3. Select compiler version: v0.8.23+commit.f704f362`);
      console.error(`   4. Select license: MIT`);
      console.error(`   5. Enter constructor arguments:`);
      CONSTRUCTOR_ARGS.forEach((arg, i) => {
        if (Array.isArray(arg)) {
          console.error(`      Arg ${i + 1}: [] (empty array)`);
        } else {
          console.error(`      Arg ${i + 1}: ${arg}`);
        }
      });
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
