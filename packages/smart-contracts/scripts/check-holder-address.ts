#!/usr/bin/env tsx

/**
 * Check Token Holder Address
 * 
 * Checks if the token holder address is a contract and provides transfer options.
 * 
 * Usage:
 *   bun run hardhat run scripts/check-holder-address.ts --network sepolia
 */

import 'dotenv/config';
import { ethers } from 'hardhat';
import hre from 'hardhat';

const TOKEN_HOLDER_ADDRESS = '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';
const MARKETPLACE_PROXY = '0x0b6a1BFCEf896d004Edd376A798c57F2B797e307';

async function main() {
  console.log('🔍 Checking Token Holder Address');
  console.log('════════════════════════════════════════════════════════════\n');

  const provider = hre.ethers.provider;

  console.log(`Holder Address: ${TOKEN_HOLDER_ADDRESS}`);
  console.log(`Marketplace Proxy: ${MARKETPLACE_PROXY}\n`);

  // Check if holder is a contract
  const holderCode = await provider.getCode(TOKEN_HOLDER_ADDRESS);
  const isContract = holderCode && holderCode !== '0x';

  console.log(`📋 Address Type: ${isContract ? 'Contract' : 'EOA (Externally Owned Account)'}\n`);

  if (isContract) {
    console.log('⚠️  Holder is a contract address.');
    console.log('   Direct token transfers require the contract to have transfer functions.');
    console.log('   You may need to interact with the contract directly.\n');

    // Check if it's the marketplace
    if (TOKEN_HOLDER_ADDRESS.toLowerCase() === MARKETPLACE_PROXY.toLowerCase()) {
      console.log('✅ This matches the marketplace proxy address!');
      console.log('   The marketplace contract holds the tokens.');
      console.log('   You may need to use marketplace functions to transfer tokens.\n');
    }

    // Try to get contract info
    try {
      const MARKETPLACE_ABI = [
        'function owner() view returns (address)',
        'function getRoleMember(bytes32 role, uint256 index) view returns (address)',
      ];
      const contract = new ethers.Contract(TOKEN_HOLDER_ADDRESS, MARKETPLACE_ABI, provider);
      
      try {
        const owner = await contract.owner();
        console.log(`   Contract Owner: ${owner}`);
      } catch {
        // No owner function
      }
    } catch {
      // Can't get contract info
    }
  } else {
    console.log('✅ Holder is an EOA (wallet address).');
    console.log('   You can transfer tokens directly if you have the private key.\n');
  }

  // Check token balances
  console.log('💰 Checking token balances...\n');
  
  const FIXED_FACTORY_ADDRESS = '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b';
  const FACTORY_ABI = ['function getTokenAddress(uint256 assetId) view returns (address)'];
  const factory = new ethers.Contract(FIXED_FACTORY_ADDRESS, FACTORY_ABI, provider);

  const TOKEN_ABI = ['function symbol() view returns (string)', 'function balanceOf(address) view returns (uint256)'];

  for (let assetId = 1; assetId <= 4; assetId++) {
    try {
      const tokenAddress = await factory.getTokenAddress(assetId);
      if (tokenAddress && tokenAddress !== ethers.ZeroAddress) {
        const token = new ethers.Contract(tokenAddress, TOKEN_ABI, provider);
        const [symbol, balance] = await Promise.all([
          token.symbol(),
          token.balanceOf(TOKEN_HOLDER_ADDRESS),
        ]);
        console.log(`   Asset ${assetId} (${symbol}): ${ethers.formatEther(balance)} tokens`);
      }
    } catch {
      // Skip
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Recommendations:\n');

  if (isContract) {
    console.log('Since the holder is a contract:');
    console.log('1. Check if the contract has transfer/withdraw functions');
    console.log('2. Use the contract owner/admin to call transfer functions');
    console.log('3. Or fix the marketplace contract to allow purchases\n');
  } else {
    console.log('Since the holder is an EOA:');
    console.log('1. Add the holder\'s private key to .env.local as HOLDER_KEY');
    console.log('2. Use transfer-tokens-for-testing.ts to transfer tokens');
    console.log('3. Or check if this address matches any known deployer/admin wallet\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
