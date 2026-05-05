import { run } from 'hardhat';

async function main() {
  console.log('🔍 Verifying RWAMarketplaceUpgradeableSetter v2 contract on Etherscan...\n');

  // Contract address from the upgrade - the new implementation
  const CONTRACT_ADDRESS = '0xAeC69342641EDEE02Fc332BbD706a6E81eE4Cf48';

  // No constructor arguments needed for this contract
  const constructorArgs: any[] = [];

  console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`Constructor Args: ${constructorArgs.length} arguments`);
  console.log(`Network: sepolia`);
  console.log(`Contract: contracts/marketplace/RWAMarketplaceUpgradeableSetter.sol:RWAMarketplaceUpgradeableSetter`);
  console.log('');

  try {
    // Run Hardhat verify
    console.log('📝 Running Etherscan verification...');
    await run('verify:verify', {
      address: CONTRACT_ADDRESS,
      constructorArguments: constructorArgs,
      contract: 'contracts/marketplace/RWAMarketplaceUpgradeableSetter.sol:RWAMarketplaceUpgradeableSetter'
    });

    console.log('✅ Verification successful!');
    console.log(`🔗 View contract on Etherscan:`);
    console.log(`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}#code`);
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Go back to the proxy contract page');
    console.log('2. Refresh the page - Read/Write as Proxy tabs should now work');
    console.log('3. Test the new setter functions: setAssetRegistry, setTokenFactory, setFeeRecipient, setMarketplaceFee');

  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Check that the contract address is correct');
    console.log('2. Ensure the contract was deployed recently');
    console.log('3. Verify network configuration (should be sepolia)');
    console.log('4. Check Etherscan API key in environment variables');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });