"use client";

import { useAppKitAccount } from '@reown/appkit/react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useAuthStore } from '@/stores/auth-store';

/**
 * AppKit Authentication Bridge
 * 
 * Handles ALL AppKit authentication methods (Wallet, Email, Google)
 * and bridges them to NextAuth sessions using Zustand state subscriptions.
 * 
 * Flow:
 * 1. User authenticates via AppKit (wallet, email, or Google)
 * 2. AppKit handles authentication internally
 * 3. Zustand store tracks wallet connection state
 * 4. This bridge subscribes to Zustand state changes
 * 5. Creates NextAuth session when wallet connects
 * 6. Redirects to home or welcome page
 * 
 * Note: AppKit handles email and Google authentication through its cloud service.
 * We bridge wallet authentication to NextAuth via Zustand state subscriptions.
 */
export function AppKitAuthBridge() {
  const { address, isConnected } = useAccount();
  const { address: appKitAddress, isConnected: appKitConnected } = useAppKitAccount();
  const { data: session, status } = useSession();
  const router = useRouter();
  const processedAuthRef = useRef<string | null>(null);
  const processingRef = useRef(false);

  // Get Zustand auth store state
  const authStore = useAuthStore();

  // Handle wallet authentication
  const handleWalletAuth = useCallback(async (walletAddress: string) => {
    if (processingRef.current) return;
    
    const authKey = `wallet:${walletAddress}`;
    if (processedAuthRef.current === authKey) return;

    console.log('🔐 [AppKit Bridge] Wallet authenticated, creating NextAuth session...');
    console.log('   Wallet address:', walletAddress);

      processingRef.current = true;
    processedAuthRef.current = authKey;

      try {
      // Wait for SIWE callbacks if any
        await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if session already exists
        const { getSession } = await import('next-auth/react');
        const currentSession = await getSession();
        if (currentSession?.user) {
        console.log('✅ [AppKit Bridge] Session already exists');
          processingRef.current = false;
          return;
        }

      // Verify/find user via API
          const verifyRes = await fetch('/api/auth/wallet/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
          message: `Authentication for ${walletAddress}`,
          signature: '',
          nonce: '',
          walletAddress: walletAddress,
          lookupOnly: true,
            }),
          });

      if (verifyRes.ok) {
            const { user, isNewUser } = await verifyRes.json();
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const result = await signIn('credentials', {
              redirect: false,
              walletAddress: user.walletAddress,
              email: user.email,
              password: 'wallet-auth-placeholder',
              isWalletAuth: 'true',
            });

            if (result?.ok) {
              console.log('✅ [AppKit Bridge] NextAuth session created');
              await new Promise(resolve => setTimeout(resolve, 500));
              
              const verifiedSession = await getSession();
              if (verifiedSession?.user) {
            router.push(isNewUser ? '/auth/welcome?newUser=true' : '/');
            router.refresh();
          }
        }
      }
    } catch (error) {
      console.error('❌ [AppKit Bridge] Wallet auth error:', error);
    } finally {
      processingRef.current = false;
    }
  }, [router]);

  // ⚠️ DISABLED: Wallet authentication is now handled separately
  // - SignInWalletHandler handles wallet connection on signin page
  // - HomeSessionHandler handles session creation on home page
  // - AppKit SIWE handles signature flow automatically
  // This bridge now only handles email/Google authentication
  
  // Subscribe to Zustand wallet connection state changes (DISABLED for wallet auth)
  // useEffect(() => {
  //   const unsubscribe = useAuthStore.subscribe(
  //     (state) => ({
  //       walletAddress: state.walletAddress,
  //       isWalletConnected: state.isWalletConnected,
  //       isAuthenticated: state.isAuthenticated,
  //     }),
  //     (walletState) => {
  //       // Wallet auth is handled by SignInWalletHandler and HomeSessionHandler
  //       // Don't create sessions here for wallet connections
  //     },
  //     {
  //       equalityFn: (a, b) =>
  //         a.walletAddress === b.walletAddress &&
  //         a.isWalletConnected === b.isWalletConnected &&
  //         a.isAuthenticated === b.isAuthenticated,
  //     }
  //   );

  //   return unsubscribe;
  // }, [session, handleWalletAuth]);
  
  // Sync AppKit wallet state to Zustand store (separate from subscription)
  useEffect(() => {
    const walletAddress = address || appKitAddress;
    const walletConnected = isConnected || appKitConnected;
    
    if (walletConnected && walletAddress && authStore.walletAddress !== walletAddress) {
      // Update Zustand store when AppKit connects
      authStore.setWalletData({
        address: walletAddress,
      });
    } else if (!walletConnected && authStore.isWalletConnected) {
      // Clear Zustand store when AppKit disconnects
      authStore.clearWalletData();
    }
  }, [address, appKitAddress, isConnected, appKitConnected, authStore]);

  // Subscribe to NextAuth session changes (for email/Google auth)
  useEffect(() => {
    // If session becomes authenticated, redirect
    if (status === 'authenticated' && session?.user) {
      const authKey = session.user.walletAddress || session.user.email || 'authenticated';
      
      if (processedAuthRef.current !== authKey) {
        processedAuthRef.current = authKey;
        console.log('✅ [AppKit Bridge] Session authenticated, redirecting...');
        router.push('/');
        router.refresh();
      }
    }
  }, [status, session, router]);

  return null;
}
