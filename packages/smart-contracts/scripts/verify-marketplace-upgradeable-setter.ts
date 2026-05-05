import { run } from 'hardhat';

// Load environment variables
require('dotenv').config({ path: '../../../.env.local' });

async function main() {
  console.log('🔍 Verifying RWAMarketplaceUpgradeableSetter contract on Etherscan...\n');

  // Contract address from the upgrade
  const CONTRACT_ADDRESS = '0x4E81c7631219384be9A0c7B7fa7206071A11D8A7';

  // No constructor arguments needed for this contract
  const constructorArgs: any[] = [];

  console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`Constructor Args: ${constructorArgs.length} arguments`);
  console.log(`Network: sepolia`);

  try {
    // Run Hardhat verify
    console.log('📝 Running Etherscan verification...');
    await run('verify:verify', {
      address: CONTRACT_ADDRESS,
      constructorArguments: constructorArgs,
      contract: 'contracts/marketplace/RWAMarketplaceUpgradeableSetter.sol:RWAMarketplaceUpgradeableSetter',
    });

    console.log('✅ Contract verification successful!');
    console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}#code`);

    console.log('\n📋 Next steps:');
    console.log('1. Verify the proxy contract on Etherscan again');
    console.log('2. The Read/Write as Proxy tabs should now show the ABI');
    console.log('3. Test contract interactions through Etherscan interface');

  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);

    if (error.message.includes('Already Verified')) {
      console.log('ℹ️  Contract is already verified on Etherscan');
      console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}#code`);
    } else if (error.message.includes('does not have bytecode')) {
      console.log('❌ Contract not found at the specified address');
      console.log('   Make sure the contract was deployed successfully');
    } else if (error.message.includes('bytecode')) {
      console.log('❌ Bytecode mismatch - contract may have been modified after deployment');
    } else {
      console.log('❌ Unknown verification error');
      console.log('   Check your Etherscan API key and network configuration');
    }

    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });