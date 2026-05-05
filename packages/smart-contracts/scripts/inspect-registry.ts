#!/usr/bin/env tsx

import 'dotenv/config';
import { ethers } from 'hardhat';

const REGISTRY_ADDRESS = '0x5f339B08a22F8f0D5fDE32016Bc2b3BC91403F9A';
const FACTORY404_ADDRESS = '0x7a6f7dE826064903f2e419833b9633560217FEe2';
const MARKETPLACE_ADDRESS = '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';

async function checkProxyImplementation(proxyAddress: string, provider: any) {
  try {
    // Check proxy implementation (slot 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc)
    const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
    const implementationData = await provider.getStorage(proxyAddress, implementationSlot);
    const implementationAddress = '0x' + implementationData.slice(-40);

    console.log(`   Implementation: ${implementationAddress}`);

    // Check if implementation exists
    const code = await provider.getCode(implementationAddress);
    if (code === '0x') {
      console.log(`   ❌ Implementation contract does not exist`);
      return false;
    } else {
      console.log(`   ✅ Implementation contract exists (${code.length} bytes)`);
    }

    // Check admin (slot 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103)
    const adminSlot = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
    const adminData = await provider.getStorage(proxyAddress, adminSlot);
    const adminAddress = '0x' + adminData.slice(-40);

    console.log(`   Admin: ${adminAddress}`);

    return implementationAddress !== '0x0000000000000000000000000000000000000000';
  } catch (error: any) {
    console.log(`   ❌ Error checking proxy: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Inspecting RWA Contracts...\n');

  const provider = ethers.provider;

  // Check Registry
  console.log('🏛️  Checking Registry...');
  console.log(`Address: ${REGISTRY_ADDRESS}`);

  const registryCode = await provider.getCode(REGISTRY_ADDRESS);
  if (registryCode === '0x') {
    console.log('❌ Registry: No contract code at this address');
    return;
  }
  console.log('✅ Registry: Contract exists');

  // Check if it's a proxy
  await checkProxyImplementation(REGISTRY_ADDRESS, provider);

  // Check Factory404
  console.log('\n🏭 Checking Factory404...');
  console.log(`Address: ${FACTORY404_ADDRESS}`);

  const factoryCode = await provider.getCode(FACTORY404_ADDRESS);
  if (factoryCode === '0x') {
    console.log('❌ Factory404: No contract code at this address');
    return;
  }
  console.log('✅ Factory404: Contract exists');

  // Check Marketplace
  console.log('\n🏪 Checking Marketplace...');
  console.log(`Address: ${MARKETPLACE_ADDRESS}`);

  const marketplaceCode = await provider.getCode(MARKETPLACE_ADDRESS);
  if (marketplaceCode === '0x') {
    console.log('❌ Marketplace: No contract code at this address');
    return;
  }
  console.log('✅ Marketplace: Contract exists');

  // Test interactions
  console.log('\n🔧 Testing contract interactions...\n');

  const [signer] = await ethers.getSigners();
  console.log(`👤 Signer: ${signer.address}`);

  try {
    // Test Registry Implementation Directly
    console.log('🏛️  Testing Registry Implementation Directly...');
    const implementationAddress = '0xaaa24dd891ea62323fb90a16631b15a681d6b802';
    const registryImpl = new ethers.Contract(implementationAddress, [
      'function owner() view returns (address)',
      'function getAsset(uint256) view returns (tuple(uint32,address,uint8,uint64,uint64,uint64,uint128,uint128,uint64,uint64,string,string,string,string,bool))',
      'function ASSET_MANAGER_ROLE() view returns (bytes32)',
      'function hasRole(bytes32, address) view returns (bool)',
    ], provider);

    try {
      const registryOwner = await registryImpl.owner();
      console.log(`   ✅ Implementation Owner: ${registryOwner}`);
    } catch (error: any) {
      console.log(`   ❌ Implementation owner call failed: ${error.message}`);
    }

    // Test Registry Proxy
    console.log('🏛️  Testing Registry Proxy...');
    const registry = new ethers.Contract(REGISTRY_ADDRESS, [
      'function owner() view returns (address)',
      'function getAsset(uint256) view returns (tuple(uint32,address,uint8,uint64,uint64,uint64,uint128,uint128,uint64,uint64,string,string,string,string,bool))',
      'function ASSET_MANAGER_ROLE() view returns (bytes32)',
      'function hasRole(bytes32, address) view returns (bool)',
    ], provider);

    try {
      const registryOwner = await registry.owner();
      console.log(`   ✅ Proxy Owner: ${registryOwner}`);
    } catch (error: any) {
      console.log(`   ❌ Proxy owner call failed: ${error.message}`);
    }

    // Test Factory404
    console.log('\n🏭 Testing Factory404...');
    const factory404 = new ethers.Contract(FACTORY404_ADDRESS, [
      'function owner() view returns (address)',
      'function paused() view returns (bool)',
      'function TOKEN_CREATOR_ROLE() view returns (bytes32)',
      'function hasRole(bytes32, address) view returns (bool)',
      'function getTokenAddress(uint256) view returns (address)',
      'function getAllTokens() view returns (address[])',
    ], provider);

    const factoryOwner = await factory404.owner();
    console.log(`   Owner: ${factoryOwner}`);

    const isPaused = await factory404.paused();
    console.log(`   Paused: ${isPaused ? '❌' : '✅'}`);

    const tokenCreatorRole = await factory404.TOKEN_CREATOR_ROLE();
    const hasTokenRole = await factory404.hasRole(tokenCreatorRole, signer.address);
    console.log(`   Signer has TOKEN_CREATOR_ROLE: ${hasTokenRole ? '✅' : '❌'}`);

    const hasMarketplaceTokenRole = await factory404.hasRole(tokenCreatorRole, MARKETPLACE_ADDRESS);
    console.log(`   Marketplace has TOKEN_CREATOR_ROLE: ${hasMarketplaceTokenRole ? '✅' : '❌'}`);

    const allTokens = await factory404.getAllTokens();
    console.log(`   Total tokens created: ${allTokens.length}`);

    // Test Marketplace
    console.log('\n🏪 Testing Marketplace...');
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, [
      'function owner() view returns (address)',
      'function getMarketplaceFee() view returns (uint256)',
      'function assetRegistry() view returns (address)',
      'function tokenFactory404() view returns (address)',
    ], provider);

    const marketplaceOwner = await marketplace.owner();
    console.log(`   Owner: ${marketplaceOwner}`);

    const fee = await marketplace.getMarketplaceFee();
    console.log(`   Fee: ${fee} basis points (${Number(fee) / 100}%)`);

    const registryAddr = await marketplace.assetRegistry();
    console.log(`   Registry address: ${registryAddr}`);
    console.log(`   Registry matches: ${registryAddr.toLowerCase() === REGISTRY_ADDRESS.toLowerCase() ? '✅' : '❌'}`);

    const factoryAddr = await marketplace.tokenFactory404();
    console.log(`   Factory404 address: ${factoryAddr}`);
    console.log(`   Factory404 matches: ${factoryAddr.toLowerCase() === FACTORY404_ADDRESS.toLowerCase() ? '✅' : '❌'}`);

  } catch (error: any) {
    console.log('❌ Contract interaction failed:', error.message);
    if (error.data) {
      console.log('Raw error data:', error.data);
    }
  }
}

main().catch(console.error);