"use client";

import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { Button } from '../../components/ui/button';
import { Wallet, Loader2, Key } from "lucide-react";
import React, { useState, useRef, useMemo, useCallback } from "react";
import { useWalletConnectionStore } from '../../lib/store/walletConnectionStore';
import { TokenizinRWAWalletWrapper } from './TokenizinRWAWalletWrapper';
import { useWagmiProviderStore } from '../../stores/wagmi-provider-store';
import { signIn } from 'next-auth/react';
import { useSignMessage } from 'wagmi';

interface SignInAppKitSectionProps {
  onWalletConnected?: (address: string) => void;
}

/**
 * SignInAppKitSection - Client-only component for AppKit wallet connection
 * 
 * Uses AppKit React hooks instead of web component for better state control.
 * Replaced useEffect with Zustand store subscription for state management.
 * 
 * Features:
 * - Wallet option (opens TigerRWAWallet directly)
 * - Other wallets option (opens AppKit modal) - only shown if WalletConnect wallets are available
 */
export function SignInAppKitSection({ onWalletConnected }: SignInAppKitSectionProps) {
  const [isSigning, setIsSigning] = useState(false);
  const [siweMessage, setSiweMessage] = useState<string | null>(null);

  // Get AppKit modal instance and open function
  // CRITICAL: useAppKit() may return a new object reference on each render
  // Use useRef to store stable reference and prevent infinite loops
  const appKit = useAppKit();
  const appKitRef = useRef(appKit);
  
  // Update ref when appKit changes, but don't trigger re-renders
  // CRITICAL: Only update ref during render, never in useEffect (causes infinite loops)
  if (appKitRef.current !== appKit) {
    appKitRef.current = appKit;
  }
  
  // Helper to get open function from ref (prevents dependency issues)
  const getOpenFunction = useCallback(() => {
    return appKitRef.current?.open;
  }, []); // Empty deps - function is stable, reads from ref

  // Use AppKit hooks exclusively (they don't require WagmiProvider)
  // CRITICAL: useAppKitAccount() may return a new object on each render
  // Extract values immediately and use refs to prevent infinite loops
  const appKitAccountResult = useAppKitAccount();
  const appKitAccountRef = useRef(appKitAccountResult);
  
  // Update ref when account result changes
  if (appKitAccountRef.current !== appKitAccountResult) {
    appKitAccountRef.current = appKitAccountResult;
  }
  
  // Extract values from ref to prevent re-renders from object reference changes
  const appKitAddress = appKitAccountRef.current && typeof appKitAccountRef.current === 'object' && 'address' in appKitAccountRef.current
    ? appKitAccountRef.current.address
    : undefined;
  const appKitConnected = appKitAccountRef.current && typeof appKitAccountRef.current === 'object' && 'isConnected' in appKitAccountRef.current
    ? appKitAccountRef.current.isConnected ?? false
    : false;

  // Check if WagmiProvider is ready before using wagmi hooks
  // CRITICAL: Must call useSignMessage unconditionally (Rules of Hooks)
  // If WagmiProvider isn't ready, this hook will throw WagmiProviderNotFoundError
  // Components using this should be wrapped in ErrorBoundary or only rendered when WagmiProvider is ready
  const wagmiProviderReady = useWagmiProviderStore((state) => state.wagmiVerified);
  
  // CRITICAL: Always call hook unconditionally (Rules of Hooks)
  // This component should only render when WagmiProvider is ready to avoid errors
  // If WagmiProvider isn't ready, this will throw - component should be wrapped in guard
  const { signMessageAsync: wagmiSignMessageAsync } = useSignMessage();
  
  // Only use wagmi's signMessageAsync if WagmiProvider is verified as ready
  // Otherwise, fall back to window.ethereum in handleSIWEAuth
  const signMessageAsync = wagmiProviderReady ? wagmiSignMessageAsync : undefined;

  // Use Zustand stores for all state management
  const { connectorStatus, connectionStatus } = useWalletConnectionStore();
  const showTigerWallet = useWagmiProviderStore((state) => state.isDialogOpen);
  const setShowTigerWallet = useWagmiProviderStore((state) => state.setDialogOpen);

  // Check if wallet is connected (using AppKit hooks)
  // Use memoized values to prevent unnecessary re-renders
  const walletConnected = useMemo(() => appKitConnected, [appKitConnected]);
  const walletAddress = useMemo(() => appKitAddress, [appKitAddress]);

  // Determine loading state from Zustand store
  const isLoading = connectorStatus === 'connecting' || connectionStatus === 'connecting' || isSigning;
  
  // Handle wallet button click - Use AppKit modal for SIWX authentication
  // CRITICAL: Use useCallback with stable dependencies to prevent infinite loops
  const handleTigerPalaceWallet = useCallback(async () => {
    console.log('🐅 [SignInAppKitSection] Opening AppKit connect modal...');
    
    // Get current appKit from ref (stable reference, no re-render trigger)
    const currentAppKit = appKitRef.current;
    const currentOpen = getOpenFunction();
    
    // Try multiple methods to open the modal
    let modalOpened = false;
    
    // Method 1: Use open function from useAppKit() hook
    if (currentOpen && typeof currentOpen === 'function') {
      try {
        // Check if modal is already open
        try {
          const state = (currentAppKit as any)?.getState?.();
          if (state?.open === true) {
            console.log('⏸️ [SignInAppKitSection] AppKit modal is already open');
            return;
          }
        } catch (e) {
          // State check failed, continue
        }
        
        // Open AppKit modal with Connect view
        await currentOpen({ view: 'Connect' });
        console.log('✅ [SignInAppKitSection] AppKit modal opened');
        modalOpened = true;
      } catch (error) {
        console.error('❌ [SignInAppKitSection] Failed to open via useAppKit().open():', error);
      }
    }
    
    // Method 2: Try window.__appkit_modal directly (fallback)
    if (!modalOpened && typeof window !== 'undefined' && (window as any).__appkit_modal) {
      try {
        const windowModal = (window as any).__appkit_modal;
        if (windowModal && typeof windowModal.open === 'function') {
          await windowModal.open({ view: 'Connect' });
          console.log('✅ [SignInAppKitSection] AppKit modal opened via window.__appkit_modal');
          modalOpened = true;
        }
      } catch (error) {
        console.error('❌ [SignInAppKitSection] Failed to open via window.__appkit_modal:', error);
      }
    }
    
    // Method 3: Fallback to TokenizinRWAWalletWrapper
    if (!modalOpened) {
      console.warn('⚠️ [SignInAppKitSection] All AppKit methods failed, using TokenizinRWAWalletWrapper fallback');
      setShowTigerWallet(true);
    }
  }, [getOpenFunction, setShowTigerWallet]); // Stable dependencies only
  
  // Handle SIWE signing and authentication
  // CRITICAL: Use useCallback to prevent recreation on every render
  const handleSIWEAuth = useCallback(async () => {
    // Get current values from refs to prevent stale closures
    const currentAddress = walletAddress;
    const currentConnected = appKitConnected;
    
    if (!currentAddress) {
      console.error('❌ [SignInAppKitSection] No wallet address available');
      return;
    }

    setIsSigning(true);
    try {
      console.log('🔐 [SignInAppKitSection] Starting SIWE authentication...');

      // Get nonce and SIWE message from API (GET request with query parameter)
      const nonceResponse = await fetch(`/api/auth/wallet/nonce?address=${encodeURIComponent(currentAddress)}`);
      
      if (!nonceResponse.ok) {
        const errorData = await nonceResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || `HTTP ${nonceResponse.status}: ${nonceResponse.statusText}`;
        console.error('❌ [SignInAppKitSection] Failed to get SIWE nonce:', errorMessage);
        throw new Error(`Failed to get authentication nonce: ${errorMessage}`);
      }

      const { message: siweMessage } = await nonceResponse.json();
      setSiweMessage(siweMessage);

      console.log('📝 [SignInAppKitSection] SIWE message generated:', siweMessage);
      console.log('✍️ [SignInAppKitSection] Prompting user to sign message...');

      // Request signature from wallet
      // Prefer wagmi's signMessageAsync if available (safer and works with all connectors)
      // Fall back to window.ethereum if wagmi is not available
      let signature: string | undefined;
      
      if (signMessageAsync) {
        // Use wagmi's signMessageAsync (works with all wagmi connectors)
        console.log('✅ [SignInAppKitSection] Using wagmi signMessageAsync');
        try {
          signature = await signMessageAsync({
            message: siweMessage,
            account: currentAddress as `0x${string}`
          });
        } catch (signError: any) {
          // Check if user rejected the request
          if (signError.code === 4001 || signError.name === 'UserRejectedRequestError' || 
              signError.message?.includes('User rejected') || signError.message?.includes('denied') ||
              signError.message?.includes('rejected')) {
            throw new Error('User rejected the signature request');
          }
          // If wagmi signing fails, fall back to window.ethereum
          console.warn('⚠️ [SignInAppKitSection] wagmi signMessageAsync failed, falling back to window.ethereum:', signError);
          // Continue to fallback below - signature will be undefined
        }
      }
      
      // Fallback to window.ethereum if wagmi signing wasn't used or failed
      if (!signature) {
        console.log('⚠️ [SignInAppKitSection] Using window.ethereum fallback');
        
        // Check if wallet is connected via AppKit (even if window.ethereum isn't available)
        if (!currentConnected) {
          throw new Error('Wallet is not connected. Please connect your wallet first.');
        }
        
        // Try window.ethereum as fallback
        if (!window.ethereum) {
          throw new Error('No wallet provider found. Please ensure your wallet extension is installed and enabled.');
        }

      const ethereum = (window as any).ethereum;
      if (!ethereum || !ethereum.request) {
        throw new Error('Wallet provider does not support signing');
      }
        
        signature = await ethereum.request({
        method: 'personal_sign',
          params: [siweMessage, currentAddress],
      });
      }
      
      // Ensure signature was obtained
      if (!signature) {
        throw new Error('Failed to obtain signature from wallet');
      }

      // Authenticate with NextAuth
      const result = await signIn('credentials', {
        walletAddress: currentAddress,
        signature,
        chainId: '1',
        walletType: 'MetaMask',
        redirect: false,
      });

      if (result?.ok) {
        console.log('✅ [SignInAppKitSection] SIWE authentication successful');
        onWalletConnected?.(currentAddress);
      } else {
        console.error('❌ [SignInAppKitSection] SIWE authentication failed:', result?.error);
      }

    } catch (error) {
      console.error('❌ [SignInAppKitSection] SIWE authentication error:', error);
    } finally {
      setIsSigning(false);
      setSiweMessage(null);
    }
  }, [walletAddress, appKitConnected, signMessageAsync, onWalletConnected]); // Stable dependencies

  // Handle other wallets connection button click
  const handleConnectWallet = useCallback(async () => {
    const currentOpen = getOpenFunction();
    
    if (!currentOpen || typeof currentOpen !== 'function') {
      console.error('❌ [SignInAppKitSection] AppKit open function not available');
      return;
    }

    // Prevent multiple simultaneous connection requests
    if (isLoading) {
      console.log('⏸️ [SignInAppKitSection] Connection already in progress, skipping duplicate request');
      return;
    }

    try {
      // Check if modal is already open
      const currentAppKit = appKitRef.current;
      try {
        const state = (currentAppKit as any)?.getState?.();
        if (state?.open === true) {
          console.log('⏸️ [SignInAppKitSection] AppKit modal is already open');
          return;
        }
      } catch (e) {
        // State check failed, continue
      }

      console.log('🔘 [SignInAppKitSection] Opening AppKit connect modal...');

      // Open AppKit modal with Connect view
      await currentOpen({ view: 'Connect' });

      console.log('✅ [SignInAppKitSection] AppKit modal opened');
    } catch (error) {
      console.error('❌ [SignInAppKitSection] Failed to open AppKit modal:', error);
    }
  }, [getOpenFunction, isLoading]); // Stable dependencies
  
  // Notify parent when wallet connects (using Zustand store subscription)
  // This will be handled by SignInWalletHandler component
  
  if (!walletConnected) {
    return (
      <>
        <div className="w-full space-y-3">
          {/* Wallet - Featured Option */}
          <Button
            onClick={handleTigerPalaceWallet}
            disabled={isLoading}
            className="w-full gap-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white dark:text-white hover:from-orange-700 hover:to-orange-600 dark:hover:from-orange-500 dark:hover:to-orange-400 border border-orange-400/30 dark:border-orange-400/40 shadow-md hover:shadow-lg transition-all duration-200"
            variant="default"
          >
            <Wallet className="h-4 w-4" />
            <span>Connect Wallet</span>
          </Button>
          
          {/* Other Wallets Option - Only show if WalletConnect wallets are available */}
          {/* Since AppKit is configured with WalletConnect enabled, this button opens the modal */}
          {/* with options like Coinbase Wallet, Rainbow, Trust Wallet, etc. via WalletConnect */}
          {false && getOpenFunction() && (
            <Button
              onClick={handleConnectWallet}
              disabled={isLoading || !getOpenFunction()}
              className="w-full gap-2 border border-border dark:border-gray-700 bg-background dark:bg-gray-800 text-foreground dark:text-white hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200"
              variant="outline"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" />
                  <span>Connect via WalletConnect</span>
                </>
              )}
            </Button>
          )}
        </div>
        
        {/* Wallet Dialog - Wrapper handles WagmiProvider availability check */}
        {showTigerWallet && (
          <TokenizinRWAWalletWrapper
            open={showTigerWallet}
            onOpenChange={setShowTigerWallet}
            defaultTab="tokens"
          />
        )}
      </>
    );
  }
  
  // Show connected status and SIWE signing option
  if (walletAddress) {
    return (
      <div className="w-full space-y-3">
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground mb-2">
            Wallet connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
          </p>
        </div>

        {/* SIWE Message Signing Button */}
        <Button
          onClick={handleSIWEAuth}
          disabled={isLoading}
          className="w-full gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white dark:text-white hover:from-blue-700 hover:to-blue-600 dark:hover:from-blue-500 dark:hover:to-blue-400 border border-blue-400/30 dark:border-blue-400/40 shadow-md hover:shadow-lg transition-all duration-200"
          variant="default"
        >
          {isSigning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing...</span>
            </>
          ) : (
            <>
              <Key className="h-4 w-4" />
              <span>Sign In with Ethereum</span>
            </>
          )}
        </Button>

        {/* Show SIWE message if available */}
        {siweMessage && (
          <div className="p-3 bg-muted dark:bg-gray-800 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Message to sign:</p>
            <p className="text-xs font-mono break-all">{siweMessage}</p>
          </div>
        )}

        {/* Wallet Dialog */}
        {showTigerWallet && (
          <TokenizinRWAWalletWrapper
            open={showTigerWallet}
            onOpenChange={setShowTigerWallet}
            defaultTab="tokens"
          />
        )}
      </div>
    );
  }
  
  return null;
}

