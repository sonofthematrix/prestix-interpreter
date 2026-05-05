/**
 * Hook to register and manage swap tokens for AppKit
 * 
 * Ensures USDC, EURC, and TigerPalace Token are available in the swap dialog
 */

'use client';

import { useEffect, useState } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { registerSwapTokens, getSwapTokens, TokenMetadata } from '../lib/token-registry';

export function useSwapTokens() {
  const { isConnected, address } = useAppKitAccount();
  const [tokens, setTokens] = useState<TokenMetadata[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      // Register tokens when wallet is connected
      try {
        registerSwapTokens();
        const registeredTokens = getSwapTokens();
        setTokens(registeredTokens);
        setIsRegistered(true);
      } catch (error) {
        console.error('Error registering swap tokens:', error);
      }
    } else {
      setTokens([]);
      setIsRegistered(false);
    }
  }, [isConnected, address]);

  return {
    tokens,
    isRegistered,
    registerTokens: registerSwapTokens,
  };
}

