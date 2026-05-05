import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { shallow } from 'zustand/shallow';
import { useMemo } from 'react';

export interface WalletInfoData {
  walletAddress: string | null;
  network: {
    name: string;
    chainId: number;
  } | null;
  ethBalance: string;
  tptBalance: string;
  propertyTokens: Array<{
    symbol: string;
    name: string;
    assetTitle: string;
    balance: string;
    tokenAmount: string;
    tokenAddress: string;
    assetId: string | null;
    imageUrl: string | null;
  }>;
  volume: string;
  explorerUrl: string | null;
}

export interface WalletState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  
  // Wallet information
  address: string | null;
  chainId: number | null;
  networkName: string | null;
  
  // Detailed wallet info from API
  walletInfo: WalletInfoData | null;
  isLoadingWalletInfo: boolean;
  
  // User information
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
    role: string | null;
    authMethod: string | null;
  } | null;
  
  // Session information
  session: {
    id: string | null;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
  } | null;
  
  // Error state
  error: string | null;
  
  // Actions
  setConnectionState: (state: Partial<Pick<WalletState, 'isConnected' | 'isConnecting' | 'isAuthenticated' | 'isAuthenticating'>>) => void;
  setWalletInfo: (info: { address: string | null; chainId: number | null; networkName: string | null }) => void;
  setUser: (user: WalletState['user']) => void;
  setSession: (session: WalletState['session']) => void;
  setError: (error: string | null) => void;
  fetchWalletInfo: (address: string, chainId: number | null) => Promise<void>;
  reset: () => void;
  
  // Computed getters
  getShortAddress: () => string | null;
  getDisplayName: () => string | null;
  isWalletUser: () => boolean;
  canPerformAction: (action: string) => boolean;
}

const initialState = {
  isConnected: false,
  isConnecting: false,
  isAuthenticated: false,
  isAuthenticating: false,
  address: null,
  chainId: null,
  networkName: null,
  walletInfo: null,
  isLoadingWalletInfo: false,
  user: null,
  session: null,
  error: null,
};

