#!/usr/bin/env tsx
/**
 * Sync Wallet On-Chain Data Script
 * 
 * Fetches wallet data from Etherscan API and syncs to backend
 * Usage: bun run scripts/sync-wallet-onchain-data.ts <wallet-address>
 */

import 'dotenv/config';
import { Address, isAddress } from 'viem';
import { 
  getTokenBalances, 
  getERC721Tokens, 
  getNormalTransactions,
  getERC20Transfers,
  getAccountBalance,
} from '../src/lib/services/etherscan-service';

const WALLET_ADDRESS = process.argv[2] as Address | undefined;

async function syncWalletData(address: Address) {
  console.log(`\n🔍 Syncing on-chain data for wallet: ${address}\n`);

  try {
    // Fetch all data in parallel
    console.log('📡 Fetching data from Etherscan API...');
    const [ethBalance, tokenBalances, erc721Tokens, normalTxs, erc20Transfers] = await Promise.all([
      getAccountBalance(address),
      getTokenBalances(address),
      getERC721Tokens(address),
      getNormalTransactions(address),
      getERC20Transfers(address),
    ]);

    console.log('\n✅ Data fetched successfully!\n');

    // Display summary
    console.log('📊 Wallet Summary:');
    console.log(`   ETH Balance: ${ethBalance} ETH`);
    console.log(`   ERC20 Tokens: ${tokenBalances.length}`);
    console.log(`   ERC721 Tokens: ${erc721Tokens.length}`);
    console.log(`   Normal Transactions: ${normalTxs.length}`);
    console.log(`   ERC20 Transfers: ${erc20Transfers.length}`);

    // Display token balances
    if (tokenBalances.length > 0) {
      console.log('\n💰 Token Balances:');
      tokenBalances.forEach((token: any) => {
        console.log(`   ${token.symbol || 'UNKNOWN'}: ${token.balance} (${token.decimals} decimals)`);
      });
    }

    // Display ERC721 holdings
    if (erc721Tokens.length > 0) {
      console.log('\n🎨 ERC721 Holdings:');
      const grouped = new Map<string, number>();
      erc721Tokens.forEach((token) => {
        const key = `${token.tokenSymbol} (${token.contractAddress})`;
        grouped.set(key, (grouped.get(key) || 0) + 1);
      });
      grouped.forEach((count, key) => {
        console.log(`   ${key}: ${count} tokens`);
      });
    }

    // Display recent transactions
    if (normalTxs.length > 0) {
      console.log('\n📝 Recent Transactions (last 5):');
      normalTxs.slice(0, 5).forEach((tx) => {
        const date = new Date(parseInt(tx.timeStamp) * 1000).toLocaleString();
        const isSend = tx.from.toLowerCase() === address.toLowerCase();
        console.log(`   ${isSend ? '→' : '←'} ${tx.hash.substring(0, 10)}... ${date}`);
      });
    }

    console.log('\n✅ Sync complete!\n');

    // Return data for potential API sync
    return {
      address,
      ethBalance,
      tokenBalances,
      erc721Tokens,
      transactions: normalTxs,
      erc20Transfers,
    };
  } catch (error) {
    console.error('❌ Error syncing wallet data:', error);
    throw error;
  }
}

// Main execution
async function main() {
  if (!WALLET_ADDRESS || !isAddress(WALLET_ADDRESS)) {
    console.error('❌ Invalid wallet address provided');
    console.log('\nUsage: bun run scripts/sync-wallet-onchain-data.ts <wallet-address>');
    console.log('Example: bun run scripts/sync-wallet-onchain-data.ts 0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047');
    process.exit(1);
  }

  if (!process.env.ETHERSCAN_API_KEY && !process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY) {
    console.warn('⚠️  Warning: ETHERSCAN_API_KEY not set. Some features may be limited.');
  }

  try {
    await syncWalletData(WALLET_ADDRESS);
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

main();

