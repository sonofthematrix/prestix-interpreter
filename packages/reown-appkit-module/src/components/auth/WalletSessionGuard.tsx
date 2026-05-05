'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAppKitAccount, useAppKitNetwork } from '../../config';
import { useAppKit } from '@reown/appkit/react';
import { Address } from 'viem';
import { shortenAddress } from '../../lib/address-utils';
import { useClientMountStore } from '../../store/clientMountStore';
import { useWalletSignatureStore } from '../../store/walletSignatureStore';
import { useTokenizinWalletStore } from '@/lib/store/tokenizinWalletStore';
import { useAppKitSessionStore } from '../../store/appkitSessionStore';
import { TigerSpinner } from '../common/TigerSpinner';
import { WalletInitializationProgress } from './WalletInitializationProgress';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface WalletSessionGuardProps {
  children: React.ReactNode;
  onSessionValid?: () => void;
  onSessionInvalid?: () => void;
}

/**
 * WalletSessionGuard - Validates session on wallet page
 * 
 * When wallet is connected:
 * - Checks for valid, non-expired session
 * - If no valid session, prompts user to sign message (SIWE)
 * - Only renders children when session is valid
 */
export function WalletSessionGuard({ 
  children, 
  onSessionValid,
  onSessionInvalid 
}: WalletSessionGuardProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const { address, isConnected } = useAppKitAccount();
  const network = useAppKitNetwork();
  const appKit = useAppKit();
  
  // Check if wallet data is being fetched (must be called unconditionally)
  const isFetchingAll = useTokenizinWalletStore((state) => state.isFetchingAll);  
  const fetchingAddress = useTokenizinWalletStore((state) => state.fetchingAddress);
  
  // Abbreviate wallet address for readable logging
  const addrAbbr = address ? shortenAddress(address) : null;
  
  const [isChecking, setIsChecking] = useState(false);
  const checkedRef = useRef(false);
  const authInProgressRef = useRef(false);
  const autoSignTriggeredRef = useRef(false);

  // Refs for callbacks to avoid effect re-running when parent re-renders with new refs (prevents "Maximum update depth exceeded")
  const onSessionValidRef = useRef(onSessionValid);
  const onSessionInvalidRef = useRef(onSessionInvalid);
  onSessionValidRef.current = onSessionValid;
  onSessionInvalidRef.current = onSessionInvalid;
  
  // Use wallet signature store for signing state
  const {
    walletAddress: signingWalletAddress,
    siweMessage,
    isSigning,
    isAuthenticating,
    error: signatureError,
    setWalletAddress: setSigningWalletAddress,
    setSiweMessage,
    setSigning,
    setAuthenticating,
    setError: setSignatureError,
    startSigning,
    completeSigning,
    failSigning,
    resetForWallet,
  } = useWalletSignatureStore();
  
  // Use AppKit session store for persisted session state
  const {
    currentSession: persistedSession,
    isSessionValid: isPersistedSessionValid,
    setCurrentSession,
    completeSessionCheck,
    updateLastChecked,
    shouldCheckSession,
  } = useAppKitSessionStore();
  
  // Use client mount store to prevent hydration mismatch
  const isMounted = useClientMountStore((state) => state.isMounted);

  // Handle SIWE authentication after signature
  const handleSignatureSuccess = useCallback(async (signature: string) => {
    if (!address || !siweMessage || authInProgressRef.current) {
      return;
    }

    setSigningWalletAddress(address);
    setAuthenticating(true);
    setSignatureError(null);
    authInProgressRef.current = true;

    try {
      console.log(`🔐 [WalletSessionGuard] Signature received, verifying for ${addrAbbr || 'wallet'}...`);

      // Verify signature and create session
      const verifyResponse = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: siweMessage,
          signature,
          walletAddress: address,
        }),
      });

            if (!verifyResponse.ok) {
              const errorData = await verifyResponse.json().catch(() => ({}));
              const errorMessage = errorData.error || errorData.details || `HTTP ${verifyResponse.status}: ${verifyResponse.statusText}`;
              console.error('❌ [WalletSessionGuard] Verification failed:', errorMessage);
              throw new Error(errorMessage);
            }

      const { user } = await verifyResponse.json();

      // Check if user is fully initialized and initialize missing records if needed
      try {
        const completenessResponse = await fetch('/api/auth/wallet/check-completeness', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: address,
            initializeMissing: true, // Automatically initialize missing records
          }),
        });
        
        if (completenessResponse.ok) {
          const completenessData = await completenessResponse.json();
          if (!completenessData.isComplete && completenessData.missingRecords?.length > 0) {
            console.log(`🔄 [WalletSessionGuard] User missing records: ${completenessData.missingRecords.join(', ')}`);
            console.log(`✅ [WalletSessionGuard] Missing records initialized automatically`);
          } else {
            console.log(`✅ [WalletSessionGuard] User is fully initialized`);
          }
        }
      } catch (completenessError) {
        console.warn('⚠️ [WalletSessionGuard] Error checking/initializing user completeness (non-critical):', completenessError);
      }

      // Detect wallet provider and record audit log
      const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;
      let walletProvider = 'unknown';
      
      if (ethereum) {
        if (ethereum.isMetaMask) {
          walletProvider = 'MetaMask';
        } else if (ethereum.isCoinbaseWallet) {
          walletProvider = 'Coinbase Wallet';
        } else if (ethereum.isWalletConnect) {
          walletProvider = 'WalletConnect';
        } else if (ethereum.providers) {
          // Check providers array for MetaMask
          const metaMaskProvider = ethereum.providers.find((p: any) => p?.isMetaMask);
          if (metaMaskProvider) {
            walletProvider = 'MetaMask';
          }
        }
      }

      // Get request metadata for audit log
      const ipAddress = typeof window !== 'undefined' 
        ? (() => {
            // Try to get IP from headers if available (client-side, we can't access headers directly)
            // In production, this would be set by the server
            return 'unknown';
          })()
        : 'unknown';
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';

      // Record audit log for wallet sign-in attempt (non-blocking)
      // Use a fire-and-forget approach to avoid blocking authentication flow
      fetch('/api/auth/wallet/audit-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          walletAddress: address,
          walletProvider,
          authMethod: 'wallet',
          provider: 'credentials',
          signatureProvided: true,
          ipAddress,
          userAgent,
        }),
      }).then((auditResponse) => {
        if (auditResponse.ok) {
          console.log('✅ [WalletSessionGuard] Audit log recorded for wallet sign-in');
        } else {
          console.warn('⚠️ [WalletSessionGuard] Failed to record audit log (non-critical)');
        }
      }).catch((auditError) => {
        // Silently handle audit log errors - don't break authentication flow
        console.warn('⚠️ [WalletSessionGuard] Audit log error (non-critical):', auditError);
      });

      // Step 4: Sign in with NextAuth
      const result = await signIn('credentials', {
        redirect: false,
        walletAddress: user.walletAddress,
        email: user.email,
        password: 'wallet-auth-placeholder',
        isWalletAuth: 'true',
      });

      if (result?.ok) {
        console.log(`✅ [WalletSessionGuard] Authentication successful for ${addrAbbr || 'wallet'}`);
        
        // Persist session to Zustand store
        if (address && user) {
          const sessionExpiresAt = session?.expires 
            ? new Date(session.expires).toISOString()
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Default 7 days
          
          setCurrentSession({
            address: address as Address,
            chainId: network?.chainId ? parseInt(network.chainId as string) : 11155111, // Default to Sepolia
            expiresAt: sessionExpiresAt,
            sessionId: user.id,
          });
          
          console.log(`💾 [WalletSessionGuard] Session persisted to Zustand store for ${addrAbbr || 'wallet'}`);
        }
        
        // Reset flags to allow re-check with new session
        authInProgressRef.current = false;
        checkedRef.current = false; // Reset to allow session check to run again
        autoSignTriggeredRef.current = false; // Reset auto-sign trigger
        
        // Force session update to ensure useSession hook picks up the new session
        console.log('🔄 [WalletSessionGuard] Updating session state...');
        await updateSession();
        
        // Load wallet data in background (non-blocking) - don't wait for it
        // This allows authentication to complete immediately while data loads in parallel
        if (address) {
          const tokenizinWalletStore = useTokenizinWalletStore.getState();
          console.log(`📊 [WalletSessionGuard] Loading wallet data in background for ${addrAbbr || 'wallet'}...`);
          // Fire and forget - don't await
          tokenizinWalletStore.fetchAllData(address as Address).then(() => {
            console.log('✅ [WalletSessionGuard] Wallet data loaded in background');
          }).catch((dataError) => {
            console.warn('⚠️ [WalletSessionGuard] Error loading wallet data (non-critical):', dataError);
          });
        }
        
        // Wait for session to be available (poll up to 2 seconds)
        const { getSession: getSessionFn } = await import('next-auth/react');
        let sessionAttempts = 0;
        let verifiedSession = null;
        
        while (sessionAttempts < 4 && !verifiedSession?.user) {
          await new Promise(resolve => setTimeout(resolve, 500));
          verifiedSession = await getSessionFn();
          sessionAttempts++;
          
          if (verifiedSession?.user) {
            const verifiedWallet = (verifiedSession.user as any).walletAddress;
            const verifiedWalletAbbr = verifiedWallet ? shortenAddress(verifiedWallet) : null;
            console.log(`✅ [WalletSessionGuard] Session verified: ${verifiedSession.user.email || verifiedWalletAbbr || addrAbbr} (attempt ${sessionAttempts})`);
            break;
          }
        }
        
        if (!verifiedSession?.user) {
          console.warn('⚠️ [WalletSessionGuard] Session not immediately available, will refresh page...');
        }
        
        // IMPORTANT: Reset authenticating state synchronously to prevent stuck state
        setAuthenticating(false);
        setIsChecking(false);
        resetForWallet(address);
        
        // Small delay to ensure React processes state update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log(`✅ [WalletSessionGuard] Authentication flow completed for ${addrAbbr || 'wallet'}`);
        
        // Trigger session update to cause useEffect to re-run and detect new session
        // Don't use router.refresh() as it can cause state reset issues
        await updateSession();
      } else {
        throw new Error(result?.error || 'Failed to create session');
      }
    } catch (err: any) {
      console.error('❌ [WalletSessionGuard] Authentication error:', err);
      
      // Check if user rejected signature
      if (err.message?.includes('User rejected') || 
          err.code === 4001 ||
          err.name === 'UserRejectedRequestError') {
        setSignatureError('Signature request was cancelled. Please try again.');
      } else {
        setSignatureError(err.message || 'Authentication failed. Please try again.');
      }
      
      // Reset state on error
      setAuthenticating(false);
      failSigning(err.message || 'Authentication failed');
      authInProgressRef.current = false;
    }
  }, [address, siweMessage, addrAbbr, updateSession, setSigningWalletAddress, setAuthenticating, setSignatureError, failSigning, resetForWallet]);

  // Check session validity when wallet connects or page loads
  useEffect(() => {
    // Only start checking after client mount to prevent hydration mismatch
    if (!isMounted) {
      return;
    }
    
    // Wait for session status to be determined
    if (sessionStatus === 'loading') {
      return;
    }

    // Don't check if auth is in progress (wait for it to complete)
    if (authInProgressRef.current) {
      return;
    }

    // Only check if wallet is connected
    if (!isConnected || !address) {
      setIsChecking(false);
      return;
    }

    // CRITICAL: Check persisted session state first to avoid unnecessary re-authentication
    if (persistedSession && persistedSession.address.toLowerCase() === address.toLowerCase()) {
      const isValid = isPersistedSessionValid();
      
      if (isValid) {
        // Persisted session is valid - check if NextAuth session matches
        if (sessionStatus === 'authenticated' && session?.user) {
          const sessionWallet = (session.user as any).walletAddress;
          if (sessionWallet && sessionWallet.toLowerCase() === address.toLowerCase()) {
            // Both persisted and NextAuth sessions are valid - skip re-authentication
            console.log(`✅ [WalletSessionGuard] Valid persisted session found for ${addrAbbr || 'wallet'}, skipping re-authentication`);
            setIsChecking(false);
            checkedRef.current = true;
            updateLastChecked();
            onSessionValidRef.current?.();
            
            // Trigger data fetching if needed
            if (address) {
                const tokenizinWalletStore = useTokenizinWalletStore.getState();
              if (!isFetchingAll || fetchingAddress !== address) {
                console.log(`📊 [WalletSessionGuard] Starting wallet data fetch for ${addrAbbr || 'wallet'}...`);
                tokenizinWalletStore.fetchAllData(address as Address).catch((dataError) => {
                  console.warn('⚠️ [WalletSessionGuard] Error loading wallet data (non-critical):', dataError);
                });
              }
            }
            return;
          }
        }
      } else {
        // Persisted session expired - clear it
        console.log(`⏰ [WalletSessionGuard] Persisted session expired for ${addrAbbr || 'wallet'}`);
        setCurrentSession(null);
      }
    }

    // Don't check if already checked recently (use persisted store's check interval)
    if (!shouldCheckSession()) {
      return;
    }

    // Reset checked flag if we have an authenticated session (allows re-check after auth)
    // This ensures that after signing, the session check runs again
    if (sessionStatus === 'authenticated' && session?.user && checkedRef.current) {
      // Verify the session wallet matches connected wallet before resetting
      const sessionWallet = (session.user as any).walletAddress;
      if (sessionWallet && address && sessionWallet.toLowerCase() === address.toLowerCase()) {
        // Session is valid and matches - reset to allow validation
        console.log(`🔄 [WalletSessionGuard] Resetting check flag for authenticated session (${addrAbbr || 'wallet'})`);
        checkedRef.current = false;
      }
    }

    // Don't check if already checked and session hasn't changed to authenticated
    if (checkedRef.current && sessionStatus !== 'authenticated') {
      return;
    }

    const checkSession = async () => {
      setIsChecking(true);
      setSignatureError(null);

      try {
        // Case 1: No session - let AppKit handle SIWE authentication automatically
        // AppKit's siweConfig.getSession() will check for existing sessions
        // If no session exists, AppKit will automatically prompt for signature
        // We don't need to manually trigger signatures here
        if (sessionStatus === 'unauthenticated' || !session?.user) {
          console.log(`🔐 [WalletSessionGuard] No session found for ${addrAbbr || 'wallet'}, AppKit will handle SIWE authentication automatically`);
          console.log(`   Session status: ${sessionStatus}`);
          console.log(`   Wallet connected: ${isConnected}`);
          console.log(`   Wallet address: ${address}`);
          
          // Ensure AppKit modal is open if wallet is connected but no session exists
          // AppKit should automatically prompt for signature via siweConfig
          if (isConnected && address && appKit) {
            console.log(`   AppKit instance available, SIWE flow should trigger automatically`);
            // AppKit's SIWE will check getSession() and prompt if needed
            // We don't need to manually open the modal - AppKit handles it
          }
          
          setIsChecking(false);
          checkedRef.current = true;
          onSessionInvalidRef.current?.();
          return;
        }

        // Case 2: Session exists - check if valid and not expired
        if (sessionStatus === 'authenticated' && session?.user) {
          // Check if session is expired
          const isExpired = session.expires ? new Date(session.expires) < new Date() : false;
          
          if (isExpired) {
            console.log(`⏰ [WalletSessionGuard] Session expired for ${addrAbbr || 'wallet'}, AppKit will handle re-authentication automatically`);
            // Let AppKit's SIWE session management handle expired sessions
            // AppKit will detect the expired session via siweConfig.getSession() and prompt for re-authentication
            setIsChecking(false);
            checkedRef.current = true;
            onSessionInvalidRef.current?.();
            return;
          }
          
          // Check if wallet matches session
          const sessionWallet = (session.user as any).walletAddress;
          const sessionWalletAbbr = sessionWallet ? shortenAddress(sessionWallet) : null;
          if (sessionWallet && address && sessionWallet.toLowerCase() !== address.toLowerCase()) {
            console.log(`⚠️ [WalletSessionGuard] Session wallet ${sessionWalletAbbr} does not match connected wallet ${addrAbbr}, AppKit will handle re-authentication automatically`);
            // Wallet mismatch - let AppKit's SIWE session management handle re-authentication
            // AppKit will detect the mismatch and prompt for signature with the new wallet
            setIsChecking(false);
            checkedRef.current = true;
            onSessionInvalidRef.current?.();
            return;
          }
          
          // Verify server-side session status and audit log before treating as active
          try {
            const statusResponse = await fetch('/api/auth/wallet/session-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ walletAddress: address }),
            });

            if (!statusResponse.ok) {
              console.warn('⚠️ [WalletSessionGuard] Session status check failed with HTTP error');
              setIsChecking(false);
              checkedRef.current = true;
              onSessionInvalidRef.current?.();
              return;
            }

            const statusData = await statusResponse.json();
            if (!statusData?.active || !statusData?.auditLogged) {
              console.warn('⚠️ [WalletSessionGuard] Session status inactive or audit missing, treating as invalid');
              setIsChecking(false);
              checkedRef.current = true;
              onSessionInvalidRef.current?.();
              return;
            }
          } catch (statusError) {
            console.warn('⚠️ [WalletSessionGuard] Session status validation error:', statusError);
            setIsChecking(false);
            checkedRef.current = true;
            onSessionInvalidRef.current?.();
            return;
          }
          
          // Valid session exists - persist to Zustand store
          console.log(`✅ [WalletSessionGuard] Valid session exists for ${addrAbbr || 'wallet'}`);
          
          // Persist session to Zustand store for future page loads
          if (address) {
            const sessionExpiresAt = session.expires 
              ? new Date(session.expires).toISOString()
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Default 7 days
            
            setCurrentSession({
              address: address as Address,
              chainId: network?.chainId ? parseInt(network.chainId as string) : 11155111, // Default to Sepolia
              expiresAt: sessionExpiresAt,
              sessionId: session.user.id,
            });
            
            completeSessionCheck({
              address: address as Address,
              chainId: network?.chainId ? parseInt(network.chainId as unknown as string) : 11155111,
              expiresAt: sessionExpiresAt,
              sessionId: session.user.id,
            });
            
            console.log(`💾 [WalletSessionGuard] Session persisted to Zustand store for ${addrAbbr || 'wallet'}`);
          }
          
          // Check user completeness and initialize if needed
          try {
            const completenessResponse = await fetch('/api/auth/wallet/check-completeness', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                walletAddress: address,
                initializeMissing: true, // Automatically initialize missing records
              }),
            });
            
            if (completenessResponse.ok) {
              const completenessData = await completenessResponse.json();
              if (!completenessData.isComplete && completenessData.missingRecords?.length > 0) {
                console.log(`🔄 [WalletSessionGuard] Initializing missing user records: ${completenessData.missingRecords.join(', ')}`);
                // User initialization happens automatically via the API
              } else {
                console.log(`✅ [WalletSessionGuard] User is fully initialized`);
              }
            }
          } catch (completenessError) {
            console.warn('⚠️ [WalletSessionGuard] Error checking user completeness (non-critical):', completenessError);
          }
          
          setIsChecking(false);
          checkedRef.current = true;
          updateLastChecked();
          
          // Trigger data fetching when session is valid
          if (address) {
            const tokenizinWalletStore = useTokenizinWalletStore.getState();
            // Only fetch if not already fetching for this address
            if (!isFetchingAll || fetchingAddress !== address) {
              console.log(`📊 [WalletSessionGuard] Starting wallet data fetch for ${addrAbbr || 'wallet'}...`);
              // Fire and forget - don't await
              tokenizinWalletStore.fetchAllData(address as Address).catch((dataError) => {
                console.warn('⚠️ [WalletSessionGuard] Error loading wallet data (non-critical):', dataError);
              });
            }
          }
          
          onSessionValidRef.current?.();
          return;
        }
      } catch (err) {
        console.error('❌ [WalletSessionGuard] Session check error:', err);
        setSignatureError('Failed to check session. Please try again.');
        setIsChecking(false);
      }
    };

    checkSession();
  }, [sessionStatus, session, isConnected, address, addrAbbr, handleSignatureSuccess, isMounted, setSiweMessage, setSigningWalletAddress, startSigning, setAuthenticating, completeSigning, failSigning, setSignatureError, persistedSession, isPersistedSessionValid, setCurrentSession, completeSessionCheck, updateLastChecked, shouldCheckSession, network]);

  // Show consistent loading state during SSR/hydration to prevent mismatch
  // Only show loading state after client mount to avoid hydration errors
  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground dark:text-gray-400">Checking session...</p>
      </div>
    );
  }

  // Check if wallet data is being fetched for this address
  const isInitializingWallet = isFetchingAll && fetchingAddress === address;

  // Show checking/authenticating state only after client mount
  if (isChecking || isAuthenticating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600 mb-4" />
        <p className="text-sm text-muted-foreground dark:text-gray-400">
          {isAuthenticating ? 'Signing message...' : 'Checking session...'}
        </p>
        {signatureError && (
          <Alert variant="destructive" className="mt-4 max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{signatureError}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // Show wallet initialization progress after signature is complete
  if (isInitializingWallet && address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-gray-950 p-4">
        <WalletInitializationProgress walletAddress={address as Address} />
      </div>
    );
  }

  // Render children if session is valid
  return <>{children}</>;
}

