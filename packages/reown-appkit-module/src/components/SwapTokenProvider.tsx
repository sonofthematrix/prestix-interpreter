/**
 * SwapTokenProvider Component
 * 
 * Ensures USDC, EURC, and TigerPalace Token are registered
 * when the swap dialog is opened
 */

'use client';

import { useEffect } from 'react';
import { useAppKitAccount, useAppKit } from '@reown/appkit/react';
import { registerSwapTokens } from '../lib/token-registry';

export function SwapTokenProvider({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAppKitAccount();
  const { open } = useAppKit();

  useEffect(() => {
    if (isConnected) {
      // Register tokens when wallet is connected
      registerSwapTokens();
    }
  }, [isConnected]);

  // Intercept swap dialog opens to ensure tokens are registered
  useEffect(() => {
    if (!isConnected || typeof window === 'undefined') return;

    // Override AppKit's open function to register tokens before opening swap
    const appKitModal = (window as any).__appkit_modal;
    if (appKitModal && appKitModal.open && typeof appKitModal.open === 'function') {
      const originalOpen = appKitModal.open;
      
      // Only wrap if not already wrapped
      if (!appKitModal.__swapTokensRegistered) {
        appKitModal.open = function(...args: any[]) {
          // Check if opening swap dialog
          const view = args[0]?.view || args[0];
          if (view === 'Swap' || view === 'SwapCrypto' || (typeof view === 'string' && view.toLowerCase().includes('swap'))) {
            // Register tokens before opening swap dialog
            registerSwapTokens();
          }
          return originalOpen.apply(appKitModal, args);
        };
        appKitModal.__swapTokensRegistered = true;
      }
    }
  }, [isConnected, open]);

  return <>{children}</>;
}

