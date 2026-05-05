"use client";

/**
 * HomeSessionHandler Component
 * 
 * Handles session creation on home page:
 * 1. Checks if wallet is connected
 * 2. Checks if NextAuth session exists
 * 3. If no session: Requires message signature via AppKit SIWE
 * 4. Creates NextAuth session after signature
 * 
 * This component ensures session is only created after message signature.
 */

import { useAppKitAccount } from '@reown/appkit/react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { Loader2 } from 'lucide-react';
import { useAppKitSessionStore } from '../../store/appkitSessionStore';
import { getSIWESession } from '../../lib/siwe';
import { SIWE_ENABLED } from '../../lib/siwe-config';

// Inner component that handles session creation
function HomeSessionHandlerInner() {
  const router = useRouter();
  
  // Use AppKit's account hook (uses AppKit's wagmi integration)
  const { address: appKitAddress, isConnected: appKitConnected } = useAppKitAccount();
  // Also use wagmi's useAccount to check connector status
  const { address: wagmiAddress, isConnected: wagmiConnected, connector, status: wagmiStatus } = useAccount();
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  // useSignMessage from wagmi works with AppKit's wagmi config
  const { signMessageAsync } = useSignMessage();
  
  // Determine authentication method
  // NextAuth users can authenticate via email/password, Google OAuth, or wallet
  const sessionUser = session?.user as any;
  const isEmailAuthUser = !!session?.user && !sessionUser?.walletAddress; // Email/Google authenticated user
  const isWalletAuthUser = !!sessionUser?.walletAddress; // Wallet-authenticated user
  
  const [isChecking, setIsChecking] = useState(true);
  const [needsSignature, setNeedsSignature] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const checkedRef = useRef(false);
  const signatureTriggeredRef = useRef(false);
  const creatingSessionWithoutSignatureRef = useRef(false);
  
  // Use AppKit session store for centralized session management
  const {
    currentSession: storedSession,
    isCheckingSession,
    hasCheckedSession,
    isSigningInProgress,
    isCreatingSession: storeIsCreatingSession,
    startSessionCheck,
    completeSessionCheck,
    startSigning,
    completeSigning,
    failSigning,
    isSessionValid,
    shouldCheckSession,
    resetForWallet,
  } = useAppKitSessionStore();
  const waitingForAppKitSIWERef = useRef(false);
  const [walletConnectedTime, setWalletConnectedTime] = useState<number | null>(null);
  
  // CRITICAL: Only consider wallet "connected" if wagmi or AppKit reports connection
  // Query param alone does NOT mean wallet is connected - it's just a redirect parameter
  const resolvedConnected = wagmiConnected || appKitConnected;
  
  // Resolve address from actual connection (not query param)
  // Query param is only used as a hint, but we need actual connection for signing
  const resolvedAddress = wagmiAddress || appKitAddress;
  
  // Track when wallet connection happens - if very recent, likely from signin page
  useEffect(() => {     
    if (resolvedConnected && resolvedAddress) {
      setWalletConnectedTime(Date.now());
      
      // Reset store for previous wallet if address changed
      if (storedSession && storedSession.address.toLowerCase() !== resolvedAddress.toLowerCase()) {
        console.log('🔄 [HomeSessionHandler] Wallet address changed, resetting store for previous wallet');
        resetForWallet(storedSession.address);
      }
    } else {
      setWalletConnectedTime(null);
    }
  }, [resolvedConnected, resolvedAddress, storedSession, resetForWallet]);
  
  // Consider "from signin page" if wallet was connected very recently (within last 5 seconds)
  const isFromSigninPage = walletConnectedTime !== null && 
    (Date.now() - walletConnectedTime) < 5000;
  
  // Check if connector is actually ready for signing
  const isConnectorReady = wagmiConnected && connector && wagmiAddress;
  
  // Debug logging
  useEffect(() => {
    if (needsSignature) {
      console.log('🔍 [HomeSessionHandler] Connector status check:', {
        needsSignature,
        resolvedAddress,
        wagmiAddress,
        appKitAddress,
        wagmiConnected,
        appKitConnected,
        connector: connector?.name,
        wagmiStatus,
        isConnectorReady,
        signMessageAsync: !!signMessageAsync,
        signatureTriggered: signatureTriggeredRef.current
      });
    }
  }, [needsSignature, resolvedAddress, wagmiAddress, appKitAddress, wagmiConnected, appKitConnected, connector, wagmiStatus, isConnectorReady, signMessageAsync]);

  useEffect(() => {
    // Wait for session status to be determined
    if (sessionStatus === 'loading') {
      return;
    }

    // CRITICAL: Only check wallet disconnection for wallet-authenticated users
    // Stack Auth users (email/Google) don't need wallet connection
    if (isWalletAuthUser && (!resolvedConnected || !resolvedAddress)) {
      // Wallet-authenticated user disconnected wallet - wait a bit before redirecting
      // This allows MetaMask to reconnect if it's just a temporary disconnection
      console.log('🔐 [HomeSessionHandler] Wallet disconnected detected (wallet-auth user), waiting before redirecting...', {
        wagmiConnected,
        appKitConnected,
        wagmiAddress,
        appKitAddress,
        sessionStatus,
        hasSession: !!session,
      });
      
      // Wait 3 seconds before redirecting to allow MetaMask to reconnect
      const disconnectTimeout = setTimeout(() => {
        // Re-check current connection state (not captured closure values)
        const currentConnected = wagmiConnected || appKitConnected;
        const currentAddress = wagmiAddress || appKitAddress;
        
        // Check again if wallet reconnected
        if (!currentConnected || !currentAddress) {
          console.log('🔐 [HomeSessionHandler] Wallet still disconnected after delay, clearing session and redirecting to signin...');
          
          // Reset all state flags
          checkedRef.current = false;
          setNeedsSignature(false);
          setIsChecking(false);
          setIsSigning(false);
          setIsCreatingSession(false);
          signatureTriggeredRef.current = false;
          waitingForAppKitSIWERef.current = false;
          setErrorMessage(null);
          
          // Clear session if it exists (sign out from NextAuth)
          if (sessionStatus === 'authenticated' && session) {
            console.log('🔐 [HomeSessionHandler] Clearing NextAuth session...');
            signOut({ redirect: false }).catch((err) => {
              console.error('❌ [HomeSessionHandler] Error clearing session:', err);
            });
          }
          
          // Redirect to signin
          router.push('/auth/signin');
        } else {
          console.log('✅ [HomeSessionHandler] Wallet reconnected, canceling redirect');
        }
      }, 3000); // 3 second delay
      
      return () => clearTimeout(disconnectTimeout);
    }
    
    // NextAuth email/Google users don't need wallet - allow access if authenticated
    if (isEmailAuthUser && !isWalletAuthUser) {
      console.log('✅ [HomeSessionHandler] NextAuth user authenticated (email/Google), allowing access without wallet');
      setIsChecking(false);
      checkedRef.current = true;
      return;
    }

    // If already checked, don't check again
    if (checkedRef.current) {
      return;
    }

    const checkSession = async () => {
      // Prevent excessive checks
      if (!shouldCheckSession()) {
        return;
      }
      
      setIsChecking(true);
      startSessionCheck();

      // FIRST: Check for stored SIWE session in database/localStorage
      if (resolvedAddress && resolvedConnected) {
        try {
          console.log('🔍 [HomeSessionHandler] Checking for stored SIWE session...');
          const storedSIWESession = await getSIWESession(resolvedAddress);
          
          if (storedSIWESession && storedSIWESession.session) {
            const sessionExpiresAt = new Date(storedSIWESession.session.expiresAt);
            const now = new Date();
            
            if (sessionExpiresAt > now) {
              console.log('✅ [HomeSessionHandler] Found valid stored SIWE session, checking NextAuth session...');
              
              // We have a valid stored session, but need to verify NextAuth session exists
              // If NextAuth session doesn't exist, we'll create it without requiring signature
              if (sessionStatus === 'unauthenticated' || !session) {
                console.log('⚠️ [HomeSessionHandler] Stored SIWE session exists but NextAuth session missing - will sync');
                // Don't trigger signature - AppKit SIWE should handle this
                setIsChecking(false);
                completeSessionCheck({
                  address: resolvedAddress as `0x${string}`,
                  chainId: storedSIWESession.session.chainId || 11155111,
                  expiresAt: storedSIWESession.session.expiresAt.toISOString(),
                  sessionId: storedSIWESession.session.id,
                });
                checkedRef.current = true;
                return;
              }
            } else {
              console.log('⏰ [HomeSessionHandler] Stored SIWE session expired');
            }
          } else {
            console.log('ℹ️ [HomeSessionHandler] No stored SIWE session found');
          }
        } catch (error) {
          console.warn('⚠️ [HomeSessionHandler] Error checking stored session:', error);
          // Continue to NextAuth check
        }
      }

      // Handle session fetch errors gracefully
      // If session fetch fails (network error, route unavailable), treat as no session
      // Note: useSession() doesn't have 'error' status, but we can check for unauthenticated with no session
      if (sessionStatus === 'unauthenticated' && !session) {
        console.log('⚠️ [HomeSessionHandler] No NextAuth session available');
        
        // If SIWE is disabled, bypass signature and create session directly
          if (!SIWE_ENABLED && resolvedConnected && resolvedAddress && !creatingSessionWithoutSignatureRef.current) {
          creatingSessionWithoutSignatureRef.current = true;
          setIsChecking(false);
          startSigning();
          
          const createSessionWithoutSignature = async () => {
            try {
              setIsCreatingSession(true);
              const verifyRes = await fetch('/api/auth/wallet/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  walletAddress: resolvedAddress,
                  chainId: 11155111,
                }),
              });
              
              if (!verifyRes.ok) {
                const errorData = await verifyRes.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.message || 'Verification failed');
              }
              
              const { user } = await verifyRes.json();
              
              const signInResult = await signIn('credentials', {
                redirect: false,
                walletAddress: user.walletAddress,
                email: user.email,
                password: 'wallet-auth-placeholder',
                isWalletAuth: 'true',
              });
              
              if (!signInResult?.ok) {
                throw new Error(signInResult?.error || 'Failed to create session');
              }
              
              const updatedSession = await updateSession();
              
              completeSigning({
                address: resolvedAddress as `0x${string}`,
                chainId: 11155111,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              });
              
              if (updatedSession?.user) {
                try {
                  const { useAuthStore } = await import('@/stores/auth-store');
                  const authStore = useAuthStore.getState();
                  const sessionUser = updatedSession.user as any;
                  authStore.setUser(sessionUser);
                  if (sessionUser.walletAddress) {
                    authStore.setWalletData({
                      address: sessionUser.walletAddress,
                      chainId: 11155111,
                      networkName: 'Sepolia',
                    });
                  }
                } catch (authStoreError) {
                  console.warn('⚠️ [HomeSessionHandler] Failed to update auth store (SIWE disabled flow):', authStoreError);
                }
              }
              
              setErrorMessage(null);
              setIsSigning(false);
              setIsCreatingSession(false);
              checkedRef.current = true;
              completeSessionCheck({
                address: resolvedAddress as `0x${string}`,
                chainId: 11155111,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              });
            } catch (error: any) {
              console.error('❌ [HomeSessionHandler] Session creation without SIWE failed:', error);
              setIsSigning(false);
              setIsCreatingSession(false);
              setErrorMessage(error?.message || 'Failed to create session');
              failSigning(error?.message || 'Session creation failed');
              creatingSessionWithoutSignatureRef.current = false;
            }
          };
          
          createSessionWithoutSignature();
          return;
        }
        
        // NextAuth email/Google users are already authenticated via NextAuth session
        if (isEmailAuthUser) {
          console.log('✅ [HomeSessionHandler] NextAuth user authenticated, allowing access');
          setIsChecking(false);
          completeSessionCheck(null);
          checkedRef.current = true;
          return;
        }
        
        // If wallet is connected but no session, check if AppKit SIWE should handle it
        if (resolvedConnected && resolvedAddress) {
          // Don't immediately trigger signature - let AppKit SIWE handle it first
          console.log('🔐 [HomeSessionHandler] Wallet connected but no session - waiting for AppKit SIWE...');
          setIsChecking(false);
          completeSessionCheck(null);
          checkedRef.current = true;
          return;
        }
        
        // No wallet connected and not Stack Auth user - redirect to signin
        console.log('🔐 [HomeSessionHandler] No wallet connected and no session - redirecting to signin...');
        setIsChecking(false);
        completeSessionCheck(null);
        router.push('/auth/signin');
        return;
      }

      // Case 2: Session exists - check if valid and not expired
      if (sessionStatus === 'authenticated' && session?.user) {
        // Double-check wallet is still connected (may have disconnected during check)
        if (!resolvedConnected || !resolvedAddress) {
          console.log('🔐 [HomeSessionHandler] Wallet disconnected during session check, redirecting to signin...');
          setIsChecking(false);
          checkedRef.current = false;
          // Clear session
          signOut({ redirect: false }).catch((err) => {
            console.error('❌ [HomeSessionHandler] Error clearing session:', err);
          });
          router.push('/auth/signin');
          return;
        }
        
        // Check if session is expired
        const isExpired = session.expires ? new Date(session.expires) < new Date() : false;
        
        if (isExpired) {
          console.log('⏰ [HomeSessionHandler] Session expired, redirecting to signin...');
          setIsChecking(false);
          checkedRef.current = false; // Allow re-check after redirect
          router.push('/auth/signin');
          return;
        }
        
        // Check if wallet matches session
        const sessionWallet = (session.user as any).walletAddress;
        if (sessionWallet && resolvedAddress && sessionWallet.toLowerCase() === resolvedAddress.toLowerCase()) {
          console.log('✅ [HomeSessionHandler] Valid NextAuth session exists, allowing access');
          
          // Update store with session info
          completeSessionCheck({
            address: resolvedAddress as `0x${string}`,
            chainId: (session.user as any).chainId || 11155111,
            expiresAt: session.expires || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });
          
          setIsChecking(false);
          checkedRef.current = true;
          return;
        }
        
        // Session wallet doesn't match connected wallet
        if (sessionWallet && resolvedAddress && sessionWallet.toLowerCase() !== resolvedAddress.toLowerCase()) {
          console.log('⚠️ [HomeSessionHandler] Session wallet does not match connected wallet, redirecting to signin...');
          setIsChecking(false);
          checkedRef.current = false;
          // Clear session
          signOut({ redirect: false }).catch((err) => {
            console.error('❌ [HomeSessionHandler] Error clearing session:', err);
          });
          router.push('/auth/signin');
          return;
        }
      }

      // Case 3: No session or session doesn't match wallet
      // CRITICAL: Check if AppKit SIWE is currently handling signature
      // AppKit SIWE stores verified user data in window.__appkit_verified_user__
      // If this exists, AppKit SIWE is in progress and we should wait
      const appKitSIWEInProgress = typeof window !== 'undefined' && 
        ((window as any).__appkit_verified_user__ !== undefined);
      
      // Also check store for signing state
      if (isSigningInProgress || storeIsCreatingSession) {
        console.log('⏸️ [HomeSessionHandler] Signature/session creation already in progress, waiting...');
        setIsChecking(false);
        completeSessionCheck(null);
        checkedRef.current = true;
        return;
      }
      
      if (appKitSIWEInProgress || isFromSigninPage) {
        console.log('🔐 [HomeSessionHandler] No session, but AppKit SIWE is handling signature...');
        console.log('   AppKit SIWE should have already triggered signature during wallet connection');
        console.log('   Waiting for session to be created by AppKit SIWE onSignIn callback...');
        console.log('   AppKit SIWE in progress:', appKitSIWEInProgress);
        console.log('   From signin page:', isFromSigninPage);
        waitingForAppKitSIWERef.current = true;
        startSigning(); // Mark signing as in progress in store
        setIsChecking(false);
        completeSessionCheck(null);
        checkedRef.current = true;
        
        // Set a longer timeout to check if AppKit SIWE completes
        // AppKit SIWE can take up to 15 seconds (user might be slow to sign)
        // If it doesn't complete within 15 seconds, we'll allow manual signature
        setTimeout(() => {
          if (waitingForAppKitSIWERef.current && sessionStatus !== 'authenticated') {
            console.warn('⚠️ [HomeSessionHandler] AppKit SIWE did not complete within timeout');
            console.warn('   This might indicate AppKit SIWE did not trigger signature automatically');
            console.warn('   OR user has not yet signed the message in their wallet');
            console.warn('   Allowing manual signature trigger as fallback...');
            waitingForAppKitSIWERef.current = false;
            failSigning('AppKit SIWE timeout');
            // Clear the error message to allow manual signature trigger
            setErrorMessage(null);
          }
        }, 15000); // Increased to 15 seconds to give AppKit SIWE more time
      } else {
        // Coming from refresh/expired session - check if we should prompt
        // Only prompt if we don't have a valid stored session
        if (!storedSession || !isSessionValid()) {
          console.log('🔐 [HomeSessionHandler] No valid stored session - AppKit SIWE will handle signature');
          console.log('   This is a refresh/expired session scenario');
          waitingForAppKitSIWERef.current = false;
          setIsChecking(false);
          completeSessionCheck(null);
          checkedRef.current = true;
          // Don't set needsSignature - let AppKit SIWE handle it
        } else {
          console.log('✅ [HomeSessionHandler] Valid stored session exists, allowing access');
          setIsChecking(false);
          completeSessionCheck(storedSession);
          checkedRef.current = true;
        }
      }
    };

    checkSession();
  }, [sessionStatus, session, resolvedConnected, resolvedAddress, router, isFromSigninPage, isEmailAuthUser, isWalletAuthUser, storedSession, isSigningInProgress, storeIsCreatingSession, startSessionCheck, completeSessionCheck, startSigning, isSessionValid, shouldCheckSession, wagmiConnected, appKitConnected, wagmiAddress, appKitAddress, signOut]);

  // Trigger sign message when signature is needed
  // CRITICAL: Only trigger manual signature if AppKit SIWE is NOT handling it
  // Check both isFromSigninPage AND appKitSIWEInProgress to prevent duplicate signatures
  useEffect(() => {
    // Check if AppKit SIWE is currently handling signature
    const appKitSIWEInProgress = typeof window !== 'undefined' && 
      ((window as any).__appkit_verified_user__ !== undefined);
    
    // Skip signature flow entirely when SIWE is disabled
    if (!SIWE_ENABLED) {
      return;
    }
    
    // Skip if AppKit SIWE is handling signature - wait for it to complete
    if ((isFromSigninPage || appKitSIWEInProgress) && waitingForAppKitSIWERef.current) {
      console.log('⏸️ [HomeSessionHandler] Waiting for AppKit SIWE to complete...');
      console.log('   From signin page:', isFromSigninPage);
      console.log('   AppKit SIWE in progress:', appKitSIWEInProgress);
      return;
    }
    
    // CRITICAL: Only proceed if wallet is ACTUALLY connected (not just query param)
    // Note: signMessageAsync might not be available immediately when AppKit connects
    // We'll check for it inside triggerSignature and wait if needed
    if (!needsSignature || !resolvedAddress || !resolvedConnected || signatureTriggeredRef.current) {
      return;
    }
    
    // Double-check: wallet must be connected via wagmi or AppKit
    if (!wagmiConnected && !appKitConnected) {
      console.log('⏳ [HomeSessionHandler] Wallet not connected, cannot request signature');
      setNeedsSignature(false);
      signatureTriggeredRef.current = false;
      router.push('/auth/signin');
      return;
    }
      
    signatureTriggeredRef.current = true;
    console.log('🔐 [HomeSessionHandler] Wallet connected but no session - triggering sign message for:', resolvedAddress);
    console.log('   Wagmi connector:', connector?.name, 'Status:', wagmiStatus, 'Connected:', wagmiConnected);
    console.log('   AppKit connected:', appKitConnected);
    console.log('   signMessageAsync available:', !!signMessageAsync);
    
    const triggerSignature = async () => {
      // Delay to ensure wagmi has time to sync with AppKit
      // AppKit uses wagmi under the hood, so we need to wait for wagmi to be ready
      // Increased delay when AppKit is connected but wagmi isn't synced yet
      const delay = appKitConnected && !wagmiConnected ? 1000 : 500;
      console.log(`⏳ [HomeSessionHandler] Waiting ${delay}ms for wallet connection to stabilize...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // CRITICAL: Verify wallet is still connected before signing
      const stillConnected = wagmiConnected || appKitConnected;
      const stillHasAddress = wagmiAddress || appKitAddress;
      
      if (!stillConnected || !stillHasAddress) {
        console.warn('⚠️ [HomeSessionHandler] Wallet disconnected before signing');
        signatureTriggeredRef.current = false;
        setNeedsSignature(false);
        setErrorMessage('Wallet connection lost. Please reconnect your wallet.');
        router.push('/auth/signin');
        return;
      }
        
        setIsSigning(true);
        startSigning(); // Mark signing as in progress in store
        try {
          // Step 1: Get nonce from server (requires address as query parameter)
          console.log('🔑 [HomeSessionHandler] Requesting nonce for address:', resolvedAddress);
          const nonceUrl = `/api/auth/wallet/nonce?address=${encodeURIComponent(resolvedAddress)}`;
          const nonceRes = await fetch(nonceUrl);
          if (!nonceRes.ok) {
            const errorData = await nonceRes.json().catch(() => ({}));
            console.error('❌ [HomeSessionHandler] Nonce request failed:', errorData);
            throw new Error(errorData.error || 'Failed to get nonce');
          }
          const { nonce, message: siweMessage } = await nonceRes.json();
          console.log('✅ [HomeSessionHandler] Nonce received:', nonce);
          
          // Step 2: Use SIWE message from server (or create our own if not provided)
          // The server returns a properly formatted SIWE message, but we can also create our own
          const message = siweMessage || `${window.location.host} wants you to sign in with your Ethereum account:
            ${resolvedAddress}

            Sign in to Tokenizin with your wallet

            URI: ${window.location.origin}
            Version: 1
            Chain ID: 11155111
            Nonce: ${nonce}
            Issued At: ${new Date().toISOString()}`;
          
          console.log('📝 [HomeSessionHandler] Requesting signature for message:', message.substring(0, 100) + '...');
          
          // Step 3: Request signature from wallet
          // Use wagmiAddress if available (from connected connector), otherwise use resolvedAddress
          const accountAddress = wagmiAddress || resolvedAddress;
          if (!accountAddress) {
            throw new Error('No account address available for signing');
          }
          
          console.log('📝 [HomeSessionHandler] Signing with account:', accountAddress);
          
          // CRITICAL: wagmi signMessageAsync requires connector to be connected
          // If wagmi connector isn't connected but AppKit is, use ethereum provider directly
          // AppKit connection means the account is already authorized
          let signature: string;
          if (signMessageAsync && wagmiConnected && connector) {
            // Use wagmi's signMessageAsync when connector is properly connected
            console.log('✅ [HomeSessionHandler] Using wagmi signMessageAsync (connector connected)');
            try {
            signature = await signMessageAsync({ 
              message,
              account: accountAddress as `0x${string}`
            });
            } catch (signError: any) {
              // Check if user rejected the request
              if (signError.code === 4001 || signError.name === 'UserRejectedRequestError' || 
                  signError.message?.includes('User rejected') || signError.message?.includes('denied') ||
                  signError.message?.includes('rejected')) {
                throw signError; // Re-throw user rejection
              }
              // Check for connector not connected error - fall back to ethereum provider
              if (signError.name === 'ConnectorNotConnectedError' || 
                  signError.message?.includes('Connector not connected') ||
                  signError.message?.includes('not connected')) {
                console.warn('⚠️ [HomeSessionHandler] Wagmi connector not connected, falling back to ethereum provider');
                if (appKitConnected && typeof window !== 'undefined' && (window as any).ethereum) {
                  const ethereum = (window as any).ethereum;
                  signature = await ethereum.request({
                    method: 'personal_sign',
                    params: [message, accountAddress],
                  });
                } else {
                  throw signError; // Re-throw if no fallback available
                }
              } else {
                // For other errors, re-throw
                throw signError;
              }
            }
          } else if (appKitConnected && typeof window !== 'undefined' && (window as any).ethereum) {
            // Use ethereum provider directly when AppKit is connected but wagmi connector isn't ready
            // AppKit connection means the account is already authorized, so this should work
            console.log('✅ [HomeSessionHandler] Using ethereum provider directly (AppKit connected, wagmi connector not ready)');
            const ethereum = (window as any).ethereum;
            try {
            signature = await ethereum.request({
              method: 'personal_sign',
              params: [message, accountAddress],
            });
            } catch (ethError: any) {
              // Check if user rejected
              if (ethError.code === 4001 || ethError.message?.includes('User rejected') || 
                  ethError.message?.includes('denied') || ethError.message?.includes('rejected')) {
                throw ethError;
              }
              // Check for authorization error
              if (ethError.code === 4100 || ethError.message?.includes('not been authorized')) {
                console.error('❌ [HomeSessionHandler] Account not authorized via ethereum provider');
                throw new Error('Wallet account needs to be authorized. Please disconnect and reconnect your wallet, then try again.');
              }
              throw ethError;
            }
          } else {
            throw new Error('No signing method available. Please ensure your wallet is connected and try refreshing the page.');
          }
          
          console.log('✅ [HomeSessionHandler] Signature received, verifying...');
          
          // Step 4: Verify signature and create session
          setIsCreatingSession(true);
          const verifyRes = await fetch('/api/auth/wallet/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              signature,
              nonce,
              walletAddress: resolvedAddress,
            }),
          });
          
          if (!verifyRes.ok) {
            const errorData = await verifyRes.json();
            const errorMessage = errorData.error || errorData.message || 'Verification failed';
            const requiresRefresh = errorData.requiresRefresh || false;
            
            // Check for nonce mismatch error (from API or error message)
            if (requiresRefresh || errorMessage.toLowerCase().includes('nonce') || errorMessage.toLowerCase().includes('refresh')) {
              console.error('❌ [HomeSessionHandler] Nonce mismatch detected!');
              console.error('   This usually means the nonce has expired or been used');
              console.error('   Solution: Hard refresh the page and try again');
              throw new Error('Nonce mismatch detected. Please hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R) and try again.');
            }
            
            throw new Error(errorMessage);
          }
          
          const { user, isNewUser } = await verifyRes.json();
          console.log('✅ [HomeSessionHandler] Signature verified, creating session...');
          
          // Store session in database before creating NextAuth session
          try {
            const { storeSIWESession } = await import('../../lib/siwe');
            await storeSIWESession(
              user.id,
              resolvedAddress,
              11155111, // Sepolia
              nonce,
              signature,
              message,
              new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            );
            console.log('💾 [HomeSessionHandler] Session stored in database');
          } catch (storeError) {
            console.warn('⚠️ [HomeSessionHandler] Failed to store session in database:', storeError);
            // Continue anyway - session will be stored in localStorage as fallback
          }
          
          // Step 5: Create NextAuth session
          const signInResult = await signIn('credentials', {
            redirect: false,
            walletAddress: user.walletAddress,
            email: user.email,
            password: 'wallet-auth-placeholder',
            isWalletAuth: 'true',
          });
          
          if (signInResult?.ok) {
            console.log('✅ [HomeSessionHandler] Session created successfully');
            
            // CRITICAL: Force NextAuth to refetch session immediately
            // Without this, useSession() hook won't update and UI stays in unauthenticated state
            console.log('🔄 [HomeSessionHandler] Forcing session refetch...');
            const updatedSession = await updateSession();
            console.log('✅ [HomeSessionHandler] Session refetch complete', { 
              hasSession: !!updatedSession?.user,
              userEmail: (updatedSession?.user as any)?.email 
            });
            
            // Update AppKit session store with session info
            completeSigning({
              address: resolvedAddress as `0x${string}`,
              chainId: 11155111,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            });
            
            // CRITICAL: Update Zustand auth store to reflect authenticated state
            // This ensures app-header and other components immediately see the authenticated state
            // setUser() automatically sets isAuthenticated to true
            try {
              const { useAuthStore } = await import('@/stores/auth-store');
              const authStore = useAuthStore.getState();
              
              if (updatedSession?.user) {
                const sessionUser = updatedSession.user as any;
                authStore.setUser(sessionUser);
                // Set wallet data if available
                if (sessionUser.walletAddress) {
                  authStore.setWalletData({
                    address: sessionUser.walletAddress,
                    chainId: 11155111, // Sepolia
                    networkName: 'Sepolia',
                  });
                }
                console.log('✅ [HomeSessionHandler] Auth store updated with user:', sessionUser?.email || sessionUser?.walletAddress);
              }
            } catch (authStoreError) {
              console.warn('⚠️ [HomeSessionHandler] Failed to update auth store:', authStoreError);
              // Non-critical - session is still created, just store update failed
            }
            
            // Clear any error messages
            setErrorMessage(null);
            setIsSigning(false);
            setIsCreatingSession(false);
            // Session will be detected by the useEffect below after updateSession() completes
          } else {
            throw new Error(signInResult?.error || 'Failed to create session');
          }
          
        } catch (error: any) {
          console.error('❌ [HomeSessionHandler] Signature flow failed:', error);
          setIsSigning(false);
          setIsCreatingSession(false);
          
          // Check if user rejected the request
          const isUserRejection = 
            error.name === 'UserRejectedRequestError' ||
            error.code === 4001 ||
            error.message?.includes('User rejected') ||
            error.message?.includes('denied') ||
            error.message?.includes('rejected');
          
          if (isUserRejection) {
            console.log('⚠️ [HomeSessionHandler] User rejected signature request');
            setErrorMessage('Signature request was cancelled. Please try again when ready.');
            // Reset trigger ref so user can try again
            signatureTriggeredRef.current = false;
            setNeedsSignature(false);
            failSigning('User rejected signature');
          } else {
            const errorMsg = error.message || 'Unknown error';
            console.error('❌ [HomeSessionHandler] Authentication error:', errorMsg);
            
            // Update store with error
            failSigning(errorMsg);
            
            // Check if it's a nonce mismatch error
            if (errorMsg.includes('nonce') || errorMsg.includes('Nonce') || errorMsg.includes('refresh')) {
              setErrorMessage(`Nonce mismatch: ${errorMsg}. Please hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R) and try again.`);
            } else {
              setErrorMessage(`Authentication failed: ${errorMsg}. Please try again.`);
            }
            
            // Reset trigger ref so user can try again
            signatureTriggeredRef.current = false;
            setNeedsSignature(false);
            waitingForAppKitSIWERef.current = false;
          }
        }
      };
      
      // Trigger signature flow with small delay to ensure everything is ready
      const triggerTimeout = setTimeout(() => {
        triggerSignature();
      }, 500);
      
      return () => clearTimeout(triggerTimeout);
  }, [needsSignature, resolvedAddress, resolvedConnected, wagmiConnected, appKitConnected, signMessageAsync, wagmiAddress, appKitAddress, connector, wagmiStatus, router, isFromSigninPage]);

  // Handle AppKit SIWE signature completion and session validation
  useEffect(() => {
    // AppKit SIWE will handle signature automatically through siwe-config.ts
    // The onSignIn callback in siwe-config.ts will create the NextAuth session
    // We just need to detect when session is created
    
    // Clear AppKit SIWE waiting flag if session is created
    if (sessionStatus === 'authenticated' && session?.user) {
      if (waitingForAppKitSIWERef.current) {
        console.log('✅ [HomeSessionHandler] Session created - clearing AppKit SIWE waiting flag');
        waitingForAppKitSIWERef.current = false;
      }
    }
    
    if (needsSignature && sessionStatus === 'authenticated' && session?.user) {
      // Check if session is expired
      const isExpired = session.expires ? new Date(session.expires) < new Date() : false;
      
      if (isExpired) {
        console.log('⏰ [HomeSessionHandler] Session expired after signature, redirecting to signin...');
        setNeedsSignature(false);
        setIsCreatingSession(false);
        setIsChecking(false);
        setIsSigning(false);
        signatureTriggeredRef.current = false;
        waitingForAppKitSIWERef.current = false;
        router.push('/auth/signin');
        return;
      }
      
      const sessionWallet = (session.user as any).walletAddress;
      if (sessionWallet && resolvedAddress && sessionWallet.toLowerCase() === resolvedAddress.toLowerCase()) {
        console.log('✅ [HomeSessionHandler] Session created after signature');
        
        // Check if this was from AppKit SIWE (from signin page) or manual signature
        if (waitingForAppKitSIWERef.current) {
          console.log('✅ [HomeSessionHandler] AppKit SIWE completed successfully (from signin page)');
        } else {
          console.log('✅ [HomeSessionHandler] Manual signature completed successfully (refresh/expired session)');
        }
        
        setNeedsSignature(false);
        setIsCreatingSession(false);
        setIsChecking(false);
        setIsSigning(false);
        setErrorMessage(null); // Clear any error messages
        signatureTriggeredRef.current = false; // Reset for future use
        waitingForAppKitSIWERef.current = false; // Reset AppKit SIWE waiting flag
      } else if (sessionWallet && (!resolvedAddress || sessionWallet.toLowerCase() !== resolvedAddress.toLowerCase())) {
        // Session wallet doesn't match connected wallet
        console.log('⚠️ [HomeSessionHandler] Session wallet does not match connected wallet after signature');
        setNeedsSignature(false);
        setIsCreatingSession(false);
        setIsChecking(false);
        setIsSigning(false);
        signatureTriggeredRef.current = false;
        waitingForAppKitSIWERef.current = false;
        router.push('/auth/signin');
      }
    }
  }, [needsSignature, sessionStatus, session, resolvedAddress, router]);

  // Monitor wallet disconnection and session expiration (event-driven, not periodic)
  useEffect(() => {
    // Check for wallet disconnection FIRST (even if no session)
    // This ensures we redirect immediately when wallet disconnects
    if (!resolvedConnected || !resolvedAddress) {
      // Reset all state flags
      checkedRef.current = false;
      setNeedsSignature(false);
      setIsChecking(false);
      setIsSigning(false);
      setIsCreatingSession(false);
      signatureTriggeredRef.current = false;
      waitingForAppKitSIWERef.current = false;
      setErrorMessage(null);
      
      // If session exists, clear it
      if (sessionStatus === 'authenticated' && session) {
        console.log('🔐 [HomeSessionHandler] Wallet disconnected while session active, clearing session and redirecting to signin...');
        signOut({ redirect: false }).then(() => {
          router.push('/auth/signin');
        }).catch((err) => {
          console.error('❌ [HomeSessionHandler] Error clearing session:', err);
          router.push('/auth/signin');
        });
      } else {
        // No session, just redirect
        console.log('🔐 [HomeSessionHandler] Wallet disconnected, redirecting to signin...');
        router.push('/auth/signin');
      }
      return;
    }

    // Only monitor session expiration if we have a valid session AND wallet is connected
    if (sessionStatus !== 'authenticated' || !session?.user) {
      return;
    }

    // Check session expiration on each render (event-driven - triggers when session updates)
    if (session?.expires) {
      const isExpired = new Date(session.expires) < new Date();
      if (isExpired) {
        console.log('⏰ [HomeSessionHandler] Session expired, redirecting to signin...');
        // Reset state flags
        checkedRef.current = false;
        setNeedsSignature(false);
        setIsChecking(false);
        router.push('/auth/signin');
        return;
      }
    }
  }, [sessionStatus, session, resolvedConnected, resolvedAddress, router]);

  // Show loading state while checking - render as overlay
  if (isChecking || sessionStatus === 'loading') {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center space-y-4 bg-card border border-border rounded-lg p-8 shadow-lg">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Checking session...</p>
        </div>
      </div>
    );
  }

  // Show signature request UI or error message
  // Only show if wallet is actually connected (not just query param)
  if ((needsSignature && resolvedAddress && resolvedConnected) || errorMessage) {
    const isWaitingForAppKit = waitingForAppKitSIWERef.current && !errorMessage;
    
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center space-y-4 bg-card border border-border rounded-lg p-8 shadow-lg max-w-md">
          {errorMessage ? (
            <>
              <div className="text-red-500 dark:text-red-400 mb-2">
                <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">{errorMessage}</p>
              {errorMessage.includes('refresh') || errorMessage.includes('nonce') ? (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => {
                      // Hard refresh the page
                      window.location.href = window.location.href.split('?')[0];
                    }}
                    className="w-full px-4 py-2 bg-primary text-white dark:text-white rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    Hard Refresh Page
                  </button>
                  <button
                    onClick={async () => {
                      // Hard clear all cache and storage
                      try {
                        // Clear localStorage
                        localStorage.clear();
                        // Clear sessionStorage
                        sessionStorage.clear();
                        // Clear IndexedDB (AppKit storage)
                        if ('indexedDB' in window) {
                          const databases = await indexedDB.databases();
                          await Promise.all(
                            databases.map(db => {
                              if (db.name) {
                                return new Promise<void>((resolve, reject) => {
                                  const deleteReq = indexedDB.deleteDatabase(db.name!);
                                  deleteReq.onsuccess = () => resolve();
                                  deleteReq.onerror = () => reject(deleteReq.error);
                                  deleteReq.onblocked = () => resolve(); // Resolve even if blocked
                                });
                              }
                            })
                          );
                        }
                        // Clear AppKit storage
                        if (typeof window !== 'undefined' && (window as any).__appkit_verified_user__) {
                          delete (window as any).__appkit_verified_user__;
                        }
                        if (typeof window !== 'undefined' && (window as any).__appkit_is_new_user__) {
                          delete (window as any).__appkit_is_new_user__;
                        }
                        // Force hard refresh with cache bypass
                        window.location.href = window.location.origin + '/auth/signin';
                      } catch (error) {
                        console.error('Error clearing cache:', error);
                        // Still redirect even if clearing fails
                        window.location.href = window.location.origin + '/auth/signin';
                      }
                    }}
                    className="w-full px-4 py-2 bg-secondary text-gray-900 dark:text-white rounded-md hover:bg-secondary/90 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    // Hard clear all cache and storage
                    try {
                      // Clear localStorage
                      localStorage.clear();
                      // Clear sessionStorage
                      sessionStorage.clear();
                      // Clear IndexedDB (AppKit storage)
                      if ('indexedDB' in window) {
                        const databases = await indexedDB.databases();
                        await Promise.all(
                          databases.map(db => {
                            if (db.name) {
                              return new Promise<void>((resolve, reject) => {
                                const deleteReq = indexedDB.deleteDatabase(db.name!);
                                deleteReq.onsuccess = () => resolve();
                                deleteReq.onerror = () => reject(deleteReq.error);
                                deleteReq.onblocked = () => resolve(); // Resolve even if blocked
                              });
                            }
                          })
                        );
                      }
                      // Clear AppKit storage
                      if (typeof window !== 'undefined' && (window as any).__appkit_verified_user__) {
                        delete (window as any).__appkit_verified_user__;
                      }
                      if (typeof window !== 'undefined' && (window as any).__appkit_is_new_user__) {
                        delete (window as any).__appkit_is_new_user__;
                      }
                      // Force hard refresh with cache bypass
                      window.location.href = window.location.origin + '/auth/signin';
                    } catch (error) {
                      console.error('Error clearing cache:', error);
                      // Still redirect even if clearing fails
                      window.location.href = window.location.origin + '/auth/signin';
                    }
                  }}
                  className="mt-4 px-4 py-2 bg-primary text-white dark:text-white rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  Try Again
                </button>
              )}
            </>
          ) : isWaitingForAppKit ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm font-medium text-foreground">Waiting for signature...</p>
              <p className="text-xs text-muted-foreground">
                AppKit should have requested a signature when you connected your wallet.
                Please check your wallet (MetaMask, etc.) to approve the signature request.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                If the signature prompt doesn't appear, try disconnecting and reconnecting your wallet.
              </p>
            </>
          ) : isSigning ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm font-medium text-foreground">Please sign the message in your wallet</p>
              <p className="text-xs text-muted-foreground">
                Check your wallet (MetaMask, etc.) to approve the signature request
              </p>
            </>
          ) : isCreatingSession ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm font-medium text-foreground">Creating your session...</p>
              <p className="text-xs text-muted-foreground">Please wait while we set up your account</p>
            </>
          ) : (
            !SIWE_ENABLED ? (
              <>
                <p className="text-sm font-medium text-foreground">SIWE is disabled. Checking Session</p>
              </>
            ) : (
              <>
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm font-medium text-foreground">Preparing signature request...</p>
                <p className="text-xs text-muted-foreground">You'll be asked to sign a message to verify your wallet</p>
              </>
            )
          )}
            </div>
      </div>
    );
  }

  // No UI needed when session is valid - home content will render normally
  return null;
}

// Wrapper component to handle AppKit initialization timing
export function HomeSessionHandler() {
  const [appKitReady, setAppKitReady] = useState(false);

  useEffect(() => {
    // Wait for AppKit to initialize
    // AppKit is initialized in WalletProvider's useEffect, which runs after mount
    const timeout = setTimeout(() => {
      setAppKitReady(true);
    }, 1000); // Give AppKit time to initialize
    
    return () => clearTimeout(timeout);
  }, []);

  // If AppKit isn't ready yet, show loading state
  // This prevents useAppKitAccount from being called before AppKit is initialized
  if (!appKitReady) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center space-y-4 bg-card border border-border rounded-lg p-8 shadow-lg">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Initializing wallet connection...</p>
        </div>
      </div>
    );
  }

  // Render the inner component - AppKit should be ready now
  return <HomeSessionHandlerInner />;
}

