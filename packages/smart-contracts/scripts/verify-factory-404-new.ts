#!/usr/bin/env tsx

/**
 * Verify RWATokenFactory404 Contract on Etherscan
 *
 * This script verifies the newly deployed RWATokenFactory404 contract
 * at address 0xdc4A8BbeC696287E44262b3fE4c2605a0C59929F on Sepolia.
 */

import hre from 'hardhat';

async function main() {
  console.log('🔍 Verifying RWATokenFactory404 Contract on Etherscan\n');

  const contractAddress = '0xdc4A8BbeC696287E44262b3fE4c2605a0C59929F';

  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Network: Sepolia (${hre.network.config.chainId})\n`);

  // Check if Etherscan API key is configured
  if (!process.env.ETHERSCAN_API_KEY && !process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY) {
    console.error('❌ ERROR: ETHERSCAN_API_KEY or NEXT_PUBLIC_ETHERSCAN_API_KEY not found in environment variables');
    console.error('Please set one of these variables in your .env.local file');
    process.exit(1);
  }

  const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
  console.log('✅ Etherscan API key found\n');

  try {
    console.log('📤 Submitting verification request to Etherscan...\n');

    // Verify the contract
    // RWATokenFactory404 has no constructor parameters
    await hre.run('verify:verify', {
      address: contractAddress,
      constructorArguments: [],
      contract: 'contracts/core/RWATokenFactory404.sol:RWATokenFactory404',
    });

    console.log('\n✅ Contract verified successfully on Etherscan!');
    console.log(`\n📋 View verified contract:`);
    console.log(`https://sepolia.etherscan.io/address/${contractAddress}#code`);

  } catch (error: any) {
    if (error.message.includes('Already Verified')) {
      console.log('\n✅ Contract is already verified on Etherscan!');
      console.log(`\n📋 View verified contract:`);
      console.log(`https://sepolia.etherscan.io/address/${contractAddress}#code`);
    } else {
      console.error('\n❌ Verification failed:', error.message);
      
      if (error.message.includes('Fail - Unable to verify')) {
        console.error('\n💡 Possible reasons:');
        console.error('1. Contract bytecode does not match source code');
        console.error('2. Compiler settings mismatch (optimizer, runs, version)');
        console.error('3. Network mismatch');
        console.error('4. Contract was deployed with different constructor parameters');
      }
      
      console.error('\n📋 Manual verification instructions:');
      console.error('You can manually verify the contract on Etherscan:');
      console.error(`https://sepolia.etherscan.io/address/${contractAddress}#code`);
      console.error('\nContract details:');
      console.error('- Contract: contracts/core/RWATokenFactory404.sol:RWATokenFactory404');
      console.error('- Compiler: Solidity 0.8.19');
      console.error('- Optimization: Enabled, Runs: 1');
      console.error('- Constructor Arguments: None (empty array)');
      console.error('\n📝 For manual verification:');
      console.error('1. Go to the contract page on Etherscan');
      console.error('2. Click "Contract" tab');
      console.error('3. Click "Verify and Publish"');
      console.error('4. Select "Solidity (Standard JSON Input)"');
      console.error('5. Upload the compiled contract JSON');
      console.error('6. Enter constructor arguments: [] (empty array)');
      
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
