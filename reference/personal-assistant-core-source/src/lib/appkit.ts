// ✅ CRITICAL: Patch @reown/appkit-utils BEFORE importing any AppKit modules
// This prevents "Cannot read properties of null (reading 'asset')" errors during TokenUtil initialization
import '@/lib/appkit-patch';

import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import type { AppKitNetwork } from '@reown/appkit/networks'
import {
  createAppKit,
  useAppKit as useAppKitOriginal,
  useAppKitAccount,
  useAppKitEvents,
  useAppKitNetwork,
  useAppKitState,
  useAppKitTheme,
  useDisconnect,
  useWalletInfo
} from '@reown/appkit/react'
import type { ConnectorTypeOrder } from '@reown/appkit'
import React from 'react';
import { SIWE_ENABLED, siweConfig } from '@/lib/siwe-config';
import { projectId, REOWN_APP_NAME } from '@/lib/reown-project-id';
import { APPKIT_ICON_BASE64 } from '@/lib/appkit-icon-base64';

// Re-export so consumers can keep importing from @/lib/appkit
export { projectId };

// ✅ DESKTOP FIX: Enhanced mobile detection to prevent desktop browsers from being treated as mobile
// This ensures MetaMask browser extension is properly prioritized on desktop browsers

// Detect specific mobile platforms
const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent) && /Mobile/i.test(navigator.userAgent);
const isMobileChrome = typeof navigator !== 'undefined' && /Android.*Chrome/i.test(navigator.userAgent) && /Mobile/i.test(navigator.userAgent);
const isMobileEdge = typeof navigator !== 'undefined' && /Android.*Edg/i.test(navigator.userAgent) && /Mobile/i.test(navigator.userAgent);

// Enhanced mobile detection - check for touch support AND small screen size
// Desktop browsers should have large screens (>= 768px) or no touch events
const hasTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
const hasSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768;
const isMobileUserAgent = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// TRUE mobile: Mobile user agent + (small screen OR touch support on small device)
// Desktop with touch (touchscreen laptops): isMobile = false if screen is large
const isMobile = typeof window !== 'undefined' && isMobileUserAgent && (hasSmallScreen || (hasTouch && window.innerWidth < 1024));

// Log device detection for debugging
if (typeof window !== 'undefined') {
  console.log('🔍 [appkit.ts] Device Detection:', {
    isMobile,
    isIOS,
    isAndroid,
    hasTouch,
    hasSmallScreen,
    screenWidth: window.innerWidth,
    deviceType: isMobile ? '📱 MOBILE' : '🖥️ DESKTOP',
    userAgent: navigator.userAgent.substring(0, 100) + '...',
  });
}

// ✅ DESKTOP FIX: Connector priority based on device type
// Desktop: Injected (MetaMask extension) FIRST → WalletConnect → EIP6963
// Mobile: WalletConnect FIRST → Injected (if available) → EIP6963
const connectorTypeOrder = (isMobile
  ? ['walletConnect', 'injected', 'eip6963']
  : ['injected', 'walletConnect', 'eip6963']) as ConnectorTypeOrder[];

if (typeof window !== 'undefined') {
  console.log('🔌 [appkit.ts] Connector Configuration:', {
    connectorTypeOrder,
    priority: isMobile
      ? '1️⃣ WalletConnect → 2️⃣ Injected → 3️⃣ EIP6963'
      : '1️⃣ Injected (MetaMask) → 2️⃣ WalletConnect → 3️⃣ EIP6963',
    metaMaskSupport: isMobile ? 'Via WalletConnect mobile app' : 'Via browser extension (window.ethereum)',
  });
}

/** Returns a valid RPC URL only; never a URL containing "undefined" (prevents JsonRpcProvider "failed to detect network"). */
function getEthereumRpcUrl(): string {
  const u = process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL;
  if (typeof u === 'string' && u.length > 10 && !u.includes('undefined')) return u;
  const infura = process.env.NEXT_PUBLIC_INFURA_API_KEY;
  if (typeof infura === 'string' && infura.length > 0) return `https://mainnet.infura.io/v3/${infura}`;
  const alchemy = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (typeof alchemy === 'string' && alchemy.length > 0) return `https://eth-mainnet.g.alchemy.com/v2/${alchemy}`;
  return 'https://ethereum-rpc.publicnode.com';
}

/** Returns a valid RPC URL only; never a URL containing "undefined" (prevents JsonRpcProvider "failed to detect network"). */
function getSepoliaRpcUrl(): string {
  const u = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
  if (typeof u === 'string' && u.length > 10 && !u.includes('undefined')) return u;
  const infura = process.env.NEXT_PUBLIC_INFURA_API_KEY;
  if (typeof infura === 'string' && infura.length > 0) return `https://sepolia.infura.io/v3/${infura}`;
  const alchemy = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (typeof alchemy === 'string' && alchemy.length > 0) return `https://eth-sepolia.g.alchemy.com/v2/${alchemy}`;
  return 'https://ethereum-sepolia-rpc.publicnode.com';
}

// Sepolia fallback RPCs so JsonRpcProvider/wagmi can retry if primary fails (avoids "failed to detect network")
const SEPOLIA_RPC_FALLBACKS_RAW = [
  getSepoliaRpcUrl(),
  'https://rpc.sepolia.org',
  'https://ethereum-sepolia-rpc.publicnode.com',
];
const SEPOLIA_RPC_FALLBACKS = SEPOLIA_RPC_FALLBACKS_RAW.filter(
  (url, i, arr) => typeof url === 'string' && url.length > 10 && !url.includes('undefined') && arr.indexOf(url) === i
);
const SEPOLIA_RPC_FALLBACKS_SAFE = SEPOLIA_RPC_FALLBACKS.length > 0 ? SEPOLIA_RPC_FALLBACKS : ['https://ethereum-sepolia-rpc.publicnode.com'];

const customEthereum: AppKitNetwork = {
  id: 1,
  name: 'Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [getEthereumRpcUrl()] },
    public: { http: [getEthereumRpcUrl()] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://etherscan.io' },
  },
  testnet: false,
};

const customSepolia: AppKitNetwork = {
  id: 11155111,
  name: 'Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: SEPOLIA_RPC_FALLBACKS_SAFE },
    public: { http: SEPOLIA_RPC_FALLBACKS_SAFE },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
  testnet: true,
};

export const networks = [customEthereum, customSepolia] as [AppKitNetwork, ...AppKitNetwork[]];

// Setup wagmi adapter with storage configuration
// ✅ CRITICAL: Let WagmiAdapter auto-create default connectors (injected, walletConnect, coinbase)
// Do NOT pass custom connectors array - this would override defaults and lose MetaMask support
// WagmiAdapter will automatically detect window.ethereum and create injected connector
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true // Enable SSR support
  // NOTE: No 'connectors' property - let WagmiAdapter create defaults automatically
  // This ensures injected connector (MetaMask) is created when window.ethereum exists
})

// Log WagmiAdapter connector configuration for debugging
if (typeof window !== 'undefined') {
  console.log('🔌 [appkit.ts] WagmiAdapter Created:', {
    networks: networks.map(n => ({ id: n.id, name: n.name })),
    projectId,
    ssr: true,
  });

  // Check for MetaMask extension
  setTimeout(() => {
    const ethereum = (window as any).ethereum;
    const hasMetaMask = ethereum?.isMetaMask === true;
    const hasEthereum = !!ethereum;
    const providers = ethereum?.providers || [];
    const hasMetaMaskProvider = providers.some((p: any) => p?.isMetaMask === true);

    console.log('🦊 [appkit.ts] MetaMask Detection:', {
      hasEthereum,
      hasMetaMask,
      hasMetaMaskProvider: hasMetaMaskProvider || hasMetaMask,
      providerType: ethereum?.constructor?.name || 'unknown',
      selectedAddress: ethereum?.selectedAddress || null,
      providerCount: providers.length,
    });

    if (hasMetaMask || hasMetaMaskProvider) {
      console.log('✅ [appkit.ts] MetaMask browser extension detected');
      if (!isMobile) {
        console.log('💡 [appkit.ts] Desktop browser - MetaMask will appear as FIRST wallet option');
      }
    } else if (hasEthereum) {
      console.warn('⚠️ [appkit.ts] Ethereum provider detected but not MetaMask:', ethereum?.constructor?.name);
    } else {
      console.warn('⚠️ [appkit.ts] No ethereum provider detected - MetaMask extension may not be installed');
    }
  }, 1000);
}

// Lazy modal creation - only initialize when actually needed
let modal: ReturnType<typeof createAppKit> | null = null;

function createModalIfNeeded() {
  if (modal) return modal;

  // Reuse modal if another module (e.g. reown-appkit-module config) already initialized AppKit
  const existing = (typeof window !== 'undefined' && (window as any).__appkit_initialized && (window as any).__appkit_modal);
  if (existing) {
    modal = (window as any).__appkit_modal;
    return modal;
  }

  // Only create modal in browser environment
  // ✅ CRITICAL: Return null immediately during SSR to prevent TokenUtil from accessing .asset on null
  if (typeof window === 'undefined') {
    console.warn('⚠️ [appkit.ts] Cannot create AppKit modal: not in browser environment (SSR)');
    return null;
  }

  // ✅ CRITICAL: Set auth origin so ReownAuthentication (patched) sends nonce/authenticate to our backend
  // Prevents "Forbidden: Nonce mismatch" when modal or iframe would otherwise use a different origin
  try {
    (window as any).__appkit_auth_origin__ = window.location.origin;
    const w3mUrl = process.env.NEXT_PUBLIC_W3M_API_URL;
    if (!w3mUrl && typeof window !== 'undefined') {
      console.warn(
        '⚠️ [appkit] NEXT_PUBLIC_W3M_API_URL is not set. Add to .env.local: NEXT_PUBLIC_W3M_API_URL=' +
          window.location.origin +
          ' then restart dev server. Otherwise social/email login may get "Forbidden: Nonce mismatch".'
      );
    }
  } catch (_) {}

  // ✅ NOTE: Patching is now done in appkit-patch.ts at module load time (before any AppKit imports)
  // This ensures TokenUtil is patched before it initializes, preventing "Cannot read properties of null (reading 'asset')" errors

  try {
    console.log('🔧 [appkit.ts] Creating AppKit modal...');
    console.log('🌐 [appkit.ts] Network Configuration:', {
      networks: networks.map(n => ({ id: n.id, name: n.name })),
      defaultNetwork: { id: customSepolia.id, name: customSepolia.name },
      note: 'Sepolia Testnet (11155111) is default for testing - matches SIWE message chainId',
    });
    console.log('🔌 [appkit.ts] Connector Configuration:', {
      connectMethodsOrder: ['email', 'social'],
      enableInjected: true,
      enableWalletConnect: false,
      note: 'Injected (MetaMask) registered; connect UI still email/social-first',
    });

    modal = createAppKit({
      adapters: [wagmiAdapter],
      networks,
      // ⚠️ CRITICAL: Sepolia Testnet as default network for testing before production rollout
      // Sepolia (chainId = 11155111) matches SIWE message chainId
      defaultNetwork: customSepolia, // Sepolia Testnet (chainId = 11155111)
      metadata: {
        name: REOWN_APP_NAME,
        description: 'Real Estate Investment Platform with Gaming Integration',
        // CRITICAL: Use window.location.origin for WalletConnect - must match actual page URL
        // Fallback: NEXT_PUBLIC_HOST (set in Vercel) or VERCEL_URL (auto-set by Vercel)
        url: typeof window !== 'undefined'
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_HOST ||
             (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
             'https://prestix.vip'),
        // Use base64 data URI to avoid CORS errors when signature dialog loads icon
        // in cross-origin contexts (e.g. WalletConnect modal, secure.walletconnect.org).
        // Source: public/images/logos/app-icon/tknzn-512.png
        icons: [APPKIT_ICON_BASE64],
      },
      projectId,
      themeMode: 'dark',
      themeVariables: {
        // --w3m-icon-size prevents SVG empty width/height errors (AppKit #5442); cast for strict ThemeVariables type
        ...({ '--w3m-icon-size': '24px' } as Record<string, string>),
        '--w3m-color-mix': '#202020',
        '--w3m-color-mix-strength': 10,
        '--w3m-accent': '#F59E0B',
        '--w3m-border-radius-master': '2px',
        '--w3m-font-family': "'__Noto_Sans_a57643', '__Noto_Sans_Fallback_a57643'"
      },
      features: {
        receive: true,
        send: true,
        // Email (OTP) + Google: enabled in Reown Dashboard (Social & Email → Email). Email uses OTP flow.
        socials: ['google'] as const,
        email: true, // Enable email login (magic link/OTP - Reown uses OTP in modal)
        emailShowWallets: true, // Show wallet options after email connect (optional)
        analytics: true, // Disable analytics to reduce external service calls
        allWallets: false, // Hide "All Wallets" - email + social only (no wallet tab)
        legalCheckbox: true,
        smartSessions: typeof window !== 'undefined' && window.indexedDB !== undefined,
        collapseWallets: false,
        connectorTypeOrder,
        walletFeaturesOrder: ['onramp', 'receive', 'send', 'swaps'],
        // Email and Google - no wallet tab (wallet connection disabled below)
        connectMethodsOrder: ['email', 'social'] as const,
        // ✅ CRITICAL: Enable Reown Authentication so SDK uses ReownAuthentication (patched) for social/email.
        // When true, AppKit sets OptionsController.siwx = new ReownAuthentication() after init. That instance
        // uses our /auth/v1/nonce and /auth/v1/authenticate (via patch-reown-auth.js). Without this, social
        // connect never triggers getNonce() → sign → addSession, so no SIWE and no session token.
        reownAuthentication: true,
      },
      // Injected (MetaMask) enabled so connector is registered and verification passes; connect methods still email/social-first
      enableInjected: true,
      enableWalletConnect: false,
      enableEIP6963: false,
      // ⚠️ CRITICAL: Enable AppKit One-Click Auth with SIWE - automatically checks for existing sessions
      // When SIWE is enabled, AppKit will automatically:
      // 1. Call getSession() when wallet connects
      // 2. If getSession() returns null (no valid session with nonce), prompt for signature
      // 3. Call getNonce() to get nonce from server
      // 4. User signs message in MetaMask
      // 5. Call verifyMessage() to verify signature
      // 6. Call onSignIn() after successful verification
      siweConfig: SIWE_ENABLED ? siweConfig : undefined,
    });

    // ✅ Register modal in window for AppKitReadyStore and reown-appkit-module config (prevents double init)
    (window as any).__appkit_modal = modal;
    (window as any).__appkit_initialized = true;
    (window as any).__appkit_initializing__ = true; // Mark as initializing
    
    // ✅ Track connection state for verifyMessage guard
    // Connection state will be updated by components using useAppKitAccount hook
    if (typeof window !== 'undefined') {
      (window as any).__appkit_connected__ = false;
      (window as any).__appkit_account__ = null;
      
      // Mark initialization as complete after a short delay
      // This allows AppKit to finish setting up before we allow verification
      setTimeout(() => {
        (window as any).__appkit_initializing__ = false;
      }, 2000); // 2 second grace period for initialization
    }

    // ✅ FIX: Wrap modal.open() to prevent "Connection declined" when previous request is still active
    // Root cause: AppKit shows error when new connection request is made while MetaMask popup is open
    // Solution: Debounce + connection-in-progress guard (from reown-appkit-module pattern)
    const originalOpen = (modal as any).open;
    if (originalOpen && typeof originalOpen === 'function') {
      let isOpening = false;
      let lastOpenTime = 0;
      let openingPromise: Promise<void> | null = null;
      const DEBOUNCE_MS = 2000;

      (modal as any).open = async function (...args: unknown[]) {
        const now = Date.now();
        const timeSinceLastOpen = now - lastOpenTime;

        // ✅ FIX: Check if modal is actually visible in DOM, not just state
        // The state might be incorrectly set to open even when modal isn't visible
        try {
          const state = (modal as any).getState?.();
          const isActuallyOpen = state?.open === true;
          
          // Also check if modal element exists and is visible in DOM
          const modalElement = typeof document !== 'undefined' 
            ? document.querySelector('w3m-modal, [data-w3m-modal], w3m-router-container')
            : null;
          const isVisibleInDOM = modalElement && 
            (modalElement as HTMLElement).offsetParent !== null;
          
          // Only skip if modal is actually open AND visible
          if (isActuallyOpen && isVisibleInDOM) {
            if (typeof window !== 'undefined') {
              console.log('⏸️ [appkit.ts] Modal already open and visible, skipping duplicate open()');
            }
            return;
          }
          
          // If state says open but modal isn't visible, force close first
          if (isActuallyOpen && !isVisibleInDOM) {
            if (typeof window !== 'undefined') {
              console.log('🔧 [appkit.ts] Modal state says open but not visible, closing first...');
            }
            try {
              await (modal as any).close?.();
              // Wait a bit for close to complete
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (closeError) {
              console.warn('⚠️ [appkit.ts] Error closing stale modal:', closeError);
            }
          }
        } catch {
          // State check failed, continue
        }

        // Prevent rapid successive calls (prevents "Connection declined")
        if (isOpening || timeSinceLastOpen < DEBOUNCE_MS) {
          if (typeof window !== 'undefined') {
            console.log('⏸️ [appkit.ts] Connection request in progress or too soon, waiting...');
          }
          if (openingPromise) {
            try {
              await openingPromise;
            } catch {
              // Ignore
            }
          }
          if (Date.now() - lastOpenTime < DEBOUNCE_MS) return;
        }

        isOpening = true;
        lastOpenTime = Date.now();
        openingPromise = (async () => {
          try {
            console.log('🚀 [appkit.ts] Opening AppKit modal...');
            const result = await originalOpen.apply(this, args);
            console.log('✅ [appkit.ts] AppKit modal opened successfully');
            return result;
          } catch (error) {
            if (typeof window !== 'undefined') {
              console.error('❌ [appkit.ts] Error opening modal:', error);
            }
            throw error;
          } finally {
            setTimeout(() => {
              isOpening = false;
              openingPromise = null;
            }, 500);
          }
        })();

        return openingPromise;
      };
      if (typeof window !== 'undefined') {
        console.log('✅ [appkit.ts] modal.open() wrapped with connection deduplication');
      }
    }

    console.log('✅ [appkit.ts] AppKit modal created successfully');
    console.log('🔌 [appkit.ts] Modal Configuration:', {
      hasModal: !!modal,
      hasOpen: typeof (modal as any)?.open === 'function',
      connectorPriority: isMobile
        ? 'WalletConnect → Injected → EIP6963'
        : 'Injected (MetaMask) → WalletConnect → EIP6963',
      siweEnabled: SIWE_ENABLED,
      siweConfig: SIWE_ENABLED ? 'configured (getSession/getNonce/verifyMessage/onSignIn)' : 'disabled',
      siweFlow: SIWE_ENABLED
        ? 'AppKit will automatically call getSession() when wallet connects → if null, prompts for signature → calls getNonce() → user signs → calls verifyMessage() → calls onSignIn()'
        : 'SIWE disabled - wallet connection only',
    });

    // Verify connectors are registered
    try {
      const registeredConnectors = (modal as any)?.getConnectors?.();
      if (registeredConnectors && registeredConnectors.length > 0) {
        console.log('🔌 [appkit.ts] Registered Connectors:',
          registeredConnectors.map((c: any) => ({
            name: c.name,
            id: c.id,
            type: c.type,
            ready: c.ready,
          }))
        );

        const hasInjected = registeredConnectors.some((c: any) => c.type === 'injected' || c.id === 'injected');
        if (hasInjected) {
          console.log('✅ [appkit.ts] Injected connector registered - MetaMask extension support enabled');
        } else {
          console.warn('⚠️ [appkit.ts] No injected connector found - MetaMask may show "Not Detected"');
        }
      }
    } catch (e) {
      console.warn('⚠️ [appkit.ts] Could not check registered connectors:', e);
    }

    return modal;
  } catch (error) {
    console.error('❌ [appkit.ts] Failed to create AppKit modal:', error);
    return null;
  }
}

// Export modal getter function
export function getModal() {
  return createModalIfNeeded();
}

// ✅ VERCEL: Run createAppKit synchronously when this module loads on the client so that
// any chunk (layout, page, or shared) that uses useAppKit/useAppKitAccount will find
// createAppKit already called. Chunk load order on Vercel can cause useAppKit to run
// before AppKitInit; this guarantees AppKit exists as soon as appkit is imported.
if (typeof window !== 'undefined') {
  try {
    (window as any).__appkit_auth_origin__ = window.location.origin;
    createModalIfNeeded();
  } catch (e) {
    console.warn('[appkit] Eager createModalIfNeeded failed:', e);
  }
}

// ✅ SSR-safe wrapper for useAppKit - ensures createAppKit is called before hook is used
// During SSR, return a no-op hook. On client, ensure createAppKit is called first.
function useAppKitSafe() {
  // During SSR, return no-op
  if (typeof window === 'undefined') {
    return { open: () => {}, close: () => {} };
  }
  
  // On client, ensure createAppKit is called before using the hook
  const currentModal = modal || (window as any).__appkit_modal;
  if (!currentModal) {
    createModalIfNeeded();
  }
  
  // Get the hook result from the original hook
  const hookResult = useAppKitOriginal();
  
  // Wrap the open method to ensure modal is ready
  return {
    ...hookResult,
    open: async (...args: unknown[]) => {
      // Ensure modal exists
      const readyModal = modal || (window as any).__appkit_modal || createModalIfNeeded();
      if (readyModal && typeof (readyModal as any).open === 'function') {
        return (readyModal as any).open(...args);
      }
      // Fallback to hook's open method
      return hookResult.open(...args as any);
    },
  };
}

export {
  useAppKitSafe as useAppKit,
  useAppKitState,
  useAppKitTheme,
  useAppKitEvents,
  useAppKitAccount,
  useWalletInfo,
  useAppKitNetwork,
  useDisconnect
}

// AppKit Provider Component
interface AppKitProviderProps {
  children: React.ReactNode;
}

export function AppKitProvider({ children }: AppKitProviderProps) {
  // Ensure modal is created when provider mounts
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      createModalIfNeeded();
    }
  }, []);

  // This component ensures the AppKit context is available throughout the app
  return children;
}
