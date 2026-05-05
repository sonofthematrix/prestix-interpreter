/**
 * AppKit Token Registry Hook
 * 
 * Registers tokens with AppKit/wagmi for wallet visibility
 * Supports ERC20, ERC721, and ERC404 tokens
 */

'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useContractStore } from '@/lib/store/contractStore';
import { TokenMetadata } from '@/lib/services/token-metadata-service';

interface UseAppKitTokensOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

interface UseAppKitTokensReturn {
  tokens: TokenMetadata[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  registerToken: (tokenAddress: string, tokenType?: 'ERC20' | 'ERC721' | 'ERC404') => Promise<void>;
}

/**
 * Hook to manage tokens for AppKit wallet display
 */
export function useAppKitTokens(options: UseAppKitTokensOptions = {}): UseAppKitTokensReturn {
  const { autoFetch = true, refreshInterval } = options;
  const { address, isConnected } = useAccount();
  const [tokens, setTokens] = useState<TokenMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user tokens from API
   */
  const fetchTokens = async () => {
    if (!isConnected || !address) {
      setTokens([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tokens/user', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tokens: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setTokens(data.tokens || []);
      } else {
        throw new Error(data.error || 'Failed to fetch tokens');
      }
    } catch (err: any) {
      console.error('Error fetching tokens:', err);
      setError(err.message || 'Failed to fetch tokens');
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register a token with AppKit/wagmi
   */
  const registerToken = async (
    tokenAddress: string,
    tokenType: 'ERC20' | 'ERC721' | 'ERC404' = 'ERC20'
  ) => {
    try {
      // Fetch token metadata
      const response = await fetch(
        `/api/tokens/metadata?address=${tokenAddress}&type=${tokenType}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch token metadata');
      }

      const data = await response.json();
      if (data.success && data.metadata) {
        // Add to tokens list if not already present
        setTokens((prev) => {
          const exists = prev.some((t) => t.address.toLowerCase() === tokenAddress.toLowerCase());
          if (exists) {
            return prev;
          }
          return [...prev, data.metadata];
        });

        // Register with wagmi (if available)
        if (typeof window !== 'undefined' && (window as any).wagmi) {
          // Wagmi will automatically detect tokens when balance is checked
          console.log(`Token registered: ${data.metadata.symbol} at ${tokenAddress}`);
        }
      }
    } catch (err: any) {
      console.error('Error registering token:', err);
      setError(err.message || 'Failed to register token');
    }
  };

  /**
   * Refresh tokens list
   */
  const refresh = async () => {
    await fetchTokens();
  };

  // Auto-fetch on mount and when address changes
  useEffect(() => {
    if (autoFetch && isConnected && address) {
      fetchTokens();
    } else if (!isConnected) {
      setTokens([]);
    }
  }, [autoFetch, isConnected, address]);

  // Set up refresh interval if specified
  useEffect(() => {
    if (refreshInterval && autoFetch && isConnected) {
      const interval = setInterval(() => {
        fetchTokens();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, autoFetch, isConnected]);

  return {
    tokens,
    isLoading,
    error,
    refresh,
    registerToken,
  };
}

/**
 * Hook to get token metadata for a specific address
 */
export function useTokenMetadata(
  tokenAddress: string | null,
  tokenType?: 'ERC20' | 'ERC721' | 'ERC404'
) {
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenAddress) {
      setMetadata(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const fetchMetadata = async () => {
      try {
        const params = new URLSearchParams({
          address: tokenAddress,
        });
        if (tokenType) {
          params.append('type', tokenType);
        }

        const response = await fetch(`/api/tokens/metadata?${params.toString()}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch token metadata');
        }

        const data = await response.json();
        if (data.success) {
          setMetadata(data.metadata);
        } else {
          throw new Error(data.error || 'Failed to fetch metadata');
        }
      } catch (err: any) {
        console.error('Error fetching token metadata:', err);
        setError(err.message || 'Failed to fetch metadata');
        setMetadata(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetadata();
  }, [tokenAddress, tokenType]);

  return { metadata, isLoading, error };
}

