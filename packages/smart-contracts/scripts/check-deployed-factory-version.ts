#!/usr/bin/env tsx

/**
 * Check Deployed Factory Version on Sepolia
 * 
 * This script checks which version of the ERC404 factory is deployed on Sepolia
 * by examining the contract bytecode and comparing it with known versions.
 */

import 'dotenv/config';
import { ethers } from 'hardhat';
import hre from 'hardhat';
import fs from 'fs';
import path from 'path';

// Known factory addresses from deployment files
const KNOWN_FACTORY_ADDRESSES = {
  OLD: '0x9cb9C7E12D104aa8e75D0d7681ce8b7d15084656', // From deployed-addresses-fresh.json
  NEW: '0xdc4A8BbeC696287E44262b3fE4c2605a0C59929F', // RWATokenFactory404 from deployed-addresses-fresh.json
  FIXED: '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b', // From update script
};

async function checkFactoryVersion() {
  console.log('🔍 Checking Deployed Factory Version on Sepolia\n');

  const provider = hre.ethers.provider;
  const network = await provider.getNetwork();
  
  if (Number(network.chainId) !== 11155111) {
    console.error('❌ This script must be run on Sepolia network');
    console.log('   Current chainId:', network.chainId);
    process.exit(1);
  }

  // Get contract bytecode for comparison
  const getBytecode = async (address: string) => {
    try {
      const code = await provider.getCode(address);
      return code;
    } catch (error: any) {
      console.error(`❌ Error fetching bytecode for ${address}:`, error.message);
      return null;
    }
  };

  // Read compiled contract bytecode
  const getCompiledBytecode = (contractName: string) => {
    try {
      const artifactPath = path.join(
        __dirname,
        `../artifacts/contracts/core/${contractName}.sol/${contractName}.json`
      );
      if (!fs.existsSync(artifactPath)) {
        return null;
      }
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
      return artifact.bytecode;
    } catch (error: any) {
      return null;
    }
  };

  console.log('📋 Checking known factory addresses:\n');

  const results: Array<{
    address: string;
    name: string;
    hasCode: boolean;
    bytecodeLength: number;
    matchesOld: boolean;
    matchesFixed: boolean;
  }> = [];

  // Check each known address
  for (const [name, address] of Object.entries(KNOWN_FACTORY_ADDRESSES)) {
    console.log(`Checking ${name}: ${address}`);
    const bytecode = await getBytecode(address);
    
    if (!bytecode || bytecode === '0x') {
      console.log(`  ⚠️  No contract deployed at this address\n`);
      results.push({
        address,
        name,
        hasCode: false,
        bytecodeLength: 0,
        matchesOld: false,
        matchesFixed: false,
      });
      continue;
    }

    // Get compiled bytecodes for comparison
    const oldBytecode = getCompiledBytecode('RWATokenFactory404');
    const fixedBytecode = getCompiledBytecode('RWATokenFactory404Fixed');

    const matchesOld = oldBytecode && bytecode.includes(oldBytecode.slice(2, 100)); // Compare first part
    const matchesFixed = fixedBytecode && bytecode.includes(fixedBytecode.slice(2, 100));

    console.log(`  ✅ Contract deployed`);
    console.log(`  📏 Bytecode length: ${bytecode.length} characters`);
    console.log(`  🔍 Matches RWATokenFactory404: ${matchesOld ? '✅ YES' : '❌ NO'}`);
    console.log(`  🔍 Matches RWATokenFactory404Fixed: ${matchesFixed ? '✅ YES' : '❌ NO'}\n`);

    results.push({
      address,
      name,
      hasCode: true,
      bytecodeLength: bytecode.length,
      matchesOld: matchesOld || false,
      matchesFixed: matchesFixed || false,
    });
  }

  // Summary
  console.log('\n📊 SUMMARY:');
  console.log('='.repeat(60));
  
  const deployedFactories = results.filter(r => r.hasCode);
  
  if (deployedFactories.length === 0) {
    console.log('❌ No factory contracts found at known addresses');
    process.exit(1);
  }

  console.log(`\n✅ Found ${deployedFactories.length} deployed factory contract(s):\n`);

  for (const factory of deployedFactories) {
    console.log(`📍 ${factory.name}: ${factory.address}`);
    console.log(`   Version: ${factory.matchesFixed ? '✅ RWATokenFactory404Fixed (FIXED)' : factory.matchesOld ? '⚠️  RWATokenFactory404 (OLD)' : '❓ UNKNOWN'}`);
    console.log(`   Bytecode: ${factory.bytecodeLength} chars\n`);
  }

  // Check which one is likely the active one (longest bytecode = most features)
  const activeFactory = deployedFactories.reduce((prev, curr) => 
    curr.bytecodeLength > prev.bytecodeLength ? curr : prev
  );

  console.log('🎯 LIKELY ACTIVE FACTORY:');
  console.log(`   Address: ${activeFactory.address}`);
  console.log(`   Version: ${activeFactory.matchesFixed ? '✅ RWATokenFactory404Fixed (RECOMMENDED)' : activeFactory.matchesOld ? '⚠️  RWATokenFactory404 (NEEDS UPGRADE)' : '❓ UNKNOWN'}`);
  
  if (activeFactory.matchesOld && !activeFactory.matchesFixed) {
    console.log('\n⚠️  WARNING: Active factory appears to be OLD version!');
    console.log('   The old version has the mintTokens() bug that can exceed total supply.');
    console.log('   Recommendation: Deploy RWATokenFactory404Fixed and update marketplace.');
  } else if (activeFactory.matchesFixed) {
    console.log('\n✅ GOOD: Active factory is the FIXED version!');
    console.log('   This version properly validates allowance and balance before transfers.');
  }

  return activeFactory;
}

// Run the check
checkFactoryVersion()
  .then((factory) => {
    console.log('\n✅ Factory version check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error checking factory version:', error);
    process.exit(1);
  });
