'use client';

/**
 * AppKitSIWETrigger Component
 * 
 * Automatically triggers AppKit's SIWE flow when a wallet connects without a session.
 * 
 * AppKit's SIWE flow only triggers when the modal is opened, not when wallets connect
 * programmatically (e.g., via MetaMask extension). This component:
 * 1. Listens for wallet connection events
 * 2. Checks if a session exists
 * 3. If no session, opens AppKit modal to trigger SIWE flow
 */

import { useEffect, useRef } from 'react';
import { useAppKitAccount } from '@/lib/appkit';
import { useSession } from '@/lib/auth/appkit-session';

export function AppKitSIWETrigger() {
  const { address, isConnected } = useAppKitAccount();
  const { data: session, status: sessionStatus } = useSession();
  const triggeredRef = useRef<string | null>(null);

  useEffect(() => {
    // Only trigger when wallet is connected
    if (!isConnected || !address) {
      triggeredRef.current = null;
      return;
    }

    // Prevent duplicate triggers for the same address
    if (triggeredRef.current === address.toLowerCase()) {
      return;
    }

    // Wait for session check to complete
    if (sessionStatus === 'loading') {
      return;
    }

    // Check if session exists for this wallet
    const hasSession = session?.user && 
      (session.user as any).walletAddress?.toLowerCase() === address.toLowerCase();

    if (hasSession) {
      console.log('✅ [AppKitSIWETrigger] Session exists, no SIWE trigger needed');
      triggeredRef.current = address.toLowerCase();
      return;
    }

    // No session exists - trigger AppKit SIWE flow
    console.log('🔐 [AppKitSIWETrigger] Wallet connected without session, triggering AppKit SIWE flow...');
    console.log('   Address:', address);
    console.log('   Session status:', sessionStatus);

    // Mark as triggered to prevent duplicates
    triggeredRef.current = address.toLowerCase();

    // Check if AppKit SIWE is already in progress
    const isSIWEInProgress = typeof window !== 'undefined' && 
      ((window as any).__appkit_verified_user__ !== undefined ||
       (window as any).__appkit_creating_session__ !== undefined);

    if (isSIWEInProgress) {
      console.log('⏸️ [AppKitSIWETrigger] SIWE already in progress, skipping trigger');
      return;
    }

    // Check if modal is already open
    const isModalOpen = typeof document !== 'undefined' && 
      document.querySelector('w3m-modal, [data-w3m-modal], w3m-router-container') !== null;

    if (isModalOpen) {
      console.log('⏸️ [AppKitSIWETrigger] AppKit modal already open, SIWE should trigger automatically');
      return;
    }

    // Open AppKit modal to trigger SIWE flow
    // AppKit will automatically:
    // 1. Call getSession() → returns null
    // 2. Call getNonce() → gets nonce from server
    // 3. Prompt user to sign message
    // 4. Call verifyMessage() → verifies signature
    // 5. Call onSignIn() → creates session
    const openModal = async () => {
      try {
        const { getModal } = await import('@/lib/appkit');
        const modal = getModal();
        
        if (modal && typeof (modal as any).open === 'function') {
          // Check modal state before opening
          const state = (modal as any).getState?.();
          if (state?.open === true) {
            console.log('⏸️ [AppKitSIWETrigger] Modal already open, skipping');
            return;
          }

          console.log('🚀 [AppKitSIWETrigger] Opening AppKit modal to trigger SIWE...');
          await (modal as any).open();
        } else {
          console.warn('⚠️ [AppKitSIWETrigger] AppKit modal not available');
        }
      } catch (error) {
        console.error('❌ [AppKitSIWETrigger] Error opening AppKit modal:', error);
      }
    };

    // Small delay to ensure wallet is fully connected and to avoid race conditions
    const timeoutId = setTimeout(() => {
      openModal();
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isConnected, address, session, sessionStatus]);

  return null; // This component doesn't render anything
}
