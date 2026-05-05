/**
 * Tiger Wallet Store
 * 
 * Centralized Zustand store for Tiger Wallet data management
 * Uses backend API routes to fetch wallet data
 * 
 * Benefits:
 * - Single source of truth for wallet data
 * - Shared state across components without prop drilling
 * - Better performance with Zustand selectors
 * - Easier testing and debugging
 * - Follows project patterns (no useEffect anti-patterns)
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useMemo, useCallback } from 'react';
import { Address } from 'viem';
import { getBestTokenIcon } from '@/lib/utils/token-icons';

// Types
export interface TokenizinWalletBalance {
  eth: string;
  usdc: string;
  eurc: string;
  tpt: string;
  totalUSDValue: string;
}

export interface TokenizinWalletToken {
  id: string;
  tokenAddress: Address;
  symbol: string;
  title?: string;
  balance: string;
  balanceFormatted: string;
  decimals: number;
  imageUrl?: string;
  usdValue?: string;
}

export interface TigerWalletProperty {
  id: string;
  tokenAddress: Address;
  symbol: string;
  title?: string;
  balance: string;
  balanceFormatted: string;
  imageUrl?: string;
  usdValue?: string;
  propertyId?: string;
  tokenPrice?: string;
  totalTokens?: string;
  availableTokens?: string;
  ownershipPercentage?: string;
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

interface TigerWalletNetwork {
  chainId: number | null;
  name: string | null;
}

interface TigerWalletState {
  // Data state
  balances: TokenizinWalletBalance | null;
  tokens: TokenizinWalletToken[];
  properties: TigerWalletProperty[];
  transactions: TigerWalletTransaction[];
  pendingTransactions: TigerWalletTransaction[];
  network: TigerWalletNetwork | null;
  
  // Loading states
  loading: {
    balances: boolean;
    tokens: boolean;
    properties: boolean;
    transactions: boolean;
  };
  
  // Fetch guard - prevents concurrent fetchAllData calls
  isFetchingAll: boolean;
  fetchingAddress: Address | null;
  
  // Error handling
  error: string | null;
  
  // Cache management
  lastFetch: {
    balances: number | null;
    tokens: number | null;
    properties: number | null;
    transactions: number | null;
  };
  
  // Current address being tracked
  currentAddress: Address | null;
  
  // Actions
  fetchBalances: (address: Address) => Promise<void>;
  fetchTokens: (address: Address) => Promise<void>;
  fetchProperties: (address: Address) => Promise<void>;
  fetchTransactions: (address: Address, limit?: number, includePending?: boolean) => Promise<void>;
  fetchAllData: (address: Address) => Promise<void>;
  
  // Utility actions
  clearError: () => void;
  reset: () => void;
  setCurrentAddress: (address: Address | null) => void;
  watchAddress: (address: Address | null | undefined) => void;
}

const initialState = {
  balances: null,
  tokens: [],
  properties: [],
  transactions: [],
  pendingTransactions: [],
  network: null,
  loading: {
    balances: false,
    tokens: false,
    properties: false,
    transactions: false,
  },
  isFetchingAll: false,
  fetchingAddress: null,
  error: null,
  lastFetch: {
    balances: null,
    tokens: null,
    properties: null,
    transactions: null,
  },
  currentAddress: null,
};

export const useTigerWalletStore = create<TigerWalletState>()(
  immer((set, get) => ({
    ...initialState,
    
    // Fetch balances from API
    fetchBalances: async (address: Address) => {
      set((state) => {
        state.loading.balances = true;
        state.error = null;
      });
      
      try {
        const response = await fetch(`/api/tokenizin-wallet/balances?address=${address}`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch balances: ${response.status}`);
        }
        
        const text = await response.text();
        if (!text || text.trim().length === 0) {
          set((state) => {
            state.balances = null;
            state.loading.balances = false;
            state.lastFetch.balances = Date.now();
          });
          return;
        }
        
        const data = JSON.parse(text);
        
        // Extract tokens from accounts[0].balances array
        const extractedTokens: TokenizinWalletToken[] = [];
        if (data.accounts && Array.isArray(data.accounts) && data.accounts.length > 0) {
          const accountBalances = data.accounts[0].balances || [];
          extractedTokens.push(...accountBalances
            .filter((balance: any) => balance.token && balance.token.type !== 'native')
            .map((balance: any, index: number) => ({
              id: `token-${balance.token.address}-${index}`,
              tokenAddress: balance.token.address as Address,
              symbol: balance.token.symbol || 'UNKNOWN',
              title: balance.token.name || balance.token.symbol || 'Unknown Token',
              balance: balance.balance || '0',
              balanceFormatted: balance.balanceFormatted || '0',
              decimals: balance.token.decimals || 18,
              imageUrl: getBestTokenIcon(balance.token.symbol || 'UNKNOWN', balance.token.logoURI),
              usdValue: balance.usdValue?.toString() || '0',
            }))
          );
          
          // Add ETH as a token if it exists
          const ethBalance = accountBalances.find((b: any) => 
            b.token && (b.token.type === 'native' || b.token.address === '0x0000000000000000000000000000000000000000')
          );
          if (ethBalance) {
            extractedTokens.unshift({
              id: 'token-eth-native',
              tokenAddress: '0x0000000000000000000000000000000000000000' as Address,
              symbol: 'ETH',
              title: 'Ethereum',
              balance: ethBalance.balance || '0',
              balanceFormatted: ethBalance.balanceFormatted || '0',
              decimals: 18,
              imageUrl: getBestTokenIcon('ETH'),
              usdValue: ethBalance.usdValue?.toString() || '0',
            });
          }
        }
        
        set((state) => {
          state.balances = data.balances || null;
          state.network = data.network || null;
          state.tokens = extractedTokens;
          state.loading.balances = false;
          state.lastFetch.balances = Date.now();
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to fetch balances';
          state.loading.balances = false;
        });
      }
    },
    
    // Fetch tokens from API
    fetchTokens: async (address: Address) => {
      set((state) => {
        state.loading.tokens = true;
        state.error = null;
      });
      
      try {
        const response = await fetch(`/api/tokenizin-wallet/tokens?address=${address}`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tokens: ${response.status}`);
        }
        
        const text = await response.text();
        if (!text || text.trim().length === 0) {
          set((state) => {
            state.tokens = [];
            state.loading.tokens = false;
            state.lastFetch.tokens = Date.now();
          });
          return;
        }
        
        const data = JSON.parse(text);
        set((state) => {
          state.tokens = data.tokens || [];
          state.loading.tokens = false;
          state.lastFetch.tokens = Date.now();
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to fetch tokens';
          state.loading.tokens = false;
        });
      }
    },
    
    // Fetch properties from API
    fetchProperties: async (address: Address) => {
      set((state) => {
        state.loading.properties = true;
        state.error = null;
      });
      
      try {
        const response = await fetch(`/api/tokenizin-wallet/properties?address=${address}`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch properties: ${response.status}`);
        }
        
        const text = await response.text();
        if (!text || text.trim().length === 0) {
          set((state) => {
            state.properties = [];
            state.loading.properties = false;
            state.lastFetch.properties = Date.now();
          });
          return;
        }
        
        const data = JSON.parse(text);
        set((state) => {
          state.properties = data.properties || [];
          state.loading.properties = false;
          state.lastFetch.properties = Date.now();
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to fetch properties';
          state.loading.properties = false;
        });
      }
    },
    
    // Fetch transactions from API
    fetchTransactions: async (address: Address, limit = 50, includePending = true) => {
      set((state) => {
        state.loading.transactions = true;
        state.error = null;
      });
      
      try {
        const response = await fetch(
          `/api/tokenizin-wallet/transactions?address=${address}&limit=${limit}&includePending=${includePending}`,
          {
            credentials: 'include',
          }
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch transactions: ${response.status}`);
        }
        
        const text = await response.text();
        if (!text || text.trim().length === 0) {
          set((state) => {
            state.transactions = [];
            state.pendingTransactions = [];
            state.loading.transactions = false;
            state.lastFetch.transactions = Date.now();
          });
          return;
        }
        
        const data = JSON.parse(text);
        set((state) => {
          state.transactions = data.transactions || [];
          state.pendingTransactions = data.pendingTransactions || [];
          state.loading.transactions = false;
          state.lastFetch.transactions = Date.now();
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to fetch transactions';
          state.loading.transactions = false;
        });
      }
    },
    
    // Fetch all wallet data sequentially
    fetchAllData: async (address: Address) => {
      const state = get();
      
      if (state.isFetchingAll) {
        if (state.fetchingAddress === address) {
          console.log('⏸️  [Tokenizin Wallet Store] Fetch already in progress for:', address);
          return;
        } else {
          console.log('⏸️  [Tokenizin Wallet Store] Fetch in progress for different address:', state.fetchingAddress, '- skipping:', address);
          return;
        }
      }
      
      set((state) => {
        state.isFetchingAll = true;
        state.fetchingAddress = address;
        state.currentAddress = address;
      });
      
      console.log('🔄 [Tokenizin Wallet Store] Fetching wallet data sequentially for:', address);
      
      try {
        await get().fetchBalances(address);
        await get().fetchTokens(address);
        await get().fetchProperties(address);
        await get().fetchTransactions(address);
        
        console.log('✅ [Tokenizin Wallet Store] All wallet data fetched sequentially');
      } catch (error) {
        console.error('❌ [Tokenizin Wallet Store] Error during sequential fetch:', error);
        throw error;
      } finally {
        set((state) => {
          state.isFetchingAll = false;
          state.fetchingAddress = null;
        });
      }
    },
    
    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },
    
    setCurrentAddress: (address: Address | null) => {
      const state = get();
      if (state.currentAddress === address) {
        return;
      }
      
      set((state) => {
        state.currentAddress = address;
      });
      
      if (address) {
        get().fetchAllData(address);
      }
    },
    
    watchAddress: (address: Address | null | undefined) => {
      if (!address) {
        get().setCurrentAddress(null);
        return;
      }
      get().setCurrentAddress(address);
    },
    
    reset: () => {
      set((state) => {
        Object.assign(state, initialState);
      });
    },
  }))
);

/** Alias for consumers that expect useTokenizinWalletStore (e.g. when package is built from root app). */
export const useTokenizinWalletStore = useTigerWalletStore;

