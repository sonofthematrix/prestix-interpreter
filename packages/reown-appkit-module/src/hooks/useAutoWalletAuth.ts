/**
 * Automatic Wallet Authentication Hook
 * 
 * This hook manages the ENTIRE wallet authentication lifecycle automatically.
 * NO manual signature buttons needed - everything happens automatically after wallet connection.
 * 
 * Flow:
 * 1. Wallet connects → Store updates
 * 2. Hook detects connection → Checks if auth needed
 * 3. Gets nonce from server
 * 4. Requests signature from wallet (ONE TIME)
 * 5. Verifies signature
 * 6. Creates NextAuth session
 * 7. Updates store to authenticated state
 * 
 * The store prevents duplicate requests across ALL components.
 */

'use client';

import { useAppKitAccount } from '@reown/appkit/react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { useAccount, useChainId, useSignMessage } from 'wagmi';
import { useWalletConnectionStore } from '../lib/store/walletConnectionStore';

export interface UseAutoWalletAuthOptions {
  redirectUrl?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useAutoWalletAuth(options: UseAutoWalletAuthOptions = {}) {
  const { redirectUrl, onSuccess, onError } = options;
  
  // Wagmi hooks
  const { address, isConnected, connector, status } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const chainId = useChainId();
  
  // AppKit hooks
  const { address: appKitAddress, isConnected: appKitConnected } = useAppKitAccount();
  
  // NextAuth session
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  // Wallet connection store
  const store = useWalletConnectionStore();
  
  // Track if we've processed this connection
  const processedConnection = useRef(false);
  const authInProgress = useRef(false);
  const sessionChecked = useRef(false);

  // Refs to track latest connection state (for async checks)
  const statusRef = useRef(status);
  const isConnectedRef = useRef(isConnected);
  const connectorRef = useRef(connector);

  // Update refs when values change
  useEffect(() => {
    statusRef.current = status;
    isConnectedRef.current = isConnected;
    connectorRef.current = connector;
  }, [status, isConnected, connector]);

  // Resolve address and connection state
  const resolvedAddress = address || appKitAddress;
  const resolvedConnected = isConnected || appKitConnected;

  /**
   * Update store when wallet connection changes
   */
  useEffect(() => {
    if (resolvedConnected && resolvedAddress) {
      // Update connector status based on Wagmi status
      if (status === 'reconnecting') {
        store.setConnectorStatus('reconnecting');
      } else if (status === 'connecting') {
        store.setConnectorStatus('connecting');
      } else if (status === 'connected') {
        store.setConnectorStatus('connected');
      }

      // Only update if address changed
      if (store.address !== resolvedAddress) {
        console.log('🔌 [AutoWalletAuth] Wallet state changed:', {
          address: resolvedAddress,
          connector: connector?.name,
          status,
        });
        
        store.setConnected(
          resolvedAddress,
          chainId,
          connector?.name || 'Unknown'
        );
      }
    } else if (!resolvedConnected && store.address) {
      console.log('🔌 [AutoWalletAuth] Wallet disconnected');
      store.setDisconnected();
      processedConnection.current = false;
      authInProgress.current = false;
      sessionChecked.current = false;
    }
  }, [resolvedAddress, resolvedConnected, status, connector, store]);

  /**
   * Check if already authenticated via NextAuth session
   * CRITICAL: Only run once per wallet address to prevent infinite loop
   */
  useEffect(() => {
    // Skip if already checked or already authenticated
    if (sessionChecked.current || store.connectionStatus === 'authenticated') {
      return;
    }

    if (sessionStatus === 'authenticated' && session?.user && store.address) {
      const sessionAddress = (session.user as any).walletAddress;
      
      if (sessionAddress && sessionAddress.toLowerCase() === store.address.toLowerCase()) {
        console.log('✅ [AutoWalletAuth] Session already exists, marking as authenticated');
        sessionChecked.current = true; // Prevent re-checking
        store.setAuthenticated();
      }
    }
  }, [sessionStatus, session, store.address, store.connectionStatus]);

  /**
   * Main authentication function
   */
  const authenticate = useCallback(async () => {
    // Prevent concurrent calls
    if (authInProgress.current) {
      console.log('⏭️ [AutoWalletAuth] Authentication already in progress');
      return;
    }

    const walletAddress = resolvedAddress || store.address;
    
    if (!walletAddress) {
      console.log('❌ [AutoWalletAuth] No wallet address available');
      return;
    }

    // Check with store if we should authenticate
    const shouldAuth = store.startAuthentication();
    if (!shouldAuth) {
      console.log('⏭️ [AutoWalletAuth] Skipping authentication (store check failed)');
      return;
    }

    authInProgress.current = true;

    try {
      console.log('🔐 [AutoWalletAuth] Starting authentication for:', walletAddress);

      // Step 1: Get nonce from server
      console.log('📝 [AutoWalletAuth] Requesting nonce...');
      const nonceResponse = await fetch(`/api/auth/wallet/nonce?address=${walletAddress}`);
      
      if (!nonceResponse.ok) {
        const errorData = await nonceResponse.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || `Server error: ${nonceResponse.status}`;
        throw new Error(errorMsg);
      }
      
      const { message: siweMessage, nonce, expiresAt } = await nonceResponse.json();
      console.log('✅ [AutoWalletAuth] Nonce received');

      // Store nonce
      store.setNonce(nonce, siweMessage);

      // Step 2: Ensure connector is ready before signing
      console.log('⏳ [AutoWalletAuth] Verifying connector readiness...');
      console.log('   Connector status:', {
        status: statusRef.current,
        isConnected: isConnectedRef.current,
        connector: connectorRef.current?.name,
        connectorStatus: store.connectorStatus,
        walletAddress,
      });

      // Wait for connector to be fully connected (max 8 seconds on mobile)
      // Mobile wallets may take longer to initialize
      let connectorReady = false;
      const maxWaitTime = 8000; // Increased to 8 seconds for mobile
      const checkInterval = 150; // Check every 150ms (less frequent checks)
      const startTime = Date.now();

      while (!connectorReady && (Date.now() - startTime) < maxWaitTime) {
        // Check if wagmi connector is connected using refs (latest values)
        const currentStatus = statusRef.current;
        const currentConnected = isConnectedRef.current;
        const currentConnector = connectorRef.current;

        // MOBILE-FRIENDLY: If we have an address and store shows connected, proceed
        // This handles cases where wagmi status hasn't updated but wallet is functional
        const hasAddress = !!(walletAddress || store.address);
        const storeIsReady = store.connectorStatus === 'connected' || store.connectionStatus === 'connected';
        
        // Primary check: wagmi connector fully connected
        if (currentStatus === 'connected' && currentConnected && currentConnector) {
          connectorReady = true;
          console.log('✅ [AutoWalletAuth] Connector ready (wagmi):', currentConnector.name);
          break;
        }
        
        // Fallback check: If we have address and store thinks we're connected, 
        // and wagmi is not actively disconnecting, proceed (mobile workaround)
        if (hasAddress && storeIsReady && currentStatus !== 'disconnected' && currentStatus !== 'reconnecting') {
          // Additional safety: Check if connector exists (even if wagmi status is stale)
          if (currentConnector || connectorRef.current) {
            connectorReady = true;
            console.log('✅ [AutoWalletAuth] Connector ready (fallback - mobile workaround):', {
              address: walletAddress,
              storeStatus: store.connectorStatus,
              wagmiStatus: currentStatus,
            });
            break;
          }
        }

        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      if (!connectorReady) {
        // More informative error message
        const errorMsg = `Wallet connection timeout. Please ensure your wallet is connected and try again.`;
        const debugInfo = `Status: ${statusRef.current}, Connected: ${isConnectedRef.current}, Connector: ${connectorRef.current?.name || 'none'}, Address: ${walletAddress || 'none'}`;
        console.error('❌ [AutoWalletAuth]', errorMsg);
        console.error('   Debug info:', debugInfo);
        store.setSignatureFailed(errorMsg);
        throw new Error(errorMsg);
      }

      // Final check: Ensure we have a connector reference
      if (!connectorRef.current && !connector) {
        const errorMsg = 'No connector available. Please reconnect your wallet.';
        console.error('❌ [AutoWalletAuth]', errorMsg);
        store.setSignatureFailed(errorMsg);
        throw new Error(errorMsg);
      }

      console.log('✅ [AutoWalletAuth] Connector ready:', connectorRef.current.name);

      // Add a small delay to ensure wagmi's connector client is fully initialized
      await new Promise(resolve => setTimeout(resolve, 200));

      // Step 3: Request signature from wallet
      console.log('📝 [AutoWalletAuth] Requesting signature from wallet...');
      store.requestSignature();
      
      // Wait a moment for store update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      store.setSignaturePending();
      
      let signature: string;
      
      try {
        signature = await signMessageAsync({
          message: siweMessage,
          account: walletAddress as `0x${string}`,
        });
        
        console.log('✅ [AutoWalletAuth] Message signed successfully');
        store.setSignatureSuccess(signature);
        
      } catch (signError: any) {
        // Check if user rejected - this is a user action, not an error
        if (signError.message?.includes('User rejected') || 
            signError.code === 4001 ||
            signError.name === 'UserRejectedRequestError') {
          console.log('⏭️ [AutoWalletAuth] User rejected signature request');
          store.setSignatureRejected();
          // Don't throw error - user action, not a system error
          authInProgress.current = false;
          return; // Exit gracefully without showing error
        }
        
        // Other errors are actual failures
        console.error('❌ [AutoWalletAuth] Signature failed:', signError);
        store.setSignatureFailed(signError.message || 'Failed to sign message');
        throw signError;
      }

      // Step 3: Verify signature on server
      console.log('🔍 [AutoWalletAuth] Verifying signature...');
      const verifyResponse = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: siweMessage,
          signature,
          nonce,
          walletType: connector?.name,
          chainId,
          networkName: 'Ethereum',
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'Signature verification failed');
      }

      const { user, session: walletSession, isNewUser } = await verifyResponse.json();
      console.log('✅ [AutoWalletAuth] Signature verified');
      console.log('   Is new user:', isNewUser);
      console.log('💾 Wallet session data:', {
        sessionId: walletSession?.sessionId,
        chainId: walletSession?.chainId,
        networkName: walletSession?.networkName,
        walletType: walletSession?.walletType,
        ensName: walletSession?.ensName
      });

      // Step 4: Create NextAuth session
      console.log('🔐 [AutoWalletAuth] Creating session...');
      const result = await signIn('credentials', {
        redirect: false,
        email: user.email,
        password: signature,
        isWalletAuth: true,
        walletAddress: walletAddress,
        signature,
        nonce,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      console.log('✅ [AutoWalletAuth] Session created successfully');

      // Update Zustand auth store with complete authentication data
      console.log('💾 Updating auth store with wallet session data...');
      const { useAuthStore } = await import('@/stores/auth-store');
      const authStore = useAuthStore.getState();
      
      // Set user data
      authStore.setUser(user);
      
      // Set wallet data
      authStore.setWalletData({
        address: walletAddress,
        walletType: walletSession?.walletType || connector?.name || 'unknown',
        chainId: walletSession?.chainId || chainId,
        networkName: walletSession?.networkName || 'Ethereum',
        ensName: walletSession?.ensName,
      });
      
      console.log('✅ Auth store updated successfully');
      console.log('   User:', user.email);
      console.log('   Wallet:', walletAddress);
      console.log('   Chain:', walletSession?.chainId || chainId);
      console.log('   Network:', walletSession?.networkName || 'Ethereum');
      console.log('   ENS:', walletSession?.ensName || 'none');

      // Mark as authenticated in store
      store.setAuthenticated();
      
      // Call success callback
      onSuccess?.();

      // Redirect based on user type
      if (isNewUser) {
        console.log('👋 [AutoWalletAuth] New user detected - redirecting to welcome page');
        router.push('/auth/welcome?newUser=true');
      } else if (redirectUrl) {
        console.log('🔀 [AutoWalletAuth] Redirecting to:', redirectUrl);
        router.push(redirectUrl);
      } else {
        console.log('🔀 [AutoWalletAuth] Redirecting to home');
        router.push('/');
      }
      router.refresh();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      
      // Check if user rejected - don't treat as error
      if (errorMessage.includes('rejected') || errorMessage.includes('User rejected')) {
        console.log('⏭️ [AutoWalletAuth] Authentication cancelled by user');
        // Don't set error state for user rejection
        authInProgress.current = false;
        return; // Exit gracefully
      }
      
      console.error('❌ [AutoWalletAuth] Authentication error:', errorMessage);
      
      store.setError(errorMessage);
      onError?.(errorMessage);
      
    } finally {
      authInProgress.current = false;
    }
  }, [resolvedAddress, store, connector, signMessageAsync, onSuccess, onError, redirectUrl, router]);

  /**
   * Auto-trigger authentication when wallet is ready
   * 
   * ⚠️ DISABLED: AppKit handles SIWE authentication automatically
   * This hook should NOT automatically request signatures - AppKit is the ONLY
   * requester and receiver of message signature requests.
   * 
   * Manual authentication can still be triggered via the `authenticate()` function
   * if needed, but automatic signature requests are disabled to prevent duplicate
   * signature requests (AppKit handles this through its SIWE flow).
   */
  useEffect(() => {
    // ⚠️ AUTOMATIC SIGNATURE REQUESTS DISABLED
    // AppKit handles all signature requests through its SIWE configuration
    // This prevents duplicate signature requests that MetaMask flags as high risk
    
    // Only log connection state - don't trigger authentication automatically
    if (store.isWalletReady()) {
      console.log('🔌 [AutoWalletAuth] Wallet connected - AppKit will handle SIWE authentication');
      console.log('   Connection status:', store.connectionStatus);
      console.log('   Address:', store.address);
      
      // Mark as processed to prevent any automatic triggers
      processedConnection.current = true;
    }
    
    // ⚠️ REMOVED: Automatic signature request via authenticate()
    // AppKit's SIWE flow handles all signature requests automatically
    // If manual authentication is needed, call authenticate() explicitly
  }, [store.address, store.connectionStatus, store.connectorStatus]);

  // Return store state and actions
  return {
    // State
    address: store.address,
    isConnected: store.connectionStatus !== 'disconnected',
    isAuthenticating: store.connectionStatus === 'authenticating',
    isAuthenticated: store.connectionStatus === 'authenticated',
    connectionStatus: store.connectionStatus,
    signatureStatus: store.signatureStatus,
    error: store.error,
    connector: store.connector,
    
    // Actions (rarely needed, but available)
    authenticate,
    clearError: store.clearError,
    reset: store.reset,
  };
}
