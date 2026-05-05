/**
 * useTransactionHistory Hook
 * 
 * Hook for tracking and displaying transaction history
 * Supports both EOA transactions and Smart Account user operations
 */

import { useEffect, useState, useCallback } from 'react';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';
import { Address } from 'viem';
import type { Transaction, TransactionStatus, AccountType } from '../types';

interface TransactionHistoryOptions {
  limit?: number;
  includePending?: boolean;
  accountType?: AccountType;
}

export function useTransactionHistory(options: TransactionHistoryOptions = {}) {
  const { address, isConnected } = useAccount();
  const appKitAccount = useAppKitAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    limit = 50,
    includePending = true,
    accountType = 'eoa',
  } = options;

  // Detect account type from embeddedWalletInfo
  const detectedAccountType: AccountType = useCallback(() => {
    const embeddedInfo = appKitAccount.embeddedWalletInfo as any;
    
    // Check if Smart Account is deployed
    if (embeddedInfo?.isSmartAccountDeployed || embeddedInfo?.accountType === 'smartAccount') {
      return 'smart';
    }
    
    // Check preferred account type
    if (embeddedInfo?.user?.preferredAccountType === 'smartAccount') {
      return 'smart';
    }
    
    // Check accounts array for Smart Account
    const hasSmartAccount = embeddedInfo?.user?.accounts?.some(
      (acc: any) => acc.type === 'smartAccount'
    );
    if (hasSmartAccount) {
      return 'smart';
    }
    
    // Fallback to EOA
    return 'eoa';
  }, [appKitAccount.embeddedWalletInfo])();

  // Fetch transactions from API
  const fetchTransactions = useCallback(async () => {
    if (!address || !isConnected) {
      setTransactions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch from backend API
      const response = await fetch(`/api/tokenizin-wallet/transactions?address=${address}&limit=${limit}`, {
        credentials: 'include',
      });

      // Handle 404 gracefully - API endpoint might not exist yet
      if (response.status === 404) {
        console.warn('Transaction API endpoint not found (404), returning empty transactions');
        setTransactions([]);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = 'Failed to fetch transactions';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        // Don't throw - just log and return empty array
        console.warn('Transaction API error:', errorMessage);
        setTransactions([]);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      
      // Transform API data to Transaction format
      const formattedTransactions: Transaction[] = (data.transactions || []).map((tx: any) => ({
        id: tx.id || tx.hash,
        hash: tx.hash,
        userOperationHash: tx.userOperationHash,
        from: tx.from as Address,
        to: tx.to as Address,
        value: tx.value || '0',
        tokenAddress: tx.tokenAddress as Address | undefined,
        tokenSymbol: tx.tokenSymbol,
        functionName: tx.functionName,
        status: (tx.status || 'pending') as TransactionStatus,
        blockNumber: tx.blockNumber,
        blockHash: tx.blockHash,
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice,
        isSponsored: tx.isSponsored || false,
        paymasterAddress: tx.paymasterAddress as Address | undefined,
        timestamp: new Date(tx.timestamp || tx.createdAt),
        accountType: tx.accountType || detectedAccountType,
        metadata: tx.metadata,
      }));

      // Filter pending transactions if needed
      const filteredTransactions = includePending
        ? formattedTransactions
        : formattedTransactions.filter((tx) => tx.status !== 'pending');

      setTransactions(filteredTransactions.slice(0, limit));
    } catch (err) {
      console.error('Failed to fetch transaction history:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch transactions'));
      
      // Fallback: Try to fetch from local storage or IndexedDB
      try {
        const stored = localStorage.getItem(`transactions_${address}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setTransactions(parsed.slice(0, limit));
        }
      } catch (storageError) {
        console.warn('Failed to load transactions from storage:', storageError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, limit, includePending, detectedAccountType]);

  // Monitor pending transactions
  const { data: receipt } = useWaitForTransactionReceipt({
    hash: transactions.find((tx) => tx.status === 'pending')?.hash as `0x${string}` | undefined,
    query: {
      enabled: transactions.some((tx) => tx.status === 'pending'),
    },
  });

  // Update transaction status when receipt is received
  useEffect(() => {
    if (receipt) {
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.hash === receipt.transactionHash
            ? {
                ...tx,
                status: receipt.status === 'success' ? 'confirmed' : 'failed',
                blockNumber: Number(receipt.blockNumber),
                blockHash: receipt.blockHash,
                gasUsed: receipt.gasUsed.toString(),
                timestamp: new Date(),
              }
            : tx
        )
      );
    }
  }, [receipt]);

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Refresh transactions
  const refresh = useCallback(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Add new transaction
  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions((prev) => [transaction, ...prev].slice(0, limit));
    
    // Store in local storage as backup
    try {
      const stored = localStorage.getItem(`transactions_${address}`) || '[]';
      const parsed = JSON.parse(stored);
      const updated = [transaction, ...parsed].slice(0, limit);
      localStorage.setItem(`transactions_${address}`, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to store transaction in localStorage:', error);
    }
  }, [address, limit]);

  // Update transaction status
  const updateTransactionStatus = useCallback((
    hash: string,
    status: TransactionStatus,
    updates?: Partial<Transaction>
  ) => {
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.hash === hash
          ? { ...tx, status, ...updates, timestamp: new Date() }
          : tx
      )
    );
  }, []);

  // Get transaction by hash
  const getTransaction = useCallback((hash: string) => {
    return transactions.find((tx) => tx.hash === hash);
  }, [transactions]);

  // Get pending transactions
  const pendingTransactions = transactions.filter((tx) => tx.status === 'pending');

  // Get transactions by account
  const getTransactionsByAccount = useCallback((accountAddress: Address) => {
    return transactions.filter((tx) => tx.from.toLowerCase() === accountAddress.toLowerCase());
  }, [transactions]);

  return {
    transactions,
    pendingTransactions,
    isLoading,
    error,
    refresh,
    addTransaction,
    updateTransactionStatus,
    getTransaction,
    getTransactionsByAccount,
    accountType: detectedAccountType,
  };
}

