/**
 * usePimlicoPaymasterTokens Hook
 *
 * Fetches tokens supported by Pimlico ERC-20 Paymaster on Sepolia
 * so the UI can show "Pay gas with USDC / EURC / ...".
 */

import { useState, useEffect, useCallback } from 'react';
import type { Address } from 'viem';

export interface PimlicoPaymasterToken {
  name: string;
  decimals: number;
  symbol: string;
  token: Address;
}

export function usePimlicoPaymasterTokens(apiBase?: string) {
  const [tokens, setTokens] = useState<PimlicoPaymasterToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    const base = apiBase ?? (typeof window !== 'undefined' ? window.location.origin : '');
    const url = `${base}/api/pimlico/supported-tokens`;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (!data.success || !Array.isArray(data.tokens)) {
        setTokens([]);
        if (data.error) setError(data.error);
        return;
      }
      setTokens(
        data.tokens.map((t: { token: string; symbol: string; name: string; decimals: number }) => ({
          token: t.token as Address,
          symbol: t.symbol,
          name: t.name,
          decimals: t.decimals,
        }))
      );
    } catch (e: any) {
      setError(e?.message || 'Failed to load paymaster tokens');
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return { tokens, isLoading, error, refetch: fetchTokens };
}
