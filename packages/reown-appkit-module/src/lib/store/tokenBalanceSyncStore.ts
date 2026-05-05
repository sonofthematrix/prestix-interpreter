/**
 * Token Balance Sync Enhancement for Token Store
 * 
 * Adds on-chain balance synchronization capabilities to the existing tokenStore
 * This file extends tokenStore.ts with balance sync functionality
 */

import { usePropertyBlockchainStore } from '@/lib/store/propertyBlockchainStore';

export interface OnChainBalance {
  propertyId: string;
  tokenAddress: string;
  walletAddress: string;
  balance: string; // BigNumber as string
  balanceDecimal: number; // Human-readable balance
  lastSynced: Date;
  chainId: number;
  transactionHash?: string;
}

export interface TokenPurchaseVerification {
  propertyId: string;
  userId: string;
  walletAddress: string;
  tokenAmount: number;
  purchaseAmount: number;
  onChainBalance: number;
  verified: boolean;
  transactionHash?: string;
  blockNumber?: number;
  timestamp?: Date;
}

interface TokenBalanceSyncState {
  // On-chain balances cache
  onChainBalances: Record<string, OnChainBalance>; // key: `${propertyId}-${walletAddress}`
  
  // Sync status
  syncStatus: {
    isSyncing: boolean;
    lastSynced?: Date;
    syncingProperties: Set<string>;
  };
  
  // Loading states
  loading: {
    sync: boolean;
    verify: boolean;
  };
  
  // Error states
  errors: {
    sync?: string;
    verify?: string;
  };
  
  // Actions
  actions: {
    // Balance sync actions
    syncUserPropertyBalance: (
      userId: string,
      propertyId: string,
      tokenAddress: string,
      walletAddress: string
    ) => Promise<OnChainBalance>;
    syncAllUserBalances: (userId: string) => Promise<void>;
    getCachedBalance: (
      propertyId: string,
      walletAddress: string
    ) => OnChainBalance | null;
    
    // Verification actions
    verifyTokenPurchase: (
      purchase: {
        propertyId: string;
        userId: string;
        walletAddress: string;
        tokenAmount: number;
        purchaseAmount: number;
      }
    ) => Promise<TokenPurchaseVerification>;
    
    // Cache management
    invalidateBalance: (propertyId: string, walletAddress: string) => void;
    invalidateAllBalances: () => void;
    
    // Loading and error management
    setLoading: (key: keyof TokenBalanceSyncState['loading'], loading: boolean) => void;
    setError: (key: keyof TokenBalanceSyncState['errors'], error?: string) => void;
    clearErrors: () => void;
  };
}

// Create a separate store for balance sync to avoid conflicts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const initialState: Omit<TokenBalanceSyncState, 'actions'> = {
  onChainBalances: {},
  syncStatus: {
    isSyncing: false,
    syncingProperties: new Set(),
  },
  loading: {
    sync: false,
    verify: false,
  },
  errors: {},
};

