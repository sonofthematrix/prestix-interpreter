/**
 * useTigerWalletData Hook
 * 
 * Hook for fetching Tiger wallet data from API endpoints
 * Replaces direct blockchain queries with API-based data fetching
 */

import { useEffect, useState, useCallback } from 'react';
// ✅ CORRECT: Use AppKit hooks instead of wagmi hooks to avoid WagmiProvider dependency
import { useAppKitAccount } from '@reown/appkit/react';
import { Address } from 'viem';

// Types for Tiger wallet data
export interface TokenizinWalletBalance {
  eth: string;
  usdc: string;
  eurc: string;
  tpt: string;
  totalUSDValue: string;
}

export interface TokenizinWalletToken {
  assetId: string;
  tokenAddress: Address;
  balance: string;
  balanceFormatted: string;
  decimals: number;
  symbol: string;
  title?: string;
  imageUrl?: string;
  propertyId?: string;
  tokenPrice?: string;
  totalTokens?: string;
  availableTokens?: string;
  usdValue?: string;
}

export interface TigerWalletProperty {
  assetId: string;
  tokenAddress: Address;
  balance: string;
  balanceFormatted: string;
  decimals: number;
  symbol: string;
  title?: string;
  imageUrl?: string;
  propertyId?: string;
  tokenPrice?: string;
  totalTokens?: string;
  availableTokens?: string;
  ownershipPercentage?: string;
  usdValue?: string;
  metadata?: {
    location?: string;
    assetType?: string;
    price?: string;
  };
}

export interface TigerWalletTransaction {
  id: string;
  hash: string;
  from: Address;
  to: Address;
  value: string;
  tokenAddress?: Address;
  tokenSymbol?: string;
  functionName?: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  blockHash?: string;
  gasUsed?: string;
  gasPrice?: string;
  isSponsored: boolean;
  paymasterAddress?: Address;
  timestamp: Date | string;
  accountType: 'eoa' | 'smart';
  metadata?: Record<string, any>;
}

