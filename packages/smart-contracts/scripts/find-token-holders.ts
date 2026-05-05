#!/usr/bin/env tsx

/**
 * Find Token Holders
 * 
 * Finds all token holders for deployed ERC404 tokens by querying Transfer events.
 * 
 * Usage:
 *   bun run hardhat run scripts/find-token-holders.ts --network sepolia
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
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Transfer721(address indexed from, address indexed to, uint256 indexed tokenId)',
] as const;

async function main() {
  console.log('🔍 Finding Token Holders');
  console.log('════════════════════════════════════════════════════════════\n');

  const provider = hre.ethers.provider;
  const factory = new ethers.Contract(FIXED_FACTORY_ADDRESS, FACTORY_ABI, provider);

  // Get all deployed tokens
  const allTokens = await factory.getAllTokens();
  console.log(`📋 Found ${allTokens.length} deployed tokens\n`);

  // Get current block
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 100000); // Last ~100k blocks

  for (const tokenAddress of allTokens) {
    try {
      const assetId = Number(await factory.getAssetId(tokenAddress));
      const token = new ethers.Contract(tokenAddress, TOKEN_ABI, provider);
      
      const [name, symbol, totalSupply] = await Promise.all([
        token.name(),
        token.symbol(),
        token.totalSupply(),
      ]);

      console.log(`\n${'='.repeat(80)}`);
      console.log(`Asset ${assetId}: ${name} (${symbol})`);
      console.log(`Token Address: ${tokenAddress}`);
      console.log(`Total Supply: ${ethers.formatEther(totalSupply)} ${symbol}`);
      console.log(`${'='.repeat(80)}\n`);

      // Query Transfer events
      console.log(`📊 Querying Transfer events from block ${fromBlock} to ${currentBlock}...`);
      
      const transferFilter = token.filters.Transfer();
      const transfers = await token.queryFilter(transferFilter, fromBlock, currentBlock);

      console.log(`   Found ${transfers.length} Transfer events\n`);

      // Build holder map
      const holders = new Map<string, bigint>();

      for (const event of transfers) {
        if ((event as any).args) {
          const { from, to, value } = (event as any).args;
          
          // Skip zero address (minting/burning)
          if (to && to !== ethers.ZeroAddress && value) {
            const currentBalance = holders.get(to) || 0n;
            holders.set(to, currentBalance + value);
          }
          
          // Subtract from sender
          if (from && from !== ethers.ZeroAddress && value) {
            const currentBalance = holders.get(from) || 0n;
            const newBalance = currentBalance > value ? currentBalance - value : 0n;
            if (newBalance > 0n) {
              holders.set(from, newBalance);
            } else {
              holders.delete(from);
            }
          }
        }
      }

      // Get current balances (more accurate)
      console.log(`💰 Checking current balances for ${holders.size} addresses...\n`);
      
      const holderBalances: Array<{ address: string; balance: bigint; percentage: number }> = [];
      
      // Check all addresses that received tokens
      const addressesToCheck = new Set<string>();
      for (const event of transfers) {
        if ((event as any).args?.to && (event as any).args.to !== ethers.ZeroAddress) {
          addressesToCheck.add((event as any).args.to);
        }
        if ((event as any).args?.from && (event as any).args.from !== ethers.ZeroAddress) {
          addressesToCheck.add((event as any).args.from);
        }
      }

      // Get current balances
      for (const address of addressesToCheck) {
        try {
          const balance = await token.balanceOf(address);
          if (balance > 0n) {
            const percentage = totalSupply > 0n 
              ? Number((balance * 10000n) / totalSupply) / 100 
              : 0;
            holderBalances.push({ address, balance, percentage });
          }
        } catch {
          // Skip if error
        }
      }

      // Sort by balance (highest first)
      holderBalances.sort((a, b) => {
        if (b.balance > a.balance) return 1;
        if (b.balance < a.balance) return -1;
        return 0;
      });

      if (holderBalances.length === 0) {
        console.log('   ⚠️  No token holders found\n');
        continue;
      }

      console.log(`📋 Token Holders (${holderBalances.length}):\n`);
      console.log('Address | Balance | % of Supply');
      console.log('─'.repeat(80));

      for (const holder of holderBalances) {
        const balanceStr = ethers.formatEther(holder.balance);
        console.log(
          `${holder.address} | ${balanceStr.padEnd(20)} | ${holder.percentage.toFixed(2)}%`
        );
      }

      // Check if buyer wallet is in holders
      const buyerWallet = process.env.BUYER_WALLET_1;
      if (buyerWallet) {
        const buyerBalance = holderBalances.find(h => 
          h.address.toLowerCase() === buyerWallet.toLowerCase()
        );
        if (buyerBalance) {
          console.log(`\n✅ Buyer wallet (${buyerWallet}) has ${ethers.formatEther(buyerBalance.balance)} ${symbol}`);
        } else {
          console.log(`\n⚠️  Buyer wallet (${buyerWallet}) has no ${symbol} tokens`);
          
          // Suggest largest holder for potential transfer
          if (holderBalances.length > 0) {
            const largestHolder = holderBalances[0];
            console.log(`   💡 Largest holder: ${largestHolder.address} (${ethers.formatEther(largestHolder.balance)} ${symbol})`);
          }
        }
      }

      console.log('\n');

    } catch (error: any) {
      console.error(`❌ Error processing token ${tokenAddress}:`, error.message);
      console.log('\n');
    }
  }

  console.log('✅ Token holder search complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
