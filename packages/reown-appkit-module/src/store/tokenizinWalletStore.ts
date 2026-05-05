/**
 * Tiger Wallet Store
 * 
 * Centralized Zustand store for Tiger Wallet data management
 * Replaces useTigerWalletData hook with store-based state management
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

// Types (matching useTigerWalletData interfaces)
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

export interface ContractProgress {
  contractAddress: string;
  contractName: string;
  status: 'pending' | 'fetching' | 'completed' | 'error';
  itemsFound: number;
  itemsStored: number;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface OperationProgress {
  operation: 'balances' | 'tokens' | 'properties' | 'transactions';
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  contracts: ContractProgress[];
  totalContracts: number;
  completedContracts: number;
  totalItems: number;
  storedItems: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface FetchProgress {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  operations: OperationProgress[];
  overallProgress: number; // 0-100
  startedAt?: number;
  completedAt?: number;
}

interface TokenizinWalletState {
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
  
  // Progress tracking
  progress: FetchProgress;
  
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
  
  // Progress tracking actions
  updateProgress: (updates: Partial<FetchProgress>) => void;
  updateOperationProgress: (operation: OperationProgress['operation'], updates: Partial<OperationProgress>) => void;
  updateContractProgress: (operation: OperationProgress['operation'], contractAddress: string, updates: Partial<ContractProgress>) => void;
  resetProgress: () => void;
  
  // Utility actions
  clearError: () => void;
  reset: () => void;
  setCurrentAddress: (address: Address | null) => void;
  watchAddress: (address: Address | null | undefined) => void;
}

const initialProgress: FetchProgress = {
  isActive: false,
  currentStep: 0,
  totalSteps: 4,
  operations: [
    {
      operation: 'balances',
      status: 'pending',
      contracts: [],
      totalContracts: 0,
      completedContracts: 0,
      totalItems: 0,
      storedItems: 0,
    },
    {
      operation: 'tokens',
      status: 'pending',
      contracts: [],
      totalContracts: 0,
      completedContracts: 0,
      totalItems: 0,
      storedItems: 0,
    },
    {
      operation: 'properties',
      status: 'pending',
      contracts: [],
      totalContracts: 0,
      completedContracts: 0,
      totalItems: 0,
      storedItems: 0,
    },
    {
      operation: 'transactions',
      status: 'pending',
      contracts: [],
      totalContracts: 0,
      completedContracts: 0,
      totalItems: 0,
      storedItems: 0,
    },
  ],
  overallProgress: 0,
};

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
  progress: initialProgress,
  error: null,
  lastFetch: {
    balances: null,
    tokens: null,
    properties: null,
    transactions: null,
  },
  currentAddress: null,
};

export const useTokenizinWalletStore = create<TokenizinWalletState>()(
  immer((set, get) => ({
    ...initialState,
    
    // Fetch balances from API
    fetchBalances: async (address: Address) => {
      set((state) => {
        state.loading.balances = true;
        state.error = null;
      });
      
      // Initialize operation progress
      get().updateOperationProgress('balances', {
        status: 'in-progress',
        startedAt: Date.now(),
        contracts: [
          { contractAddress: '0x0000000000000000000000000000000000000000', contractName: 'ETH (Native)', status: 'pending', itemsFound: 0, itemsStored: 0 },
          { contractAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', contractName: 'USDC', status: 'pending', itemsFound: 0, itemsStored: 0 },
          { contractAddress: '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4', contractName: 'EURC', status: 'pending', itemsFound: 0, itemsStored: 0 },
          { contractAddress: '0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e', contractName: 'TKNZN', status: 'pending', itemsFound: 0, itemsStored: 0 },
        ],
        totalContracts: 4,
      });
      
      try {
        let response: Response;
        try {
          response = await fetch(`/api/tokenizin-wallet/balances?address=${address}`, {
            credentials: 'include',
          });
        } catch (networkError: any) {
          // Network error (connection failed, CORS, etc.)
          const errorMessage = networkError?.message || 'Network error';
          console.error('❌ [Tokenizin Wallet Store] Network error fetching balances:', errorMessage);
          
          // Mark all contracts as error
          ['0x0000000000000000000000000000000000000000', '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4', '0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e'].forEach(contractAddr => {
            get().updateContractProgress('balances', contractAddr, {
              status: 'error',
              error: errorMessage,
              completedAt: Date.now(),
            });
          });
          
          set((state) => {
            state.error = `Network error: ${errorMessage}. Please check your connection and try again.`;
            state.loading.balances = false;
          });
          get().updateOperationProgress('balances', {
            status: 'error',
            completedAt: Date.now(),
            error: `Network error: ${errorMessage}`,
          });
          return;
        }
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch balances: ${response.status} ${response.statusText} - ${errorText.slice(0, 100)}`);
        }
        
        const text = await response.text();
        if (!text || text.trim().length === 0) {
          set((state) => {
            state.balances = null;
            state.loading.balances = false;
            state.lastFetch.balances = Date.now();
          });
          get().updateOperationProgress('balances', {
            status: 'completed',
            completedAt: Date.now(),
          });
          return;
        }
        
        const data = JSON.parse(text);
        
        // Extract tokens from accounts[0].balances array
        // Transform API response format to TokenizinWalletToken format
        const extractedTokens: TokenizinWalletToken[] = [];
        if (data.accounts && Array.isArray(data.accounts) && data.accounts.length > 0) {
          const accountBalances = data.accounts[0].balances || [];
          extractedTokens.push(...accountBalances
            .filter((balance: any) => {
              // Include all non-native tokens (USDC, EURC, TKNZN, etc.)
              // Only exclude native ETH token
              if (!balance.token || balance.token.type === 'native') {
                return false;
              }
              // Include tokens with positive balances (parse balance to check)
              const balanceValue = BigInt(balance.balance || '0');
              return balanceValue > 0n;
            })
            .map((balance: any, index: number) => ({
              id: `token-${balance.token.address}-${index}`,
              tokenAddress: balance.token.address as Address,
              symbol: balance.token.symbol || 'UNKNOWN',
              title: balance.token.name || balance.token.symbol || 'Unknown Token',
              balance: balance.balance || '0',
              balanceFormatted: balance.balanceFormatted || '0',
              decimals: balance.token.decimals || 18,
              imageUrl: undefined, // Can be added later if available
              usdValue: balance.usdValue?.toString() || '0',
            }))
          );
          
          // Also add ETH as a token if it exists (for display purposes)
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
              imageUrl: undefined,
              usdValue: ethBalance.usdValue?.toString() || '0',
            });
          }
        }
        
        set((state) => {
          // Normalize balances: API returns tknzn, store/UI expect tpt
          const raw = data.balances || null;
          state.balances = raw
            ? {
                eth: raw.eth ?? '0',
                usdc: raw.usdc ?? '0',
                eurc: raw.eurc ?? '0',
                tpt: raw.tknzn ?? raw.tpt ?? '0',
                totalUSDValue: raw.totalUSDValue ?? '0',
              }
            : null;
          state.network = data.network || null;
          // Populate tokens array from balances response
          state.tokens = extractedTokens;
          state.loading.balances = false;
          state.lastFetch.balances = Date.now();
        });
        
        // Update progress for each contract based on extracted tokens
        extractedTokens.forEach(token => {
          const contractAddress = token.tokenAddress.toLowerCase();
          get().updateContractProgress('balances', contractAddress, {
            status: 'completed',
            itemsFound: 1,
            itemsStored: 1,
            completedAt: Date.now(),
          });
        });
        
        // Mark operation as completed
        get().updateOperationProgress('balances', {
          status: 'completed',
          completedAt: Date.now(),
          totalItems: extractedTokens.length,
          storedItems: extractedTokens.length,
        });
        
        console.log('🪙 [Tokenizin Wallet Store] Extracted tokens from balances:', extractedTokens.length);
        extractedTokens.forEach(token => {
          console.log(`   - ${token.symbol}: ${token.balanceFormatted} (USD: $${token.usdValue})`);
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch balances';
        console.error('❌ [Tokenizin Wallet Store] Error fetching balances:', errorMessage);
        
        // Mark all contracts as error if not already marked
        ['0x0000000000000000000000000000000000000000', '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4', '0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e'].forEach(contractAddr => {
          const contract = get().progress.operations.find(op => op.operation === 'balances')?.contracts.find(c => c.contractAddress.toLowerCase() === contractAddr.toLowerCase());
          if (!contract || contract.status !== 'error') {
            get().updateContractProgress('balances', contractAddr, {
              status: 'error',
              error: errorMessage,
              completedAt: Date.now(),
            });
          }
        });
        
        set((state) => {
          state.error = errorMessage;
          state.loading.balances = false;
        });
        get().updateOperationProgress('balances', {
          status: 'error',
          completedAt: Date.now(),
          error: errorMessage,
        });
      }
    },
    
    // Fetch tokens from API
    // NOTE: Tokens are already extracted from fetchBalances, so this merges additional tokens
    // from the tokens API endpoint without overwriting existing tokens
    fetchTokens: async (address: Address) => {
      set((state) => {
        state.loading.tokens = true;
        state.error = null;
      });
      
      // Initialize operation progress
      get().updateOperationProgress('tokens', {
        status: 'in-progress',
        startedAt: Date.now(),
        contracts: [],
        totalContracts: 0,
      });
      
      try {
        let response: Response;
        try {
          response = await fetch(`/api/tokenizin-wallet/tokens?address=${address}`, {
            credentials: 'include',
          });
        } catch (networkError: any) {
          // Network error
          const errorMessage = networkError?.message || 'Network error';
          console.error('❌ [Tokenizin Wallet Store] Network error fetching tokens:', errorMessage);
          set((state) => {
            state.error = `Network error: ${errorMessage}`;
            state.loading.tokens = false;
          });
          get().updateOperationProgress('tokens', {
            status: 'error',
            completedAt: Date.now(),
            error: `Network error: ${errorMessage}`,
          });
          return;
        }
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch tokens: ${response.status} ${response.statusText} - ${errorText.slice(0, 100)}`);
        }
        
        const text = await response.text();
        if (!text || text.trim().length === 0) {
          set((state) => {
            // Don't overwrite existing tokens from balances API
            // state.tokens = [];
            state.loading.tokens = false;
            state.lastFetch.tokens = Date.now();
          });
          return;
        }
        
        const data = JSON.parse(text);
        const apiTokens = data.tokens || [];
          
        set((state) => {
          // Merge tokens from API with existing tokens from balances
          // Use a Map to deduplicate by tokenAddress, prioritizing existing tokens
          const tokenMap = new Map<string, TokenizinWalletToken>();
          
          // First, add existing tokens (from balances API - these have USD values)
          state.tokens.forEach(token => {
            tokenMap.set(token.tokenAddress.toLowerCase(), token);
          });
          
          // Then, add/update with tokens from tokens API (only if not already present)
          apiTokens.forEach((apiToken: any) => {
            const tokenAddress = apiToken.tokenAddress?.toLowerCase();
            if (tokenAddress && !tokenMap.has(tokenAddress)) {
              // Only add if not already present (balances API tokens take priority)
              tokenMap.set(tokenAddress, {
                id: apiToken.assetId || `token-${tokenAddress}`,
                tokenAddress: apiToken.tokenAddress as Address,
                symbol: apiToken.symbol || 'UNKNOWN',
                title: apiToken.title || apiToken.symbol || 'Unknown Token',
                balance: apiToken.balance || '0',
                balanceFormatted: apiToken.balanceFormatted || '0',
                decimals: apiToken.decimals || 18,
                imageUrl: apiToken.imageUrl,
                usdValue: apiToken.usdValue?.toString() || '0',
              });
            }
          });
          
          // Convert map back to array
          const mergedTokens = Array.from(tokenMap.values());
          state.tokens = mergedTokens;
          state.loading.tokens = false;
          state.lastFetch.tokens = Date.now();
          
          console.log('🪙 [Tokenizin Wallet Store] Merged tokens (after tokens API):', mergedTokens.length);
          mergedTokens.forEach(token => {
            console.log(`   - ${token.symbol}: ${token.balanceFormatted} (USD: $${token.usdValue})`);
          });
        });
        
        // Mark operation as completed
        const currentState = get();
        get().updateOperationProgress('tokens', {
          status: 'completed',
          completedAt: Date.now(),
          totalItems: currentState.tokens.length,
          storedItems: currentState.tokens.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tokens';
        console.error('❌ [Tokenizin Wallet Store] Error fetching tokens:', errorMessage);
        set((state) => {
          state.error = errorMessage;
          state.loading.tokens = false;
        });
        get().updateOperationProgress('tokens', {
          status: 'error',
          completedAt: Date.now(),
          error: errorMessage,
        });
      }
    },
    
    // Fetch properties from API
    fetchProperties: async (address: Address) => {
      set((state) => {
        state.loading.properties = true;
        state.error = null;
      });
      
      // Initialize operation progress
      get().updateOperationProgress('properties', {
        status: 'in-progress',
        startedAt: Date.now(),
        contracts: [],
        totalContracts: 0,
      });
      
      try {
        let response: Response;
        try {
          response = await fetch(`/api/tokenizin-wallet/properties?address=${address}`, {
            credentials: 'include',
          });
        } catch (networkError: any) {
          // Network error
          const errorMessage = networkError?.message || 'Network error';
          console.error('❌ [Tokenizin Wallet Store] Network error fetching properties:', errorMessage);
          set((state) => {
            state.error = `Network error: ${errorMessage}`;
            state.loading.properties = false;
          });
          get().updateOperationProgress('properties', {
            status: 'error',
            completedAt: Date.now(),
            error: `Network error: ${errorMessage}`,
          });
          return;
        }
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch properties: ${response.status} ${response.statusText} - ${errorText.slice(0, 100)}`);
        }
        
        const text = await response.text();
        if (!text || text.trim().length === 0) {
          set((state) => {
            state.properties = [];
            state.loading.properties = false;
            state.lastFetch.properties = Date.now();
          });
          get().updateOperationProgress('properties', {
            status: 'completed',
            completedAt: Date.now(),
          });
          return;
        }
        
        const data = JSON.parse(text);
        const properties = data.properties || [];
        
        // Group properties by contract address to track progress
        const contractMap = new Map<string, number>();
        properties.forEach((prop: any) => {
          const contractAddr = prop.tokenAddress?.toLowerCase() || 'unknown';
          contractMap.set(contractAddr, (contractMap.get(contractAddr) || 0) + 1);
        });
        
        // Update progress for each contract
        contractMap.forEach((count, contractAddr) => {
          get().updateContractProgress('properties', contractAddr, {
            status: 'completed',
            contractName: contractAddr.slice(0, 6) + '...' + contractAddr.slice(-4),
            itemsFound: count,
            itemsStored: count,
            completedAt: Date.now(),
          });
        });
        
        set((state) => {
          state.properties = properties;
          state.loading.properties = false;
          state.lastFetch.properties = Date.now();
        });
        
        // Mark operation as completed
        get().updateOperationProgress('properties', {
          status: 'completed',
          completedAt: Date.now(),
          totalContracts: contractMap.size,
          completedContracts: contractMap.size,
          totalItems: properties.length,
          storedItems: properties.length,
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to fetch properties';
          state.loading.properties = false;
        });
        get().updateOperationProgress('properties', {
          status: 'error',
          completedAt: Date.now(),
          error: error instanceof Error ? error.message : 'Failed to fetch properties',
        });
      }
    },
    
    // Fetch transactions from API
    fetchTransactions: async (address: Address, limit = 50, includePending = true) => {
      set((state) => {
        state.loading.transactions = true;
        state.error = null;
      });
      
      // Initialize operation progress
      get().updateOperationProgress('transactions', {
        status: 'in-progress',
        startedAt: Date.now(),
        contracts: [
          { contractAddress: 'native', contractName: 'ETH Transactions', status: 'pending', itemsFound: 0, itemsStored: 0 },
          { contractAddress: 'erc20', contractName: 'ERC20 Transfers', status: 'pending', itemsFound: 0, itemsStored: 0 },
        ],
        totalContracts: 2,
      });
      
      try {
        let response: Response;
        try {
          response = await fetch(
            `/api/tokenizin-wallet/transactions?address=${address}&limit=${limit}&includePending=${includePending}`,
            {
              credentials: 'include',
            }
          );
        } catch (networkError: any) {
          // Network error
          const errorMessage = networkError?.message || 'Network error';
          console.error('❌ [Tokenizin Wallet Store] Network error fetching transactions:', errorMessage);
          
          // Mark contracts as error
          ['native', 'erc20'].forEach(contractAddr => {
            get().updateContractProgress('transactions', contractAddr, {
              status: 'error',
              error: errorMessage,
              completedAt: Date.now(),
            });
          });
          
          set((state) => {
            state.error = `Network error: ${errorMessage}`;
            state.loading.transactions = false;
          });
          get().updateOperationProgress('transactions', {
            status: 'error',
            completedAt: Date.now(),
            error: `Network error: ${errorMessage}`,
          });
          return;
        }
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch transactions: ${response.status} ${response.statusText} - ${errorText.slice(0, 100)}`);
        }
        
        const text = await response.text();
        if (!text || text.trim().length === 0) {
          set((state) => {
            state.transactions = [];
            state.pendingTransactions = [];
            state.loading.transactions = false;
            state.lastFetch.transactions = Date.now();
          });
          get().updateOperationProgress('transactions', {
            status: 'completed',
            completedAt: Date.now(),
          });
          return;
        }
        
        const data = JSON.parse(text);
        const transactions = data.transactions || [];
        const pendingTransactions = data.pendingTransactions || [];
        const allTransactions = [...transactions, ...pendingTransactions];
        
        // Count ETH vs ERC20 transactions
        const ethTxCount = transactions.filter((tx: any) => !tx.tokenAddress).length;
        const erc20TxCount = transactions.filter((tx: any) => tx.tokenAddress).length;
        
        // Update progress for native ETH transactions
        if (ethTxCount > 0) {
          get().updateContractProgress('transactions', 'native', {
            status: 'completed',
            itemsFound: ethTxCount,
            itemsStored: ethTxCount,
            completedAt: Date.now(),
          });
        }
        
        // Update progress for ERC20 transfers
        if (erc20TxCount > 0) {
          get().updateContractProgress('transactions', 'erc20', {
            status: 'completed',
            itemsFound: erc20TxCount,
            itemsStored: erc20TxCount,
            completedAt: Date.now(),
          });
        }
        
        set((state) => {
          state.transactions = transactions;
          state.pendingTransactions = pendingTransactions;
          state.loading.transactions = false;
          state.lastFetch.transactions = Date.now();
        });
        
        // Mark operation as completed
        get().updateOperationProgress('transactions', {
          status: 'completed',
          completedAt: Date.now(),
          completedContracts: (ethTxCount > 0 ? 1 : 0) + (erc20TxCount > 0 ? 1 : 0),
          totalItems: allTransactions.length,
          storedItems: allTransactions.length,
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to fetch transactions';
          state.loading.transactions = false;
        });
        get().updateOperationProgress('transactions', {
          status: 'error',
          completedAt: Date.now(),
          error: error instanceof Error ? error.message : 'Failed to fetch transactions',
        });
      }
    },
    
    // Fetch all wallet data sequentially (one at a time) to avoid API rate limits
    // Order: balances -> tokens -> properties -> transactions
    fetchAllData: async (address: Address) => {
      const normalizedAddress = address.toLowerCase() as Address;

      // CRITICAL: Check flag immediately (synchronously) before any async operations
      // This prevents race conditions where multiple calls get through before loading states are set
      const currentState = get();
      if (currentState.isFetchingAll) {
        if (currentState.fetchingAddress === normalizedAddress) {
          console.log('⏸️  [Tokenizin Wallet Store] Fetch already in progress for:', normalizedAddress);
          return;
        } else {
          console.log('⏸️  [Tokenizin Wallet Store] Fetch in progress for different address:', currentState.fetchingAddress, '- skipping:', normalizedAddress);
          return;
        }
      }

      // Set flag immediately (synchronously) to prevent concurrent calls
      set((state) => {
        state.isFetchingAll = true;
        state.fetchingAddress = normalizedAddress;
        state.currentAddress = normalizedAddress;
        // Initialize progress tracking
        state.progress = {
          ...initialProgress,
          isActive: true,
          startedAt: Date.now(),
          currentStep: 0,
        };
        // Clear any previous errors
        state.error = null;
      });

      // Sequential calls to avoid overusing API token/rate limits
      // Each call waits for the previous one to complete
      console.log('🔄 [Tokenizin Wallet Store] Fetching wallet data sequentially for:', normalizedAddress);

      try {
        // 1. Fetch balances first (most important)
        console.log('📊 [Tokenizin Wallet Store] Step 1/4: Fetching balances...');
        get().updateProgress({ currentStep: 1 });
        await get().fetchBalances(normalizedAddress);

        // Check if we should continue (address might have changed)
        if (get().currentAddress !== normalizedAddress) {
          console.log('⏸️  [Tokenizin Wallet Store] Address changed during fetch, aborting');
          return;
        }

        // 2. Fetch tokens
        console.log('🪙 [Tokenizin Wallet Store] Step 2/4: Fetching tokens...');
        get().updateProgress({ currentStep: 2 });
        await get().fetchTokens(normalizedAddress);

        if (get().currentAddress !== normalizedAddress) {
          console.log('⏸️  [Tokenizin Wallet Store] Address changed during fetch, aborting');
          return;
        }

        // 3. Fetch properties
        console.log('🏠 [Tokenizin Wallet Store] Step 3/4: Fetching properties...');
        get().updateProgress({ currentStep: 3 });
        await get().fetchProperties(normalizedAddress);

        if (get().currentAddress !== normalizedAddress) {
          console.log('⏸️  [Tokenizin Wallet Store] Address changed during fetch, aborting');
          return;
        }

        // 4. Fetch transactions last
        console.log('📜 [Tokenizin Wallet Store] Step 4/4: Fetching transactions...');
        get().updateProgress({ currentStep: 4 });
        await get().fetchTransactions(normalizedAddress);

        console.log('✅ [Tokenizin Wallet Store] All wallet data fetched sequentially');

        // Mark progress as complete
        set((state) => {
          state.progress.isActive = false;
          state.progress.completedAt = Date.now();
          state.progress.overallProgress = 100;
        });
      } catch (error) {
        console.error('❌ [Tokenizin Wallet Store] Error during sequential fetch:', error);
        set((state) => {
          state.progress.isActive = false;
          state.progress.completedAt = Date.now();
          state.error = error instanceof Error ? error.message : 'Failed to fetch wallet data';
        });
        // Don't throw error - let the UI handle it gracefully
      } finally {
        // Always clear the flag, even if there was an error
        set((state) => {
          state.isFetchingAll = false;
          state.fetchingAddress = null;
        });
      }
    },
    
    // Progress tracking actions
    updateProgress: (updates: Partial<FetchProgress>) => {
      set((state) => {
        Object.assign(state.progress, updates);
        // Calculate overall progress
        const completedOps = state.progress.operations.filter(op => op.status === 'completed').length;
        const totalOps = state.progress.operations.length;
        state.progress.overallProgress = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0;
      });
    },
    
    updateOperationProgress: (operation: OperationProgress['operation'], updates: Partial<OperationProgress>) => {
      set((state) => {
        const opIndex = state.progress.operations.findIndex(op => op.operation === operation);
        if (opIndex >= 0) {
          Object.assign(state.progress.operations[opIndex], updates);
          // Recalculate overall progress
          const completedOps = state.progress.operations.filter(op => op.status === 'completed').length;
          const totalOps = state.progress.operations.length;
          state.progress.overallProgress = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0;
        }
      });
    },
    
    updateContractProgress: (operation: OperationProgress['operation'], contractAddress: string, updates: Partial<ContractProgress>) => {
      set((state) => {
        const opIndex = state.progress.operations.findIndex(op => op.operation === operation);
        if (opIndex >= 0) {
          const contractIndex = state.progress.operations[opIndex].contracts.findIndex(
            c => c.contractAddress.toLowerCase() === contractAddress.toLowerCase()
          );
          if (contractIndex >= 0) {
            Object.assign(state.progress.operations[opIndex].contracts[contractIndex], updates);
          } else {
            // Create new contract progress entry
            state.progress.operations[opIndex].contracts.push({
              contractAddress,
              contractName: contractAddress.slice(0, 6) + '...' + contractAddress.slice(-4),
              status: 'pending',
              itemsFound: 0,
              itemsStored: 0,
              ...updates,
            });
          }
          // Update operation totals
          const op = state.progress.operations[opIndex];
          op.totalContracts = op.contracts.length;
          op.completedContracts = op.contracts.filter(c => c.status === 'completed').length;
          op.totalItems = op.contracts.reduce((sum, c) => sum + c.itemsFound, 0);
          op.storedItems = op.contracts.reduce((sum, c) => sum + c.itemsStored, 0);
          // Recalculate overall progress
          const completedOps = state.progress.operations.filter(op => op.status === 'completed').length;
          const totalOps = state.progress.operations.length;
          state.progress.overallProgress = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0;
        }
      });
    },
    
    resetProgress: () => {
      set((state) => {
        state.progress = { ...initialProgress };
      });
    },
    
    // Clear error state
    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },
    
  // Set current address and auto-fetch if changed
  // CRITICAL: Normalize addresses for comparison to prevent duplicate calls
  setCurrentAddress: (address: Address | null) => {
    const state = get();
    
    // Normalize both addresses for comparison (handle different casing)
    const normalizedNewAddress = address ? address.toLowerCase() as Address : null;
    const normalizedCurrentAddress = state.currentAddress ? state.currentAddress.toLowerCase() as Address : null;
    
    if (normalizedCurrentAddress === normalizedNewAddress) {
      return; // No change (addresses are the same, just different casing)
    }
    
    // Address changed, update it (use normalized version for consistency)
    set((state) => {
      state.currentAddress = normalizedNewAddress;
    });
    
    // Auto-fetch data when address changes
    if (normalizedNewAddress) {
      get().fetchAllData(normalizedNewAddress);
    }
  },
  
  // Watch address changes from external source (e.g., AppKit hooks)
  // CRITICAL: Normalize address to prevent duplicate calls with different casing
  watchAddress: (address: Address | null | undefined) => {
    if (!address) {
      get().setCurrentAddress(null);
      return;
    }

    // Normalize address to lowercase for comparison
    const normalizedAddress = address.toLowerCase() as Address;
    const state = get();

    // CRITICAL: Check if address is already being watched to prevent infinite loops
    // Compare normalized addresses to handle different casing
    if (state.currentAddress && state.currentAddress.toLowerCase() === normalizedAddress) {
      // Address is already being watched, skip to prevent duplicate fetchAllData calls
      console.log('⏸️ [Tokenizin Wallet Store] Address already being watched:', normalizedAddress);
      return;
    }

    // Address changed or not set, update it
    console.log('🔄 [Tokenizin Wallet Store] Watching new address:', normalizedAddress);
    get().setCurrentAddress(normalizedAddress);
  },
    
    // Reset store to initial state
    reset: () => {
      set((state) => {
        Object.assign(state, initialState);
      });
    },
  }))
);

// Convenience selectors for common use cases
export const useTokenizinWalletBalances = () => useTokenizinWalletStore((state) => ({
  balances: state.balances,
  isLoading: state.loading.balances,
  error: state.error,
  fetchBalances: state.fetchBalances,
}));

export const useTokenizinWalletTokens = () => useTokenizinWalletStore((state) => ({
  tokens: state.tokens,
  isLoading: state.loading.tokens,
  error: state.error,
  fetchTokens: state.fetchTokens,
}));

export const useTokenizinWalletProperties = () => useTokenizinWalletStore((state) => ({
  properties: state.properties,
  isLoading: state.loading.properties,
  error: state.error,
  fetchProperties: state.fetchProperties,
}));

export const useTokenizinWalletTransactions = () => useTokenizinWalletStore((state) => ({
  transactions: state.transactions,
  pendingTransactions: state.pendingTransactions,
  isLoading: state.loading.transactions,
  error: state.error,
  fetchTransactions: state.fetchTransactions,
}));

export const useTokenizinWalletNetwork = () => useTokenizinWalletStore((state) => state.network);

// Combined selector for all wallet data (matches useTigerWalletData return type)
// Using individual selectors to prevent infinite loops from new object creation
export const useTigerWalletData = () => {
  // Use individual selectors to get stable references
  // CRITICAL: Select individual loading states, not the entire loading object
  // Selecting the entire object creates a new reference on every render, causing infinite loops
  const balances = useTokenizinWalletStore((state) => state.balances);
  const tokens = useTokenizinWalletStore((state) => state.tokens);
  const properties = useTokenizinWalletStore((state) => state.properties);
  const transactions = useTokenizinWalletStore((state) => state.transactions);
  const pendingTransactions = useTokenizinWalletStore((state) => state.pendingTransactions);
  const network = useTokenizinWalletStore((state) => state.network);
  const loadingBalances = useTokenizinWalletStore((state) => state.loading.balances);
  const loadingTokens = useTokenizinWalletStore((state) => state.loading.tokens);
  const loadingProperties = useTokenizinWalletStore((state) => state.loading.properties);
  const loadingTransactions = useTokenizinWalletStore((state) => state.loading.transactions);
  const error = useTokenizinWalletStore((state) => state.error);
  const fetchAllData = useTokenizinWalletStore((state) => state.fetchAllData);
  const isFetchingAll = useTokenizinWalletStore((state) => state.isFetchingAll);
  const fetchingAddress = useTokenizinWalletStore((state) => state.fetchingAddress);
  const lastFetchBalances = useTokenizinWalletStore((state) => state.lastFetch.balances);
  
  // Compute isLoading from individual loading states (stable boolean values)
  const isLoading = loadingBalances || loadingTokens || loadingProperties || loadingTransactions;
  
  // CRITICAL: Create stable refresh function that checks cache and prevents rapid calls
  const refresh = useCallback(async (address: Address): Promise<void> => {
    // Don't fetch if already fetching for this address
    if (isFetchingAll && fetchingAddress === address) {
      console.log('⏸️  [useTokenizinWalletData] Skipping refresh - already fetching for:', address);
      return;
    }
    
    // Don't fetch if data was fetched recently (within last 5 seconds)
    const now = Date.now();
    if (lastFetchBalances && (now - lastFetchBalances) < 5000) {
      console.log('⏸️  [useTokenizinWalletData] Skipping refresh - data fetched recently:', now - lastFetchBalances, 'ms ago');
      return;
    }
    
    // Fetch data
    await fetchAllData(address);
  }, [fetchAllData, isFetchingAll, fetchingAddress, lastFetchBalances]);
  
  // Memoize error conversion to prevent creating new Error objects on every render
  const errorObject = useMemo(() => {
    return error ? new Error(error) : null;
  }, [error]);
  
  // Memoize computed values with stable refresh function
  return useMemo(() => ({
    balances,
    tokens,
    properties,
    transactions,
    pendingTransactions,
    network,
    isLoading,
    error: errorObject,
    refresh,
  }), [balances, tokens, properties, transactions, pendingTransactions, network, isLoading, errorObject, refresh]);
};

