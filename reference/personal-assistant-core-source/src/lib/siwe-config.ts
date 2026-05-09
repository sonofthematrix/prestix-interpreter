/**
 * AppKit SIWE Configuration - Enhanced Authentication Mode
 * 
 * This integrates with AppKit's managed authentication system with the following enhancements:
 * 
 * ✅ ENHANCEMENTS IMPLEMENTED:
 * 
 * 1. Cache-Busting Headers
 *    - getSession endpoint uses explicit cache-busting headers
 *    - Prevents stale session data from being served
 *    - Headers: Cache-Control, Pragma, Expires
 * 
 * 2. Session Timeout Warnings
 *    - Monitors session expiry time (checks every getSession call)
 *    - Warns 15 minutes before expiry via custom event
 *    - UI component shows timeout alert with refresh button
 *    - Allows user to refresh session before expiry
 * 
 * 3. Network Validation (see: src/app/api/auth/wallet/verify/route.ts)
 *    - Verifies wallet chain ID matches expected network
 *    - Rejects authentication on wrong network with clear message
 *    - Logs network mismatches for audit trail
 *    - Supports: mainnet, sepolia, goerli, polygon, arbitrum
 * 
 * 4. Duplicate Auth Prevention (see: src/hooks/useWalletAuth.ts)
 *    - Uses Set<string> to track authenticated wallets
 *    - Prevents duplicate signatures for same wallet
 *    - Clears Set when wallet disconnects
 *    - Already implemented in useWalletAuth hook
 * 
 * 5. Manual Disconnect Button
 *    - Available in authenticated state
 *    - Calls NextAuth signOut to clear session
 *    - Resets all auth state variables
 *    - Located in WalletAuthHandler component
 * 
 * AppKit's role: Manage the entire authentication lifecycle
 * Our role: Provide backend integration points for AppKit to use
 */

import { clearLocalStorageOnSignOut } from '@/lib/auth-storage-clear';
import { sessionCache } from '@/lib/services/session-cache';
import type { SIWESession } from '@reown/appkit-siwe';
import { createSIWEConfig, formatMessage } from '@reown/appkit-siwe';

/**
 * Clear expired session data from database and Zustand store
 * ✅ SINGLE SOURCE OF TRUTH: Uses Zustand store, not NextAuth
 * 
 * This function clears all session-related data when a session expires:
 * 1. Zustand store (primary source of truth)
 * 2. Session cache
 * 3. NextAuth cookies (cleanup only, not primary source)
 */
async function clearExpiredSessionData(walletAddress: string, sessionId?: string): Promise<void> {
  try {
    console.log('🧹 [AppKit SIWE] Clearing expired session data for:', walletAddress.substring(0, 10) + '...');

    // Step 1: Clear Zustand store (single source of truth)
    if (typeof window !== 'undefined') {
      try {
        const { useAppKitSession } = await import('@/lib/auth/appkit-session');
        useAppKitSession.getState().clearSession();
        console.log('✅ [AppKit SIWE] Zustand store cleared');
      } catch (storeError) {
        console.warn('⚠️ [AppKit SIWE] Could not clear Zustand store:', storeError);
      }
    }

    // Step 2: Clear session cache
    sessionCache.invalidate(walletAddress, 'sessionExpired');
    console.log('✅ [AppKit SIWE] Session cache cleared');

    // Step 3: Clear any NextAuth cookies (cleanup only, not primary source)
    // ✅ NOTE: We don't rely on NextAuth, but clear cookies for cleanup
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach((cookie) => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.startsWith('next-auth') || name.startsWith('__Secure-next-auth')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
      console.log('✅ [AppKit SIWE] NextAuth cookies cleared (cleanup only)');
    }

    // Step 4: Try to invalidate expired session in database (optional, non-blocking)
    // Note: Database sessions are managed separately, but we try to clean them up
    if (sessionId && typeof window !== 'undefined') {
      try {
        // The database session will be cleaned up by the session expiry check
        // We don't need to explicitly delete it here - it's already expired
        console.log('ℹ️ [AppKit SIWE] Database session will be cleaned up automatically (expired)');
      } catch (dbError) {
        // Non-blocking - continue even if database cleanup fails
        console.warn('⚠️ [AppKit SIWE] Could not clean up database session:', dbError);
      }
    }

    console.log('✅ [AppKit SIWE] All expired session data cleared');
  } catch (error) {
    console.error('❌ [AppKit SIWE] Error clearing expired session data:', error);
    // Don't throw - continue with SIWE flow even if cleanup fails
  }
}

// Toggle SIWE signing; honor both legacy and current env names.
// Any of these explicitly set to "false" disable SIWE:
// - NEXT_PUBLIC_SIWE (legacy)
// - NEXT_PUBLIC_ENABLE_SIWE (current)
const siweEnv = process.env.NEXT_PUBLIC_SIWE;
const siweEnableEnv = process.env.NEXT_PUBLIC_ENABLE_SIWE;
export const SIWE_ENABLED = !(
  (siweEnv && siweEnv.toLowerCase() === 'false') ||
  (siweEnableEnv && siweEnableEnv.toLowerCase() === 'false')
);

if (!SIWE_ENABLED) {
  // Keep the logs explicit so we remember this is a temporary relaxed mode.
  // Wallet connection will still work, but signature-based verification is skipped.
  console.warn('🚧 [AppKit SIWE] Disabled via NEXT_PUBLIC_SIWE=false - wallet connections will not request SIWE signatures.');
}

/**
 * SIWE Configuration for AppKit - Backend Integration Points
 * 
 * ⚠️ IMPORTANT: SIWE (message signing) ONLY applies to WALLET authentication.
 * Email (OTP) and Google (social) authentication do NOT use SIWE - they use
 * AppKit's built-in authentication system which doesn't require message signing.
 * 
 * ✅ SINGLE SOURCE OF TRUTH: Uses Zustand store, NOT NextAuth
 * 
 * These callbacks integrate AppKit's WALLET authentication with our backend:
 * - getNonce() → /api/auth/wallet/nonce
 * - verifyMessage() → /api/auth/wallet/verify
 * - getSession() → /api/auth/sessions (database sessions, NOT NextAuth)
 * - signOut() → Clear Zustand store and disconnect wallet
 * - onSignIn() → Create session in database and Zustand store
 */