export const useWalletStore = create<WalletState>()(
  devtools(
    persist(
      immer((set, get: () => WalletState) => ({
        ...initialState,
        
        setConnectionState: (state) => {
          set((draft) => {
            Object.assign(draft, state);
          });
        },
        
        setWalletInfo: (info) => {
          set((draft) => {
            draft.address = info.address;
            draft.chainId = info.chainId;
            draft.networkName = info.networkName;
          });
        },
        
        setUser: (user) => {
          set((draft) => {
            draft.user = user;
          });
        },
        
        setSession: (session) => {
          set((draft) => {
            draft.session = session;
          });
        },
        
        setError: (error) => {
          set((draft) => {
            draft.error = error;
          });
        },
        
        fetchWalletInfo: async (address: string, chainId: number | null) => {
          set((draft) => {
            draft.isLoadingWalletInfo = true;
            draft.error = null;
          });
          
          try {
            const numericChainId = chainId || 11155111; // Default to Sepolia
            const chainIdParam = numericChainId ? `?chainId=${numericChainId}` : '';
            const response = await fetch(`/api/user/wallet/info${chainIdParam}`, {
              credentials: 'include',
            });

            // Handle 401 Unauthorized gracefully - user not authenticated yet
            if (response.status === 401) {
              set((draft) => {
                draft.walletInfo = null;
                draft.isLoadingWalletInfo = false;
                draft.error = null; // Don't show error for unauthenticated state
              });
              return; // Exit early, don't throw error
            }

            if (!response.ok) {
              throw new Error(`Failed to fetch wallet info: ${response.status}`);
            }

            // Check if response is JSON before parsing
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              throw new Error(`Invalid response type: ${contentType || 'unknown'}`);
            }

            const data: WalletInfoData = await response.json();
            
            set((draft) => {
              draft.walletInfo = data;
              draft.isLoadingWalletInfo = false;
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            // Only set error if it's not a 401 (authentication) error
            const isAuthError = errorMessage.includes('401') || errorMessage.includes('Unauthorized');
            
            set((draft) => {
              draft.isLoadingWalletInfo = false;
              // Don't set error for authentication issues - they're expected
              draft.error = isAuthError ? null : errorMessage;
            });
            
            // Only throw if it's not an authentication error
            if (!isAuthError) {
              throw err;
            }
          }
        },
        
        reset: () => {
          set((draft) => {
            Object.assign(draft, initialState);
          });
        },
        
        // Computed getters
        getShortAddress: () => {
          const { address } = get();
          if (!address) return null;
          return `${address.slice(0, 6)}...${address.slice(-4)}`;
        },
        
        getDisplayName: () => {
          const { user, address } = get();
          if (user?.name) return user.name;
          if (address) return get().getShortAddress();
          return null;
        },
        
        isWalletUser: () => {
          const { user } = get();
          return user?.authMethod === 'wallet';
        },
        
        canPerformAction: (action: string) => {
          const { isAuthenticated, user } = get();
          
          if (!isAuthenticated || !user) return false;
          
          // Define role-based permissions
          const permissions: Record<string, string[]> = {
            'create_product': ['VENDOR', 'ADMIN', 'MODERATOR'],
            'manage_users': ['ADMIN', 'MODERATOR'],
            'view_analytics': ['ADMIN', 'MODERATOR'],
            'make_purchase': ['CUSTOMER', 'VENDOR', 'ADMIN', 'MODERATOR'],
            'manage_orders': ['VENDOR', 'ADMIN', 'MODERATOR'],
            'wallet_transaction': ['CUSTOMER', 'VENDOR', 'ADMIN', 'MODERATOR'],
          };
          
          const allowedRoles = permissions[action] || [];
          return allowedRoles.includes(user.role || '');
        },
      })),
      {
        name: 'wallet-store',
        partialize: (state) => ({
          // Only persist essential state
          address: state.address,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'wallet-store',
    }
  )
) as any;

// Selectors for common use cases - using shallow comparison to prevent infinite loops
export const useWalletConnection = () => useWalletStore(
  (state) => ({
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    isAuthenticated: state.isAuthenticated,
    isAuthenticating: state.isAuthenticating,
    error: state.error,
  }),
  shallow
);

// Memoized selector to prevent infinite loops
// Using useMemo to cache the selector result
export const useWalletInfo = () => {
  const address = useWalletStore((state) => state.address);
  const chainId = useWalletStore((state) => state.chainId);
  const networkName = useWalletStore((state) => state.networkName);
  const walletInfo = useWalletStore((state) => state.walletInfo);
  const isLoadingWalletInfo = useWalletStore((state) => state.isLoadingWalletInfo);
  const error = useWalletStore((state) => state.error);
  const fetchWalletInfo = useWalletStore((state) => state.fetchWalletInfo);
  
  // Compute shortAddress only when address changes
  const shortAddress = useMemo(() => {
    if (!address) return null;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);
  
  // Return memoized object to prevent new references
  return useMemo(
    () => ({
      address,
      chainId,
      networkName,
      shortAddress,
      walletInfo,
      isLoadingWalletInfo,
      error,
      fetchWalletInfo,
    }),
    [address, chainId, networkName, shortAddress, walletInfo, isLoadingWalletInfo, error, fetchWalletInfo]
  );
};

export const useWalletUser = () => useWalletStore(
  (state) => ({
    user: state.user,
    displayName: state.getDisplayName(),
    isWalletUser: state.isWalletUser(),
  }),
  shallow
);

export const useWalletPermissions = () => useWalletStore(
  (state) => ({
    canPerformAction: state.canPerformAction,
    user: state.user,
  }),
  shallow
);

// Separate selector for wallet info data (without function to prevent infinite loops)
// Using useMemo to cache the result and prevent infinite loops with useSyncExternalStore
export const useWalletInfoData = () => {
  const walletInfo = useWalletStore((state) => state.walletInfo);
  const isLoadingWalletInfo = useWalletStore((state) => state.isLoadingWalletInfo);
  const error = useWalletStore((state) => state.error);
  
  // Cache the object to prevent new reference on every render
  // This prevents infinite loops with React's useSyncExternalStore
  return useMemo(
    () => ({
      walletInfo,
      isLoadingWalletInfo,
      error,
    }),
    [walletInfo, isLoadingWalletInfo, error]
  );
};

// Separate selector for fetchWalletInfo function (stable reference)
export const useFetchWalletInfo = () => useWalletStore((state) => state.fetchWalletInfo);
