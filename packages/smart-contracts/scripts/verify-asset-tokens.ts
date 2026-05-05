#!/usr/bin/env tsx
/**
 * Verify Asset Token Contracts on Etherscan
 * 
 * Verifies the 4 ERC404 token contracts created by Factory404
 */

import 'dotenv/config';
import hre from 'hardhat';
import { ethers } from 'hardhat';

// Asset tokens to verify
const ASSET_TOKENS = [
  {
    address: '0x883BeD27A00f4513AC52606f3fc7Aeb398AA717d',
    name: 'Luxury Beachfront Villa - Maldives',
    symbol: 'ASSET1',
    assetId: 1,
    totalSupply: '1000', // 1000 tokens
  },
  {
    address: '0xaCfF6abcd5e04E2ae792cBcd8fD87A15dCC04789',
    name: 'Mountain Resort Estate - Swiss Alps',
    symbol: 'ASSET2',
    assetId: 2,
    totalSupply: '1500',
  },
  {
    address: '0xFd25B46C4eC742Ea04a2E5450A001D18f7De2251',
    name: 'Urban Penthouse - Manhattan',
    symbol: 'ASSET3',
    assetId: 3,
    totalSupply: '2000',
  },
  {
    address: '0x2F74DBEb8f96fBe5779AdDdD4Dfb39b93722BC3c',
    name: 'Mediterranean Coastal Villa - Greece',
    symbol: 'ASSET4',
    assetId: 4,
    totalSupply: '1200',
  },
];

// Deployer address (owner)
const DEPLOYER_ADDRESS = '0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047';
// Marketplace address (initial holder)
const MARKETPLACE_ADDRESS = '0x033c3B60f713027Fa9bE06A461Aa4DC1C348cEcB';

async function verifyToken(token: typeof ASSET_TOKENS[0]) {
  console.log(`\n╭${'─'.repeat(58)}╮`);
  console.log(`│ ${token.symbol.padEnd(56)} │`);
  console.log(`├${'─'.repeat(58)}┤`);
  console.log(`│ Address: ${token.address.padEnd(46)} │`);
  console.log(`╰${'─'.repeat(58)}╯\n`);

  // Constructor arguments for RWAToken404Fixed
  // constructor(
  //   string memory name_,
  //   string memory symbol_,
  //   uint256 assetId_,
  //   uint256 totalSupply_,
  //   address owner,
  //   string memory tokenURI_
  // )
  
  const totalSupplyWei = ethers.parseEther(token.totalSupply);
  const tokenURI = `https://tokenizin.com/assets/${token.assetId}.json`;

  const constructorArgs = [
    token.name,
    token.symbol,
    BigInt(token.assetId),
    totalSupplyWei,
    DEPLOYER_ADDRESS,
    tokenURI,
  ];

  console.log(`   📋 Constructor Arguments:`);
  console.log(`      name:        ${token.name}`);
  console.log(`      symbol:      ${token.symbol}`);
  console.log(`      assetId:     ${token.assetId}`);
  console.log(`      totalSupply: ${ethers.formatEther(totalSupplyWei)} tokens (${totalSupplyWei.toString()} wei)`);
  console.log(`      owner:       ${DEPLOYER_ADDRESS}`);
  console.log(`      tokenURI:    ${tokenURI}\n`);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const maxRetries = 5;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`   🔍 Verification attempt ${attempt}/${maxRetries}...`);

      await hre.run('verify:verify', {
        address: token.address,
        constructorArguments: constructorArgs,
        contract: 'contracts/core/RWAToken404Fixed.sol:RWAToken404Fixed',
      });

      console.log(`   ✅ Contract verified successfully!`);
      console.log(`   📋 View: https://sepolia.etherscan.io/address/${token.address}#code\n`);
      return true;

    } catch (error: any) {
      if (error.message.includes('Already Verified')) {
        console.log(`   ✅ Contract already verified!`);
        console.log(`   📋 View: https://sepolia.etherscan.io/address/${token.address}#code\n`);
        return true;
      }

      if (error.message.includes('does not have bytecode')) {
        console.error(`   ❌ Contract not found at this address\n`);
        return false;
      }

      if (attempt === maxRetries) {
        console.error(`   ❌ Verification failed after ${maxRetries} attempts`);
        console.error(`   Error: ${error.message}\n`);
        return false;
      }

      const backoffDelay = Math.min(5000 * Math.pow(2, attempt - 1), 80000);
      console.log(`   ⏳ Retrying in ${backoffDelay / 1000} seconds...`);
      await delay(backoffDelay);
    }
  }

  return false;
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   VERIFY ASSET TOKEN CONTRACTS ON ETHERSCAN               ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log(`📡 Network: Sepolia (Chain ID: 11155111)`);
  console.log(`🏭 Factory: 0x41CC47BC79F645840f5051B909E0f4E633E363Af`);
  console.log(`🏪 Marketplace: ${MARKETPLACE_ADDRESS}\n`);

  const results: Array<{ token: string; success: boolean }> = [];

  for (const token of ASSET_TOKENS) {
    const success = await verifyToken(token);
    results.push({ token: token.symbol, success });
  }

  // Summary
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   VERIFICATION SUMMARY                                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  for (const result of results) {
    console.log(`   ${result.token.padEnd(10)} ${result.success ? '✅ Verified' : '❌ Failed'}`);
  }

  console.log(`\n   Success Rate: ${successCount}/${totalCount} (${Math.round(successCount / totalCount * 100)}%)\n`);

  if (successCount === totalCount) {
    console.log("   ✅ All asset tokens verified successfully!\n");
  } else {
    console.log("   ⚠️  Some tokens failed verification - review errors above\n");
  }

  process.exit(successCount === totalCount ? 0 : 1);
}

main().catch((error) => {
  console.error("\n❌ Verification script failed:", error);
  process.exit(1);
});
