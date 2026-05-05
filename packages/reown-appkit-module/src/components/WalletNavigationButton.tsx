'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAppKitAccount } from '../config'
import { useTokenizinWalletStore } from '../store/tokenizinWalletStore'
import { Wallet, Loader2 } from 'lucide-react'
import { Address } from 'viem'
import { useClientMountStore } from '../store/clientMountStore'

interface WalletNavigationButtonProps {
  className?: string
}

/**
 * WalletNavigationButton - Button that navigates to wallet page
 * 
 * This button:
 * - Only activates once all wallet data is loaded
 * - Shows loading state while data is loading
 * - Navigates to /wallet page when clicked
 * - Only shows when wallet is connected
 * - The wallet page will have access to the same data via useTokenizinWalletData hook
 */
export function WalletNavigationButton({ className }: WalletNavigationButtonProps) {
  // CRITICAL: All hooks must be called unconditionally before any early returns
  const router = useRouter()
  const account = useAppKitAccount()
  const { address, isConnected } = account
  
  // Get wallet data from Zustand store
  const {
    balances,
    loading,
  } = useTokenizinWalletStore()
  
  // ✅ CORRECT: Use client mount store instead of useState + useEffect
  const isMounted = useClientMountStore((state) => state.isMounted)
  const watchAddress = useTokenizinWalletStore((state) => state.watchAddress)
  const lastWatchedAddressRef = React.useRef<string | null>(null)
  
  // ✅ CORRECT: Watch address changes using useEffect (allowed for mount-time init)
  // Defer watchAddress call to avoid render-time state updates
  React.useEffect(() => {
    if (!isMounted || !isConnected || !address) {
      // Clear watched address if disconnected
      if (lastWatchedAddressRef.current !== null) {
        lastWatchedAddressRef.current = null
        watchAddress(null)
      }
      return;
    }
    
    // Only watch if address actually changed (string comparison to prevent infinite loops)
    const addressString = address.toLowerCase()
    if (lastWatchedAddressRef.current === addressString) {
      return; // Address hasn't changed, skip
    }
    
    // Update ref BEFORE calling watchAddress to prevent re-triggering
    lastWatchedAddressRef.current = addressString
    
    // Call watchAddress - this will update store and trigger fetchAllData
    // CRITICAL: Don't include watchAddress in dependencies - it's a stable Zustand action
    watchAddress(address as Address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, isConnected, address]);
  
  // Determine if all data is loaded
  // CRITICAL: Do not proceed until isLoading is false
  // Data is considered loaded when:
  // 1. Component is mounted
  // 2. Wallet is connected
  // 3. isLoading MUST be false (loading has completed)
  // 4. We've attempted to fetch data (address exists triggers fetch)
  // Note: balances can be null even after loading completes (empty wallet), so we check isLoading, not balances
    const isDataLoaded = isMounted && isConnected && address && loading.balances === false
    
  // Only show button if wallet is connected (but all hooks have been called)
  if (!isMounted || !isConnected || !address) {
    return null
  }
  
  const handleClick = () => {
    if (isDataLoaded) {
      router.push('/wallet')
    }
  }
  
  return (
    <button
      onClick={handleClick}
      disabled={!isDataLoaded}
      className={`
        flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
        ${isDataLoaded
          ? 'bg-primary dark:bg-orange-600 text-white dark:text-white hover:bg-primary/90 dark:hover:bg-orange-700 cursor-pointer shadow-lg hover:shadow-xl'
          : 'bg-muted dark:bg-gray-800 text-muted-foreground dark:text-gray-500 cursor-not-allowed opacity-60'
        }
        ${className || ''}
      `}
      title={isDataLoaded ? 'View Wallet - Data loaded' : loading.balances ? 'Loading wallet data...' : 'Preparing wallet...'}
    >
      {loading.balances ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading Wallet Data...</span>
        </>
      ) : (
        <>
          <Wallet className="h-4 w-4" />
          <span>View Wallet</span>
        </>
      )}
    </button>
  )
}

