/**
 * WalletAuthHandler Component
 * 
 * Transparently handles automatic wallet authentication when AppKit connects
 * Shows visual feedback during the authentication process
 */

'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAutoWalletAuth } from '@/hooks/useAutoWalletAuth';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  Shield,
  Wallet
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useSession } from '@/lib/auth/appkit-session';
import { useEffect, useState } from 'react';
import { useChainId, useDisconnect } from 'wagmi';
import { useWalletConnectionStore } from '@/lib/walletConnectionStore';

export interface WalletAuthHandlerProps {
  autoAuthenticate?: boolean;
  redirectUrl?: string;
  onAuthStart?: () => void;
  onAuthSuccess?: () => void;
  onAuthError?: (error: string) => void;
  showStatus?: boolean;
  className?: string;
}

export function WalletAuthHandler({
  autoAuthenticate = false, // ⚠️ DISABLED: AppKit handles SIWE authentication automatically
  redirectUrl = '/',
  onAuthStart,
  onAuthSuccess,
  onAuthError,
  showStatus = true,
  className,
}: WalletAuthHandlerProps) {
  const [showAlert, setShowAlert] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState<number | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const { data: session } = useSession();
  const { disconnect } = useDisconnect();
  
  const {
    isConnected,
    isAuthenticating,
    isAuthenticated,
    address,
    error,
    authenticate,
    clearError,
    connector: walletType
  } = useAutoWalletAuth({
    redirectUrl,
    onSuccess: () => {
      onAuthSuccess?.();
    },
    onError: (err: string) => {
      onAuthError?.(err);
    }
  });

  // Get chain ID for network name - use wagmi first, then store as fallback
  const wagmiChainId = useChainId();
  const storeChainId = useWalletConnectionStore((state) => state.chainId);
  const chainId = wagmiChainId || storeChainId || undefined;
  
  // Get network name with proper fallback handling
  const getNetworkName = (cid: number | undefined | null): string | null => {
    if (!cid) return null;
    const networkMap: Record<number, string> = {
      1: 'mainnet',
      11155111: 'sepolia',
      137: 'polygon',
      80001: 'mumbai',
      42161: 'arbitrum',
    };
    return networkMap[cid] || null; // Return null instead of `chain-${cid}` to avoid showing "chain-123"
  };
  const networkName = getNetworkName(chainId);

  // Monitor session timeout warnings
  useEffect(() => {
    const handleTimeoutWarning = (event: Event) => {
      const { expiresIn } = (event as CustomEvent<{ expiresIn: number }>).detail;
      setSessionTimeout(expiresIn);
      setShowTimeoutWarning(true);
      const timeout = setTimeout(() => setShowTimeoutWarning(false), 10000);
      return () => clearTimeout(timeout);
    };

    const listener = handleTimeoutWarning as EventListener;
    window.addEventListener('session-timeout-warning', listener);
    return () => window.removeEventListener('session-timeout-warning', listener);
  }, []);

  // Show alert when connection happens
  useEffect(() => {
    if (isConnected) {
      setShowAlert(true);
    }
  }, [isConnected]);

  // Call onAuthStart when authentication begins
  useEffect(() => {
    if (isAuthenticating) {
      onAuthStart?.();
    }
  }, [isAuthenticating, onAuthStart]);

  // Manual disconnect handler - disconnects from AppKit/wagmi and signs out
  const handleManualDisconnect = async () => {
    try {
      console.log('🔌 Manual disconnect initiated');
      setSessionTimeout(null);
      setShowTimeoutWarning(false);
      setShowAlert(false);
      
      // First disconnect from wagmi/AppKit
      if (isConnected) {
        console.log('🔌 Disconnecting wallet from AppKit...');
        disconnect();
      }
      
      // Then sign out from NextAuth session
      console.log('🔐 Signing out from NextAuth...');
      await signOut({ redirect: false });
      
      console.log('✅ Disconnect complete');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
      // Still try to sign out even if disconnect fails
      await signOut({ redirect: false });
    }
  };

  // Don't render if not showing status or no connection
  if (!showStatus || (!isConnected && !error)) {
    return null;
  }

  // Session timeout warning
  if (showTimeoutWarning && sessionTimeout !== null) {
    return (
      <div className={cn('space-y-3', className)}>
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <Clock className="h-4 w-4 text-orange-600 animate-pulse" />
          <AlertTitle className="text-orange-900 dark:text-orange-100">
            Session Expiring Soon
          </AlertTitle>
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <div className="space-y-2">
              <p>Your session will expire in {Math.round(sessionTimeout / 60000)} minutes.</p>
              
              <Button
                variant="default"
                size="sm"
                onClick={handleManualDisconnect}
              >
                <Shield className="h-3 w-3 mr-2" />
                Refresh Session
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Authenticated state
  if (isAuthenticated) {
    return (
      <div className={cn('space-y-3', className)}>
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900 dark:text-green-100">
            Successfully Authenticated!
          </AlertTitle>
          <AlertDescription className="text-green-800 dark:text-green-200">
            <div className="space-y-2">
              <p>Your wallet has been verified and authenticated.</p>
              
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  <Wallet className="h-3 w-3 mr-1" />
                  {address?.substring(0, 6)}...{address?.substring(38)}
                </Badge>
                
                {walletType && (
                  <Badge variant="outline" className="text-xs">
                    {walletType}
                  </Badge>
                )}
                
                {networkName && (
                  <Badge variant="outline" className="text-xs">
                    {networkName}
                  </Badge>  
                )}
              </div>
              
              {/* Manual Disconnect Button */}
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualDisconnect}
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700"
                >
                  <LogOut className="h-3 w-3 mr-2" />
                  Disconnect Wallet
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Authenticating state
  if (isAuthenticating) {
    return (
      <div className={cn('space-y-3', className)}>
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">
            Authenticating Your Wallet...
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className="space-y-2">
              <p>Please follow the prompts in your wallet to sign the authentication message.</p>
              
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  <Wallet className="h-3 w-3 mr-1" />
                  {address?.substring(0, 6)}...{address?.substring(38)}
                </Badge>
                
                {walletType && (
                  <Badge variant="outline" className="text-xs">
                    {walletType}
                  </Badge>
                )}
                
                {networkName && (
                  <Badge variant="outline" className="text-xs">
                    {networkName}
                  </Badge>
                )}
              </div>
              
              <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-xs">
                <p className="flex items-center">
                  <Shield className="h-3 w-3 mr-1" />
                  Signing this message is free and does not send a transaction
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Error state
  if (error) {
    const handleRetryAuth = async () => {
      clearError();
      setShowAlert(true);
      await authenticate();
    };

    return (
      <div className={cn('space-y-3', className)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Failed</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>{error}</p>
              
              {address && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    <Wallet className="h-3 w-3 mr-1" />
                    {address.substring(0, 6)}...{address.substring(38)}
                  </Badge>
                </div>
              )}
              
              <div className="flex gap-2 mt-3">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleRetryAuth}
                >
                  <Shield className="h-3 w-3 mr-1" />
                  Retry Authentication
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualDisconnect}
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700"
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  Disconnect
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Connected but not authenticated yet
  if (isConnected && showAlert) {
    const handleManualAuth = async () => {
      console.log('🖱️ Manual authentication triggered by user');
      // This will trigger the signature flow using useSignMessage
      // The wallet will prompt for signature, not show Account modal
      await authenticate();
    };

    return (
      <div className={cn('space-y-3', className)}>
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <Wallet className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">
            Wallet Connected
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <div className="space-y-3">
              <p>Your wallet is connected. {autoAuthenticate ? 'Authentication will start automatically...' : 'Click below to sign in.'}</p>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  <Wallet className="h-3 w-3 mr-1" />
                  {address?.substring(0, 6)}...{address?.substring(38)}
                </Badge>
                
                {walletType && (
                  <Badge variant="outline" className="text-xs">
                    {walletType}
                  </Badge>
                )}
                
                {networkName && (
                  <Badge variant="outline" className="text-xs">
                    {networkName}
                  </Badge>
                )}
              </div>
              
              <div className="pt-2">
                <Button
                  onClick={handleManualAuth}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Shield className="h-3 w-3 mr-2" />
                  Sign Message to Connect
                </Button>
              </div>
              
              {/* Disconnect Button */}
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualDisconnect}
                  className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700"
                >
                  <LogOut className="h-3 w-3 mr-2" />
                  Disconnect Wallet
                </Button>
              </div>
              
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-xs">
                <p className="flex items-center">
                  <Shield className="h-3 w-3 mr-1" />
                  Signing is free and doesn't send a transaction
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}
