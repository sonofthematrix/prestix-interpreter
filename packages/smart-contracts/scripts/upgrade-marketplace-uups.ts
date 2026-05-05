#!/usr/bin/env tsx

/**
 * Upgrade UUPS Marketplace to Add EURC Support
 * 
 * For UUPS proxies, the upgrade function is on the proxy itself, not via ProxyAdmin.
 */

import 'dotenv/config';
import { ethers } from 'hardhat';
import hre from 'hardhat';

const MARKETPLACE_PROXY = '0x033c3B60f713027Fa9bE06A461Aa4DC1C348cEcB';
const NEW_IMPLEMENTATION = '0x4A302f91a3bcbc0D75f8a8e41f23aEa1fa2783dF'; // Already deployed

const UUPS_ABI = [
  'function upgradeToAndCall(address newImplementation, bytes memory data) external payable',
  'function implementation() external view returns (address)',
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function verifyContractOnEtherscan(
  contractAddress: string,
  contractName: string,
  constructorArgs: any[] = []
): Promise<void> {
  const maxRetries = 5;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Verification attempt ${attempt}/${maxRetries}...`);
      
      await hre.run('verify:verify', {
        address: contractAddress,
        constructorArguments: constructorArgs,
        contract: `contracts/marketplace/${contractName}.sol:${contractName}`,
      });
      
      console.log(`✅ Contract verified successfully!`);
      return;
      
    } catch (error: any) {
      if (error.message.includes('Already Verified')) {
        console.log(`✅ Contract already verified!`);
        return;
      }
      
      if (attempt === maxRetries) {
        console.log(`⚠️  Verification failed after ${maxRetries} attempts`);
        console.log(`   You can verify manually later on Etherscan`);
        return;
      }
      
      const backoffDelay = Math.min(5000 * Math.pow(2, attempt - 1), 80000);
      console.log(`⏳ Retrying in ${backoffDelay / 1000} seconds...`);
      await delay(backoffDelay);
    }
  }
}

async function main() {
  console.log('🚀 Upgrading UUPS Marketplace...\n');

  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer:', deployer.address);
  console.log('📍 Marketplace proxy:', MARKETPLACE_PROXY);
  console.log('📍 New implementation:', NEW_IMPLEMENTATION);

  // Check current implementation
  console.log('\n📋 Checking current implementation...');
  const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
  const currentImpl = ethers.AbiCoder.defaultAbiCoder().decode(
    ['address'],
    await ethers.provider.getStorage(MARKETPLACE_PROXY, implementationSlot)
  )[0];
  
  console.log('   Current:', currentImpl);
  console.log('   Target:', NEW_IMPLEMENTATION);

  if (currentImpl.toLowerCase() === NEW_IMPLEMENTATION.toLowerCase()) {
    console.log('   ✅ Already upgraded to target implementation!');
  } else {
    console.log('   🔄 Needs upgrade...');
    
    // Connect to proxy with UUPS ABI
    const marketplace = await ethers.getContractAt(
      'RWAMarketplaceUpgradeableSetterV2',
      MARKETPLACE_PROXY
    );
    
    // Upgrade to new implementation
    console.log('\n📋 Executing upgrade...');
    try {
      const upgradeTx = await marketplace.upgradeToAndCall(
        NEW_IMPLEMENTATION,
        '0x' // No initialization data
      );
      
      console.log('⏳ Transaction sent:', upgradeTx.hash);
      const receipt = await upgradeTx.wait();
      console.log('✅ Upgrade successful!');
      console.log('   Block:', receipt.blockNumber);
      console.log('   Gas used:', receipt.gasUsed.toString());
    } catch (error: any) {
      console.error('❌ Upgrade failed:', error.message);
      throw error;
    }
    
    // Verify upgrade succeeded
    const newImpl = ethers.AbiCoder.defaultAbiCoder().decode(
      ['address'],
      await ethers.provider.getStorage(MARKETPLACE_PROXY, implementationSlot)
    )[0];
    
    console.log('\n📋 Verifying upgrade...');
    console.log('   New implementation:', newImpl);
    
    if (newImpl.toLowerCase() === NEW_IMPLEMENTATION.toLowerCase()) {
      console.log('   ✅ Upgrade verified!');
    } else {
      throw new Error('Upgrade verification failed');
    }
  }

  console.log('\n🎉 Marketplace upgrade complete!');
  console.log(`\nℹ️  Next step: Run add-eurc-payment-token.ts to add EURC`);
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
