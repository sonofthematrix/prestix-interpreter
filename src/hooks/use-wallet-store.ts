'use client';

import { useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useSession } from '@/lib/auth/appkit-session';
import { useWalletStore } from '@/stores/wallet-store';

/**
 * Single bridge: Wagmi + AppKit session → Zustand wallet-store (ONE SOURCE OF TRUTH).
 * This is the only place that writes wallet/session state from external sources into the store.
 * Consumers must use useWalletState() or useWalletStore() and must NOT sync from Wagmi elsewhere.
 */
export function useWalletStoreSync() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: session, status } = useSession();
  const {
    setConnectionState,
    setWalletInfo,
    setUser,
    setSession,
    setError,
    reset,
  } = useWalletStore();

  // Single sync effect: one dependency set, one write path into the store.
  useEffect(() => {
    const authenticated = status === 'authenticated' && !!session?.user;
    setConnectionState({
      isConnected,
      isAuthenticated: authenticated,
    });
    if (isConnected && address) {
      setWalletInfo({
        address,
        chainId,
        networkName: getNetworkName(chainId),
      });
    } else {
      setWalletInfo({
        address: null,
        chainId: null,
        networkName: null,
      });
    }
    if (session?.user) {
      const u = session.user as { authMethod?: string };
      setUser({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        authMethod: u.authMethod ?? 'wallet',
      });
      setSession({
        id: session.user.id,
        expiresAt: null,
        lastUsedAt: new Date(),
      });
    } else {
      setUser(null);
      setSession(null);
    }
    if (isConnected && authenticated) {
      setError(null);
    }
    if (!isConnected && status === 'unauthenticated') {
      reset();
    }
  }, [
    isConnected,
    address,
    chainId,
    status,
    session,
    setConnectionState,
    setWalletInfo,
    setUser,
    setSession,
    setError,
    reset,
  ]);
}

/**
 * Get network name from chain ID
 */
function getNetworkName(chainId: number): string {
  const networks: Record<number, string> = {
    1: 'Ethereum',
    137: 'Polygon',
    42161: 'Arbitrum',
    10: 'Optimism',
    11155111: 'Sepolia',
  };
  
  return networks[chainId] || `Chain ${chainId}`;
}

/**
 * Hook to get wallet store state with automatic syncing
 */
export function useWalletState() {
  useWalletStoreSync();
  return useWalletStore();
}
