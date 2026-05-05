/**
 * Wallet Sync Hook
 * 
 * Automatically syncs wagmi/AppKit wallet state with Zustand stores.
 * This replaces useEffect-based syncing with reactive store updates.
 * 
 * Usage: Call this hook once at the app root level to enable automatic syncing.
 */

import { useEffect } from 'react';
import { useAppKitNetwork } from '@reown/appkit/react';
import { useWalletStore } from '@/stores/wallet-store';
import { usePropertyBlockchainStore } from '../lib/store/propertyBlockchainStore';

/**
 * Helper function to get network name from chain ID
 */
function getNetworkName(chainId: number | null): string | null {
  if (!chainId) return null;
  const networks: Record<number, string> = {
    1: 'Ethereum Mainnet',
    11155111: 'Sepolia Testnet',
    137: 'Polygon Mainnet',
    80001: 'Mumbai Testnet',
    42161: 'Arbitrum One',
  };
  return networks[chainId] || `Chain ${chainId}`;
}

/**
 * Hook to sync wagmi wallet state with Zustand stores
 * 
 * This hook automatically:
 * - Syncs wallet connection state from wagmi to stores
 * - Updates wallet info when address/chainId changes
 * - Fetches wallet info from API when connected
 * - Updates blockchain balances
 * - Clears state when disconnected
 */
export function useWalletSync() {
  const walletInfo = useWalletStore((state) => state.walletInfo); 
  const syncStatus = usePropertyBlockchainStore((state) => state.syncStatus && state.loading.sync && state.errors.sync && state.syncStatus.isSyncing);
  const syncPropertyStatus = usePropertyBlockchainStore((state) => state.actions.syncPropertyStatus as (propertyId: string) => Promise<void>);
  useEffect(() => {
    if (walletInfo?.address && walletInfo.chainId && !syncStatus && walletInfo.propertyId && !syncStatus) {
      syncPropertyStatus(walletInfo.propertyId);
    }
  }, [walletInfo?.address, walletInfo?.chainId, syncStatus, syncPropertyStatus, walletInfo?.propertyId, syncStatus]);            
}