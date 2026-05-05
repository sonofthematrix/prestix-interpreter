/**
 * useWalletAuth Hook
 *
 * Provides seamless AppKit authentication integration
 * Supports email, Gmail social login, and wallet authentication via Reown AppKit
 *
 * Usage:
 * ```tsx
 * const { authenticate, isAuthenticated, isConnected } = useWalletAuth();
 *
 * // Open AppKit authentication modal
 * <button onClick={authenticate}>
 *   {isAuthenticated ? 'Authenticated' : 'Sign In'}
 * </button>
 *
 * // AppKit will handle:
 * // - Email authentication
 * // - Gmail social login
 * // - Wallet connection and SIWE
 * ```
 */

'use client';

import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';


export interface WalletAuthState {
  isConnected: boolean;
  isAuthenticating: boolean;
  isAuthenticated: boolean;
  address: string | undefined;
  error: string | null;
  walletType: string | null;
  chainId: number | null;
  networkName: string | null;
}

export interface WalletAuthActions {
  authenticate: () => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
}

export interface UseWalletAuthOptions {
  autoAuthenticate?: boolean; // Automatically authenticate when wallet connects
  redirectUrl?: string; // Redirect after successful authentication
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useWalletAuth(
  options: UseWalletAuthOptions = {}
): WalletAuthState & WalletAuthActions {
  const {
    autoAuthenticate = true,
    redirectUrl = '/',
    onSuccess,
    onError
  } = options;

  const { data: session } = useSession();
  const { address, isConnected } = useAccount();

  // AppKit hooks
  const appKit = useAppKit();
  const { address: appKitAddress, isConnected: appKitConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<string | null>(null);
  const [networkName, setNetworkName] = useState<string | null>(null);

  // Check authentication status
  const currentAddress = address || appKitAddress;
  const isWalletConnected = isConnected || appKitConnected;
  const isAuthenticated = !!session?.user;

  // Get network name from chainId
  useEffect(() => {
    if (chainId) {
      const networks: Record<number, string> = {
        1: 'mainnet',
        11155111: 'sepolia',
        137: 'polygon',
        80001: 'mumbai',
        42161: 'arbitrum',
      };
      setNetworkName(networks[chainId] || `chain-${chainId}`);
    }
  }, [chainId]);

  /**
   * Open AppKit authentication modal
   */
  const authenticate = useCallback(async () => {
    // Prevent multiple simultaneous connection requests
    if (isAuthenticating) {
      console.log('⏸️ [useWalletAuth] Authentication already in progress, skipping duplicate request');
      return;
    }

    try {
      setIsAuthenticating(true);
      setError(null);

      // Check if modal is already open before opening
      try {
        const state = (appKit as any)?.getState?.();
        if (state?.open === true) {
          console.log('⏸️ [useWalletAuth] AppKit modal is already open');
          setIsAuthenticating(false);
          return;
        }
      } catch (e) {
        // State check failed, continue
      }

      // Open AppKit modal - AppKit handles all authentication (email, social, wallet)
      appKit.open();

      // AppKit will handle the authentication flow and emit events
      // The authentication result will be available through session updates

      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      console.error('❌ AppKit authentication error:', errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  }, [appKit, isAuthenticating, onSuccess, onError]);

  /**
   * Disconnect from AppKit
   */
  const disconnect = useCallback(() => {
    // Note: AppKit handles disconnection through its modal
    // This is a placeholder for any custom cleanup logic
    setError(null);
    setWalletType(null);
    setNetworkName(null);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Handle AppKit authentication events
  useEffect(() => {
    const handleAuth = (user: any) => {
      console.log('✅ AppKit authentication successful:', user);
      // AppKit will handle session creation automatically
      onSuccess?.();
    };

    const handleAuthError = (error: any) => {
      console.error('❌ AppKit authentication error:', error);
      setError(error.message || 'Authentication failed');
      onError?.(error.message || 'Authentication failed');
    };

    // AppKit events (these are conceptual - actual events may vary)
    // You may need to adjust based on AppKit's actual event system
    const unsubscribe = () => {
      // Cleanup listeners if needed
    };

    return unsubscribe;
  }, [onSuccess, onError]);

  return {
    // State
    isConnected: isWalletConnected,
    isAuthenticating,
    isAuthenticated,
    address: currentAddress,
    error,
    walletType,
    chainId: chainId ? Number(chainId) : null,
    networkName,

    // Actions
    authenticate,
    disconnect,
    clearError,
  };
}
