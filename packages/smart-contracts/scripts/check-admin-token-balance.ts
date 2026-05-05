#!/usr/bin/env tsx

import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`📋 Admin Wallet: ${deployer.address}\n`);
  
  // Token addresses from database
  const tokens = [
    { symbol: 'ASSET1', address: '0x883bed27a00f4513ac52606f3fc7aeb398aa717d', name: 'Luxury Beachfront Villa - Maldives' },
    { symbol: 'ASSET2', address: '0xacff6abcd5e04e2ae792cbcd8fd87a15dcc04789', name: 'Mountain Resort Estate - Swiss Alps' },
    { symbol: 'ASSET3', address: '0xfd25b46c4ec742ea04a2e5450a001d18f7de2251', name: 'Urban Penthouse - Manhattan' },
    { symbol: 'ASSET4', address: '0x2f74dbeb8f96fbe5779adddd4dfb39b93722bc3c', name: 'Mediterranean Coastal Villa - Greece' },
  ];
  
  console.log('💰 Token Balances:\n');
  
  for (const token of tokens) {
    try {
      const tokenContract = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', token.address);
      const balance = await tokenContract.balanceOf(deployer.address);
      const balanceFormatted = ethers.formatEther(balance);
      
      console.log(`${token.symbol}:`);
      console.log(`  Name: ${token.name}`);
      console.log(`  Balance: ${balanceFormatted} tokens`);
      console.log(`  Raw: ${balance.toString()} wei`);
      console.log(`  Contract: ${token.address}`);
      
      if (balance > 0) {
        console.log(`  ✅ Admin has tokens available for transfer`);
      } else {
        console.log(`  ⚠️ Admin has NO tokens (cannot transfer)`);
      }
      console.log('');
      
    } catch (error: any) {
      console.log(`${token.symbol}:`);
      console.log(`  ❌ Error: ${error.message}`);
      console.log('');
    }
  }
  
  console.log('='.repeat(60));
  console.log('\n📋 Summary:');
  console.log('  Admin Wallet: ' + deployer.address);
  console.log('\nTo transfer tokens, you need:');
  console.log('  1. Admin wallet to have sufficient token balance');
  console.log('  2. Gas for the transfer transaction');
  console.log('');
  console.log('If admin wallet has no tokens, you must:');
  console.log('  1. Issue ETH refund instead, OR');
  console.log('  2. Mint/transfer tokens to admin wallet first');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
