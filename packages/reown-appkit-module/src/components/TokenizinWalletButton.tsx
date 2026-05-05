/**
 * Tiger Wallet Button Component
 * Opens the AppKit connect modal with wallet, email, and social login options
 */

'use client';
import React from 'react';
import { TokenizinPalaceAppKit } from './TokenizinPalaceAppKit';

interface TokenizinWalletButtonProps {
  className?: string;
}

export function TokenizinWalletButton({ className }: TokenizinWalletButtonProps) {
  return (
    <TokenizinPalaceAppKit className={className}>
      <appkit-button label="Connect Wallet" size="md" loadingLabel="Connecting..." disabled={false} />
      <appkit-network-button /> 
    </TokenizinPalaceAppKit>
  );
}
