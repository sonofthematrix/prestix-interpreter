import fs from 'fs';
import { ethers, run } from 'hardhat';
import path from 'path';

/**
 * Verify Deployment Script
 * 
 * Verifies all deployed contracts on Etherscan
 * 
 * Usage: bun run hardhat run scripts/verify-deployment.ts --network sepolia
 */

interface DeploymentInfo {
  contractName: string;
  address: string;
  constructorArgs: any[];
  contractPath: string;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   VERIFY DEPLOYMENT ON ETHERSCAN                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  
  // Load deployment file
  const deploymentFile = path.join(__dirname, `../deployments/${networkName}.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  
  console.log(`📋 Loading deployment from: ${deploymentFile}`);
  console.log(`   Network: ${networkName}`);
  console.log(`   Timestamp: ${deployment.timestamp}\n`);
  
  const contracts: DeploymentInfo[] = [
    {
      contractName: 'RWAAssetRegistry',
      address: deployment.contracts.RWAAssetRegistry.address,
      constructorArgs: deployment.contracts.RWAAssetRegistry.constructorArgs || [],
      contractPath: 'contracts/core/RWAAssetRegistry.sol:RWAAssetRegistry',
    },
    {
      contractName: 'RWATokenFactory',
      address: deployment.contracts.RWATokenFactory.address,
      constructorArgs: deployment.contracts.RWATokenFactory.constructorArgs || [],
      contractPath: 'contracts/core/RWATokenFactory.sol:RWATokenFactory',
    },
    {
      contractName: 'RWAMarketplace',
      address: deployment.contracts.RWAMarketplace.address,
      constructorArgs: deployment.contracts.RWAMarketplace.constructorArgs || [],
      contractPath: 'contracts/marketplace/RWAMarketplace.sol:RWAMarketplace',
    },
  ];
  
  // Check Etherscan API key
  const etherscanApiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
  if (!etherscanApiKey) {
    throw new Error('ETHERSCAN_API_KEY not set in environment');
  }
  
  console.log('🔍 Verifying contracts on Etherscan...\n');
  
  for (const contract of contracts) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Verifying ${contract.contractName}...`);
    console.log(`Address: ${contract.address}`);
    console.log(`Constructor Args: ${contract.constructorArgs.length > 0 ? contract.constructorArgs.join(', ') : 'None'}`);
    
    try {
      await run('verify:verify', {
        address: contract.address,
        contract: contract.contractPath,
        constructorArguments: contract.constructorArgs,
      });
      
      console.log(`✅ ${contract.contractName} verified successfully!`);
    } catch (error: any) {
      if (error.message.includes('Already Verified') || error.message.includes('already verified')) {
        console.log(`✅ ${contract.contractName} already verified`);
      } else {
        console.log(`❌ Verification failed: ${error.message}`);
        console.log(`\n   Manual verification command:`);
        console.log(`   bun run hardhat verify --network ${networkName} ${contract.address} ${contract.constructorArgs.join(' ')}`);
      }
    }
    
    // Wait between verifications
    if (contract !== contracts[contracts.length - 1]) {
      console.log('\n⏳ Waiting 10 seconds before next verification...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('🎉 Verification Complete');
  console.log('='.repeat(70));
  
  console.log(`\n🔗 Explorer Links:`);
  console.log(`   Registry: https://sepolia.etherscan.io/address/${contracts[0].address}`);
  console.log(`   Factory: https://sepolia.etherscan.io/address/${contracts[1].address}`);
  console.log(`   Marketplace: https://sepolia.etherscan.io/address/${contracts[2].address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });

