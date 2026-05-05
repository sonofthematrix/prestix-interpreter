"use client";

/**
 * SocialWalletSIWEHandler Component
 * 
 * Handles SIWE signature flow for social wallets (Google, Email) after ReownAuthentication completes.
 * 
 * Problem: When users connect via Google social login, ReownAuthentication handles authentication
 * but bypasses our custom SIWE flow. This component detects social wallet connections and
 * triggers SIWE signature verification to create a session in our database.
 * 
 * Flow:
 * 1. Detects when a social wallet connects (via useAppKitAccount)
 * 2. Checks if we have a session for that wallet address
 * 3. If no session exists, triggers SIWE signature flow
 * 4. After signature, creates session via verifyMessage → onSignIn
 */

import { useAppKitAccount } from '@reown/appkit/react';
import { useEffect, useRef, useState } from 'react';
import { useSession, useAppKitSession } from '@/lib/auth/appkit-session';
import { useSIWEVerificationStore } from '@/stores/siwe-verification-store';

export function SocialWalletSIWEHandler() {
  // ✅ Use AppKit hooks only (no WagmiProvider required)
  const appKitAccount = useAppKitAccount();
  const { data: session, status: sessionStatus } = useSession();
  
  // ✅ Zustand store for SIWE verification state
  const {
    status: verificationStatus,
    error: verificationError,
    retryCount,
    startSigning,
    setSignature,
    startVerifying,
    markSuccess,
    markFailed,
    incrementRetry,
    resetForWallet,
  } = useSIWEVerificationStore();
  
  // Get wallet address and connection status from AppKit
  let walletAddress = appKitAccount.address;
  let isConnected = appKitAccount.isConnected === true;
  
  // ✅ Update global connection flag for verifyMessage guard
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__appkit_account__ = appKitAccount;
      (window as any).__appkit_connected__ = isConnected && !!walletAddress;
    }
  }, [isConnected, walletAddress, appKitAccount]);
  
  // ✅ CRITICAL: Also check for Magic Link authentication (separate from AppKit)
  // Magic Link provides wallet addresses in localStorage or session after Google OAuth
  const [magicWalletAddress, setMagicWalletAddress] = useState<string | null>(null);
  
  // ✅ CRITICAL: Check session for Magic Link wallet address
  // If user is authenticated but doesn't have walletAddress in session, check Magic Link data
  useEffect(() => {
    const checkSessionForWallet = async () => {
      // If user is authenticated but no wallet address in AppKit session
      if (sessionStatus === 'authenticated' && !session?.user?.walletAddress) {
        console.log('🔍 [SocialWalletSIWEHandler] User authenticated but no wallet in session, checking Magic Link...');
        
        // Check /api/auth/me for wallet address
        try {
          const meRes = await fetch('/api/auth/me', { credentials: 'include' });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData?.user?.walletAddress) {
              console.log('✅ [SocialWalletSIWEHandler] Found wallet in /api/auth/me:', meData.user.walletAddress.substring(0, 10) + '...');
              setMagicWalletAddress(meData.user.walletAddress);
              return;
            }
          }
        } catch (e) {
          console.warn('⚠️ [SocialWalletSIWEHandler] Failed to check /api/auth/me:', e);
        }
        
        // Also check localStorage for Magic Link data
        if (typeof window !== 'undefined') {
          const magicSession = localStorage.getItem('magic_session');
          const magicUser = localStorage.getItem('magic_user');
          
          if (magicSession || magicUser) {
            try {
              const sessionData = magicSession ? JSON.parse(magicSession) : null;
              const userData = magicUser ? JSON.parse(magicUser) : null;
              
              // Extract Ethereum wallet address
              const wallets = sessionData?.user_data?.wallets || userData?.wallets || [];
              const ethWallet = wallets.find((w: any) => 
                w.chain === 'ETH' || (w.network && (w.network.includes('MAINNET') || w.network.includes('SEPOLIA')))
              );
              
              if (ethWallet?.public_address) {
                console.log('✅ [SocialWalletSIWEHandler] Found Magic Link wallet:', ethWallet.public_address.substring(0, 10) + '...');
                setMagicWalletAddress(ethWallet.public_address);
              }
            } catch (e) {
              console.warn('⚠️ [SocialWalletSIWEHandler] Failed to parse Magic Link data:', e);
            }
          }
        }
      }
    };
    
    checkSessionForWallet();
  }, [session, sessionStatus]);
  
  useEffect(() => {
    // Check for Magic Link wallet address in localStorage or sessionStorage
    if (typeof window !== 'undefined') {
      // Magic Link might store wallet info in various places
      const checkMagicLinkWallet = () => {
        // Check localStorage for Magic Link session data
        const magicSession = localStorage.getItem('magic_session');
        const magicUser = localStorage.getItem('magic_user');
        const fridgeToken = localStorage.getItem('fridge_access_token');
        
        if (magicSession || magicUser || fridgeToken) {
          try {
            // Try to parse Magic Link session/user data
            const sessionData = magicSession ? JSON.parse(magicSession) : null;
            const userData = magicUser ? JSON.parse(magicUser) : null;
            
            // Extract wallet address from Magic Link data
            if (userData?.wallets) {
              const ethWallet = userData.wallets.find((w: any) => 
                w.chain === 'ETH' || w.network === 'MAINNET' || w.network === 'SEPOLIA'
              );
              if (ethWallet?.public_address) {
                return ethWallet.public_address;
              }
            }
            
            // Also check session data
            if (sessionData?.user_data?.wallets) {
              const ethWallet = sessionData.user_data.wallets.find((w: any) => 
                w.chain === 'ETH' || w.network === 'MAINNET' || w.network === 'SEPOLIA'
              );
              if (ethWallet?.public_address) {
                return ethWallet.public_address;
              }
            }
          } catch (e) {
            console.warn('⚠️ [SocialWalletSIWEHandler] Failed to parse Magic Link data:', e);
          }
        }
        
        // Check for Reown/AppKit social wallet indicators
        const siwxAuthToken = localStorage.getItem('@appkit/siwx-auth-token');
        const connectedSocial = localStorage.getItem('@appkit/connected_social');
        
        if (siwxAuthToken || connectedSocial) {
          // If we have AppKit social indicators but no wallet address from AppKit,
          // check if wallet is stored elsewhere
          const storedWallet = localStorage.getItem('@appkit/wallet_address');
          if (storedWallet) {
            return storedWallet;
          }
        }
        
        return null;
      };
      
      const magicWallet = checkMagicLinkWallet();
      if (magicWallet && magicWallet !== magicWalletAddress) {
        console.log('🔍 [SocialWalletSIWEHandler] Detected Magic Link wallet:', magicWallet.substring(0, 10) + '...');
        setMagicWalletAddress(magicWallet);
      }
    }
  }, [magicWalletAddress]);
  
  // Use Magic Link wallet if AppKit doesn't have one
  if (!walletAddress && magicWalletAddress) {
    walletAddress = magicWalletAddress;
    isConnected = true;
  }
  
  const [isProcessing, setIsProcessing] = useState(false);
  const processedAddressRef = useRef<string | null>(null);
  const processingRef = useRef(false);

  // Detect if this is a social wallet
  // ✅ CRITICAL: Only trigger for actual social/embedded wallets, not regular EOA wallets
  const isSocialWallet = (() => {
    // Must have a wallet address to check
    if (!walletAddress) {
      return false;
    }

    // ✅ CRITICAL: Check for Magic Link authentication (Google OAuth via Magic Link)
    if (typeof window !== 'undefined') {
      const magicSession = localStorage.getItem('magic_session');
      const magicUser = localStorage.getItem('magic_user');
      const fridgeAccessToken = localStorage.getItem('fridge_access_token');
      
      // If Magic Link authenticated (has session/user data), it's a social wallet
      if (magicSession || magicUser || fridgeAccessToken) {
        console.log('✅ [SocialWalletSIWEHandler] Detected Magic Link social authentication');
        return true;
      }
    }

    // Check localStorage for AppKit/Reown social login indicator
    if (typeof window !== 'undefined') {
      const connectedSocial = localStorage.getItem('@appkit/connected_social');
      const socialProvider = localStorage.getItem('@appkit/social_provider');
      const siwxAuthToken = localStorage.getItem('@appkit/siwx-auth-token');
      
      // If we have social indicators AND siwx token, it's definitely a social wallet
      if ((connectedSocial || socialProvider) && siwxAuthToken) {
        return true;
      }
    }

    // Check AppKit account type
    const accountType = appKitAccount.allAccounts?.[0]?.type;
    
    // Explicitly exclude EOA wallets (regular MetaMask, etc.)
    if (accountType === 'eoa' || accountType === 'smartAccount' || accountType === 'payment' || accountType === 'ordinal' || accountType === 'stx') {
      return false;
    }
    
    // Only consider social if account type is explicitly 'social'
    if (accountType === 'payment' || accountType === 'ordinal' || accountType === 'stx') {
      return true;
    }

    // Check embeddedWalletInfo
    const embeddedInfo = appKitAccount.embeddedWalletInfo;
    if (embeddedInfo) {
      const authProvider = (embeddedInfo as any).authProvider;
      // Only consider social if authProvider is explicitly set and not 'wallet'
      if (authProvider && authProvider !== 'wallet' && authProvider !== 'extension') {
        return true;
      }
    }

    // Default to false - only trigger for confirmed social wallets
    return false;
  })();

  const isAuthenticated = sessionStatus === 'authenticated' && !!session?.user;
  const hasSessionForWallet = session?.user?.walletAddress?.toLowerCase() === walletAddress?.toLowerCase();

  // ✅ When Reown /auth/v1/authenticate succeeds, cookie is set but useAppKitAccount.address may lag.
  // Poll /api/auth/me briefly so we close modal and redirect without waiting for address.
  const reownPollDoneRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined' || hasSessionForWallet || reownPollDoneRef.current) return;
    const siwxToken = localStorage.getItem('@appkit/siwx-auth-token');
    if (!siwxToken) return;
    let cancelled = false;
    const poll = async () => {
      for (let i = 0; i < 8 && !cancelled; i++) {
        await new Promise((r) => setTimeout(r, 500));
        if (cancelled) return;
        try {
          const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
          if (!res.ok) continue;
          const data = await res.json();
          const user = data?.user;
          if (!user?.id) continue;
          const addr = user.walletAddress;
          if (!addr) continue;
          reownPollDoneRef.current = true;
          await useAppKitSession.getState().hydrateFromCookie(addr);
          window.dispatchEvent(new CustomEvent('appkit-siwe-signin', { detail: { user, isNewUser: false } }));
          try {
            const { getModal } = await import('@/lib/appkit');
            const modal = getModal();
            if (modal && typeof (modal as any).close === 'function') await (modal as any).close();
          } catch (_) {}
          window.dispatchEvent(new CustomEvent('appkit-siwe-navigate', { detail: { path: '/' } }));
          return;
        } catch (_) {}
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [hasSessionForWallet]);

  useEffect(() => {
    // ✅ CRITICAL: Prevent premature triggering on initial page load
    // Skip if:
    // - Not connected
    // - No wallet address
    // - Already processed this address
    // - Currently processing
    // - Not a social wallet
    // - Already authenticated with this wallet
    // - AppKit not initialized
    // - Page just loaded (prevent immediate trigger)
    // - AppKit SIWE is already handling signature
    // - Session creation is in progress
    
    // Check if AppKit is initialized (not required for Magic Link)
    const appKitInitialized = typeof window !== 'undefined' && (window as any).__appkit_initialized === true;
    
    // Check if AppKit SIWE is already handling signature
    const appKitSIWEInProgress = typeof window !== 'undefined' && (
      (window as any).__appkit_creating_session__ === true ||
      (window as any).__appkit_verified_user__ !== undefined ||
      sessionStorage.getItem('__appkit_just_signed_in__') === 'true'
    );
    
    // Check if we're on initial page load (prevent immediate trigger)
    // ✅ RELAXED: For Magic Link, allow trigger after short delay even on initial load
    const isInitialLoad = typeof window !== 'undefined' && 
      !sessionStorage.getItem('__social_wallet_siwe_ready__');
    
    // ✅ CRITICAL: For Magic Link, we need to trigger SIWE even if AppKit isn't initialized
    // Magic Link authentication happens outside AppKit, so we need to handle it separately
    const isMagicLinkAuth = typeof window !== 'undefined' && (
      localStorage.getItem('magic_session') ||
      localStorage.getItem('magic_user') ||
      localStorage.getItem('fridge_access_token')
    );
    
    // ✅ CRITICAL: Also check if user is authenticated but doesn't have SIWE session
    // This handles Magic Link authentication where user is authenticated but SIWE wasn't triggered
    const isAuthenticatedButNoSIWE = sessionStatus === 'authenticated' && 
      session?.user && 
      !hasSessionForWallet &&
      walletAddress;
    
    // Skip if:
    // - Not connected AND not Magic Link authenticated AND not authenticated without SIWE
    // - No wallet address
    // - Already processed this address
    // - Currently processing
    // - Not a social wallet AND not authenticated without SIWE
    // - Already authenticated with this wallet
    // - AppKit SIWE is already handling signature (unless Magic Link or authenticated without SIWE)
    // - Initial load AND AppKit not initialized (unless Magic Link or authenticated without SIWE)
    if (
      (!isConnected && !isMagicLinkAuth && !isAuthenticatedButNoSIWE) ||
      !walletAddress ||
      processedAddressRef.current === walletAddress ||
      processingRef.current ||
      (!isSocialWallet && !isAuthenticatedButNoSIWE) ||
      hasSessionForWallet ||
      (appKitSIWEInProgress && !isMagicLinkAuth && !isAuthenticatedButNoSIWE) ||
      (isInitialLoad && !appKitInitialized && !isMagicLinkAuth && !isAuthenticatedButNoSIWE)
    ) {
      // Mark as ready after initial check (prevents immediate trigger on next render)
      if (typeof window !== 'undefined' && isInitialLoad) {
        sessionStorage.setItem('__social_wallet_siwe_ready__', 'true');
      }
      return;
    }

    console.log('🔐 [SocialWalletSIWEHandler] Social wallet connected or authenticated without SIWE, checking session...', {
      walletAddress,
      isSocialWallet,
      hasSessionForWallet,
      sessionStatus,
      appKitInitialized,
      appKitSIWEInProgress,
      isMagicLinkAuth,
      isAuthenticatedButNoSIWE: sessionStatus === 'authenticated' && session?.user && !hasSessionForWallet,
    });

    const handleSocialWalletConnection = async () => {
      // ✅ CRITICAL: For Magic Link, reduce delay since authentication already completed
      const isMagicLinkAuth = typeof window !== 'undefined' && (
        localStorage.getItem('magic_session') ||
        localStorage.getItem('magic_user') ||
        localStorage.getItem('fridge_access_token') ||
        magicWalletAddress === walletAddress
      );
      // ✅ Reown social/email: siwx-auth-token is set right after /auth/v1/authenticate succeeds
      const hasReownAuthToken = typeof window !== 'undefined' && !!localStorage.getItem('@appkit/siwx-auth-token');
      // Shorter delay when Reown auth just completed (cookie set by authenticate) or Magic Link
      const delay = isMagicLinkAuth ? 500 : hasReownAuthToken ? 600 : 2000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Double-check conditions after delay (user might have disconnected)
      if ((!isConnected && !isMagicLinkAuth) || !walletAddress || hasSessionForWallet) {
        console.log('⏸️ [SocialWalletSIWEHandler] Conditions changed during delay, skipping...');
        return;
      }
      
      processingRef.current = true;
      processedAddressRef.current = walletAddress;
      setIsProcessing(true);

      try {
        // Step 0: Check cookie session first (backend session). If valid for this wallet, hydrate and skip SIWE.
        const meRes = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
        if (meRes.ok) {
          const meData = await meRes.json();
          const cookieUser = meData?.user;
          if (cookieUser?.id && cookieUser?.walletAddress?.toLowerCase() === walletAddress.toLowerCase()) {
            console.log('✅ [SocialWalletSIWEHandler] Valid cookie session for wallet, hydrating and skipping SIWE');
            await useAppKitSession.getState().hydrateFromCookie(walletAddress);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('appkit-siwe-signin', { detail: { user: cookieUser, isNewUser: false } }));
              // Close AppKit modal and redirect (same as siweConfig.onSignIn for wallet flow)
              try {
                const { getModal } = await import('@/lib/appkit');
                const modal = getModal();
                if (modal && typeof (modal as any).close === 'function') {
                  await (modal as any).close();
                  console.log('✅ [SocialWalletSIWEHandler] Modal closed after social auth');
                }
              } catch (closeErr) {
                console.warn('⚠️ [SocialWalletSIWEHandler] Could not close modal:', closeErr);
              }
              const isNewUser = (cookieUser as { isNewUser?: boolean })?.isNewUser === true;
              window.dispatchEvent(new CustomEvent('appkit-siwe-navigate', {
                detail: { path: isNewUser ? '/auth/welcome?newUser=true' : '/' }
              }));
            }
            processingRef.current = false;
            setIsProcessing(false);
            return;
          }
        }

        // Step 1: Check if DB session exists for this wallet (sessions API requires walletAddress query)
        const sessionRes = await fetch(`/api/auth/sessions?walletAddress=${encodeURIComponent(walletAddress)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });

        let hasExistingSession = false;
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          const sessions = sessionData?.sessions ?? [];
          if (Array.isArray(sessions) && sessions.length > 0) {
            hasExistingSession = true;
            console.log('✅ [SocialWalletSIWEHandler] DB session already exists for social wallet');
            // Hydrate from cookie so Redux/AuthGate can show content (cookie may have been set by Reown authenticate)
            await useAppKitSession.getState().hydrateFromCookie(walletAddress);
            if (typeof window !== 'undefined') {
              const u = sessions[0]?.user;
              if (u) {
                window.dispatchEvent(new CustomEvent('appkit-siwe-signin', { detail: { user: u, isNewUser: false } }));
                // Close AppKit modal and redirect (same as siweConfig.onSignIn for wallet flow)
                try {
                  const { getModal } = await import('@/lib/appkit');
                  const modal = getModal();
                  if (modal && typeof (modal as any).close === 'function') {
                    await (modal as any).close();
                    console.log('✅ [SocialWalletSIWEHandler] Modal closed after DB session found');
                  }
                } catch (closeErr) {
                  console.warn('⚠️ [SocialWalletSIWEHandler] Could not close modal:', closeErr);
                }
                window.dispatchEvent(new CustomEvent('appkit-siwe-navigate', { detail: { path: '/' } }));
              }
            }
            processingRef.current = false;
            setIsProcessing(false);
            return;
          }
        }

        // Step 2: Check if AppKit SIWE is already handling signature
        // If AppKit SIWE is in progress, don't trigger manually
        const appKitState = (window as any).__appkit_state__;
        const isAppKitPrompting = appKitState?.open === true || appKitState?.siweSigning === true;
        const isCreatingSession = (window as any).__appkit_creating_session__ === true;
        const justVerified = (window as any).__appkit_verified_user__ !== undefined;
        const justSignedIn = sessionStorage.getItem('__appkit_just_signed_in__') === 'true';
        
        if (isAppKitPrompting || isCreatingSession || justVerified || justSignedIn) {
          console.log('⏸️ [SocialWalletSIWEHandler] AppKit SIWE is already handling signature, waiting...', {
            isAppKitPrompting,
            isCreatingSession,
            justVerified,
            justSignedIn,
          });
          
          // Wait longer for AppKit SIWE to complete
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Re-check session after waiting
          const recheckRes = await fetch(`/api/auth/sessions?walletAddress=${encodeURIComponent(walletAddress)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          });
          
          if (recheckRes.ok) {
            const recheckData = await recheckRes.json();
            const recheckSessions = recheckData?.sessions ?? [];
            if (Array.isArray(recheckSessions) && recheckSessions.length > 0) {
              console.log('✅ [SocialWalletSIWEHandler] Session created by AppKit SIWE flow');
              await useAppKitSession.getState().hydrateFromCookie(walletAddress);
              const u = recheckSessions[0]?.user;
              if (u && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('appkit-siwe-signin', { detail: { user: u, isNewUser: false } }));
                try {
                  const { getModal } = await import('@/lib/appkit');
                  const modal = getModal();
                  if (modal && typeof (modal as any).close === 'function') {
                    await (modal as any).close();
                  }
                } catch (_) {}
                window.dispatchEvent(new CustomEvent('appkit-siwe-navigate', { detail: { path: '/' } }));
              }
              processingRef.current = false;
              setIsProcessing(false);
              return;
            }
          }
          
          // If still no session after waiting, AppKit SIWE might not have triggered
          // Continue with manual trigger
          console.log('⚠️ [SocialWalletSIWEHandler] AppKit SIWE did not create session, proceeding with manual trigger...');
        }

        // Step 3: No session exists and AppKit isn't prompting - trigger SIWE signature flow manually
        console.log('🔐 [SocialWalletSIWEHandler] No session found, triggering SIWE signature flow manually...');

        // Get nonce
        const nonceRes = await fetch('/api/auth/wallet/nonce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress }),
        });

        if (!nonceRes.ok) {
          throw new Error('Failed to get nonce');
        }

        const { nonce } = await nonceRes.json();

        // Create SIWE message
        const domain = typeof window !== 'undefined' ? window.location.host : 'prestix.vip';
        const uri = typeof window !== 'undefined' ? window.location.origin : 'https://prestix.vip';
        const statement = 'Sign in to PRESTIX.VIP with your wallet';
        const chainId = 11155111; // Sepolia
        const issuedAt = new Date().toISOString();

        const message = `${domain} wants you to sign in with your Ethereum account:
${walletAddress}

${statement}

URI: ${uri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`;

        // Request signature using window.ethereum (works with all wallet types including embedded wallets)
        // Note: Embedded/social wallets use EIP-1271 signatures, which are handled by the verification endpoint
        console.log('📝 [SocialWalletSIWEHandler] Requesting SIWE signature for social wallet...');
        console.log('   Note: Embedded wallets use EIP-1271 signatures (handled by verification endpoint)');
        
        if (!walletAddress) {
          throw new Error('Wallet address not available');
        }

        // ✅ CRITICAL: For Magic Link embedded wallets, we need to use Magic Link's signing method
        // Magic Link wallets are smart accounts (EIP-1271) and may not support personal_sign directly
        let signature: string | undefined = undefined;
        
        // ✅ Use Zustand store to track signing state
        startSigning(walletAddress, message, nonce, chainId);
        
        // Check if this is a Magic Link wallet
        const isMagicLinkWallet = typeof window !== 'undefined' && (
          localStorage.getItem('magic_session') ||
          localStorage.getItem('magic_user') ||
          localStorage.getItem('fridge_access_token') ||
          magicWalletAddress === walletAddress
        );
        
        if (isMagicLinkWallet) {
          // For Magic Link wallets, try to use Magic Link SDK if available
          // Magic Link wallets are smart accounts and need special handling
          console.log('🔐 [SocialWalletSIWEHandler] Detected Magic Link wallet, attempting to sign...');
          
          // Try Magic Link SDK first (preferred for smart accounts)
          if (typeof window !== 'undefined') {
            const magic = (window as any).magic;
            if (magic && magic.wallet) {
              try {
                console.log('📝 [SocialWalletSIWEHandler] Using Magic Link SDK to sign message...');
                // Magic Link SDK signing for smart accounts
                signature = await magic.wallet.signMessage({
                  message,
                  address: walletAddress,
                });
                console.log('✅ [SocialWalletSIWEHandler] Magic Link SDK signature obtained');
                if (signature) {
                  setSignature(signature);
                }
              } catch (magicError: any) {
                console.warn('⚠️ [SocialWalletSIWEHandler] Magic Link SDK signing failed, trying window.ethereum...', magicError);
                // Fall through to window.ethereum
              }
            }
          }
          if (!signature && typeof window !== 'undefined' && (window as any).ethereum) {
            try {
              signature = await (window as any).ethereum.request({
                method: 'personal_sign',
                params: [message, walletAddress],
              });
              console.log('✅ [SocialWalletSIWEHandler] window.ethereum signature obtained');
              if (signature) {
                setSignature(signature);
              }
            } catch (ethError: any) {
              console.error('❌ [SocialWalletSIWEHandler] window.ethereum signing also failed:', ethError);
              throw new Error(`Failed to sign message: ${ethError?.message || 'Please ensure your wallet is connected and try again'}`);
            }
          }
          if (!signature) {
            throw new Error('No signing method available. Please ensure Magic Link SDK is initialized or wallet is connected.');
          }
        } else if (!isMagicLinkAuth) {
          // Standard wallet signing via window.ethereum
          if (typeof window === 'undefined' || !(window as any).ethereum) {
            throw new Error('Ethereum provider not available. Please ensure your wallet is connected.');
          }

          const ethereum = (window as any).ethereum;
          if (!ethereum.request) {
            throw new Error('Wallet provider does not support signing');
          }

          try {
            // Use personal_sign method (works with all wallet types)
            signature = await ethereum.request({  
              method: 'personal_sign',
              params: [message, walletAddress],
            });
            console.log('✅ [SocialWalletSIWEHandler] Standard wallet signature obtained');
            if (signature) {
              setSignature(signature);
            }
          } catch (signError: any) {
            throw signError; // Re-throw to be caught by outer try-catch
          }
        }
        
        console.log('✅ [SocialWalletSIWEHandler] Signature obtained successfully');

        // Verify signature and create session
        if (!signature) {
          markFailed('No signature obtained', 'unknown');
          throw new Error('No signature obtained');
        }

        console.log('✅ [SocialWalletSIWEHandler] Signature obtained, verifying...');
        startVerifying();
        
        const verifyRes = await fetch('/api/auth/wallet/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message,
            signature: signature,
            walletAddress: walletAddress,
            chainId: chainId,
            nonce: nonce,
            walletType: 'Social Wallet',
            linkToSocialAccount: true,
          }),
        });

        if (!verifyRes.ok) {
          // ✅ Improved error handling - try to extract actual error message
          let errorData: any = {};
          let errorMessage = 'Failed to verify signature';
          let errorDetails: Record<string, any> = { status: verifyRes.status };
          
          try {
            const text = await verifyRes.text();
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
            console.error('❌ [SocialWalletSIWEHandler] Failed to read error response:', fetchError);
            errorMessage = `HTTP ${verifyRes.status}: ${verifyRes.statusText}`;
            errorDetails.statusText = verifyRes.statusText;
          }
          
          console.error('❌ [SocialWalletSIWEHandler] Verification failed:', {
            status: verifyRes.status,
            error: errorMessage,
            details: errorDetails,
          });
          
          // Determine error type
          let errorType: 'signature_rejected' | 'verification_failed' | 'network_error' | 'unknown' = 'unknown';
          if (verifyRes.status >= 400 && verifyRes.status < 500) {
            errorType = 'verification_failed';
          } else if (verifyRes.status >= 500) {
            errorType = 'network_error';
          }
          
          // Handle system user error gracefully
          if (errorMessage.includes('System user not found')) {
            console.error('❌ [SocialWalletSIWEHandler] System user not configured.');
            console.error('   Please run: bun scripts/setup-system-user.ts');
            console.error('   SIWE verification cannot proceed without system user.');
            markFailed(errorMessage, 'verification_failed', errorDetails);
            // Don't throw - allow user to continue, they can sign manually later
            return;
          }
          
          markFailed(errorMessage, errorType, errorDetails);
          throw new Error(errorMessage);
        }

        const { user } = await verifyRes.json();
        console.log('✅ [SocialWalletSIWEHandler] SIWE verification successful, session created:', {
          userId: user.id,
          walletAddress: user.walletAddress,
        });
        
        // ✅ Mark success in Zustand store
        markSuccess();

        // Update Zustand appkit-session so hasSessionForWallet is true and we don't re-trigger SIWE
        useAppKitSession.getState().updateUser({
          id: user.id,
          email: user.email ?? null,
          name: user.name ?? null,
          walletAddress: user.walletAddress ?? walletAddress,
          role: user.role ?? 'CUSTOMER',
          profileImageUrl: (user as { profileImageUrl?: string | null }).profileImageUrl ?? null,
        });

        // Notify AuthGate to refresh Redux (fetchSession) so main page loads with user/DB data
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('appkit-siwe-signin', {
            detail: { user, isNewUser: false },
          }));
        }

      } catch (rawError: unknown) {
        const err = rawError as Record<string, unknown>;
        const errorMessage = typeof err?.message === 'string'
          ? err.message
          : typeof rawError === 'string'
            ? rawError
            : rawError instanceof Error
              ? rawError.message
              : String(rawError ?? 'Unknown error');
        const errorStack = typeof err?.stack === 'string' ? err.stack : undefined;

        // Check if user rejected the signature request
        if (err?.code === 4001 ||
            err?.name === 'UserRejectedRequestError' ||
            (typeof errorMessage === 'string' && (
              errorMessage.includes('User rejected') ||
              errorMessage.includes('denied') ||
              errorMessage.includes('rejected')
            ))) {
          console.log('⏭️ [SocialWalletSIWEHandler] User rejected signature request');
          markFailed('User rejected signature request', 'signature_rejected', {
            code: err?.code,
            name: err?.name,
          });
          return;
        }

        // Check if we should retry
        if (retryCount < 3 && verificationStatus !== 'failed') {
          incrementRetry();
          console.log(`⏳ [SocialWalletSIWEHandler] Retrying verification (attempt ${retryCount + 1}/3)...`);
        }

        let rawPreview: string | undefined;
        try {
          rawPreview = rawError !== null && typeof rawError === 'object'
            ? JSON.stringify(rawError).slice(0, 200)
            : undefined;
        } catch {
          rawPreview = Object.prototype.toString.call(rawError);
        }
        console.error('❌ [SocialWalletSIWEHandler] Error handling social wallet SIWE:', errorMessage, {
          stack: errorStack,
          status: verificationStatus,
          retryCount,
          ...(rawPreview ? { raw: rawPreview } : {}),
        });

        if (verificationStatus !== 'failed') {
          markFailed(errorMessage || 'Unknown error', 'unknown', { stack: errorStack });
        }
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
      }
    };

    handleSocialWalletConnection();
  }, [
    isConnected,
    walletAddress,
    isSocialWallet,
    hasSessionForWallet,
    sessionStatus,
  ]);

  // Reset when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      processingRef.current = false;
      processedAddressRef.current = null;
      reownPollDoneRef.current = false;
      setIsProcessing(false);
      // Clear ready flag on disconnect so it can trigger again on reconnect
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('__social_wallet_siwe_ready__');
      }
      // Reset Zustand store for disconnected wallet
      if (walletAddress) {
        resetForWallet(walletAddress);
      }
    }
  }, [isConnected, walletAddress, resetForWallet]);

  // Component doesn't render anything visible
  return null;
}
