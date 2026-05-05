'use client'

import React, { type ReactNode, useEffect, useState, useMemo, Suspense } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// CRITICAL: Don't import wagmi at top level - use dynamic import to prevent BigInt conversion errors
// wagmi imports viem internally, which triggers BigInt errors during module evaluation
import type { Config } from 'wagmi'

import { projectId, getWagmiConfig, networks } from '../config'
import { features as walletFeatures } from '../lib/wallet-config'
import { useContextStore } from '../store/contextStore'
import { WagmiProviderReadyProvider, useWagmiProviderReady } from './WagmiProviderReadyContext'
import { ConnectMethod, ConnectorTypeOrder, createAppKit, SocialProvider, WalletFeature } from '@reown/appkit/react'
// CRITICAL: Don't import WagmiAdapter at top level - use require() inside useEffect to prevent BigInt errors

// Set up queryClient with SSR-safe defaults
// CRITICAL: Create QueryClient per-request for SSR (not singleton)
// This prevents state leakage between requests in production
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // SSR-safe defaults
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false, // Prevent refetch on focus (SSR-safe)
      refetchOnMount: false, // Prevent refetch on mount (SSR-safe)
      refetchOnReconnect: false, // Prevent refetch on reconnect (SSR-safe)
      retry: 1, // Reduce retries for SSR
    },
  },
})

// Validate projectId only on client side to prevent build errors
if (typeof window !== 'undefined' && !projectId) {
  console.error('Project ID is not defined')
}

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  // ✅ CORRECT: Use Zustand store instead of useState + useEffect
  const mounted = useContextStore((state) => state.mounted)
  const wagmiConfig = useContextStore((state) => state.wagmiConfig)
  const initialState = useContextStore((state) => state.initialState)
  const setMounted = useContextStore((state) => state.setMounted)
  const setWagmiConfig = useContextStore((state) => state.setWagmiConfig)
  const setInitialState = useContextStore((state) => state.setInitialState)

  // Dynamically import WagmiProvider to prevent BigInt conversion errors during module evaluation
  const [WagmiProviderComponent, setWagmiProviderComponent] = useState<React.ComponentType<any> | null>(null);
  const [cookieToInitialStateFn, setCookieToInitialStateFn] = useState<((config: Config, cookies: string) => any) | null>(null);

  // CRITICAL: Set mounted to true when component mounts on client side
  useEffect(() => {
    if (typeof window !== 'undefined' && !mounted) {
      setMounted(true);
    }
  }, [mounted, setMounted]);

  // Load wagmi dynamically on client side - CRITICAL: Load immediately on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !WagmiProviderComponent) {
      console.log('📦 [WalletProvider] Loading wagmi module...');
      // Dynamically import wagmi only on client side to prevent BigInt errors
      import('wagmi').then((wagmiModule) => {
        console.log('✅ [WalletProvider] Wagmi module loaded successfully');
        setWagmiProviderComponent(() => wagmiModule.WagmiProvider);
        setCookieToInitialStateFn(() => wagmiModule.cookieToInitialState);
      }).catch((error) => {
        console.error('❌ [WalletProvider] Failed to load wagmi:', error);
        // Retry after a short delay
        setTimeout(() => {
          console.log('🔄 [WalletProvider] Retrying wagmi import...');
          import('wagmi').then((wagmiModule) => {
            console.log('✅ [WalletProvider] Wagmi module loaded on retry');
            setWagmiProviderComponent(() => wagmiModule.WagmiProvider);
            setCookieToInitialStateFn(() => wagmiModule.cookieToInitialState);
          }).catch((retryError) => {
            console.error('❌ [WalletProvider] Retry failed:', retryError);
          });
        }, 1000);
      });
    }
  }, [WagmiProviderComponent]);

  // Apply dark theme class directly to avoid ThemeProvider's script injection
  // Since we're forcing dark theme, we don't need ThemeProvider's dynamic switching
  // This must be called before any conditional returns (React Hook rules)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      // Set data-theme attribute for compatibility
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // ✅ REMOVED DUPLICATE: AppKit is already initialized in config/index.ts
  // This duplicate initialization was causing injected connectors to not register properly
  // The primary initialization in config/index.ts handles all AppKit setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Just verify AppKit is initialized (done in config/index.ts)
      if ((window as any).__appkit_initialized) {
        console.log('✅ [WalletProvider] AppKit already initialized in config module');
      } else {
        console.warn('⚠️ [WalletProvider] AppKit not yet initialized - should be initialized by config module');
      }
    }
  }, [projectId]);

  // Initialize config synchronously and use it directly in render
  // This ensures WagmiProvider is available on first render
  let configToUse = wagmiConfig;

  // Only initialize Wagmi config on client side to prevent SSR errors
  if (typeof window !== 'undefined' && mounted && !configToUse && getWagmiConfig) {
    try {
      // Validate projectId before attempting to get config
      if (!projectId) {
        console.error('Project ID is not defined - cannot initialize Wagmi config')
      } else {
        const config = getWagmiConfig()
        configToUse = config;
        // Update store for future renders
        setWagmiConfig(config)

        // Safely parse cookies to avoid BigInt conversion errors
        // Wait for cookieToInitialStateFn to be loaded before parsing
        if (cookieToInitialStateFn) {
          try {
            const parsedState = cookieToInitialStateFn(config, cookies || '');
            setInitialState(parsedState)
          } catch (cookieError) {
            console.warn('Failed to parse cookies for Wagmi initial state:', cookieError);
            setInitialState(null)
          }
        } else {
          // Set to null initially, will be parsed when cookieToInitialStateFn loads
          setInitialState(null)
        }
      }
    } catch (error) {
      console.error('Failed to initialize Wagmi config:', error)
    }
  }

  // Always wrap children with WagmiProviderReadyProvider so the context is available
  // even when WagmiProvider isn't ready yet
  const wrappedChildren = (
    <WagmiProviderReadyProvider>
      <WagmiProviderReadySetter 
        mounted={mounted} 
        configAvailable={!!configToUse} 
        hasWagmiProvider={!!WagmiProviderComponent}
      />
      {children}
    </WagmiProviderReadyProvider>
  );

  // Note: Wagmi loading is handled in the first useEffect above
  // This effect is no longer needed as wagmi is loaded on mount

  // Don't render WagmiProvider during SSR or if config/WagmiProvider is not available
  if (!mounted || !configToUse || !WagmiProviderComponent) {
    console.log('⏳ [WalletProvider] Waiting for config and mount...', { mounted, hasConfig: !!configToUse, hasWagmiProvider: !!WagmiProviderComponent });
    return wrappedChildren;
  }

  // CRITICAL: Parse initialState from cookies for SSR hydration
  // This must happen synchronously before rendering WagmiProvider
  // Use useMemo to ensure it's only computed once per render
  const stateToUse = React.useMemo(() => {
    // Prefer stored initialState (already parsed)
    if (initialState !== undefined && initialState !== null) {
      return initialState;
    }
    
    // Fallback: parse from cookies if cookieToInitialStateFn is available
    if (cookieToInitialStateFn && configToUse && cookies) {
      try {
        return cookieToInitialStateFn(configToUse, cookies);
      } catch (cookieError) {
        console.warn('Failed to parse cookies for Wagmi state:', cookieError);
        return null;
      }
    }
    
    // No cookies or function not loaded yet
    return null;
  }, [initialState, cookieToInitialStateFn, configToUse, cookies]);

  // Don't render WagmiProvider until it's dynamically loaded
  if (!WagmiProviderComponent || !configToUse) {
    return wrappedChildren;
  }

  return (
    <WagmiProviderComponent config={configToUse} initialState={stateToUse}>
      <QueryClientProvider client={queryClient}>
        {/* 
          Removed ThemeProvider to prevent hydration mismatches from script injection.
          Theme is applied directly via useEffect since we're forcing light theme.
        */}
        {/* WagmiProviderVerifier verifies WagmiProvider is actually mounted and sets ready */}
        <WagmiProviderVerifier />
        {wrappedChildren}
      </QueryClientProvider>
    </WagmiProviderComponent>
  )
}

