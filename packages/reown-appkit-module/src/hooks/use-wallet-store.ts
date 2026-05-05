'use client';

import { useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useSession } from 'next-auth/react';
import { useWalletStore } from '../stores/wallet-store';

/**
 * Hook to sync wallet state between Wagmi and Zustand store
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

  // Sync wallet connection state
  useEffect(() => {
    setConnectionState({
      isConnected,
      isAuthenticated: status === 'authenticated' && !!session?.user,
    });
  }, [isConnected, status, session, setConnectionState]);

  // Sync wallet information
  useEffect(() => {
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
  }, [isConnected, address, chainId, setWalletInfo]);

  // Sync user information
  useEffect(() => {
    if (session?.user) {
      setUser({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        authMethod: session.user.authMethod,
      });
    } else {
      setUser(null);
    }
  }, [session, setUser]);

  // Sync session information
  useEffect(() => {
    if (session?.user) {
      setSession({
        id: session.user.id,
        expiresAt: null, // NextAuth handles expiration
        lastUsedAt: new Date(),
      });
    } else {
      setSession(null);
    }
  }, [session, setSession]);

  // Clear error when connection is successful
  useEffect(() => {
    if (isConnected && status === 'authenticated') {
      setError(null);
    }
  }, [isConnected, status, setError]);

  // Reset store when disconnected
  useEffect(() => {
    if (!isConnected && status === 'unauthenticated') {
      reset();
    }
  }, [isConnected, status, reset]);
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