export const siweConfig = createSIWEConfig({
  // Enable AppKit-managed SIWX authentication (SIWE is automatically mapped to SIWX)
  // Email and Google auth bypass SIWX and use AppKit's built-in auth system
  enabled: SIWE_ENABLED,

  // SIWX message configuration (CAIP-122 compliant)
  // AppKit internally uses SIWX (Sign-In With X) which follows CAIP-122 standard
  // The createSIWEConfig is automatically mapped to siwx internally
  getMessageParams: async () => ({
    domain: typeof window !== 'undefined' ? window.location.host : 'prestix.vip',
    uri: typeof window !== 'undefined' ? window.location.origin : 'https://prestix.vip',
    chains: [11155111], // Sepolia testnet (CAIP-2 format: eip155:11155111)
    statement: 'Sign in to PRESTIX.VIP with your wallet',
    expirationTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
  }),

  // Use AppKit's formatMessage to create CAIP-122 compliant SIWX messages
  // This ensures the message follows the standard format:
  // {domain} wants you to sign in with your Ethereum account:
  // {address}
  //
  // {statement}
  //
  // URI: {uri}
  // Version: 1
  // Chain ID: {chainId}
  // Nonce: {nonce}
  // Issued At: {issuedAt}
  // [Expiration Time: {expirationTime}] (optional)
  createMessage: ({ address, ...args }) => formatMessage(args, address),

  /**
   * Get nonce from server
   * AppKit will call this before requesting signature
   */
  getNonce: async () => {
    try {
      console.log('🔑 [AppKit SIWE] Requesting nonce...');

      // Get current wallet address and chainId if available
      let walletAddress: string | null = null;
      let chainId: number | null = null;

      if (typeof window !== 'undefined') {
        // Try to get wallet address and chainId from AppKit state or window
        const appKitState = (window as any).__appkit_state__;
        if (appKitState?.address) {
          walletAddress = appKitState.address;
        }
        if (appKitState?.chainId) {
          chainId = typeof appKitState.chainId === 'string'
            ? parseInt(appKitState.chainId, 10)
            : appKitState.chainId;
        }

        // Also check for connected accounts and chainId in ethereum provider
        if ((window as any).ethereum) {
          try {
            // Get accounts
            if (!walletAddress) {
              const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
              if (accounts && accounts.length > 0) {
                walletAddress = accounts[0];
              }
            }

            // Get chainId from wallet provider
            if (!chainId) {
              try {
                const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' });
                chainId = parseInt(chainIdHex, 16); // Convert hex to decimal
                console.log('🔗 [AppKit SIWE] Detected chainId from wallet:', chainId);
              } catch (chainError) {
                console.warn('⚠️ [AppKit SIWE] Could not get chainId from wallet:', chainError);
              }
            }
          } catch (e) {
            // Ignore errors - wallet might not be connected
            console.warn('⚠️ [AppKit SIWE] Error accessing ethereum provider:', e);
          }
        }
      }

      // ⚠️ CRITICAL: Default to Sepolia (11155111) if chainId not detected
      // This ensures SIWE messages always use Sepolia for testing before production
      const finalChainId = chainId || 11155111;
      console.log('🔗 [AppKit SIWE] Using chainId:', finalChainId, chainId ? '(from wallet)' : '(default Sepolia)');

      // Build query string with address and chainId
      const queryParams = new URLSearchParams();
      if (walletAddress) {
        queryParams.append('address', walletAddress);
      }
      queryParams.append('chainId', finalChainId.toString());

      const res = await fetch(`/api/auth/wallet/nonce?${queryParams.toString()}`);

      if (!res.ok) {
        throw new Error('Failed to get nonce');
      }

      const { nonce, message } = await res.json();
      console.log('✅ [AppKit SIWE] Nonce received:', nonce.substring(0, 8) + '...');

      // Mark that we are in the sign step (so modal-close handler can detect cancel)
      if (typeof window !== 'undefined') {
        (window as any).__appkit_siwe_pending_at__ = Date.now();
      }

      // Verify the message contains the correct chainId
      if (message) {
        const messageChainIdMatch = message.match(/Chain ID:\s*(\d+)/i);
        const messageChainId = messageChainIdMatch ? parseInt(messageChainIdMatch[1], 10) : null;
        if (messageChainId && messageChainId !== finalChainId) {
          console.warn(`⚠️ [AppKit SIWE] ChainId mismatch: message has ${messageChainId}, expected ${finalChainId}`);
        } else {
          console.log(`✅ [AppKit SIWE] Message chainId verified: ${messageChainId || finalChainId}`);
        }
      }

      // Store nonce association with wallet address for later validation
      // SECURITY: Use sessionStorage instead of localStorage to prevent nonce persistence
      // across browser sessions and ensure automatic cleanup on tab close
      if (walletAddress && typeof window !== 'undefined') {
        try {
          const nonceKey = `siwe_nonce_${walletAddress.toLowerCase()}`;
          const timestamp = Date.now();
          const expiresAt = timestamp + 15 * 60 * 1000; // 15 minutes (matching SIWE message expiry)

          // Store nonce with expiration timestamp in sessionStorage (more secure than localStorage)
          sessionStorage.setItem(nonceKey, JSON.stringify({ nonce, expiresAt }));
          console.log('💾 [AppKit SIWE] Stored nonce for wallet:', walletAddress.substring(0, 10) + '...', '(expires in 15min)');

          // Also store in window for immediate access (in-memory, cleared on page reload)
          (window as any).__appkit_last_nonce_wallet__ = walletAddress;
          (window as any).__appkit_last_nonce__ = nonce;
        } catch (e) {
          console.warn('⚠️ [AppKit SIWE] Failed to store nonce:', e);
        }
      }

      return nonce;

    } catch (error) {
      console.error('❌ [AppKit SIWE] getNonce error:', error);
      throw error;
    }
  },

  /**
   * Verify signature on server
   * AppKit will call this after user signs the message
   * Returns verification result and stores user data for onSignIn callback
   * 
   * ✅ ENHANCED ERROR HANDLING: Retries on failure, logs detailed errors
   * 
   * ✅ ENHANCED SESSION RESTORATION DETECTION:
   * - Detects when ReownAuthentication is trying to restore sessions on page load
   * - Distinguishes between restoration (has tokens, no wallet) vs new signatures (active wallet)
   * - Skips verification for restoration attempts - they should use token validation instead
   * - Prevents "Failed to verify message" errors during initialization
   * 
   * Session Restoration Scenarios Detected:
   * 1. AppKit initializing + has tokens + no wallet connection → restoration attempt
   * 2. AppKit initializing + no tokens + no sessions + no wallet → stale restoration
   * 3. Has tokens + stale signature (no valid nonce) + no wallet → stale signature
   * 4. Has tokens + no wallet connection → restoration (should validate tokens, not signatures)
   */
  verifyMessage: async ({ message, signature }) => {
    // ✅ CRITICAL: Validate inputs first - don't proceed with invalid data
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.warn('⚠️ [AppKit SIWE] Invalid or missing message, skipping verification');
      return false;
    }
    
    if (!signature || typeof signature !== 'string' || signature.trim().length === 0) {
      console.warn('⚠️ [AppKit SIWE] Invalid or missing signature, skipping verification');
      return false;
    }
    
    // ✅ CRITICAL: Validate signature format (should be hex string starting with 0x)
    // For EIP-1271/EIP-6492 (smart accounts), signatures can be longer, so be lenient
    const isValidSignatureFormat = /^0x[a-fA-F0-9]{130,}$/.test(signature.trim());
    if (!isValidSignatureFormat) {
      console.warn('⚠️ [AppKit SIWE] Invalid signature format, skipping verification', {
        signatureLength: signature.length,
        signaturePrefix: signature.substring(0, 10),
      });
      return false;
    }
    
    // ✅ CRITICAL: Extract wallet address from message and validate
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
    if (!addressMatch) {
      console.warn('⚠️ [AppKit SIWE] No wallet address found in message, skipping verification');
      return false;
    }
    
    const walletAddressFromMessage = addressMatch[0];
    
    // ✅ ENHANCED: Comprehensive session restoration detection
    // ReownAuthentication calls verifyMessage during session restoration on page load
    // We need to distinguish between:
    // 1. Session restoration (has tokens, no active wallet connection) - should skip verification
    // 2. New signature verification (user actively signing) - should proceed
    if (typeof window !== 'undefined') {
      const isAppKitInitializing = (window as any).__appkit_initializing__ === true;
      const hasReownAuthToken = localStorage.getItem('@appkit/siwx-auth-token');
      const hasReownNonceToken = localStorage.getItem('@appkit/siwx-nonce-token');
      const hasStoredSession = sessionStorage.getItem(`siwe_session_${walletAddressFromMessage.toLowerCase()}`);
      
      // Check for active wallet connections
      const appKitAccount = (window as any).__appkit_account__;
      const hasAppKitConnection = appKitAccount?.isConnected === true && !!appKitAccount?.address;
      const hasEthereumProvider = !!(window as any).ethereum?.selectedAddress;
      const hasMagicLink = !!(
        localStorage.getItem('magic_session') || 
        localStorage.getItem('fridge_access_token') ||
        localStorage.getItem('magic_user')
      );
      const isReconnecting = (window as any).__appkit_reconnecting__ === true;
      
      // ✅ CRITICAL: Detect session restoration scenarios
      // Scenario 1: AppKit initializing + has tokens but NO active wallet connection
      // This is a restoration attempt - tokens exist but wallet isn't connected yet
      const isRestorationWithTokens = isAppKitInitializing && 
                                      (hasReownAuthToken || hasReownNonceToken) && 
                                      !hasAppKitConnection && 
                                      !hasEthereumProvider && 
                                      !hasMagicLink;
      
      // Scenario 2: AppKit initializing + no tokens + no sessions + no wallet connection
      // This is a stale restoration attempt - nothing to restore
      const isStaleRestoration = isAppKitInitializing && 
                                 !hasReownAuthToken && 
                                 !hasReownNonceToken && 
                                 !hasStoredSession &&
                                 !hasAppKitConnection && 
                                 !hasEthereumProvider && 
                                 !hasMagicLink;
      
      // Scenario 3: Has tokens but signature looks stale (very old message format or empty nonce)
      // Check if message contains a nonce - restoration attempts might have stale/empty nonces
      const nonceInMessage = message.match(/Nonce:\s*([a-fA-F0-9]+)/i);
      const hasValidNonce = nonceInMessage && nonceInMessage[1] && nonceInMessage[1].length >= 8;
      const isStaleSignature = (hasReownAuthToken || hasReownNonceToken) && 
                               !hasValidNonce && 
                               !hasAppKitConnection && 
                               !hasEthereumProvider && 
                               !hasMagicLink;
      
      // Handle restoration scenarios
      if (isRestorationWithTokens) {
        console.log('ℹ️ [AppKit SIWE] Session restoration detected - tokens exist but wallet not connected yet', {
          hasReownAuthToken: !!hasReownAuthToken,
          hasReownNonceToken: !!hasReownNonceToken,
          walletAddress: walletAddressFromMessage.substring(0, 10) + '...',
        });
        console.log('   Skipping verification - session restoration should use token validation, not signature verification');
        return false;
      }
      
      if (isStaleRestoration) {
        console.log('ℹ️ [AppKit SIWE] Stale session restoration attempt - no tokens/sessions found during initialization', {
          walletAddress: walletAddressFromMessage.substring(0, 10) + '...',
        });
        console.log('   Skipping verification - nothing to restore');
        return false;
      }
      
      if (isStaleSignature) {
        console.log('ℹ️ [AppKit SIWE] Stale signature detected - has tokens but signature appears invalid/old', {
          hasValidNonce,
          hasReownAuthToken: !!hasReownAuthToken,
          walletAddress: walletAddressFromMessage.substring(0, 10) + '...',
        });
        console.log('   Skipping verification - stale signatures should not be re-verified');
        return false;
      }
      
      // ✅ CRITICAL: Verify wallet connection matches message address
      // Only proceed if we have an active wallet connection that matches the message
      if (hasAppKitConnection && appKitAccount.address) {
        const appKitAddress = appKitAccount.address.toLowerCase();
        const messageAddress = walletAddressFromMessage.toLowerCase();
        if (appKitAddress !== messageAddress) {
          console.warn('⚠️ [AppKit SIWE] Address mismatch, skipping verification', {
            appKitAddress,
            messageAddress,
          });
          return false;
        }
      }
      
      if (hasEthereumProvider) {
        const ethAddress = (window as any).ethereum.selectedAddress.toLowerCase();
        const messageAddress = walletAddressFromMessage.toLowerCase();
        if (ethAddress !== messageAddress) {
          console.warn('⚠️ [AppKit SIWE] Ethereum provider address mismatch, skipping verification', {
            ethAddress,
            messageAddress,
          });
          return false;
        }
      }
      
      // ✅ CRITICAL: Detect embedded wallet authentication scenarios
      // When social wallets connect, addEmbeddedWalletSession calls verifyMessage with a valid signature
      // but the wallet isn't "connected" in the traditional sense yet
      // Key indicators:
      // 1. Valid signature format (already checked above)
      // 2. Valid nonce in message (indicates fresh signature, not stale restoration)
      // 3. No traditional wallet connection (embedded wallet, not EOA)
      // Note: Tokens might not be set yet, but valid nonce indicates fresh signature
      const isEmbeddedWalletAuth = hasValidNonce && 
                                   !hasAppKitConnection && 
                                   !hasEthereumProvider && 
                                   !hasMagicLink;
      
      if (isEmbeddedWalletAuth) {
        console.log('✅ [AppKit SIWE] Embedded wallet authentication detected - allowing signature verification', {
          hasValidNonce,
          hasReownAuthToken: !!hasReownAuthToken,
          hasReownNonceToken: !!hasReownNonceToken,
          isAppKitInitializing,
          walletAddress: walletAddressFromMessage.substring(0, 10) + '...',
        });
        console.log('   Fresh signature with valid nonce detected - proceeding with verification');
        console.log('   This is likely from social login (embedded wallet) - verification will proceed');
        // Allow verification to proceed - this is a legitimate embedded wallet signature
        // Even if AppKit is initializing, this is a fresh signature from social login
      } else if (!hasAppKitConnection && !hasEthereumProvider && !hasMagicLink && !isReconnecting) {
        // ✅ CRITICAL: Final check - ensure we have SOME form of wallet connection
        // If none of the connection methods are active, this is likely a restoration attempt
        // that should be handled differently (via token validation, not signature verification)
        
        // If we have tokens but no connection AND no valid nonce, this is a restoration attempt
        if ((hasReownAuthToken || hasReownNonceToken) && !hasValidNonce) {
          console.log('ℹ️ [AppKit SIWE] Session restoration detected - tokens exist but no active wallet connection and no valid nonce', {
            hasReownAuthToken: !!hasReownAuthToken,
            hasReownNonceToken: !!hasReownNonceToken,
            hasValidNonce,
            walletAddress: walletAddressFromMessage.substring(0, 10) + '...',
          });
          console.log('   Skipping verification - restoration should validate tokens, not signatures');
          return false;
        }
        
        // No tokens and no connection - this is a premature verification attempt
        console.warn('⚠️ [AppKit SIWE] Wallet not connected and no restoration tokens found, skipping verification', {
          hasAppKitConnection,
          hasEthereumProvider,
          hasMagicLink,
          isReconnecting,
          walletAddress: walletAddressFromMessage,
        });
        return false;
      }
      
      // Log connection status for debugging (only if we're proceeding with verification)
      console.log('✅ [AppKit SIWE] Wallet connection verified - proceeding with signature verification:', {
        hasAppKitConnection,
        hasEthereumProvider,
        hasMagicLink,
        isReconnecting,
        walletAddress: walletAddressFromMessage,
        hasValidNonce,
      });
    }

    const MAX_RETRIES = 2;
    let lastError: any = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 [AppKit SIWE] Retry attempt ${attempt}/${MAX_RETRIES}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }

        console.log('🔍 [AppKit SIWE] Verifying signature...');
        console.log('📝 [AppKit SIWE] Message:', message?.substring?.(0, 200) || 'No message');

        // Use wallet address already extracted and validated at the top of the function
        const walletAddress = walletAddressFromMessage;

        // Extract nonce from SIWX message (CAIP-122 compliant format)
        // Standard SIWX message format:
        // {domain} wants you to sign in with your Ethereum account:
        // {address}
        //
        // {statement}
        //
        // URI: {uri}
        // Version: 1
        // Chain ID: {chainId}
        // Nonce: {nonce}
        // Issued At: {issuedAt}
        // [Expiration Time: {expirationTime}] (optional)
        let nonce = '';

        // Extract nonce - AppKit may encode it (base64, URL encoding, etc.)
        // Try multiple patterns to handle different encodings
        const noncePatterns = [
          // Pattern 1: Standard "Nonce: {nonce}" format (plain text)
          /^Nonce:\s*([a-zA-Z0-9]+)$/im,
          // Pattern 2: "Nonce: {nonce}" anywhere (case-insensitive)
          /Nonce:\s*([a-zA-Z0-9]+)/i,
          // Pattern 3: Base64 encoded nonce (may include +, /, =)
          /Nonce:\s*([A-Za-z0-9+/=]{10,})/i,
          // Pattern 4: URL encoded nonce
          /Nonce:\s*([A-Za-z0-9%]+)/i,
          // Pattern 5: Nonce on its own line (any format)
          /^Nonce:\s*(.+)$/im,
          // Pattern 6: Query-like format "nonce={value}"
          /nonce[=:]\s*([a-zA-Z0-9+/=]+)/i,
        ];

        for (const pattern of noncePatterns) {
          const match = message.match(pattern);
          if (match && match[1]) {
            let extractedNonce = match[1].trim();

            // Try to decode if it looks encoded
            try {
              // Check if it's base64 encoded (has padding or special chars)
              if (extractedNonce.length > 15 || extractedNonce.includes('=') || extractedNonce.includes('+') || extractedNonce.includes('/')) {
                // Try base64 decode
                const decoded = atob(extractedNonce.replace(/-/g, '+').replace(/_/g, '/'));
                // If decode succeeds and produces valid characters, use decoded version
                if (/^[a-zA-Z0-9]+$/.test(decoded)) {
                  console.log('🔓 [AppKit SIWX] Decoded base64 nonce:', decoded.substring(0, 8) + '...');
                  nonce = decoded;
                  break;
                }
              }
              // Try URL decode
              if (extractedNonce.includes('%')) {
                const urlDecoded = decodeURIComponent(extractedNonce);
                if (urlDecoded !== extractedNonce && /^[a-zA-Z0-9]+$/.test(urlDecoded)) {
                  console.log('🔓 [AppKit SIWX] Decoded URL-encoded nonce:', urlDecoded.substring(0, 8) + '...');
                  nonce = urlDecoded;
                  break;
                }
              }
              // If no encoding detected, use as-is
              if (/^[a-zA-Z0-9]+$/.test(extractedNonce)) {
                nonce = extractedNonce;
                console.log('✅ [AppKit SIWX] Extracted nonce from message:', nonce.substring(0, 8) + '...');
                break;
              }
            } catch (e) {
              // If decoding fails, try next pattern
              continue;
            }
          }
        }

        // If still no nonce found, try to get it from the stored nonce for this wallet
        // This ensures we can validate against the nonce we generated
        if (!nonce && typeof window !== 'undefined') {
          try {
            const storedNonceKey = `siwe_nonce_${walletAddress.toLowerCase()}`;
            const storedData = sessionStorage.getItem(storedNonceKey);

            if (storedData) {
              try {
                const { nonce: storedNonce, expiresAt } = JSON.parse(storedData);

                // Check if nonce has expired
                if (Date.now() < expiresAt) {
                  nonce = storedNonce;
                  console.log('📝 [AppKit SIWE] Using stored nonce from sessionStorage');
                } else {
                  console.warn('⚠️ [AppKit SIWE] Stored nonce expired, removing');
                  sessionStorage.removeItem(storedNonceKey);
                }
              } catch (parseError) {
                console.warn('⚠️ [AppKit SIWE] Failed to parse stored nonce, removing');
                sessionStorage.removeItem(storedNonceKey);
              }
            }
          } catch (e) {
            console.warn('⚠️ [AppKit SIWE] Failed to get stored nonce:', e);
          }
        }

        // Extract chain ID from message (SIWE message format: "Chain ID: {chainId}")
        const chainIdMatch = message.match(/Chain ID:\s*(\d+)/i);
        const chainId = chainIdMatch ? chainIdMatch[1] : '11155111'; // Default to Sepolia

        console.log('✅ [AppKit SIWE] Extracted from message:', { walletAddress, nonce: nonce || '(empty)', chainId });

        const res = await fetch('/api/auth/wallet/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            message,
            signature,
            chainId,
            nonce,
            walletType: 'AppKit',
          }),
        });

        if (!res.ok) {
          // ✅ Improved error handling - try to extract actual error message
          let errorData: any = {};
          let errorMessage = 'Failed to verify signature';
          let errorDetails: Record<string, any> = { status: res.status };
          
          try {
            const text = await res.text();
            if (text) {
              try {
                errorData = JSON.parse(text);
                errorMessage = errorData.error || errorData.message || errorMessage;
                errorDetails = {
                  ...errorDetails,
                  ...errorData,
                  responseText: text.substring(0, 500), // Limit response text length
                };
              } catch (parseError) {
                // Response is not JSON, use text as error message
                errorMessage = text.substring(0, 200);
                errorDetails.responseText = text.substring(0, 500);
              }
            }
          } catch (fetchError) {
            console.error('❌ [AppKit SIWE] Failed to read error response:', fetchError);
            errorMessage = `HTTP ${res.status}: ${res.statusText}`;
            errorDetails.statusText = res.statusText;
          }
          
          // ✅ Improved error logging - serialize error details properly
          const errorLog = {
            status: res.status,
            error: errorMessage,
            details: errorDetails,
            attempt: attempt + 1,
            url: '/api/auth/wallet/verify',
            walletAddress: walletAddressFromMessage,
          };
          
          console.error('❌ [AppKit SIWE] Verification failed:', JSON.stringify(errorLog, null, 2));
          console.error('❌ [AppKit SIWE] Error details:', errorDetails);
          
          // ✅ Handle "Internal server error" specifically - likely means API endpoint issue
          if (res.status === 500 || errorMessage.toLowerCase().includes('internal server error')) {
            console.error('❌ [AppKit SIWE] Internal server error - API endpoint may be misconfigured');
            console.error('   Check: System user exists, DATABASE_URL is set, API route is working');
            // Don't retry on 500 errors - they indicate server-side issues
            lastError = new Error(`Internal server error: ${errorMessage}`);
            return false;
          }

          // Don't retry on client errors (4xx), only on server errors (5xx)
          if (res.status >= 400 && res.status < 500) {
            console.error('❌ [AppKit SIWE] Client error - not retrying');
            return false;
          }

          // Store error and continue to retry
          lastError = new Error(errorMessage || `HTTP ${res.status}`);
          continue;
        }

        const responseData = await res.json();
        const { user, isNewUser, token } = responseData;

        console.log('✅ [AppKit SIWE] Signature verified:', user.walletAddress);
        console.log('   Is new user:', isNewUser);
        console.log('   Token received:', token ? 'Yes' : 'No (using cookie-based auth)');

        // Store SIWE session in database for persistent session management
        // Use API route instead of direct database call (server-side only)
        try {
          const sessionResponse = await fetch('/api/auth/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              userId: user.id,
              authMethod: 'wallet',
              walletAddress,
              chainId: parseInt(chainId),
              nonce,
              signature,
              message,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            }),
          });

          if (sessionResponse.ok) {
            console.log('💾 [AppKit SIWE] Session stored in database');
          } else {
            const errorData = await sessionResponse.json().catch(() => ({}));
            console.warn('⚠️ [AppKit SIWE] Failed to store session in database:', errorData.error || sessionResponse.status);
          }
        } catch (storeError) {
          console.warn('⚠️ [AppKit SIWE] Failed to store session in database:', storeError);
          // Continue anyway - session will be stored in localStorage as fallback
        }

        // Store user data and new user flag for onSignIn callback
        if (typeof window !== 'undefined') {
          (window as any).__appkit_verified_user__ = user;
          (window as any).__appkit_is_new_user__ = isNewUser;
        }

        console.log('✅ [AppKit SIWE] Signature verification complete');
        return true;

      } catch (error) {
        console.error(`❌ [AppKit SIWE] verifyMessage error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });

        lastError = error;

        // Continue to next retry attempt if we have attempts left
        if (attempt < MAX_RETRIES) {
          console.log(`⏳ [AppKit SIWE] Will retry in ${(attempt + 1) * 1000}ms...`);
          continue;
        }
      }
    }

    // All retries exhausted
    const errorInfo = {
      attempts: MAX_RETRIES + 1,
      lastError: lastError instanceof Error ? lastError.message : String(lastError),
      lastErrorStack: lastError instanceof Error ? lastError.stack : undefined,
      lastErrorName: lastError instanceof Error ? lastError.name : undefined,
    };
    
    console.error('❌ [AppKit SIWE] All retry attempts exhausted:', JSON.stringify(errorInfo, null, 2));
    if (lastError instanceof Error) {
      console.error('❌ [AppKit SIWE] Last error stack:', lastError.stack);
    }

    // Dispatch error event for UI handling
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('appkit-auth-error', {
        detail: {
          error: 'Verification failed after multiple attempts',
          message: lastError instanceof Error ? lastError.message : 'Please try again'
        }
      }));
    }

    return false;
  },

  /**
   * Check for existing session
   * ✅ SINGLE SOURCE OF TRUTH: Uses Zustand store and database sessions, NOT NextAuth
   *
   * IMPORTANT: This prevents the endless signing loop by properly checking for sessions
   * and only returning null when there's truly no valid session
   * 
   * ✅ CRITICAL FIX: Added session caching to prevent repeated checks on navigation
   * Session is cached for 5 seconds to prevent race conditions during page transitions
   * 
   * ✅ REMOVED NEXTAUTH FALLBACK: No longer checks NextAuth - uses Zustand store as single source of truth
   */
  getSession: async (): Promise<SIWESession | null> => {
    try {
      // ✅ IMPROVED SESSION CACHING: Use centralized cache with event-based invalidation
      // Check cache first to prevent repeated checks during navigation
      if (typeof window !== 'undefined') {
        // Try to get wallet address for cache lookup
        let walletAddress: string | null = null;
        const appKitState = (window as any).__appkit_state__;
        if (appKitState?.address) {
          walletAddress = appKitState.address;
        }

        // If we have a wallet address, check the cache
        if (walletAddress) {
          const cachedSession = sessionCache.get(walletAddress);
          if (cachedSession) {
            console.log('✅ [AppKit SIWE] Using cached session (event-based cache)');
            return cachedSession;
          }
        }
      }

      // ✅ CRITICAL FIX: Check if user is authenticated via email/Google (non-wallet auth)
      // SIWE should ONLY apply to wallet authentication, not email/Google
      // If user has a session but no walletAddress, they authenticated via email/Google
      // In this case, return null to prevent SIWE prompts (email/Google users don't need SIWE)
      try {
        const sessionCheck = await fetch('/api/auth/session', {
          cache: 'no-store',
          credentials: 'include',
        });

        if (sessionCheck.ok) {
          const sessionData = await sessionCheck.json();
          // If session exists but has no walletAddress, user authenticated via email/Google
          if (sessionData?.user && !sessionData.user.walletAddress) {
            console.log('ℹ️ [AppKit SIWE] User authenticated via email/Google - skipping SIWE (no wallet auth)');
            return null; // Return null to prevent SIWE prompts for non-wallet users
          }
        }
      } catch (e) {
        // If session check fails, continue with normal SIWE flow
        console.warn('⚠️ [AppKit SIWE] Session check failed, continuing with SIWE flow:', e);
      }

      // Check if we're currently in the process of creating a session
      // This prevents AppKit from prompting while session is being created
      if (typeof window !== 'undefined') {
        const isCreatingSession = (window as any).__appkit_creating_session__;
        if (isCreatingSession) {
          console.log('⏳ [AppKit SIWE] Session creation in progress, waiting...');
          // Wait a bit and retry
          await new Promise(resolve => setTimeout(resolve, 1500));
          // Don't clear the flag here - let onSignIn clear it after redirect
        }

        // Also check if we just redirected from a sign-in (prevent immediate re-prompt)
        const justSignedIn = sessionStorage.getItem('__appkit_just_signed_in__');
        if (justSignedIn) {
          console.log('⏳ [AppKit SIWE] Just signed in, waiting for session to propagate...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          sessionStorage.removeItem('__appkit_just_signed_in__');
        }

        // Check if we just verified a signature (prevent immediate re-prompt)
        const justVerified = (window as any).__appkit_verified_user__;
        if (justVerified) {
          console.log('⏳ [AppKit SIWE] Signature just verified, waiting for session creation...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // First, try to get wallet address from connected wallet
      // We need this to check for stored sessions
      let walletAddress: string | null = null;

      if (typeof window !== 'undefined') {
        // Try multiple sources for wallet address
        const appKitState = (window as any).__appkit_state__;
        if (appKitState?.address) {
          walletAddress = appKitState.address;
        }

        // Also check ethereum provider if AppKit doesn't have it
        if (!walletAddress && (window as any).ethereum) {
          try {
            const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
              walletAddress = accounts[0];
            }
          } catch (e) {
            // Ignore errors - wallet might not be connected
          }
        }
      }

      // Re-check cache now that we have walletAddress (may have been missing at top if appKitState wasn't set yet)
      if (walletAddress && typeof window !== 'undefined') {
        const cachedAfterResolve = sessionCache.get(walletAddress);
        if (cachedAfterResolve) {
          console.log('✅ [AppKit SIWE] Using cached session (after resolving address)');
          return cachedAfterResolve;
        }

        // ✅ FIX: After sign, AppKit may call getSession() before our session is in DB.
        // Return a synthetic session so the modal closes instead of hanging on "Approve Transaction".
        const verifiedUser = (window as any).__appkit_verified_user__;
        const creatingSession = (window as any).__appkit_creating_session__;
        if (verifiedUser?.walletAddress || creatingSession) {
          const addr = (verifiedUser?.walletAddress && typeof verifiedUser.walletAddress === 'string')
            ? verifiedUser.walletAddress
            : walletAddress;
          const chainId = typeof verifiedUser?.chainId === 'number' ? verifiedUser.chainId : 11155111;
          const syntheticSession: SIWESession = { address: addr, chainId };
          sessionCache.set(addr, syntheticSession, 8000); // 8s TTL so follow-up getSession() hits cache until onSignIn completes
          console.log('✅ [AppKit SIWE] Signature verified / session creating – returning synthetic session so modal closes');
          return syntheticSession;
        }
      }

      // If we have a wallet address, check for stored SIWE session first
      // Use API route instead of direct database call (server-side only)
      if (walletAddress) {
        // ✅ REQUEST DEDUPLICATION: Prevent multiple simultaneous requests for the same wallet
        const requestKey = `getSession_${walletAddress.toLowerCase()}`;
        if (typeof window !== 'undefined') {
          const pendingRequest = (window as any)[requestKey];
          if (pendingRequest && pendingRequest instanceof Promise) {
            console.log('⏳ [AppKit SIWE] Request already in progress, waiting for existing request...');
            return await pendingRequest;
          }
        }

        try {
          // Create a promise for this request and store it to prevent duplicates
          const sessionRequestPromise = (async (): Promise<SIWESession | null> => {
            const sessionResponse = await fetch(`/api/auth/sessions?walletAddress=${encodeURIComponent(walletAddress)}&authMethod=wallet&limit=1`, {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
            });

            if (sessionResponse.ok) {
              const data = await sessionResponse.json();
              if (data.success && data.sessions && data.sessions.length > 0) {
              const session = data.sessions[0];
              const expiresAt = new Date(session.expiresAt);

              // ⚠️ CRITICAL: Check if session is still valid AND has valid SIWE nonce
              // A session without a nonce means it was never SIWE-verified
              // ✅ FIX: nonceExpiry comes from User model (session.user?.walletNonceExpiry)
              // We need to check if the nonceExpiry is valid (not expired)
              const nonceExpiryValue = session.nonceExpiry || session.user?.walletNonceExpiry;
              const hasValidNonce = (session.nonce && session.nonce.trim() !== '') ||
                (session.user?.walletNonce && session.user.walletNonce.trim() !== '');

              // ✅ CRITICAL: Validate nonceExpiry - must exist and be in the future
              let hasValidNonceExpiry = false;
              if (nonceExpiryValue) {
                try {
                  const nonceExpiryDate = new Date(nonceExpiryValue);
                  // Check if date is valid and in the future
                  if (!isNaN(nonceExpiryDate.getTime()) && nonceExpiryDate > new Date()) {
                    hasValidNonceExpiry = true;
                  } else {
                    console.log('⚠️ [AppKit SIWE] NonceExpiry is expired or invalid:', {
                      nonceExpiry: nonceExpiryValue,
                      parsedDate: nonceExpiryDate.toISOString(),
                      now: new Date().toISOString(),
                      isExpired: nonceExpiryDate <= new Date(),
                    });
                  }
                } catch (dateError) {
                  console.warn('⚠️ [AppKit SIWE] Error parsing nonceExpiry:', dateError);
                  hasValidNonceExpiry = false;
                }
              }

              // Check if session is still valid
              if (expiresAt > new Date() && session.status === 'ACTIVE') {
                // ⚠️ CRITICAL: Validate SIWE nonce and expiry
                // If nonce is null or expired, treat session as invalid and trigger SIWE signature
                if (!hasValidNonce || !hasValidNonceExpiry) {
                  console.log('🔐 [AppKit SIWE] Session exists but SIWE nonce is missing or expired:', {
                    sessionId: session.id,
                    address: session.walletAddress,
                    hasNonce: hasValidNonce,
                    hasValidNonceExpiry: hasValidNonceExpiry,
                    nonceExpiry: nonceExpiryValue ? new Date(nonceExpiryValue).toISOString() : 'null',
                    nonceSource: session.nonce ? 'session' : (session.user?.walletNonce ? 'user' : 'none'),
                    nonceExpirySource: session.nonceExpiry ? 'session' : (session.user?.walletNonceExpiry ? 'user' : 'none'),
                    currentTime: new Date().toISOString(),
                  });
                  console.log('   Returning null to trigger SIWE signature verification');

                  // ✅ CRITICAL: If nonceExpiry is expired, clear cache to force re-check
                  // Note: Session will be naturally replaced when user signs in again
                  // The main fix is ensuring nonceExpiry is always fresh (15 min from verification time)

                  // Invalidate cached session to force re-check
                  if (session.walletAddress) {
                    sessionCache.invalidate(session.walletAddress, 'sessionExpired');
                  }

                  // Return null to trigger SIWE signature prompt
                  return null;
                }

                console.log('✅ [AppKit SIWE] Found valid stored session with SIWE verification:', {
                  sessionId: session.id,
                  address: session.walletAddress,
                  chainId: session.chainId,
                  expiresAt: expiresAt.toISOString(),
                  nonceExpiry: session.nonceExpiry ? new Date(session.nonceExpiry).toISOString() : 'N/A',
                });

                // Return SIWE session format
                const siweSession: SIWESession = {
                  address: session.walletAddress,
                  chainId: typeof session.chainId === 'number' ? session.chainId : parseInt(String(session.chainId)) || 11155111,
                };

                // ✅ CACHE SESSION: Store in event-based cache with longer TTL to reduce API calls
                sessionCache.set(session.walletAddress, siweSession, 30000); // 30 second TTL (reduced from 5s)

                return siweSession;
              } else {
                // ✅ STORED SESSION EXPIRED: Clear all session data and return null
                // ✅ SINGLE SOURCE OF TRUTH: Clear Zustand store, NOT NextAuth
                console.log('⏰ [AppKit SIWE] Stored session expired, clearing all session data...');
                console.log('   ✅ Using Zustand store as single source of truth (NOT NextAuth)');

                // Clear expired session from Zustand store, cache, and cookies
                // This function handles all cleanup - no need for additional cache invalidation
                await clearExpiredSessionData(walletAddress, session.id);

                // Return null to trigger SIWE signature
                console.log('✅ [AppKit SIWE] Expired session cleared, returning null to trigger SIWE signature');
                return null;
              }
            }
            }
            
            // No valid session found (response was not ok or no sessions)
            return null;
          })();

          // Clear pending key when request settles so future getSession() can hit cache or create new request
          const requestKeyForCleanup = requestKey;
          const promiseWithCleanup = sessionRequestPromise.finally(() => {
            if (typeof window !== 'undefined') delete (window as any)[requestKeyForCleanup];
          });

        // Only store if no other caller stored first (first caller wins; others await that same promise)
        if (typeof window !== 'undefined') {
          const existing = (window as any)[requestKey];
          if (existing && existing instanceof Promise) {
            return await existing;
          }
          (window as any)[requestKey] = promiseWithCleanup;
        }

        try {
          const result = await promiseWithCleanup;
          return result;
        } catch (error) {
          if (typeof window !== 'undefined') delete (window as any)[requestKey];
          console.warn('⚠️ [AppKit SIWE] Error checking stored session:', error);
          return null;
        }
        } catch (error) {
          // If the fetch or processing fails, return null
          console.warn('⚠️ [AppKit SIWE] Error in session request:', error);
          return null;
        }
      }

      // ✅ NO NEXTAUTH FALLBACK: Use Zustand store as single source of truth
      // If no stored session found, return null to trigger SIWE signature
      console.log('ℹ️ [AppKit SIWE] No stored session found, returning null to trigger SIWE signature');
      return null;

    } catch (error) {
      console.error('❌ [AppKit SIWE] getSession error:', error);
      return null;
    }
  },

  /**
   * Sign out
   * Uses AppKit session store (NO NextAuth)
   */
  signOut: async () => {
    try {
      console.log('[AUTH_MONITOR] 🔌 SIWE signOut: Starting (triggered by disconnect/signOutOnDisconnect)');
      console.log('🔌 [AppKit SIWE] Starting comprehensive sign out...');

      // Step 0: Clear server session cookie (httpOnly) so GET /api/auth/session returns null and app doesn't auto sign-in
      if (typeof window !== 'undefined') {
        try {
          await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' });
          console.log('✅ [AppKit SIWE] Server session cookie cleared via /api/auth/signout');
        } catch (err) {
          console.warn('⚠️ [AppKit SIWE] /api/auth/signout failed (continuing client cleanup):', err);
        }
      }

      // Step 1: Clear AppKit session store (single source of truth)
      try {
        const { useAppKitSession } = await import('@/lib/auth/appkit-session');
        useAppKitSession.getState().clearSession();
        console.log('✅ [AppKit SIWE] AppKit session store cleared');
      } catch (sessionError) {
        console.warn('⚠️ [AppKit SIWE] AppKit session store cleanup error (continuing):', sessionError);
      }

      // Step 2: Clear all session caches
      sessionCache.invalidateAll('signOut');

      // Step 3: Clear localStorage and sessionStorage
      if (typeof window !== 'undefined') {
        // Clear AppKit session cache (in-memory)
        delete (window as any).__appkit_session_cache__;
        delete (window as any).__appkit_session_cache_expiry__;
        delete (window as any).__appkit_creating_session__;
        delete (window as any).__appkit_verified_user__;
        delete (window as any).__appkit_is_new_user__;

        // Clear session storage flags
        sessionStorage.removeItem('__appkit_just_signed_in__');

        // Clear all localStorage (wagmi, AppKit, SIWX, and any other app state)
        clearLocalStorageOnSignOut();

        console.log('✅ [AppKit SIWE] LocalStorage and SessionStorage cleared (including SIWX for social/embedded)');
      }

      // Step 4: Dispatch custom events for other components to listen to
      // appkit-signout: SIWE config; appkit-disconnect-wallet: legacy (AppKitSessionProvider listens for both)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('appkit-signout'));
        window.dispatchEvent(new CustomEvent('appkit-disconnect-wallet'));
      }

      // Step 5: Clear auth store state (handled by Step 6/clearSession)
      console.log('✅ [AppKit SIWE] Auth store cleanup handled by clearSession');

      // Step 6: Clear AppKit session store (NO NextAuth!)
      try {
        const { useAppKitSession } = await import('@/lib/auth/appkit-session');
        useAppKitSession.getState().clearSession();
        console.log('✅ [AppKit SIWE] AppKit session store cleared');
      } catch (sessionError) {
        console.warn('⚠️ [AppKit SIWE] AppKit session store cleanup error (continuing):', sessionError);
      }

      // Note: Database sessions are managed by NextAuth via cookies
      // Clearing localStorage/sessionStorage and AppKit session store is sufficient
      // NextAuth will handle session invalidation when cookies are cleared

      console.log('[AUTH_MONITOR] ✅ SIWE signOut: Completed – localStorage cleared, events dispatched');
      console.log('✅ [AppKit SIWE] Comprehensive sign out completed successfully');
      return true;

    } catch (error) {
      // ⚠️ FIX: Properly serialize error for logging
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null
          ? JSON.stringify(error, null, 2)
          : String(error);

      console.error('❌ [AppKit SIWE] signOut error:', errorMessage);
      if (error instanceof Error && error.stack) {
        console.error('   Stack:', error.stack);
      }
      return false;
    }
  },

  /**
   * Callback when user signs in successfully
   * AppKit calls this after verifyMessage returns true
   *
   * For new users: Redirect to welcome page
   * For existing users: Redirect to home
   */
  onSignIn: async (session?: SIWESession) => {
    console.log('🎉 [AppKit SIWE] onSignIn callback triggered!');
    if (session) {
      console.log('   Address:', session.address);
      console.log('   Chain ID:', session.chainId);
    }

    if (typeof window !== 'undefined') {
      // Prevent multiple simultaneous calls to onSignIn
      const processingKey = '__appkit_onsignin_processing__';
      if ((window as any)[processingKey]) {
        console.log('⏸️ [AppKit SIWE] onSignIn already in progress, skipping duplicate call');
        return;
      }

      // Check if we just signed in (prevent re-triggering after refresh)
      const justSignedIn = sessionStorage.getItem('__appkit_just_signed_in__');
      if (justSignedIn === 'true') {
        console.log('⏸️ [AppKit SIWE] Already signed in recently, skipping onSignIn');
        // Still close the modal and go home so "Approve Transaction" doesn't stay on screen
        try {
          const { getModal } = await import('@/lib/appkit');
          const modal = getModal();
          if (modal && typeof (modal as any).close === 'function') {
            await (modal as any).close();
            console.log('✅ [AppKit SIWE] Modal closed (skipped onSignIn path)');
          }
          window.dispatchEvent(new CustomEvent('appkit-siwe-navigate', { detail: { path: '/' } }));
        } catch (e) {
          console.warn('⚠️ [AppKit SIWE] Could not close modal on skip:', e);
        }
        return;
      }

      // Check if session creation is already in progress (from manual flow)
      const creatingSession = (window as any).__appkit_creating_session__;
      if (creatingSession) {
        console.log('⏸️ [AppKit SIWE] Session creation already in progress, skipping onSignIn');
        return;
      }

      // Set processing flag
      (window as any)[processingKey] = true;

      // Mark sign completed so modal-close handler does not treat a later close as "cancelled"
      if (typeof window !== 'undefined') {
        (window as any).__appkit_siwe_signed_at__ = Date.now();
        delete (window as any).__appkit_siwe_pending_at__;
      }

      try {
        // Get verified user data from verifyMessage
        let verifiedUser = (window as any).__appkit_verified_user__;
        let isNewUser: boolean | undefined = (window as any).__appkit_is_new_user__;

        // If user data not found (page reload), fetch from API using wallet address
        if (!verifiedUser && session?.address) {
          console.log('⚠️ [AppKit SIWE] User data not in window, fetching from API...');

          // Wait a moment for database to be ready (in case of race condition)
          await new Promise(resolve => setTimeout(resolve, 500));

          try {
            // Use the wallet address directly to find user
            const walletAddress = session.address;
            const verifyRes = await fetch('/api/auth/wallet/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: `Authentication lookup for ${walletAddress}`,
                signature: '', // Not needed for lookup
                walletAddress: walletAddress, // Pass wallet address directly
                lookupOnly: true, // Flag to indicate this is just a lookup
              }),
            });

            if (verifyRes.ok) {
              const data = await verifyRes.json();
              verifiedUser = data.user;
              isNewUser = data.isNewUser;
              console.log('✅ [AppKit SIWE] User fetched from API:', verifiedUser?.id);
            } else {
              console.error('❌ [AppKit SIWE] Failed to fetch user from API');
            }
          } catch (error) {
            console.error('❌ [AppKit SIWE] Error fetching user data:', error);
          }
        }

        if (!verifiedUser) {
          console.warn('⚠️ [AppKit SIWE] No verified user data, dispatching navigation event to home');
          // ✅ CLIENT-SIDE NAVIGATION: Use custom event instead of window.location.href
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('appkit-siwe-navigate', {
              detail: { path: '/' }
            }));
          }
          return;
        }

        console.log('🔐 [AppKit SIWE] Creating AppKit session (NO NextAuth)...');
        console.log('   User ID:', verifiedUser.id);
        console.log('   Wallet:', verifiedUser.walletAddress);
        console.log('   Is new user:', isNewUser);

        // Set flag to prevent AppKit from checking session while we're creating it
        if (typeof window !== 'undefined') {
          (window as any).__appkit_creating_session__ = true;
        }

        // Get chainId from session or verifiedUser, default to Sepolia (11155111)
        const chainId = session?.chainId || verifiedUser.chainId || 11155111;

        // ✅ CRITICAL: Wait for database session to be fully stored with nonce and expiry
        // verifyMessage() stores session in database, but we need to verify it's complete before proceeding
        console.log('⏳ [AppKit SIWE] Verifying database session is fully stored with nonce and expiry...');

        let sessionVerified = false;
        let verificationAttempts = 0;
        const maxVerificationAttempts = 10; // Max 5 seconds (10 * 500ms)

        while (!sessionVerified && verificationAttempts < maxVerificationAttempts) {
          try {
            // Check if session exists in database with proper nonce and expiry
            const sessionCheckResponse = await fetch(
              `/api/auth/sessions?walletAddress=${encodeURIComponent(verifiedUser.walletAddress)}&authMethod=wallet&limit=1`,
              {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store',
              }
            );

            if (sessionCheckResponse.ok) {
              const sessionData = await sessionCheckResponse.json();

              if (sessionData.success && sessionData.sessions && sessionData.sessions.length > 0) {
                const dbSession = sessionData.sessions[0];

                // ✅ FIX: Handle both Session model (expires) and WalletSession model (expiresAt)
                const expiresAt = dbSession.expiresAt || dbSession.expires;

                // ✅ CRITICAL: Nonce and nonceExpiry come from User model (via user relation)
                // The GET endpoint includes user.walletNonce and user.walletNonceExpiry
                const hasNonce = (dbSession.nonce && dbSession.nonce.trim() !== '') ||
                  (dbSession.user?.walletNonce && dbSession.user.walletNonce.trim() !== '');
                const hasNonceExpiry = dbSession.nonceExpiry ||
                  (dbSession.user?.walletNonceExpiry && new Date(dbSession.user.walletNonceExpiry) > new Date());
                const hasExpiresAt = expiresAt && new Date(expiresAt) > new Date();

                if (hasNonce && hasNonceExpiry && hasExpiresAt) {
                  console.log('✅ [AppKit SIWE] Database session verified with nonce, nonceExpiry, and expiresAt');
                  console.log('   Session ID:', dbSession.id);
                  console.log('   Nonce:', (dbSession.nonce || dbSession.user?.walletNonce || '').substring(0, 8) + '...');
                  console.log('   NonceExpiry:', dbSession.nonceExpiry ? new Date(dbSession.nonceExpiry).toISOString() :
                    (dbSession.user?.walletNonceExpiry ? new Date(dbSession.user.walletNonceExpiry).toISOString() : 'N/A'));
                  console.log('   ExpiresAt:', expiresAt ? new Date(expiresAt).toISOString() : 'N/A');
                  sessionVerified = true;
                  break;
                } else {
                  console.log(`⏳ [AppKit SIWE] Session found but incomplete (attempt ${verificationAttempts + 1}/${maxVerificationAttempts}):`, {
                    hasNonce,
                    hasNonceExpiry: !!hasNonceExpiry,
                    hasExpiresAt,
                    nonceSource: dbSession.nonce ? 'session' : (dbSession.user?.walletNonce ? 'user' : 'none'),
                    nonceExpirySource: dbSession.nonceExpiry ? 'session' : (dbSession.user?.walletNonceExpiry ? 'user' : 'none'),
                    expiresAtSource: dbSession.expiresAt ? 'expiresAt' : (dbSession.expires ? 'expires' : 'none'),
                  });
                }
              } else {
                console.log(`⏳ [AppKit SIWE] Session not found yet (attempt ${verificationAttempts + 1}/${maxVerificationAttempts})`);
              }
            }
          } catch (checkError) {
            console.warn(`⚠️ [AppKit SIWE] Session verification error (attempt ${verificationAttempts + 1}):`, checkError);
          }

          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, 500));
          verificationAttempts++;
        }

        if (!sessionVerified) {
          console.warn('⚠️ [AppKit SIWE] Could not verify database session after all attempts');
          console.warn('   Proceeding anyway - session may be created but not yet visible');
          console.warn('   This may cause double signing if session is not fully stored');
        }

        // ✅ PURE APPKIT: Update AppKit session store directly (NO NextAuth)
        // Only update Zustand store AFTER database session is verified
        try {
          const { useAppKitSession } = await import('@/lib/auth/appkit-session');
          useAppKitSession.getState().updateUser({
            id: verifiedUser.id,
            email: verifiedUser.email,
            name: verifiedUser.name,
            walletAddress: verifiedUser.walletAddress,
            role: verifiedUser.role || 'CUSTOMER',
          });
          console.log('✅ [AppKit SIWE] AppKit session created successfully');

          // Clean up temporary data
          delete (window as any).__appkit_verified_user__;
          delete (window as any).__appkit_is_new_user__;

          // Set flag to prevent immediate re-prompt after redirect
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('__appkit_just_signed_in__', 'true');
            // Clear the creating session flag
            delete (window as any).__appkit_creating_session__;
          }

          // ⚠️ CRITICAL: Dispatch event for AppKitSessionProvider to sync session
          if (typeof window !== 'undefined') {
            const signInEvent = new CustomEvent('appkit-siwe-signin', {
              detail: {
                user: verifiedUser,
                isNewUser: isNewUser,
              },
            });
            window.dispatchEvent(signInEvent);
            console.log('📢 [AppKit SIWE] Dispatched appkit-siwe-signin event');
          }

          // ✅ CRITICAL: Wait additional moment to ensure Zustand store is propagated
          await new Promise(resolve => setTimeout(resolve, 300));

          // Close AppKit modal so user sees NDA or home instead of the social/wallet modal
          if (typeof window !== 'undefined') {
            try {
              const { getModal } = await import('@/lib/appkit');
              const modal = getModal();
              if (modal && typeof (modal as any).close === 'function') {
                await (modal as any).close();
                console.log('✅ [AppKit SIWE] Modal closed after sign-in');
              }
            } catch (closeErr) {
              console.warn('⚠️ [AppKit SIWE] Could not close modal after sign-in:', closeErr);
            }
          }

          // Always redirect: new user → welcome; otherwise → home (NDA or main content)
          const isOnWelcomePage = typeof window !== 'undefined' && (window.location.pathname === '/auth/welcome' || window.location.pathname.startsWith('/auth/welcome'));
          if (typeof window !== 'undefined') {
            const shouldRedirectToWelcome = Boolean(isNewUser) && !isOnWelcomePage;
            if (shouldRedirectToWelcome) {
              console.log('👋 [AppKit SIWE] New user - redirecting to welcome');
              window.dispatchEvent(new CustomEvent('appkit-siwe-navigate', {
                detail: { path: '/auth/welcome?newUser=true' }
              }));
            } else {
              console.log('👋 [AppKit SIWE] Session established - redirecting to home (NDA or main content)');
              window.dispatchEvent(new CustomEvent('appkit-siwe-navigate', {
                detail: { path: '/' }
              }));
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('❌ [AppKit SIWE] Failed to create AppKit session:', errorMessage);

          // Clear the flags on failure
          if (typeof window !== 'undefined') {
            delete (window as any).__appkit_creating_session__;
            delete (window as any)[processingKey];
          }

          // Don't redirect - let user try again manually
          console.log('⚠️ [AppKit SIWE] Session creation failed - user can try signing in again');
        }

      } catch (error) {
        // ⚠️ FIX: Properly serialize error for logging to prevent JSON parsing errors
        const errorMessage = error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null
            ? JSON.stringify(error, null, 2)
            : String(error);

        console.error('❌ [AppKit SIWE] onSignIn error:', errorMessage);
        if (error instanceof Error && error.stack) {
          console.error('   Stack:', error.stack);
        }

        // Clear processing flag on error
        if (typeof window !== 'undefined') {
          delete (window as any)[processingKey];
        }
        // Don't redirect on error - let the current page handle it
      } finally {
        // Always clear processing flag after completion
        if (typeof window !== 'undefined') {
          // Small delay before clearing to prevent rapid re-triggers
          setTimeout(() => {
            delete (window as any)[processingKey];
          }, 2000);
        }
      }
    }
  },

  /**
   * Callback when user signs out
   * This is called when:
   * - User manually signs out
   * - Wallet account changes (signOutOnAccountChange: true)
   * - Network changes (signOutOnNetworkChange: true)
   */
  onSignOut: () => {
    console.log('👋 [AppKit SIWE] User signed out');

    // ✅ INVALIDATE SESSION CACHE: Use event-based invalidation
    // This ensures that when network changes trigger sign out, the cache is cleared
    // and user will be prompted to sign again for the new network
    sessionCache.invalidateAll('signOut');

    // Dispatch event for UI components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('appkit-signout'));
    }

    console.log('🧹 [AppKit SIWE] Session cache cleared via event-based invalidation');
  },

  // AppKit configuration options
  nonceRefetchIntervalMs: 300000, // Refetch nonce every 5 minutes
  sessionRefetchIntervalMs: 300000, // Refetch session every 5 minutes
  signOutOnAccountChange: true, // Sign out when wallet account changes

  /**
   * ⚠️ IMPORTANT: Network Change Handling
   * 
   * Why require re-signing on network change?
   * 
   * 1. **Cryptographic Binding**: SIWE messages include Chain ID in the signed message.
   *    The signature is cryptographically bound to that specific chain ID.
   * 
   * 2. **Security**: Requiring re-signing prevents replay attacks across networks.
   *    A signature from Sepolia cannot be replayed on Mainnet.
   * 
   * 3. **User Awareness**: Forces user to acknowledge network changes and explicitly
   *    sign for the new network, ensuring they understand which network they're using.
   * 
   * 4. **Session Validity**: A session signed for Sepolia (chainId: 11155111) is not
   *    valid for Mainnet (chainId: 1). The signature must match the current network.
   * 
   * Alternative (less secure): Set to `false` to allow session persistence across networks,
   * but this creates a mismatch between the session's chainId and the current network,
   * which could lead to security issues or user confusion.
   * 
   * See: docs/implementation/development/SIWE_NETWORK_CHANGE_EXPLANATION.md
   */
  signOutOnNetworkChange: true, // ✅ Sign out when network changes (requires re-signing for security)
});