/**
 * Component that initializes the WagmiProviderReady context
 * This component is rendered BEFORE WagmiProvider, so it only initializes the context
 * WagmiProviderVerifier (inside WagmiProvider) will actually set ready to true
 */
function WagmiProviderReadySetter({ 
  mounted, 
  configAvailable, 
  hasWagmiProvider 
}: { 
  mounted: boolean; 
  configAvailable: boolean;
  hasWagmiProvider: boolean;
}) {
  // Safely get context - handle case where provider might not be ready yet
    const context = useWagmiProviderReady();
  const setIsReady = context?.setIsReady;
  
  useEffect(() => {
    // Only initialize context if setIsReady is available
    if (!setIsReady) return;
    
    // CRITICAL: Don't set ready to true here - we're outside WagmiProvider
    // Only WagmiProviderVerifier (inside WagmiProvider) should set ready to true
    // This prevents false positives where components think WagmiProvider is ready when it's not
    if (!mounted || !configAvailable || !hasWagmiProvider) {
      setIsReady(false);
    }
    // Otherwise, leave it as false - WagmiProviderVerifier will set it to true when WagmiProvider is actually mounted
  }, [mounted, configAvailable, hasWagmiProvider, setIsReady]);
  
  return null;
}

/**
 * Component that verifies WagmiProvider is actually mounted
 * This component is rendered INSIDE WagmiProvider, so if it renders, WagmiProvider is available
 * CRITICAL: This component sets ready to true only when WagmiProvider is actually mounted
 */
function WagmiProviderVerifier() {
  // CRITICAL: Always call hooks unconditionally (Rules of Hooks)
  // Since this component only renders INSIDE WagmiProvider, the context is safe to access
  const context = useWagmiProviderReady();
  
  useEffect(() => {
    if (!context) return;
    
    // Since this component only renders INSIDE WagmiProvider, we can safely set ready to true
    // Add a small delay to ensure WagmiProvider context is fully propagated to all children
    const timer = setTimeout(() => {
      if (context && typeof context.setIsReady === 'function') {
        context.setIsReady(true);
        console.log('✅ [WagmiProviderVerifier] WagmiProvider verified and ready');
      }
    }, 150); // Small delay to ensure context propagation
    
    return () => clearTimeout(timer);
  }, [context]);
  
  return null;
}

export default ContextProvider
