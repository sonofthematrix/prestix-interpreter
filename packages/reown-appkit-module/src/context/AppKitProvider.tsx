'use client';

import { createAppKit } from '@reown/appkit';
// CRITICAL: Don't import WagmiAdapter at top level - use require() inside useEffect to prevent BigInt errors
import { networks } from '../config';
import { ReactNode, useEffect, useState } from 'react';

// Get project ID from environment variables
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || process.env.NEXT_PUBLIC_PROJECT_ID || '122878b95737e1300958ec73a8c0b61a';

interface AppKitProviderProps {
  children: ReactNode;
}

export function AppKitProvider({ children }: AppKitProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [appKit, setAppKit] = useState<any>(null);

  useEffect(() => {
    setMounted(true);

    // Check if AppKit is already initialized by config/index.ts to prevent double initialization
    // The main AppKit instance is created in config/index.ts, so we should reuse it
    if ((window as any).__appkit_initialized || (window as any).__appkit_modal) {
      console.log('[AppKit Provider] AppKit already initialized by config/index.ts, reusing existing instance');
      const existingModal = (window as any).__appkit_modal;
      if (existingModal) {
        setAppKit(existingModal);
      }
      return;
    }

    // Initialize AppKit with timeout and retry logic
    const initializeAppKit = async (retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`[AppKit Provider] Initializing AppKit (attempt ${attempt}/${retries})`);

          // Wait for window to be fully loaded
          if (typeof window === 'undefined') {
            throw new Error('Window not available');
          }

          // Check if ethereum provider is available (MetaMask, etc.)
          const ethereumAvailable = !!(window as any).ethereum;
          console.log(`[AppKit Provider] Ethereum provider available: ${ethereumAvailable}`);

          // Mobile detection for connector ordering (WalletConnect first on mobile)
          const isMobile =
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
              navigator.userAgent || ''
            );

          // ⚠️ SEPOLIA ONLY - Vercel production is treated as staging environment
          // Only Sepolia testnet is supported for wallet connections and signatures
          // CRITICAL: Dynamically require WagmiAdapter to prevent BigInt conversion errors
          const { WagmiAdapter } = await import('@reown/appkit-adapter-wagmi');

          // Create Wagmi adapter with error handling
          // Use networks from config (custom Sepolia with numeric chain ID, not BigInt)
          const wagmiAdapter = new WagmiAdapter({
            networks: networks,
            projectId,
            ssr: true,
          });

          // Create AppKit instance with standalone package configuration
          const kit = createAppKit({
            adapters: [wagmiAdapter],
            networks: networks,
            defaultNetwork: networks[0], // Force Sepolia as default network
            projectId,
            features: {
              analytics: false, // Disable analytics for standalone package
              allWallets: true, // show full registry
              connectorTypeOrder: (isMobile
                ? ['walletConnect', 'injected', 'eip6963']
                : ['injected', 'walletConnect', 'eip6963']) as any,
            },
            themeMode: 'dark',
            // Enable wallet connections for SIWE signing
            enableWalletConnect: true,
            enableInjected: true, // keep injected available; WC first on mobile via connectorTypeOrder
            enableCoinbase: false, // Disable Coinbase for standalone package
            enableEIP6963: true, // Enable modern wallet detection
          });

          // Wait for AppKit to be ready (timeout after 10 seconds)
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('AppKit initialization timeout'));
            }, 10000);

            // Check if AppKit is ready every 500ms
            const checkReady = () => {
              if (kit) {
                clearTimeout(timeout);
                resolve(kit);
              } else {
                setTimeout(checkReady, 500);
              }
            };

            checkReady();
          });

          // Mark as initialized to prevent double initialization
          (window as any).__appkit_initialized = true;
          (window as any).__appkit_modal = kit;
          setAppKit(kit);

          console.log('[AppKit Provider] AppKit initialized successfully');
          return;

        } catch (error) {
          console.warn(`[AppKit Provider] Initialization attempt ${attempt} failed:`, error);

          if (attempt === retries) {
            console.error('[AppKit Provider] All initialization attempts failed, continuing without AppKit');
            // Continue without AppKit for standalone package compatibility
            return;
          }

          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    };

    // Start initialization
    initializeAppKit();
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

// Export a stub appKit instance for components that need it
export const appKit = {
  open: () => console.warn('[AppKit Stub] AppKit not initialized in standalone package'),
  close: () => console.warn('[AppKit Stub] AppKit not initialized in standalone package'),
  subscribeState: () => () => {},
  getState: () => ({
    open: false,
    selectedNetworkId: undefined,
    activeWallet: undefined,
  }),
};
