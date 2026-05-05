#!/usr/bin/env tsx
/**
 * Test Wallet Balances Script
 * 
 * Tests the balances API endpoint to verify Etherscan integration
 * Usage: bun run scripts/test-wallet-balances.ts <wallet-address>
 */

import 'dotenv/config';

const WALLET_ADDRESS = process.argv[2] || '0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047';
const API_BASE_URL = process.env.NEXT_PUBLIC_HOST 
  ? `https://${process.env.NEXT_PUBLIC_HOST}`
  : 'http://localhost:3000';

async function testBalances() {
  console.log(`\n🔍 Testing balances API for wallet: ${WALLET_ADDRESS}\n`);
  console.log(`📡 API Base URL: ${API_BASE_URL}\n`);

  try {
    const url = `${API_BASE_URL}/api/tokenizin-wallet/balances?address=${WALLET_ADDRESS}`;
    console.log(`🌐 Fetching: ${url}\n`);

    const response = await fetch(url, {
      credentials: 'include',
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:', errorText);
      return;
    }

    const data = await response.json();
    
    console.log('✅ Balances Response:');
    console.log(JSON.stringify(data, null, 2));

    if (data.success && data.balances) {
      console.log('\n💰 Formatted Balances:');
      console.log(`   ETH: ${data.balances.eth}`);
      console.log(`   USDC: ${data.balances.usdc}`);
      console.log(`   EURC: ${data.balances.eurc}`);
      console.log(`   TKNZN: ${data.balances.tpt}`);
      console.log(`   Total USD Value: ${data.balances.totalUSDValue}`);

      if (data._debug) {
        console.log('\n🔧 Debug Info:');
        console.log(`   RPC URL: ${data._debug.rpcUrl}`);
        console.log(`   Etherscan Tokens Found: ${data._debug.etherscanTokensFound}`);
        console.log(`   Raw Balances:`, data._debug.rawBalances);
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Check environment variables
console.log('🔑 Environment Check:');
console.log(`   ETHERSCAN_API_KEY: ${process.env.ETHERSCAN_API_KEY ? '✅ Set' : '❌ Not set'}`);
console.log(`   NEXT_PUBLIC_ETHERSCAN_API_KEY: ${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY ? '✅ Set' : '❌ Not set'}`);
console.log(`   SEPOLIA_RPC_URL: ${process.env.SEPOLIA_RPC_URL ? '✅ Set' : '❌ Not set'}`);
console.log(`   NEXT_PUBLIC_SEPOLIA_RPC_URL: ${process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ? '✅ Set' : '❌ Not set'}\n`);

testBalances();

