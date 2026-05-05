'use client'

import { useAppKitAccount } from '@reown/appkit/react';
import { useSigningStore } from '../store/signingStore';

interface AppKitSignButtonProps {
  onSuccess?: (signature: string) => void;
  onError?: (error: Error) => void;
  message?: string;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

/**
 * AppKitSignButton - Button component that handles signature based on account type
 * 
 * - If account type is "eoa" (Externally Owned Account), performs signature
 * - If account type is "social", skips signature (social accounts don't need signing)
 * 
 * ✅ CORRECT: Uses Zustand store instead of useState
 * 
 * Usage:
 * ```tsx
 * <AppKitSignButton 
 *   onSuccess={(signature) => console.log('Signed:', signature)}
 *   onError={(error) => console.error('Error:', error)}
 *   message="Sign in to Tokenizin"
 * />
 * ```
 */
export function AppKitSignButton({
  onSuccess,
  onError,
  message = 'Sign in to Tokenizin',
  className = '',
  disabled = false,
  children,
}: AppKitSignButtonProps) {
  // ✅ CORRECT: Use Zustand store instead of useState
  const isSigning = useSigningStore((state) => state.isSigning);
  const setSigning = useSigningStore((state) => state.setSigning);

  // Use AppKit account hook (safe with 'use client' directive)
  const appKitAccount = useAppKitAccount();

  const handleSign = async () => {
    if (!appKitAccount?.isConnected) {
      onError?.(new Error('Wallet not connected'));
      return;
    }

    // Check account type
    const accountType = appKitAccount.allAccounts?.[0]?.type;
    const accountAddress = appKitAccount.address;

    console.log('🔐 [AppKitSignButton] Account info:', {
      type: accountType,
      address: accountAddress,
      allAccounts: appKitAccount.allAccounts,
      isConnected: appKitAccount.isConnected,
    });

    // If account type is social, skip signature
    if (accountType !== 'eoa') {
      console.log('⏭️ [AppKitSignButton] Social account detected, skipping signature');
      onSuccess?.('social-account-no-signature');
      return;
    }

    // For EOA accounts, perform signature
    if (!accountAddress) {
      onError?.(new Error('No account address available'));
      return;
    }

    setSigning(true);

    try {
      console.log('📝 [AppKitSignButton] Requesting signature for EOA account...');

      let signature: string;

      // Use ethereum provider directly (works with all wallet types including WalletConnect)
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        signature = await ethereum.request({
          method: 'personal_sign',
          params: [message, accountAddress],
        });
        console.log('✅ [AppKitSignButton] Signature received via ethereum provider');
      } else {
        throw new Error('No ethereum provider available. Please connect a wallet.');
      }

      console.log('✅ [AppKitSignButton] Signature successful');
      onSuccess?.(signature);
    } catch (error: any) {
      console.error('❌ [AppKitSignButton] Signature failed:', error);
      
      // Check if user rejected
      if (
        error.code === 4001 ||
        error.message?.includes('User rejected') ||
        error.message?.includes('denied') ||
        error.message?.includes('rejected')
      ) {
        console.log('⏭️ [AppKitSignButton] User rejected signature');
        setSigning(false);
        return; // User rejection is not an error
      }

      onError?.(error instanceof Error ? error : new Error(error.message || 'Signature failed'));
    } finally {
      setSigning(false);
    }
  };

  const isLoading = isSigning;
  const isConnected = appKitAccount?.isConnected === true;
  const accountType = appKitAccount?.allAccounts?.[0]?.type;

  return (
    <button
      type="button"
      onClick={handleSign}
      disabled={disabled || !isConnected || isLoading}
      className={className || `
        px-4 py-2 rounded-md font-medium transition-colors
        bg-primary text-white dark:text-white
        hover:bg-primary/90
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isLoading ? 'cursor-wait' : ''}
      `}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Signing...
        </span>
      ) : children ? (
        children
      ) : accountType === 'eoa' ? (
        'Sign Message'
      ) : accountType ? (
        'Continue (Social Account)'
      ) : isConnected ? (
        'Sign Message'
      ) : (
        'Connect Wallet First'
      )}
    </button>
  );
}