// Convenience selectors
export const useTokenizinWalletBalances = () => useTigerWalletStore((state) => ({
  balances: state.balances,
  isLoading: state.loading.balances,
  error: state.error,
  fetchBalances: state.fetchBalances,
}));

export const useTokenizinWalletTokens = () => useTigerWalletStore((state) => ({
  tokens: state.tokens,
  isLoading: state.loading.tokens,
  error: state.error,
  fetchTokens: state.fetchTokens,
}));

export const useTigerWalletProperties = () => useTigerWalletStore((state) => ({
  properties: state.properties,
  isLoading: state.loading.properties,
  error: state.error,
  fetchProperties: state.fetchProperties,
}));

export const useTigerWalletTransactions = () => useTigerWalletStore((state) => ({
  transactions: state.transactions,
  pendingTransactions: state.pendingTransactions,
  isLoading: state.loading.transactions,
  error: state.error,
  fetchTransactions: state.fetchTransactions,
}));

export const useTigerWalletNetwork = () => useTigerWalletStore((state) => state.network);

// Combined selector for all wallet data
export const useTigerWalletData = () => {
  const balances = useTigerWalletStore((state) => state.balances);
  const tokens = useTigerWalletStore((state) => state.tokens);
  const properties = useTigerWalletStore((state) => state.properties);
  const transactions = useTigerWalletStore((state) => state.transactions);
  const pendingTransactions = useTigerWalletStore((state) => state.pendingTransactions);
  const network = useTigerWalletStore((state) => state.network);
  const loadingBalances = useTigerWalletStore((state) => state.loading.balances);
  const loadingTokens = useTigerWalletStore((state) => state.loading.tokens);
  const loadingProperties = useTigerWalletStore((state) => state.loading.properties);
  const loadingTransactions = useTigerWalletStore((state) => state.loading.transactions);
  const error = useTigerWalletStore((state) => state.error);
  const fetchAllData = useTigerWalletStore((state) => state.fetchAllData);
  const isFetchingAll = useTigerWalletStore((state) => state.isFetchingAll);
  const fetchingAddress = useTigerWalletStore((state) => state.fetchingAddress);
  const lastFetchBalances = useTigerWalletStore((state) => state.lastFetch.balances);
  
  const isLoading = loadingBalances || loadingTokens || loadingProperties || loadingTransactions;
  
  const refresh = useCallback(async (address: Address): Promise<void> => {
    if (isFetchingAll && fetchingAddress === address) {
      console.log('⏸️  [useTokenizinWalletData] Skipping refresh - already fetching for:', address);
      return;
    }
    
    const now = Date.now();
    if (lastFetchBalances && (now - lastFetchBalances) < 5000) {
      console.log('⏸️  [useTokenizinWalletData] Skipping refresh - data fetched recently:', now - lastFetchBalances, 'ms ago');
      return;
    }
    
    await fetchAllData(address);
  }, [fetchAllData, isFetchingAll, fetchingAddress, lastFetchBalances]);
  
  return useMemo(() => ({
    balances,
    tokens,
    properties,
    transactions,
    pendingTransactions,
    network,
    isLoading,
    error: error ? new Error(error) : null,
    refresh,
  }), [balances, tokens, properties, transactions, pendingTransactions, network, isLoading, error, refresh]);
};

