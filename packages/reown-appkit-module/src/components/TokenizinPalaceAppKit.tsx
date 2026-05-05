'use client'

/**
 * Tokenizin AppKit Wrapper Component
 * 
 * Custom wrapper that applies Tokenizin branding and styling to AppKit
 * - Imports custom CSS
 * - Provides branded context
 * - Ensures responsive design
 */

import React, { useEffect } from 'react'

// Import custom Tokenizin AppKit styles
import '../styles/tokenizin-appkit.css'

interface TokenizinPalaceAppKitProps {
  children?: React.ReactNode
  className?: string
}

/**
 * TigerPalaceAppKit - Wrapper component for AppKit with Tokenizin branding
 * 
 * This component ensures that all AppKit components inherit Tokenizin styling
 * and branding. It should wrap any AppKit usage in the application.
 */
export function TokenizinPalaceAppKit({ children, className }: TokenizinPalaceAppKitProps) {
  useEffect(() => {
    // Apply Tokenizin theme variables to document root
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      
      // Set Tokenizin CSS variables
      root.style.setProperty('--w3m-accent', '#F59E0B')
      root.style.setProperty('--w3m-color-mix', '#0A3A2A')
      root.style.setProperty('--w3m-color-mix-strength', '15')
      root.style.setProperty('--w3m-background', '#1C3A36')
      root.style.setProperty('--w3m-background-bg', '#0A3A2A')
      root.style.setProperty('--w3m-color-fg', '#F8F5F0')
      root.style.setProperty('--w3m-border-radius-master', '12px')
      
      // Cleanup on unmount
      return () => {
        // Optionally reset variables if needed
      }
    }
  }, [])

  return (
    <div 
      className={`tokenizin-palace-appkit ${className || ''}`}
      data-theme="tokenizin-palace-dark"
    >
      {children}
    </div>
  )
}

/**
 * TigerPalaceConnectButton - Branded connect button component
 * 
 * Uses the AppKit web component with Tokenizin styling
 */
export function TokenizinPalaceConnectButton({ 
  className,
  label = 'Connect Wallet'
}: { 
  className?: string
  label?: string 
}) {
  return (
      <TokenizinPalaceAppKit className={className}>
      <appkit-button label={label} size="md" loadingLabel="Connecting..." disabled={false} />
    </TokenizinPalaceAppKit>
  )
}

/**
 * TigerPalaceAccountButton - Branded account button component
 */
export function TokenizinPalaceAccountButton({ className }: { className?: string }) {
  return (
    <TokenizinPalaceAppKit className={className}>
      <appkit-account-button />
    </TokenizinPalaceAppKit>
  )
}

/**
 * TigerPalaceNetworkButton - Branded network button component
 */
export function TigerPalaceNetworkButton({ className }: { className?: string }) {
  return (
    <TokenizinPalaceAppKit className={className}>
      <appkit-network-button />
    </TokenizinPalaceAppKit>
  )
}

/**
 * Export AppKitSignButton for use in applications
 */
export { AppKitSignButton } from './AppKitSignButton';

/**
 * Export TokenizinPalaceWalletButton for comprehensive wallet management
 */
export { TokenizinWalletButton } from './TokenizinWalletButton';

