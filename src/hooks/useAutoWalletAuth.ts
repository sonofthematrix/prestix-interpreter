'use client';

import { useAccount, useConnect } from 'wagmi';
import { useSession } from '@/lib/auth/appkit-session';

export interface UseAutoWalletAuthOptions {
  redirectUrl?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Stub hook for WalletAuthHandler. AppKit/SIWE handles auth automatically;
 * this exposes connection/session state for status UI.
 */
export function useAutoWalletAuth(options: UseAutoWalletAuthOptions = {}) {
  const { address, isConnected, connector } = useAccount();
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && !!session?.user && !!address;
  const isAuthenticating = false;

  return {
    isConnected: isConnected && !!address,
    isAuthenticating,
    isAuthenticated,
    address: address ?? undefined,
    error: null as string | null,
    authenticate: async () => {},
    clearError: () => {},
    connector: connector?.name ?? null,
  };
}
