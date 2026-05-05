// ============================================================================
// AUTHENTICATION AND AUTHORIZATION STORE
// ============================================================================

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { validateAdmin } from '@/lib/admin-validation';
import { 
  UserWithRelations, 
  Permission, 
  Role, 
  UserPermissions,
  ApiResponse
} from './types';

// ============================================================================
// AUTH STORE
// ============================================================================

interface AuthState {
  // State
  user: UserWithRelations | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Session
  sessionToken: string | null;
  refreshToken: string | null;
  sessionExpiry: Date | null;
  
  // Wallet State
  walletAddress: string | null;
  isWalletConnected: boolean;
  walletType: string | null;
  chainId: number | null;
  networkName: string | null;
  ensName: string | null;
  authMethod: 'email' | 'wallet' | null;
  
  // Permissions
  permissions: UserPermissions | null;
  roles: Role[];
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: { email: string; password: string; name?: string }) => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  updateProfile: (updates: Partial<UserWithRelations>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  verifyEmail: (token: string) => Promise<boolean>;
  
  // Wallet Actions
  connectWallet: (walletData: {
    address: string;
    signature: string;
    message: string;
    nonce: string;
    walletType?: string;
    chainId?: number;
    networkName?: string;
    ensName?: string;
  }) => Promise<boolean>;
  disconnectWallet: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<boolean>;
  
  // Permission checks
  hasPermission: (resource: string, action: string, context?: any) => boolean;
  hasRole: (roleName: string) => boolean;
  canAccessSpace: (spaceId: number, action: string) => boolean;
  canManageSpace: (spaceId: number) => boolean;
  
  // Helpers
  setUser: (user: UserWithRelations | null) => void;
  setSession: (token: string, refreshToken: string, expiry: Date) => void;
  clearSession: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setWalletData: (walletData: {
    address: string;
    walletType?: string;
    chainId?: number;
    networkName?: string;
    ensName?: string;
  }) => void;
  clearWalletData: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          sessionToken: null,
          refreshToken: null,
          sessionExpiry: null,
          permissions: null,
          roles: [],
          
          // Wallet initial state
          walletAddress: null,
          isWalletConnected: false,
          walletType: null,
          chainId: null,
          networkName: null,
          ensName: null,
          authMethod: null,

          // Actions
          login: async (email, password) => {
            set((state) => { 
              state.isLoading = true; 
              state.error = null; 
            });

            try {
              const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
              });

              const result: ApiResponse<{
                user: UserWithRelations;
                token: string;
                refreshToken: string;
                expiresAt: string;
                permissions: UserPermissions;
              }> = await response.json();

              if (result.success && result.data) {
                const { user, token, refreshToken, expiresAt, permissions } = result.data;
                const expiry = new Date(expiresAt);

                set((state) => {
                  state.user = user as UserWithRelations | null | undefined | any | any;
                  state.isAuthenticated = true;
                  state.sessionToken = token;
                  state.refreshToken = refreshToken;
                  state.sessionExpiry = expiry;
                  state.permissions = permissions;
                  state.roles = permissions.roles;
                  state.isLoading = false;
                });

                return true;
              } else {
                set((state) => {
                  state.error = result.error || 'Login failed';
                  state.isLoading = false;
                });
                return false;
              }
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Login failed';
                state.isLoading = false;
              });
              return false;
            }
          },

          logout: async () => {
            set((state) => { state.isLoading = true; });

            try {
              const { sessionToken } = get();
              if (sessionToken) {
                await fetch('/api/auth/logout', {
                  method: 'POST',
                  headers: { 
                    'Authorization': `Bearer ${sessionToken}`,
                    'Content-Type': 'application/json' 
                  },
                });
              }
            } catch (error) {
              console.error('Logout error:', error);
            } finally {
              set((state) => {
                state.user = null;
                state.isAuthenticated = false;
                state.sessionToken = null;
                state.refreshToken = null;
                state.sessionExpiry = null;
                state.permissions = null;
                state.roles = [];
                state.isLoading = false;
                state.error = null;
                
                // Clear wallet data
                state.walletAddress = null;
                state.isWalletConnected = false;
                state.walletType = null;
                state.chainId = null;
                state.networkName = null;
                state.ensName = null;
                state.authMethod = null;
              });
            }
          },

          register: async (userData) => {
            set((state) => { 
              state.isLoading = true; 
              state.error = null; 
            });

            try {
              const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
              });

              const result: ApiResponse<{
                user: UserWithRelations;
                token: string;
                refreshToken: string;
                expiresAt: string;
                permissions: UserPermissions;
              }> = await response.json();

              if (result.success && result.data) {
                const { user, token, refreshToken, expiresAt, permissions } = result.data;
                const expiry = new Date(expiresAt);

                set((state) => {
                  state.user = user as UserWithRelations | null | undefined | any;
                  state.isAuthenticated = true;
                  state.sessionToken = token;
                  state.refreshToken = refreshToken;
                  state.sessionExpiry = expiry;
                  state.permissions = permissions;
                  state.roles = permissions.roles;
                  state.isLoading = false;
                });

                return true;
              } else {
                set((state) => {
                  state.error = result.error || 'Registration failed';
                  state.isLoading = false;
                });
                return false;
              }
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Registration failed';
                state.isLoading = false;
              });
              return false;
            }
          },

          refreshSession: async () => {
            const { refreshToken } = get();
            if (!refreshToken) return false;

            try {
              const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
              });

              const result: ApiResponse<{
                token: string;
                refreshToken: string;
                expiresAt: string;
              }> = await response.json();

              if (result.success && result.data) {
                const { token, refreshToken: newRefreshToken, expiresAt } = result.data;
                const expiry = new Date(expiresAt);

                set((state) => {
                  state.sessionToken = token;
                  state.refreshToken = newRefreshToken;
                  state.sessionExpiry = expiry;
                });

                return true;
              } else {
                // Refresh failed, logout user
                get().logout();
                return false;
              }
            } catch (error) {
              console.error('Session refresh error:', error);
              get().logout();
              return false;
            }
          },

          updateProfile: async (updates) => {
            const { user, sessionToken } = get();
            if (!user || !sessionToken) return false;

            set((state) => { state.isLoading = true; state.error = null; });

            try {
              const response = await fetch('/api/auth/profile', {
                method: 'PATCH',
                headers: { 
                  'Authorization': `Bearer ${sessionToken}`,
                  'Content-Type': 'application/json' 
                },
                body: JSON.stringify(updates),
              });

              const result: ApiResponse<UserWithRelations> = await response.json();

              if (result.success && result.data) {
                set((state) => {
                  state.user = result.data! as UserWithRelations | null | undefined | any | any;
                  state.isLoading = false;
                });
                return true;
              } else {
                set((state) => {
                  state.error = result.error || 'Profile update failed';
                  state.isLoading = false;
                });
                return false;
              }
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Profile update failed';
                state.isLoading = false;
              });
              return false;
            }
          },

          changePassword: async (currentPassword, newPassword) => {
            const { sessionToken } = get();
            if (!sessionToken) return false;

            set((state) => { state.isLoading = true; state.error = null; });

            try {
              const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 
                  'Authorization': `Bearer ${sessionToken}`,
                  'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ currentPassword, newPassword }),
              });

              const result: ApiResponse<boolean> = await response.json();

              set((state) => { state.isLoading = false; });

              if (!result.success) {
                set((state) => { state.error = result.error || 'Password change failed'; });
              }

              return result.success || false;
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Password change failed';
                state.isLoading = false;
              });
              return false;
            }
          },

          resetPassword: async (email) => {
            set((state) => { state.isLoading = true; state.error = null; });

            try {
              const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
              });

              const result: ApiResponse<boolean> = await response.json();

              set((state) => { state.isLoading = false; });

              if (!result.success) {
                set((state) => { state.error = result.error || 'Password reset failed'; });
              }

              return result.success || false;
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Password reset failed';
                state.isLoading = false;
              });
              return false;
            }
          },

          verifyEmail: async (token) => {
            set((state) => { state.isLoading = true; state.error = null; });

            try {
              const response = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
              });

              const result: ApiResponse<boolean> = await response.json();

              set((state) => { state.isLoading = false; });

              if (!result.success) {
                set((state) => { state.error = result.error || 'Email verification failed'; });
              }

              return result.success || false;
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Email verification failed';
                state.isLoading = false;
              });
              return false;
            }
          },

          // Wallet Actions
          connectWallet: async (walletData) => {
            set((state) => { 
              state.isLoading = true; 
              state.error = null; 
            });

            try {
              // Verify signature on server
              const response = await fetch('/api/auth/wallet/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(walletData),
              });

              const result: ApiResponse<{
                user: UserWithRelations;
                session: any;
                token?: string;
                refreshToken?: string;
                expiresAt?: string;
                permissions?: UserPermissions;
              }> = await response.json();

              if (result.success && result.data) {
                const { user, token, refreshToken, expiresAt, permissions } = result.data;

                // Check if wallet matches admin wallets/ENS
                const adminValidation = validateAdmin(
                  walletData.address+"@tigerpalace.pro",
                  walletData.address,
                  walletData.ensName
                );

                set((state) => {
                  // Apply admin role if wallet is an admin wallet
                  const finalUser = adminValidation.isAdmin 
                    ? { ...user, role: 'ADMIN' as any }
                    : user;

                  state.user = finalUser as UserWithRelations | null | undefined | any | any;
                  state.isAuthenticated = true;
                  state.walletAddress = walletData.address;
                  state.isWalletConnected = true;
                  state.walletType = walletData.walletType || null;
                  state.chainId = walletData.chainId || null;
                  state.networkName = walletData.networkName || null;
                  state.ensName = walletData.ensName || null;
                  state.authMethod = 'wallet';
                  
                  if (token) {
                    state.sessionToken = token;
                    state.refreshToken = refreshToken || null;
                    state.sessionExpiry = expiresAt ? new Date(expiresAt) : null;
                  }
                  
                  if (permissions) {
                    state.permissions = permissions;
                    state.roles = permissions.roles;
                  }
                  
                  state.isLoading = false;
                });

                if (adminValidation.isAdmin) {
                  console.log('🔐 Wallet Admin Access Granted:', adminValidation.message);
                }

                return true;
              } else {
                set((state) => {
                  state.error = result.error || 'Wallet authentication failed';
                  state.isLoading = false;
                });
                return false;
              }
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Wallet authentication failed';
                state.isLoading = false;
              });
              return false;
            }
          },

          disconnectWallet: async () => {
            set((state) => {
              state.walletAddress = null;
              state.isWalletConnected = false;
              state.walletType = null;
              state.chainId = null;
              state.networkName = null;
              state.ensName = null;
              
              // If user was only authenticated via wallet, clear session
              if (state.authMethod === 'wallet') {
                state.user = null as UserWithRelations | null | undefined | any | any ;
                state.isAuthenticated = false;
                state.sessionToken = null;
                state.refreshToken = null;
                state.sessionExpiry = null;
                state.permissions = null;
                state.roles = [];
                state.authMethod = null;
              }
            });
          },

          switchNetwork: async (chainId) => {
            set((state) => { state.isLoading = true; state.error = null; });

            try {
              // Network switching logic would go here
              // This is typically handled by the wallet provider
              set((state) => {
                state.chainId = chainId;
                state.isLoading = false;
              });

              return true;
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Network switch failed';
                state.isLoading = false;
              });
              return false;
            }
          },

          // Permission checks
          hasPermission: (resource, action, context) => {
            const { permissions } = get();
            if (!permissions) return false;

            // Check global permissions
            const hasGlobalPermission = permissions.permissions.some(permission => 
              permission.resource === resource && 
              (permission.action === action || permission.action === 'manage')
            );

            if (hasGlobalPermission) return true;

            // No space-specific permissions in current schema

            return false;
          },

          hasRole: (roleName) => {
            const { roles } = get();
            return roles.some(role => role.name === roleName);
          },

          canAccessSpace: (spaceId, action) => {
            // Simplified - no spaces in current schema
            return false;
          },

          canManageSpace: (spaceId) => {
            // Simplified - no spaces in current schema
            return false;
          },

          // Helpers
          setUser: (user: UserWithRelations | null) => set((state) => {
            state.user = user as UserWithRelations | null | undefined | any;
            state.isAuthenticated = !!user;
          }),

          setSession: (token, refreshToken, expiry) => set((state) => {
            state.sessionToken = token;
            state.refreshToken = refreshToken;
            state.sessionExpiry = expiry;
          }),

          clearSession: () => set((state) => {
            state.sessionToken = null;
            state.refreshToken = null;
            state.sessionExpiry = null;
          }),

          setError: (error: string | null) => set((state) => {
            state.error = error;
          }),

          setLoading: (loading: boolean) => set((state) => {
            state.isLoading = loading;
          }),

          setWalletData: (walletData: {
            address: string;
            walletType?: string;
            chainId?: number;
            networkName?: string;
            ensName?: string;
          }) => set((state) => {
            state.walletAddress = walletData.address;
            state.isWalletConnected = true;
            state.walletType = walletData.walletType || null;
            state.chainId = walletData.chainId || null;
            state.networkName = walletData.networkName || null;
            state.ensName = walletData.ensName || null;
          }),

          clearWalletData: () => set((state) => {
            state.walletAddress = null;
            state.isWalletConnected = false;
            state.walletType = null;
            state.chainId = null;
            state.networkName = null;
            state.ensName = null;
            if (state.authMethod === 'wallet') {
              state.authMethod = null;
            }
          }),
        }))
      ),
      {
        name: 'auth-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          sessionToken: state.sessionToken,
          refreshToken: state.refreshToken,
          sessionExpiry: state.sessionExpiry,
          permissions: state.permissions,
          roles: state.roles,
          // Persist wallet state
          walletAddress: state.walletAddress,
          isWalletConnected: state.isWalletConnected,
          walletType: state.walletType,
          chainId: state.chainId,
          networkName: state.networkName,
          ensName: state.ensName,
          authMethod: state.authMethod,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

// Auto-refresh session before expiry
let sessionRefreshTimer: NodeJS.Timeout | null = null;

export const initializeSessionManagement = () => {
  const authStore = useAuthStore.getState();
  
  if (authStore.isAuthenticated && authStore.sessionExpiry) {
    const now = new Date();
    const timeUntilExpiry = authStore.sessionExpiry.getTime() - now.getTime();
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0); // Refresh 5 minutes before expiry

    if (sessionRefreshTimer) {
      clearTimeout(sessionRefreshTimer);
    }

    sessionRefreshTimer = setTimeout(() => {
      authStore.refreshSession();
    }, refreshTime);
  }
};

