#!/usr/bin/env tsx

/**
 * Upgrade Marketplace to Add EURC Payment Token Support
 * 
 * This script:
 * 1. Upgrades marketplace to RWAMarketplaceUpgradeableSetterV2
 * 2. Adds EURC as an allowed payment token
 * 3. Verifies the upgrade on Etherscan
 */

import 'dotenv/config';
import { ethers } from 'hardhat';
import hre from 'hardhat';

const MARKETPLACE_PROXY = '0x033c3B60f713027Fa9bE06A461Aa4DC1C348cEcB';
const EURC_ADDRESS = '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function verifyContractOnEtherscan(
  contractAddress: string,
  contractName: string,
  constructorArgs: any[] = []
): Promise<void> {
  const maxRetries = 5;
  
  // Check Etherscan API key
  if (!process.env.ETHERSCAN_API_KEY && !process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY) {
    throw new Error('ETHERSCAN_API_KEY or NEXT_PUBLIC_ETHERSCAN_API_KEY required');
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n🔍 Verification attempt ${attempt}/${maxRetries}...`);
      
      await hre.run('verify:verify', {
        address: contractAddress,
        constructorArguments: constructorArgs,
        contract: `contracts/marketplace/${contractName}.sol:${contractName}`,
      });
      
      console.log(`\n✅ Contract verified successfully!`);
      console.log(`https://sepolia.etherscan.io/address/${contractAddress}#code`);
      return;
      
    } catch (error: any) {
      if (error.message.includes('Already Verified')) {
        console.log(`\n✅ Contract already verified!`);
        console.log(`https://sepolia.etherscan.io/address/${contractAddress}#code`);
        return;
      }
      
      if (attempt === maxRetries) {
        throw new Error(`Verification failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      const backoffDelay = Math.min(5000 * Math.pow(2, attempt - 1), 80000);
      console.log(`⏳ Retrying in ${backoffDelay / 1000} seconds...`);
      await delay(backoffDelay);
    }
  }
}

async function main() {
  console.log('🚀 Upgrading Marketplace to Add EURC Support...\n');

  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer:', deployer.address);
  console.log('📍 Marketplace proxy:', MARKETPLACE_PROXY);

  // Step 1: Deploy new implementation
  console.log('\n📋 Step 1: Deploying RWAMarketplaceUpgradeableSetterV2...');
  const RWAMarketplaceV2 = await ethers.getContractFactory('RWAMarketplaceUpgradeableSetterV2');
  const implementation = await RWAMarketplaceV2.deploy();
  await implementation.waitForDeployment();
  const implementationAddress = await implementation.getAddress();
  console.log('✅ New implementation deployed:', implementationAddress);

  // Step 2: Verify new implementation on Etherscan
  console.log('\n📋 Step 2: Verifying new implementation on Etherscan...');
  await verifyContractOnEtherscan(
    implementationAddress,
    'RWAMarketplaceUpgradeableSetterV2',
    [] // No constructor arguments
  );

  // Step 3: Get proxy admin
  console.log('\n📋 Step 3: Getting proxy admin...');
  const proxyAdminSlot = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
  const proxyAdminAddress = ethers.AbiCoder.defaultAbiCoder().decode(
    ['address'],
    await ethers.provider.getStorage(MARKETPLACE_PROXY, proxyAdminSlot)
  )[0];
  console.log('✅ Proxy admin:', proxyAdminAddress);

  // Step 4: Upgrade proxy
  console.log('\n📋 Step 4: Upgrading proxy to new implementation...');
  const ProxyAdmin = await ethers.getContractFactory('ProxyAdmin');
  const proxyAdmin = ProxyAdmin.attach(proxyAdminAddress);

  const upgradeTx = await proxyAdmin.upgradeAndCall(
    MARKETPLACE_PROXY,
    implementationAddress,
    '0x' // No initialization call needed
  );
  await upgradeTx.wait();
  console.log('✅ Marketplace upgraded successfully!');
  console.log('   TX:', upgradeTx.hash);

  // Step 5: Verify upgrade
  console.log('\n📋 Step 5: Verifying upgrade...');
  const marketplace = await ethers.getContractAt('RWAMarketplaceUpgradeableSetterV2', MARKETPLACE_PROXY);
  
  // Check for new functions
  try {
    const allowedTokens = await marketplace.getAllowedPaymentTokens();
    console.log(`✅ New function getAllowedPaymentTokens() works!`);
    console.log(`   Current allowed tokens: ${allowedTokens.length}`);
  } catch (error: any) {
    console.error('❌ Upgrade verification failed:', error.message);
    throw error;
  }

  // Step 6: Add EURC as payment token
  console.log('\n📋 Step 6: Adding EURC as allowed payment token...');
  
  // Check if EURC is already allowed
  const isEURCAllowed = await marketplace.allowedPaymentTokens(EURC_ADDRESS);
  
  if (isEURCAllowed) {
    console.log('✅ EURC is already allowed in marketplace');
  } else {
    console.log(`➕ Adding EURC (${EURC_ADDRESS})...`);
    const addTokenTx = await marketplace.addPaymentToken(EURC_ADDRESS);
    await addTokenTx.wait();
    console.log('✅ EURC added successfully!');
    console.log('   TX:', addTokenTx.hash);
  }

  // Step 7: Verify final configuration
  console.log('\n📋 Step 7: Verifying final payment token configuration...');
  const finalAllowedTokens = await marketplace.getAllowedPaymentTokens();
  
  console.log(`\n✅ Final allowed payment tokens: ${finalAllowedTokens.length}`);
  const tokenNames: { [key: string]: string } = {
    '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238': 'USDC',
    '0x08210f9170f89ab7658f0b5e3ff39b0e03c594d4': 'EURC',
    '0x064682f1555d3bad3dab5edd0dee45372f23a570': 'TKNZN',
    '0x0000000000000000000000000000000000000000': 'ETH (Native)',
  };
  
  for (let i = 0; i < finalAllowedTokens.length; i++) {
    const token = finalAllowedTokens[i].toLowerCase();
    const name = tokenNames[token] || 'Unknown';
    console.log(`   ${i + 1}. ${name}: ${finalAllowedTokens[i]}`);
  }

  console.log('\n🎉 Marketplace upgrade complete!');
  console.log('\n📊 Summary:');
  console.log(`   Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   New Implementation: ${implementationAddress}`);
  console.log(`   Allowed Payment Tokens: ${finalAllowedTokens.length}`);
  console.log(`   ✅ EURC support added`);
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
