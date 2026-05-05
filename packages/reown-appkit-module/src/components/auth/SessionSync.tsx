'use client';

/**
 * SessionSync Component
 * 
 * Ensures proper session synchronization between NextAuth and the UI.
 * This component:
 * 1. Detects when authentication occurs
 * 2. Triggers session refresh in useSession hook
 * 3. Syncs session data to Zustand auth store
 * 4. Syncs session data across all components
 * 5. Handles post-authentication navigation
 */

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useAppKitAccount, useAppKitNetwork } from '../../config';
import { useAppKitSessionStore } from '../../store/appkitSessionStore';
import { Address } from 'viem';

export function SessionSync() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const lastStatusRef = useRef(status);
  const hasRefreshedRef = useRef(false);
  
  // Get AppKit account and network for session persistence
  const { address, isConnected } = useAppKitAccount();
  const network = useAppKitNetwork();
  
  // Get AppKit session store for persistence
  const { setCurrentSession, completeSessionCheck, reset } = useAppKitSessionStore();

  // Monitor wallet disconnection and clear persisted session
  useEffect(() => {
    // If wallet disconnects, clear persisted session
    if (!isConnected || !address) {
      // Check if we had a persisted session for a different wallet
      const { currentSession } = useAppKitSessionStore.getState();
      if (currentSession && currentSession.address.toLowerCase() !== (address || '').toLowerCase()) {
        console.log('🔄 [SessionSync] Wallet disconnected, clearing persisted session');
        reset();
      }
    }
  }, [isConnected, address, reset]);

  useEffect(() => {
    // Sync NextAuth session to AppKit session store (persisted)
    if (status === 'authenticated' && session?.user) {
      const user = session.user;
      const walletAddress = (user as any).walletAddress || address;
      
      // Persist session to AppKit session store for wallet authentication
      if (walletAddress && isConnected) {
        const sessionExpiresAt = session.expires 
          ? new Date(session.expires).toISOString()
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Default 7 days
        
        const sessionData = {
          address: walletAddress as Address,
          chainId: network?.chainId || (user as any).chainId || 11155111, // Default to Sepolia
          expiresAt: sessionExpiresAt,
          sessionId: user.id,
        };
        
        setCurrentSession(sessionData);
        completeSessionCheck(sessionData);
        
        console.log('✅ [SessionSync] Synced NextAuth session to AppKit session store (persisted)');
        console.log('   User:', user.email || user.id);
        console.log('   Wallet:', walletAddress);
        console.log('   Expires:', sessionExpiresAt);
      } else {
        console.log('✅ [SessionSync] NextAuth session authenticated (non-wallet)');
        console.log('   User:', user.email || user.id);
      }
    } else if (status === 'unauthenticated' && lastStatusRef.current === 'unauthenticated') {
      // Clear persisted session if wallet is disconnected
      if (!isConnected || !address) {
        setCurrentSession(null);
        console.log('🔄 [SessionSync] Cleared AppKit session store (unauthenticated and disconnected)');
      } else {
        console.log('⏸️  [SessionSync] Keeping session - wallet still connected (possible transition)');
      }
    }
  }, [status, session, address, isConnected, network, setCurrentSession, completeSessionCheck]);

  useEffect(() => {
    // Detect when authentication status changes from unauthenticated to authenticated
    const statusChanged = lastStatusRef.current !== status;
    
    if (statusChanged && status === 'authenticated' && session) {
      console.log('🔄 [SessionSync] Authentication detected - syncing session');
      console.log('   User:', session.user?.email || session.user?.id);
      console.log('   Current path:', pathname);
      
      // Force a session refresh to ensure all components get the latest data
      if (!hasRefreshedRef.current) {
        hasRefreshedRef.current = true;
        
        // Trigger session update
        update().then(() => {
          console.log('✅ [SessionSync] Session refreshed successfully');
          
          // Force router refresh to update all server components
          router.refresh();
        });
      }
    }
    
    // Update last status
    lastStatusRef.current = status;
  }, [status, session, update, router, pathname]);

  // ⚠️ NO PERIODIC REFRESH: Session refresh only occurs on authentication state changes
  // Removed automatic refresh to prevent unwanted background activity

  // This component doesn't render anything
  return null;
}

