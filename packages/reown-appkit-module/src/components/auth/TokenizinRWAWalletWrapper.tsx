"use client";

import React, { useState, useEffect, useMemo, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from '@/components/error-boundary';
import { WagmiProvider, type Config } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWagmiProviderStore } from '@/stores/wagmi-provider-store';
import {  getWagmiConfig } from '../../config';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { TokenizinRWAWallet } from '../TokenizinRWAWallet/TokenizinRWAWallet';
import type { TokenizinRWAWalletHandle } from '../TokenizinRWAWallet/types';

export interface TokenizinRWAWalletWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'overview' | 'tokens' | 'properties' | 'history';
}

const TokenizinRWAWalletInner = forwardRef<TokenizinRWAWalletHandle, TokenizinRWAWalletWrapperProps>(function TokenizinRWAWalletInner({
  open,
  onOpenChange,
  defaultTab
}, ref) {
  // REDUX: open/onOpenChange are the single source of truth (parent reads from useWagmiProviderStore and passes setDialogOpen).
  // No useEffect sync: parent owns the store update; wrapper only renders from props.
  if (!open) {
    return null;
  }

  return (
    <TokenizinWalletRenderer
      ref={ref}
      open={open}
      onOpenChange={onOpenChange}
      defaultTab={defaultTab}
    />
  );
});

/**
 * TokenizinWalletRenderer - Safely renders TokenizinRWAWallet with WagmiProvider fallback
 * 
 * This component ensures WagmiProvider wraps the wallet content even when the global
 * provider isn't ready yet. It always wraps TokenizinRWAWallet in a WagmiProvider using
 * the fallback config, ensuring hooks like useAccount() always have a provider context.
 */
// Create a QueryClient instance for WagmiProvider
// This is required by WagmiProvider - it needs QueryClientProvider
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const TokenizinWalletRenderer = forwardRef<TokenizinRWAWalletHandle, TokenizinRWAWalletWrapperProps>(function TokenizinWalletRenderer({
  open,
  onOpenChange,
  defaultTab
}, ref) {
  const [fallbackConfig, setFallbackConfig] = useState<Config | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Get contract addresses from environment variables
  const contractAddresses = useMemo(() => {
    return {
      registry: (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || process.env.NEXT_PUBLIC_PROPERTY_REGISTRY_ADDRESS) as `0x${string}` | undefined,
      factory404: (process.env.NEXT_PUBLIC_FACTORY_404_ADDRESS || process.env.NEXT_PUBLIC_FACTORY_ADDRESS) as `0x${string}` | undefined,
      staking: (process.env.NEXT_PUBLIC_STAKING_ADDRESS) as `0x${string}` | undefined,
      paymaster: (process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS) as `0x${string}` | undefined,
      usdc: (process.env.NEXT_PUBLIC_USDC_ADDRESS) as `0x${string}` | undefined,
      eurc: (process.env.NEXT_PUBLIC_EURC_ADDRESS) as `0x${string}` | undefined,
      tpt: (process.env.NEXT_PUBLIC_TPT_ADDRESS || process.env.NEXT_PUBLIC_TIGER_PALACE_TOKEN_CONTRACT_ADDRESS) as `0x${string}` | undefined,
    };
  }, []);

  // Initialize fallback config immediately (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsInitializing(false);
      return;
    }
    
    try {
      const config = getWagmiConfig();
      setFallbackConfig(config);
      console.log('🐅 [TokenizinWalletRenderer] Prepared fallback WagmiProvider config');
    } catch (error) {
      console.error('🐅 [TokenizinWalletRenderer] Failed to get fallback config:', error);
    } finally {
      setIsInitializing(false);
    }
  }, []); // Empty deps - only run once on mount

  // Show loading while initializing fallback config
  if (isInitializing || !fallbackConfig) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Initializing Wallet Provider</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Initializing wallet provider...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // CRITICAL: WagmiProvider requires QueryClientProvider
  // Always wrap TokenizinRWAWallet in both WagmiProvider and QueryClientProvider
  // This ensures hooks like useAccount() always have a provider context
  // Even if the global provider isn't ready yet, this local provider will work
  return (
    <ErrorBoundary
      componentName="TokenizinRWAWallet"
      fallback={
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Waiting for wallet provider...</p>
          </div>
        </div>
      }
    >
      <WagmiProvider config={fallbackConfig}>
        <QueryClientProvider client={queryClient}>
          <TokenizinRWAWallet
            ref={ref}
            open={open}
            onOpenChange={onOpenChange}
            defaultTab={defaultTab}
            contractAddresses={contractAddresses}
            enablePimlicoErc20Paymaster={process.env.NEXT_PUBLIC_PIMLICO_ENABLED === 'true'}
          />
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
});

/**
 * TokenizinRWAWalletWrapper - Wrapper component that ensures WagmiProvider is available
 * 
 * This component wraps TokenizinRWAWalletInner in an ErrorBoundary to catch cases where
 * WagmiProviderReadyProvider is not in the tree (meaning WagmiProvider isn't ready yet).
 * TokenizinRWAWallet uses wagmi hooks (useAccount, useWalletClient) which require WagmiProvider.
 *
 * Ref: pass a ref to call `openAccountSwitch()` and open the AppKit ProfileWallets view without clicking the row.
 */
export const TokenizinRWAWalletWrapper = forwardRef<TokenizinRWAWalletHandle, TokenizinRWAWalletWrapperProps>(function TokenizinRWAWalletWrapper(props, ref) {
  // Wrap in ErrorBoundary to catch errors if WagmiProviderReadyProvider is not available
  return (
    <ErrorBoundary
      componentName="TokenizinRWAWalletWrapper"
      fallback={
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Waiting for wallet provider...</p>
          </div>
        </div>
      }
    >
      <TokenizinRWAWalletInner ref={ref} {...props} />
    </ErrorBoundary>
  );
});

