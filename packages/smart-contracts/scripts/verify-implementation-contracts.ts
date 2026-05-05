import { ethers, run } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';  
async function main() {
  console.log('🚀 Starting Implementation Contract Verification...\n');

  // Load deployment data
  const deploymentPath = path.join(__dirname, '../deployed-addresses-fresh.json');
  if (!fs.existsSync(deploymentPath)) {
    throw new Error('Deployment file not found. Please run deployment first.');
  }

  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  console.log('📋 Loaded deployment data from:', deploymentPath);
  console.log('Network:', deploymentData.network);
  console.log('Chain ID:', deploymentData.chainId);
  console.log('');

  // Implementation contracts to verify
  const implementationContracts = [
    {
      name: 'RWAAssetRegistryUpgradeable',
      address: deploymentData.registry.implementation,
      contractPath: 'contracts/upgradeable/RWAAssetRegistryUpgradeable.sol',
      constructorArgs: [] // No constructor args for upgradeable contracts
    },
    {
      name: 'RWATokenFactoryUpgradeable',
      address: deploymentData.factory.implementation,
      contractPath: 'contracts/upgradeable/RWATokenFactoryUpgradeable.sol',
      constructorArgs: [] // No constructor args for upgradeable contracts
    },
    {
      name: 'RWAMarketplaceUpgradeableSetter',
      address: deploymentData.marketplace.implementation,
      contractPath: 'contracts/marketplace/RWAMarketplaceUpgradeableSetter.sol',
      constructorArgs: [] // No constructor args for upgradeable contracts
    },
    {
      name: 'RWATokenFactory404',
      address: deploymentData.factory404,
      contractPath: 'contracts/core/RWATokenFactory404.sol',
      constructorArgs: [] // Direct deployment, no constructor args
    }
  ];

  console.log('🎯 Implementation Contracts to Verify:');
  implementationContracts.forEach((contract, index) => {
    console.log(`${index + 1}. ${contract.name}`);
    console.log(`   Address: ${contract.address}`);
    console.log(`   Path: ${contract.contractPath}`);
  });
  console.log('');

  // Verify each implementation contract
  for (const contract of implementationContracts) {
    console.log(`🔍 Verifying ${contract.name}...`);

    try {
      // Check if contract exists onchain
      const code = await ethers.provider.getCode(contract.address);
      if (code === '0x') {
        throw new Error(`Contract not found at ${contract.address}`);
      }

      console.log(`✅ Contract bytecode found at ${contract.address}`);

      // Run Etherscan verification
      console.log(`📤 Submitting ${contract.name} for Etherscan verification...`);

      // Use Hardhat's verify task
      await run('verify:verify', {
      address: contract.address,
      contract: contract.contractPath + ':' + contract.name,
      constructorArguments: contract.constructorArgs,
    });

      console.log(`✅ ${contract.name} verification submitted successfully!`);
      console.log(`   Address: ${contract.address}`);
      console.log(`   Etherscan: https://sepolia.etherscan.io/address/${contract.address}#code`);
      console.log('');

    } catch (error: any) {
      if (error.message.includes('Already Verified')) {
        console.log(`ℹ️  ${contract.name} is already verified on Etherscan`);
        console.log(`   Address: ${contract.address}`);
        console.log('');
      } else {
        console.error(`❌ ${contract.name} verification failed:`);
        console.error(`   Error: ${error.message}`);
        console.log('');
      }
    }
  }

  console.log('🎉 Implementation Contract Verification Complete!');
  console.log('');
  console.log('📋 Summary:');
  console.log('- All implementation contracts submitted for Etherscan verification');
  console.log('- Check Etherscan links above for verification status');
  console.log('- Implementation verification may take a few minutes to complete');
  console.log('');
  console.log('⚠️  CRITICAL: All proxy contracts MUST have verified implementations');
  console.log('   before the application can go live or proceed to the next stage.');
}

// Execute
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Implementation verification failed:', error);
    process.exit(1);
  });