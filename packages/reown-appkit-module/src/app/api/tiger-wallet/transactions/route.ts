/**
 * Tiger Wallet Transactions API
 * 
 * GET /api/tokenizin-wallet/transactions
 * Get transaction history for Tiger wallet
 * Fetches from Etherscan API for normal and token transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { Address, isAddress, formatUnits } from 'viem';
import { getNormalTransactions, getERC20Transfers } from '../../../../lib/services/etherscan-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('address') as Address | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const includePending = searchParams.get('includePending') !== 'false';

    if (!walletAddress || !isAddress(walletAddress)) {
      return NextResponse.json({
        success: true,
        transactions: [],
        pendingTransactions: [],
        count: 0,
        network: {
          chainId: 11155111,
          name: 'Sepolia Testnet',
        },
      });
    }

    // Fetch normal transactions and ERC20 transfers from Etherscan
    const [normalTxs, erc20Transfers] = await Promise.all([
      getNormalTransactions(walletAddress),
      getERC20Transfers(walletAddress),
    ]);

    // Format normal transactions
    const formattedTransactions = normalTxs
      .slice(0, limit)
      .map((tx) => {
        const isSend = tx.from.toLowerCase() === walletAddress.toLowerCase();
        const value = BigInt(tx.value);
        const amountFormatted = formatUnits(value, 18);

        return {
          id: tx.hash,
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          amount: amountFormatted,
          amountFormatted,
          tokenAddress: undefined,
          tokenSymbol: 'ETH',
          functionName: tx.functionName || undefined,
          status: tx.isError === '0' ? 'confirmed' : 'failed',
          blockNumber: parseInt(tx.blockNumber),
          blockHash: tx.blockHash,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          isSponsored: false,
          paymasterAddress: undefined,
          timestamp: new Date(parseInt(tx.timeStamp) * 1000),
          accountType: 'eoa' as const,
          metadata: {
            methodId: tx.methodId,
            input: tx.input,
            confirmations: parseInt(tx.confirmations),
          },
        };
      });

    // Format ERC20 token transfers
    const tokenTransactions = erc20Transfers
      .slice(0, limit)
      .map((tx) => {
        const isSend = tx.from.toLowerCase() === walletAddress.toLowerCase();
        const value = BigInt(tx.value);
        const decimals = parseInt(tx.tokenDecimal) || 18;
        const amountFormatted = formatUnits(value, decimals);

        return {
          id: tx.hash,
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          amount: amountFormatted,
          amountFormatted,
          tokenAddress: tx.contractAddress,
          tokenSymbol: tx.tokenSymbol,
          functionName: undefined,
          status: 'confirmed' as const,
          blockNumber: parseInt(tx.blockNumber),
          blockHash: tx.blockHash,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          isSponsored: false,
          paymasterAddress: undefined,
          timestamp: new Date(parseInt(tx.timeStamp) * 1000),
          accountType: 'eoa' as const,
          metadata: {
            tokenName: tx.tokenName,
            tokenDecimal: decimals,
            confirmations: parseInt(tx.confirmations),
          },
        };
      });

    // Combine and sort by timestamp (newest first)
    const allTransactions = [...formattedTransactions, ...tokenTransactions]
      .sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
        return timeB - timeA;
      })
      .slice(0, limit);

    // Separate pending transactions (those with 0 confirmations)
    const pendingTransactions = allTransactions.filter(
      (tx) => tx.metadata?.confirmations === 0 || tx.status === 'pending'
    );
    const confirmedTransactions = allTransactions.filter(
      (tx) => tx.metadata?.confirmations > 0 && tx.status !== 'pending'
    );

    const networkInfo = {
      chainId: 11155111,
      name: 'Sepolia Testnet',
    };

    return NextResponse.json({
      success: true,
      transactions: includePending ? allTransactions : confirmedTransactions,
      pendingTransactions: includePending ? pendingTransactions : [],
      count: allTransactions.length,
      network: networkInfo,
    });
  } catch (error) {
    console.error('Error fetching Tokenizin wallet transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transactions',
        transactions: [],
        pendingTransactions: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}