// Clean up timer on logout
useAuthStore.subscribe(
  (state) => state.isAuthenticated,
  (isAuthenticated) => {
    if (!isAuthenticated && sessionRefreshTimer) {
      clearTimeout(sessionRefreshTimer);
      sessionRefreshTimer = null;
    }
  }
);

// ============================================================================
// AUTH HOOKS
// ============================================================================

export const useAuth = () => {
  const authStore = useAuthStore();
  
  return {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    error: authStore.error,
    login: authStore.login,
    logout: authStore.logout,
    register: authStore.register,
    updateProfile: authStore.updateProfile,
    changePassword: authStore.changePassword,
    resetPassword: authStore.resetPassword,
    verifyEmail: authStore.verifyEmail,
    // Wallet fields
    walletAddress: authStore.walletAddress,
    isWalletConnected: authStore.isWalletConnected,
    authMethod: authStore.authMethod,
  };
};

export const useWallet = () => {
  const authStore = useAuthStore();
  
  return {
    walletAddress: authStore.walletAddress,
    isWalletConnected: authStore.isWalletConnected,
    walletType: authStore.walletType,
    chainId: authStore.chainId,
    networkName: authStore.networkName,
    ensName: authStore.ensName,
    authMethod: authStore.authMethod,
    connectWallet: authStore.connectWallet,
    disconnectWallet: authStore.disconnectWallet,
    switchNetwork: authStore.switchNetwork,
    setWalletData: authStore.setWalletData,
    clearWalletData: authStore.clearWalletData,
  };
};

export const usePermissions = () => {
  const authStore = useAuthStore();
  
  return {
    permissions: authStore.permissions,
    roles: authStore.roles,
    hasPermission: authStore.hasPermission,
    hasRole: authStore.hasRole,
    canAccessSpace: authStore.canAccessSpace,
    canManageSpace: authStore.canManageSpace,
  };
};

export const useSession = () => {
  const authStore = useAuthStore();
  
  return {
    sessionToken: authStore.sessionToken,
    refreshToken: authStore.refreshToken,
    sessionExpiry: authStore.sessionExpiry,
    refreshSession: authStore.refreshSession,
    clearSession: authStore.clearSession,
  };
};
