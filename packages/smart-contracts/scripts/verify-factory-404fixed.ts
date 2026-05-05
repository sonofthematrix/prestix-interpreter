import hre from 'hardhat';

async function main() {
  console.log('🔍 Verifying RWATokenFactory404Fixed Contract on Etherscan\n');

  const contractAddress = '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b';

  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Network: Sepolia (${hre.network.config.chainId})\n`);

  // Check if Etherscan API key is configured
  if (!process.env.ETHERSCAN_API_KEY && !process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY) {
    console.error('❌ ERROR: ETHERSCAN_API_KEY or NEXT_PUBLIC_ETHERSCAN_API_KEY not found in environment variables');
    console.error('Please set one of these variables in your .env.local file');
    process.exit(1);
  }

  console.log('✅ Etherscan API key found\n');

  try {
    console.log('📤 Submitting verification request to Etherscan...\n');

    // Verify the contract
    // RWATokenFactory404Fixed has no constructor parameters
    await hre.run('verify:verify', {
      address: contractAddress,
      constructorArguments: [],
      contract: 'contracts/core/RWATokenFactory404Fixed.sol:RWATokenFactory404Fixed',
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
      
      console.error('\n📋 Manual verification:');
      console.error('You can manually verify the contract on Etherscan:');
      console.error(`https://sepolia.etherscan.io/address/${contractAddress}#code`);
      console.error('\nContract details:');
      console.error('- Contract: contracts/core/RWATokenFactory404Fixed.sol:RWATokenFactory404Fixed');
      console.error('- Compiler: Solidity 0.8.19');
      console.error('- Optimization: Enabled, Runs: 1');
      console.error('- Constructor Arguments: None (empty array)');
      
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
