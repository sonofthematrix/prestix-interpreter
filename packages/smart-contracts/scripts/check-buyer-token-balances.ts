#!/usr/bin/env tsx

/**
 * Check Buyer Wallet Token Balances
 * 
 * Checks token balances for a buyer wallet across all deployed tokens.
 * 
 * Usage:
 *   BUYER_WALLET_1=0x... BUYER_KEY_1=0x... bun run hardhat run scripts/check-buyer-token-balances.ts --network sepolia
 */

import 'dotenv/config';
import { ethers } from 'hardhat';
import hre from 'hardhat';

const FIXED_FACTORY_ADDRESS = '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b';

const FACTORY_ABI = [
  'function getTokenAddress(uint256 assetId) view returns (address)',
  'function getAllTokens() view returns (address[])',
  'function getAssetId(address tokenAddress) view returns (uint256)',
] as const;

const TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
] as const;

async function main() {
  console.log('🔍 Checking Buyer Wallet Token Balances');
  console.log('════════════════════════════════════════════════════════════\n');

  const buyerWallet = process.env.BUYER_WALLET_1;
  if (!buyerWallet) {
    console.error('❌ BUYER_WALLET_1 environment variable not set');
    process.exit(1);
  }

  const provider = hre.ethers.provider;
  const factory = new ethers.Contract(FIXED_FACTORY_ADDRESS, FACTORY_ABI, provider);

  console.log(`👤 Buyer Wallet: ${buyerWallet}\n`);

  // Get all deployed tokens
  const allTokens = await factory.getAllTokens();
  console.log(`📋 Found ${allTokens.length} deployed tokens\n`);

  const buyerBalances: Array<{
    assetId: number;
    tokenAddress: string;
    name: string;
    symbol: string;
    balance: bigint;
    totalSupply: bigint;
    percentage: number;
  }> = [];

  for (const tokenAddress of allTokens) {
    try {
      const assetId = Number(await factory.getAssetId(tokenAddress));
      const token = new ethers.Contract(tokenAddress, TOKEN_ABI, provider);
      
      const [name, symbol, balance, totalSupply] = await Promise.all([
        token.name(),
        token.symbol(),
        token.balanceOf(buyerWallet),
        token.totalSupply(),
      ]);

      const percentage = totalSupply > 0n 
        ? Number((balance * 10000n) / totalSupply) / 100 
        : 0;

      buyerBalances.push({
        assetId,
        tokenAddress,
        name,
        symbol,
        balance,
        totalSupply,
        percentage,
      });
    } catch (error: any) {
      console.log(`⚠️  Error checking token ${tokenAddress}: ${error.message}`);
    }
  }

  // Sort by balance (highest first)
  buyerBalances.sort((a, b) => {
    if (b.balance > a.balance) return 1;
    if (b.balance < a.balance) return -1;
    return 0;
  });

  console.log('📊 Token Balances:\n');
  console.log('Asset ID | Token Address | Name | Symbol | Balance | Total Supply | %');
  console.log('─'.repeat(100));

  let hasTokens = false;
  for (const token of buyerBalances) {
    const balanceStr = ethers.formatEther(token.balance);
    const supplyStr = ethers.formatEther(token.totalSupply);
    const hasBalance = token.balance > 0n;
    
    if (hasBalance) {
      hasTokens = true;
      console.log(
        `${token.assetId.toString().padEnd(9)} | ${token.tokenAddress.substring(0, 10)}... | ${token.name.padEnd(30)} | ${token.symbol.padEnd(6)} | ${balanceStr.padEnd(10)} | ${supplyStr.padEnd(12)} | ${token.percentage.toFixed(2)}%`
      );
    } else {
      console.log(
        `${token.assetId.toString().padEnd(9)} | ${token.tokenAddress.substring(0, 10)}... | ${token.name.padEnd(30)} | ${token.symbol.padEnd(6)} | ${balanceStr.padEnd(10)} | ${supplyStr.padEnd(12)} | 0.00%`
      );
    }
  }

  console.log('\n');

  if (hasTokens) {
    console.log('✅ Buyer wallet has tokens! You can test ERC404 lifecycle with these assets.');
    const assetsWithTokens = buyerBalances.filter(t => t.balance > 0n).map(t => t.assetId);
    console.log(`   Assets with tokens: ${assetsWithTokens.join(', ')}\n`);
  } else {
    console.log('⚠️  Buyer wallet has no tokens.');
    console.log('   To test ERC404 lifecycle, you need to:');
    console.log('   1. Purchase tokens via marketplace (if available)');
    console.log('   2. Or receive tokens from another holder\n');
  }

  // Check marketplace listings for available tokens
  console.log('🔍 Checking marketplace for available tokens...\n');
  
  const MARKETPLACE_ADDRESS = '0x0b6a1BFCEf896d004Edd376A798c57F2B797e307';
  const MARKETPLACE_ABI = [
    'function getActiveListing(uint256 assetId) view returns (address seller, uint256 pricePerToken, uint256 availableTokens)',
  ] as const;

  const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

  for (const token of buyerBalances) {
    try {
      const listing = await marketplace.getActiveListing(token.assetId);
      if (listing && listing.availableTokens > 0n) {
        const priceEth = ethers.formatEther(listing.pricePerToken);
        const available = ethers.formatEther(listing.availableTokens);
        console.log(`   Asset ${token.assetId} (${token.symbol}): ${available} tokens available at ${priceEth} ETH/token`);
      }
    } catch {
      // No listing or error
    }
  }

  console.log('\n✅ Balance check complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