export interface UseTigerWalletDataReturn {
  balances: TokenizinWalletBalance | null;
  tokens: TokenizinWalletToken[];
  properties: TigerWalletProperty[];
  transactions: TigerWalletTransaction[];
  pendingTransactions: TigerWalletTransaction[];
  network: {
    chainId: number | null;
    name: string | null;
  } | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Fetch Tiger wallet data from API
 */
async function fetchTigerWalletData(address?: Address) {
  const baseUrl = '/api/tokenizin-wallet';
  const addressParam = address ? `?address=${address}` : '';

  try {
    console.log('🔍 [useTokenizinWalletData] Fetching wallet data sequentially for address:', address);
    
    // Sequential calls to avoid overusing API token/rate limits
    // Order: balances -> tokens -> properties -> transactions
    
    // 1. Fetch balances first (most important)
    console.log('📊 [useTokenizinWalletData] Step 1/4: Fetching balances...');
    const balancesRes = await fetch(`${baseUrl}/balances${addressParam}`, { credentials: 'include' });
    if (!balancesRes.ok) {
      console.error('❌ [useTokenizinWalletData] Balances request failed:', balancesRes.status, balancesRes.statusText);
    }
    const balances = await balancesRes.json().catch((err) => {
      console.error('❌ [useTokenizinWalletData] Failed to parse balances:', err);
      return { success: false, balances: null };
    });
    
    // 2. Fetch tokens
    console.log('🪙 [useTokenizinWalletData] Step 2/4: Fetching tokens...');
    const tokensRes = await fetch(`${baseUrl}/tokens${addressParam}`, { credentials: 'include' });
    if (!tokensRes.ok) {
      console.error('❌ [useTokenizinWalletData] Tokens request failed:', tokensRes.status, tokensRes.statusText);
    }
    const tokens = await tokensRes.json().catch((err) => {
      console.error('❌ [useTokenizinWalletData] Failed to parse tokens:', err);
      return { success: false, tokens: [] };
    });
    
    // 3. Fetch properties
    console.log('🏠 [useTokenizinWalletData] Step 3/4: Fetching properties...');
    const propertiesRes = await fetch(`${baseUrl}/properties${addressParam}`, { credentials: 'include' });
    if (!propertiesRes.ok) {
      console.error('❌ [useTokenizinWalletData] Properties request failed:', propertiesRes.status, propertiesRes.statusText);
    }
    const properties = await propertiesRes.json().catch((err) => {
      console.error('❌ [useTokenizinWalletData] Failed to parse properties:', err);
      return { success: false, properties: [] };
    });
    
    // 4. Fetch transactions last
    console.log('📜 [useTokenizinWalletData] Step 4/4: Fetching transactions...');
    const transactionsRes = await fetch(`${baseUrl}/transactions${addressParam}&limit=50&includePending=true`, { credentials: 'include' });
    if (!transactionsRes.ok) {
      console.error('❌ [useTokenizinWalletData] Transactions request failed:', transactionsRes.status, transactionsRes.statusText);
    }
    const transactions = await transactionsRes.json().catch((err) => {
      console.error('❌ [useTokenizinWalletData] Failed to parse transactions:', err);
      return { success: false, transactions: [], pendingTransactions: [] };
    });
    
    console.log('✅ [useTokenizinWalletData] All wallet data fetched sequentially');

    // Log response status
    console.log('📊 [useTokenizinWalletData] API Responses:', {
      balances: { success: balances.success, status: balancesRes.status, hasBalances: !!balances.balances },
      tokens: { success: tokens.success, status: tokensRes.status, count: tokens.tokens?.length || 0 },
      properties: { success: properties.success, status: propertiesRes.status, count: properties.properties?.length || 0 },
      transactions: { success: transactions.success, status: transactionsRes.status, count: transactions.transactions?.length || 0 },
    });

    return {
      balances: balances.success ? balances.balances : null,
      tokens: tokens.success ? tokens.tokens : [],
      properties: properties.success ? properties.properties : [],
      transactions: transactions.success ? transactions.transactions : [],
      pendingTransactions: transactions.success ? transactions.pendingTransactions || [] : [],
      network: balances.network || transactions.network || null,
    };
  } catch (error) {
    console.error('Error fetching Tokenizin wallet data:', error);
    return {
      balances: null,
      tokens: [],
      properties: [],
      transactions: [],
      pendingTransactions: [],
      network: null,
    };
  }
}

export function useTigerWalletData(address?: Address): UseTigerWalletDataReturn {
  // ✅ CORRECT: Use AppKit hooks instead of wagmi hooks to avoid WagmiProvider dependency
  const appKitAccount = useAppKitAccount();
  const { address: appKitAddress, isConnected } = appKitAccount;
  const [balances, setBalances] = useState<TokenizinWalletBalance | null>(null);
  const [tokens, setTokens] = useState<TokenizinWalletToken[]>([]);
  const [properties, setProperties] = useState<TigerWalletProperty[]>([]);
  const [transactions, setTransactions] = useState<TigerWalletTransaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<TigerWalletTransaction[]>([]);
  const [network, setNetwork] = useState<{ chainId: number | null; name: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const targetAddress = address || appKitAddress;

  const fetchData = useCallback(async () => {
    if (!targetAddress || !isConnected) {
      setBalances(null);
      setTokens([]);
      setProperties([]);
      setTransactions([]);
      setPendingTransactions([]);
      setNetwork(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchTigerWalletData(targetAddress as Address);
      
      setBalances(data.balances);
      setTokens(data.tokens);
      setProperties(data.properties);
      setTransactions(data.transactions);
      setPendingTransactions(data.pendingTransactions);
      setNetwork(data.network);
    } catch (err) {
      console.error('Error fetching Tokenizin wallet data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch wallet data'));
    } finally {
      setIsLoading(false);
    }
  }, [targetAddress, isConnected]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    balances,
    tokens,
    properties,
    transactions,
    pendingTransactions,
    network,
    isLoading,
    error,
    refresh: fetchData,
  };
}