export const useTokenBalanceSyncStore = create<TokenBalanceSyncState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        actions: {
          syncUserPropertyBalance: async (
            userId,
            propertyId,
            tokenAddress,
            walletAddress
          ) => {
            const cacheKey = `${propertyId}-${walletAddress}`;
            
            // Check cache first (5 minute TTL)
            const cached = get().onChainBalances[cacheKey];
            if (cached) {
              const cacheAge = Date.now() - cached.lastSynced.getTime();
              if (cacheAge < 5 * 60 * 1000) {
                return cached;
              }
            }

            set((state) => {
              state.loading.sync = true;
              state.syncStatus.isSyncing = true;
              state.syncStatus.syncingProperties.add(propertyId);
              delete state.errors.sync;
            });

            try {
              const response = await fetch(
                `/api/blockchain/tokens/sync-balance`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                  body: JSON.stringify({
                    userId,
                    propertyId,
                    tokenAddress,
                    walletAddress,
                  }),
                }
              );

              if (!response.ok) {
                throw new Error(`Failed to sync balance: ${response.status}`);
              }

              const data: OnChainBalance = await response.json();

              set((state) => {
                state.onChainBalances[cacheKey] = {
                  ...data,
                  lastSynced: new Date(data.lastSynced),
                };
                state.loading.sync = false;
                state.syncStatus.syncingProperties.delete(propertyId);
                if (state.syncStatus.syncingProperties.size === 0) {
                  state.syncStatus.isSyncing = false;
                }
                state.syncStatus.lastSynced = new Date();
              });

              return get().onChainBalances[cacheKey];
            } catch (error: any) {
              set((state) => {
                state.errors.sync = error.message;
                state.loading.sync = false;
                state.syncStatus.syncingProperties.delete(propertyId);
                if (state.syncStatus.syncingProperties.size === 0) {
                  state.syncStatus.isSyncing = false;
                }
              });
              throw error;
            }
          },

          syncAllUserBalances: async (userId) => {
            set((state) => {
              state.loading.sync = true;
              state.syncStatus.isSyncing = true;
              delete state.errors.sync;
            });

            try {
              const onChainBalances = get().onChainBalances;
              // Get user's properties from propertyBlockchainStore
              const propertyBlockchainStore = usePropertyBlockchainStore.getState();
              const userProperties = Object.values(propertyBlockchainStore.properties).filter(
                (property) => onChainBalances[`${property.propertyId}-${userId}`]?.walletAddress === userId
              ).map((property) => property.propertyId);

              // Sync balances for all properties
              await Promise.all(userProperties.map((propertyId) => {
                return get().actions.syncUserPropertyBalance(
                  userId,
                  propertyId,
                  '', // tokenAddress will be fetched from API
                  userId
                );
              }));

              set((state) => {
                state.loading.sync = false;
                state.syncStatus.isSyncing = false;
                state.syncStatus.lastSynced = new Date();
              });
            } catch (error: any) {
              set((state) => {
                state.errors.sync = error.message;
                state.loading.sync = false;
                state.syncStatus.isSyncing = false;
              });
            }
          },

          getCachedBalance: (propertyId, walletAddress) => {
            const cacheKey = `${propertyId}-${walletAddress}`;
            return get().onChainBalances[cacheKey] || null;
          },

          verifyTokenPurchase: async (purchase) => {
            set((state) => {
              state.loading.verify = true;
              delete state.errors.verify;
            });

            try {
              // Sync balance first
              const authStore = require('./authStore').useAuthStore.getState();
              const walletAddress = authStore.user?.walletAddress;
              
              if (!walletAddress) {
                throw new Error('Wallet address not found');
              }

              // Get property token address
              const propertyBlockchainStore = usePropertyBlockchainStore.getState();
              const property = Object.values(propertyBlockchainStore.properties).find(
                (p) => p.propertyId === purchase.propertyId
              );

              if (!property) {
                throw new Error('Property not found');
              }

              // Sync balance
              const balance = await get().actions.syncUserPropertyBalance(
                purchase.userId,
                purchase.propertyId,
                '', // Will be fetched from API
                walletAddress
              );

              const verified: TokenPurchaseVerification = {
                ...purchase,
                onChainBalance: balance.balanceDecimal,
                verified: balance.balanceDecimal >= purchase.tokenAmount,
              };

              set((state) => {
                state.loading.verify = false;
              });

              return verified;
            } catch (error: any) {
              set((state) => {
                state.errors.verify = error.message;
                state.loading.verify = false;
              });
              throw error;
            }
          },

          invalidateBalance: (propertyId, walletAddress) =>
            set((state) => {
              const cacheKey = `${propertyId}-${walletAddress}`;
              delete state.onChainBalances[cacheKey];
            }),

          invalidateAllBalances: () =>
            set((state) => {
              state.onChainBalances = {};
            }),

          setLoading: (key, loading) =>
            set((state) => {
              state.loading[key] = loading;
            }),

          setError: (key, error) =>
            set((state) => {
              if (error) {
                state.errors[key] = error;
              } else {
                delete state.errors[key];
              }
            }),

          clearErrors: () =>
            set((state) => {
              state.errors = {};
            }),
        },
      })),
      {
        name: 'token-balance-sync-store',
        partialize: (state) => ({
          onChainBalances: state.onChainBalances,
          syncStatus: {
            isSyncing: false,
            lastSynced: state.syncStatus.lastSynced,
            syncingProperties: [],
          },
        }),
      }
    ),
    { name: 'Token Balance Sync Store' }
  )
);

// Convenience hooks
export const useTokenBalanceSyncActions = () =>
  useTokenBalanceSyncStore((state) => state.actions);
export const useOnChainBalances = () =>
  useTokenBalanceSyncStore((state) => state.onChainBalances);
export const useTokenBalanceSyncStatus = () =>
  useTokenBalanceSyncStore((state) => state.syncStatus);
export const useTokenBalanceSyncLoading = () =>
  useTokenBalanceSyncStore((state) => state.loading);
export const useTokenBalanceSyncErrors = () =>
  useTokenBalanceSyncStore((state) => state.errors);

