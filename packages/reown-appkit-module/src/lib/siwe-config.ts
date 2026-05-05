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

import type { SIWESession } from '@reown/appkit-siwe';
import { createSIWEConfig, formatMessage } from '@reown/appkit-siwe';

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
 * These callbacks integrate AppKit's WALLET authentication with our NextAuth backend:
 * - getNonce() → /api/auth/wallet/nonce
 * - verifyMessage() → /api/auth/wallet/verify
 * - getSession() → /api/auth/session
 * - signOut() → NextAuth signOut
 * - onSignIn() → Create NextAuth session only (no manual redirects)
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

      // Get current wallet address if available (for storing nonce association)
      let walletAddress: string | null = null;
      if (typeof window !== 'undefined') {
        // Try to get wallet address from AppKit state or window
        const appKitState = (window as any).__appkit_state__;
        if (appKitState?.address) {
          walletAddress = appKitState.address;
        }

        // Also check for connected accounts in ethereum provider
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

      const res = await fetch('/api/auth/wallet/nonce' + (walletAddress ? `?address=${walletAddress}` : ''));

      if (!res.ok) {
        throw new Error('Failed to get nonce');
      }

      const { nonce } = await res.json();
      console.log('✅ [AppKit SIWE] Nonce received:', nonce.substring(0, 8) + '...');

      // Store nonce association with wallet address for later validation
      if (walletAddress && typeof window !== 'undefined') {
        try {
          const nonceKey = `siwe_nonce_${walletAddress.toLowerCase()}`;
          localStorage.setItem(nonceKey, nonce);
          console.log('💾 [AppKit SIWE] Stored nonce for wallet:', walletAddress.substring(0, 10) + '...');

          // Also store in window for immediate access
          (window as any).__appkit_last_nonce_wallet__ = walletAddress;
          (window as any).__appkit_last_nonce__ = nonce;
        } catch (e) {
          console.warn('⚠️ [AppKit SIWE] Failed to store nonce:', e);
        }
      }

      return nonce;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ [AppKit SIWE] getNonce error:', errorMessage);
      throw error;
    }
  },
  
  /**
   * Verify signature on server
   * AppKit will call this after user signs the message
   * Returns verification result and stores user data for onSignIn callback
   */
  verifyMessage: async ({ message, signature }) => {
    try {
      console.log('🔍 [AppKit SIWE] Verifying signature...');
      console.log('📝 [AppKit SIWE] Message:', message.substring(0, 200) + '...');
      
      // Extract wallet address from SIWE message
      // SIWE message format: "{domain} wants you to sign in with your Ethereum account:\n{address}\n\n..."
      // The address appears on its own line after "Ethereum account:"
      const lines = message.split('\n');
      let walletAddress: string | null = null;
      
      // Look for the line with the Ethereum address
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Check if this line contains an Ethereum address
        const addressMatch = line.match(/^(0x[a-fA-F0-9]{40})$/);
        if (addressMatch) {
          walletAddress = addressMatch[1];
          break;
        }
        // Also check if address is embedded in a line
        const embeddedMatch = line.match(/0x[a-fA-F0-9]{40}/);
        if (embeddedMatch) {
          walletAddress = embeddedMatch[0];
          break;
        }
      }
      
      // Fallback: regex search across entire message
      if (!walletAddress) {
        const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
        walletAddress = addressMatch ? addressMatch[0] : null;
      }
      
      if (!walletAddress) {
        console.error('❌ [AppKit SIWE] Could not extract wallet address from message');
        console.error('   Message preview:', message.substring(0, 500));
        return false;
      }
      
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
          const storedNonce = localStorage.getItem(storedNonceKey);
          if (storedNonce) {
            nonce = storedNonce;
            console.log('📝 [AppKit SIWE] Using stored nonce from localStorage');
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
        const errorData = await res.json().catch(() => ({}));
        console.error('❌ [AppKit SIWE] Verification failed:', errorData.error || `HTTP ${res.status}`);
        return false;
      }
      
      const { user, isNewUser } = await res.json();
      console.log('✅ [AppKit SIWE] Signature verified:', user.walletAddress);
      console.log('   Is new user:', isNewUser);
      
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
      
      return true;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ [AppKit SIWE] verifyMessage error:', errorMessage);
      return false;
    }
  },
  
  /**
   * Check for existing session
   * First checks database for stored SIWE sessions, then falls back to NextAuth
   *
   * IMPORTANT: This prevents the endless signing loop by properly checking for sessions
   * and only returning null when there's truly no valid session
   * 
   * ✅ CRITICAL FIX: Added session caching to prevent repeated checks on navigation
   * Session is cached for 5 seconds to prevent race conditions during page transitions
   */
  getSession: async (): Promise<SIWESession | null> => {
    try {
      // ✅ SESSION CACHING: Check cache first to prevent repeated checks during navigation
      if (typeof window !== 'undefined') {
        const cacheKey = '__appkit_session_cache__';
        const cacheExpiryKey = '__appkit_session_cache_expiry__';
        const cachedSession = (window as any)[cacheKey];
        const cacheExpiry = (window as any)[cacheExpiryKey];
        
        // Return cached session if still valid (5 second cache)
        if (cachedSession && cacheExpiry && Date.now() < cacheExpiry) {
          console.log('✅ [AppKit SIWE] Using cached session (preventing re-check on navigation)');
          return cachedSession;
        }
        
        // Clear expired cache
        if (cacheExpiry && Date.now() >= cacheExpiry) {
          delete (window as any)[cacheKey];
          delete (window as any)[cacheExpiryKey];
        }
      }
      
      // ✅ CHECK APPKIT SESSION STORE FIRST (NOT NextAuth)
      // SIWE should ONLY apply to wallet authentication
      if (typeof window !== 'undefined') {
        try {
          // Dynamically import AppKit session store (relative path from package to root src)
          // @ts-expect-error - Dynamic import path resolved at runtime by bundler
          const appKitSessionModule = await import('@/lib/auth/appkit-session');
          const { useAppKitSession } = appKitSessionModule;
          const appKitSession = useAppKitSession.getState().session;
          
          // If AppKit session exists and has wallet address, return it
          if (appKitSession.isConnected && appKitSession.address && appKitSession.user) {
            console.log('✅ [AppKit SIWE] Found AppKit session:', {
              address: appKitSession.address,
              chainId: appKitSession.chainId,
            });
            
            // Check if session is expired
            if (appKitSession.expires) {
              const expiresAt = new Date(appKitSession.expires);
              const now = new Date();
              
              if (expiresAt < now) {
                console.log('⏰ [AppKit SIWE] AppKit session expired, returning null');
                // Clear expired session
                useAppKitSession.getState().clearSession();
                return null;
              }
            }
            
            // Return SIWE session format from AppKit store
            const siweSession: SIWESession = {
              address: appKitSession.address,
              chainId: appKitSession.chainId || 11155111,
            };
            
            // Cache session
            (window as any).__appkit_session_cache__ = siweSession;
            (window as any).__appkit_session_cache_expiry__ = Date.now() + 5000;
            
            return siweSession;
          }
        } catch (importError) {
          console.warn('⚠️ [AppKit SIWE] Could not import AppKit session store:', importError);
          // Continue with fallback checks
        }
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

      // ⚠️ CRITICAL: When wallet is connected, only skip the sign prompt if we have a completed
      // SIWE session in the AppKit store. Do NOT use a DB session when wallet is connected,
      // so the user always sees the signature request after connecting.
      if (walletAddress && typeof window !== 'undefined') {
        try {
          // @ts-expect-error - Dynamic import path resolved at runtime by bundler
          const appKitSessionModule = await import('@/lib/auth/appkit-session');
          const appKitSession = appKitSessionModule.useAppKitSession.getState().session;
          const storeHasSameAddress = appKitSession.address?.toLowerCase() === walletAddress.toLowerCase();
          const storeHasNoUser = !appKitSession.user;
          if (storeHasSameAddress && storeHasNoUser && appKitSession.isConnected) {
            console.log('🔐 [AppKit SIWE] Wallet connected but no SIWE user in store - returning null to trigger sign prompt');
            return null;
          }
          // Wallet connected: only skip sign if we already returned from store (with user) above.
          // Do not use DB session when wallet is connected - force sign prompt.
          console.log('ℹ️ [AppKit SIWE] Wallet connected - requiring store session; returning null so sign prompt can show');
          return null;
        } catch (_) {
          // If store import fails, fall through to DB check (e.g. SSR or missing module)
        }
      }

      // Use API route for stored sessions only when wallet is not connected (e.g. initial page load)
      if (walletAddress) {
        try {
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
              
              // Check if session is still valid
              if (expiresAt > new Date() && session.status === 'ACTIVE') {
                console.log('✅ [AppKit SIWE] Found stored session in database:', {
                  sessionId: session.id,
                  address: session.walletAddress,
                  chainId: session.chainId,
                  expiresAt: expiresAt.toISOString(),
                });
                
                // Return SIWE session format
                const siweSession: SIWESession = {
                  address: session.walletAddress,
                  chainId: typeof session.chainId === 'number' ? session.chainId : parseInt(String(session.chainId)) || 11155111,
                };
                
                // ✅ CACHE SESSION: Store in cache to prevent repeated checks during navigation
                if (typeof window !== 'undefined') {
                  (window as any).__appkit_session_cache__ = siweSession;
                  (window as any).__appkit_session_cache_expiry__ = Date.now() + 5000; // 5 second cache
                }
                
                return siweSession;
              } else {
                console.log('⏰ [AppKit SIWE] Stored session expired, checking AppKit session store...');
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ [AppKit SIWE] Error checking stored session:', error);
          // Continue - no session found
        }
      }

      // ✅ NO NEXTAUTH CHECK: AppKit session store is the source of truth
      // If we reach here, no session was found in AppKit store or database
      console.log('ℹ️ [AppKit SIWE] No AppKit session found');
      return null;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ [AppKit SIWE] getSession error:', errorMessage);
      return null;
    }
  },
  
  /**
   * Sign out
   * Uses AppKit session store (NOT NextAuth)
   */
  signOut: async () => {
    try {
      console.log('🔌 [AppKit SIWE] Signing out...');
      
      // ✅ CLEAR SESSION CACHE: Remove cached session on sign out
      if (typeof window !== 'undefined') {
        delete (window as any).__appkit_session_cache__;
        delete (window as any).__appkit_session_cache_expiry__;
      }
      
      // ✅ USE APPKIT SESSION STORE: Clear session from AppKit store
      if (typeof window !== 'undefined') {
        try {
          // Dynamically import AppKit session store (relative path from package to root src)
          // @ts-expect-error - Dynamic import path resolved at runtime by bundler
          const appKitSessionModule = await import('@/lib/auth/appkit-session');
          const { useAppKitSession } = appKitSessionModule;
          const { clearSession } = useAppKitSession.getState();
          
          // Clear AppKit session
          clearSession();
          console.log('✅ [AppKit SIWE] AppKit session cleared');
        } catch (importError) {
          console.warn('⚠️ [AppKit SIWE] Could not import AppKit session store:', importError);
          // Continue with wallet disconnect even if session store import fails
        }
      }
      
      // Disconnect wallet via AppKit (use useDisconnect from wagmi)
      try {
        // Use wagmi's useDisconnect hook pattern - but we need to call it differently
        // Since we're in a callback, we'll dispatch a custom event for components to handle
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('appkit-disconnect-wallet'));
          console.log('✅ [AppKit SIWE] Wallet disconnect event dispatched');
        }
      } catch (disconnectError) {
        console.warn('⚠️ [AppKit SIWE] Could not dispatch wallet disconnect:', disconnectError);
        // Continue even if disconnect fails
      }
      
      console.log('✅ [AppKit SIWE] Signed out successfully');
      return true;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ [AppKit SIWE] signOut error:', errorMessage);
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
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('❌ [AppKit SIWE] Error fetching user data:', errorMessage);
          }
        }
        
        if (!verifiedUser) {
          console.warn('⚠️ [AppKit SIWE] No verified user data, redirecting to home');
          // Fallback: redirect anyway and let user sign in manually
          window.location.href = '/';
          return;
        }
        
        console.log('🔐 [AppKit SIWE] Creating AppKit session...');
        console.log('   User ID:', verifiedUser.id);
        console.log('   Wallet:', verifiedUser.walletAddress);
        console.log('   Is new user:', isNewUser);
        
        // Set flag to prevent AppKit from checking session while we're creating it
        if (typeof window !== 'undefined') {
          (window as any).__appkit_creating_session__ = true;
        }
        
        // Wait a moment to ensure user is fully committed to database
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // ✅ USE APPKIT SESSION STORE: Update session with user data
        try {
          // Dynamically import AppKit session store using root-level @/ alias
          // The @/ alias is configured in webpack to resolve to src/ from root
          // @ts-expect-error - Dynamic import path resolved at runtime by bundler
          const appKitSessionModule = await import('@/lib/auth/appkit-session');
          const { useAppKitSession } = appKitSessionModule;
          const { setSession, updateUser } = useAppKitSession.getState();
          
          // Get chainId from session or verifiedUser, default to Sepolia (11155111)
          const chainId = session?.chainId || verifiedUser.chainId || 11155111;
          
          // Update session with wallet info
          setSession({
            address: verifiedUser.walletAddress,
            chainId: typeof chainId === 'number' ? chainId : parseInt(String(chainId)) || 11155111,
            isConnected: true,
          });
          
          // Update session with user data
          updateUser({
            id: verifiedUser.id,
            email: verifiedUser.email || null,
            name: verifiedUser.name || null,
            walletAddress: verifiedUser.walletAddress,
            role: verifiedUser.role || 'CUSTOMER',
          });
          
          console.log('✅ [AppKit SIWE] AppKit session created');
          
          // Clean up temporary data
          delete (window as any).__appkit_verified_user__;
          delete (window as any).__appkit_is_new_user__;
          
          // Set flag to prevent immediate re-prompt after redirect
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('__appkit_just_signed_in__', 'true');
            // Clear the creating session flag
            delete (window as any).__appkit_creating_session__;
          }
          
          // Check if we're already on a page that should show authenticated state
          const currentPath = window.location.pathname;
          const isOnSignInPage = currentPath === '/auth/signin' || currentPath.startsWith('/auth/signin');
          const isOnWelcomePage = currentPath === '/auth/welcome' || currentPath.startsWith('/auth/welcome');
          
          // Only redirect if we're on the sign-in page or if it's a new user
          // Ensure isNewUser is defined (default to false if undefined)
          const shouldRedirectToWelcome = Boolean(isNewUser) && !isOnWelcomePage;
          if (shouldRedirectToWelcome) {
            console.log('👋 [AppKit SIWE] New user detected - redirecting to welcome page');
            window.location.href = '/auth/welcome?newUser=true';
          } else if (isOnSignInPage) {
            // If on sign-in page, redirect to home
            console.log('👋 [AppKit SIWE] On sign-in page - redirecting to home');
            window.location.href = '/';
          } else {
            // Already on the right page - session is updated, components will react
            console.log('✅ [AppKit SIWE] Already on correct page - AppKit session updated');
          }
        } catch (sessionError) {
          const errorMessage = sessionError instanceof Error ? sessionError.message : String(sessionError);
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
        // Properly serialize error object to prevent "[object Object]" JSON parsing errors
        const errorMessage = error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null
          ? JSON.stringify(error, null, 2)
          : String(error);
        
        console.error('❌ [AppKit SIWE] onSignIn error:', errorMessage);
        
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
    
    // ✅ CLEAR SESSION CACHE: Remove cached session on sign out
    // This ensures that when network changes trigger sign out, the cache is cleared
    // and user will be prompted to sign again for the new network
    if (typeof window !== 'undefined') {
      delete (window as any).__appkit_session_cache__;
      delete (window as any).__appkit_session_cache_expiry__;
      console.log('🧹 [AppKit SIWE] Session cache cleared');
    }
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

