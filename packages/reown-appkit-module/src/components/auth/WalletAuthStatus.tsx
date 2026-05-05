/**
 * WalletAuthStatus Component
 * 
 * DISPLAY-ONLY component that shows wallet authentication status.
 * NO manual authentication buttons - everything is automatic via GlobalWalletAuth.
 * 
 * This component simply reflects the state from the wallet connection store.
 */

'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Shield,
  Wallet,
  Lock
} from 'lucide-react';
import { useAppKitAccount } from '../../config';
import { useWalletConnectionStore } from '../../lib/store/walletConnectionStore';

export interface WalletAuthStatusProps {
  className?: string;
  showWhenDisconnected?: boolean;
}

export function WalletAuthStatus({ 
  className,
  showWhenDisconnected = false 
}: WalletAuthStatusProps) {
  // Get address and connection info from AppKit hooks
  const { address, isConnected } = useAppKitAccount();
  
  // Get connection status from store
  const {
    connectionStatus,
    connectorStatus,
  } = useWalletConnectionStore();

  // Don't show anything if disconnected (unless explicitly enabled)
  if (!address && !showWhenDisconnected) {
    return null;
  }

  // Authenticated state (connected and ready)
  if (connectionStatus === 'connected' && isConnected && address) {
    return (
      <div className={cn('space-y-3', className)}>
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900 dark:text-green-100">
            Wallet Authenticated ✓
          </AlertTitle>
          <AlertDescription className="text-green-800 dark:text-green-200">
            <div className="space-y-2">
              <p>Your wallet has been verified and authenticated successfully.</p>
              
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  <Wallet className="h-3 w-3 mr-1" />
                  {address?.substring(0, 6)}...{address?.substring(38)}
                </Badge>
                
                <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Authenticating state
  if (connectionStatus === 'connecting') {  
    return (
      <div className={cn('space-y-3', className)}>
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">
            Authenticating Wallet...
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Connecting your wallet...
              </p>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {address && (
                  <Badge variant="outline" className="text-xs">
                    <Wallet className="h-3 w-3 mr-1" />
                    {address.substring(0, 6)}...{address.substring(38)}
                  </Badge>
                )}
                
                
                <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/30">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Connecting
                </Badge>
              </div>
              
              <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-xs">
                <p className="flex items-center">
                  <Shield className="h-3 w-3 mr-1" />
                  Signing is free and does not send a transaction
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Error state
  if (connectionStatus === 'error') {
    return (
      <div className={cn('space-y-3', className)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Issue</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p className="text-sm">A connection error occurred. Please try again.</p>
              
              {address && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    <Wallet className="h-3 w-3 mr-1" />
                    {address.substring(0, 6)}...{address.substring(38)}
                  </Badge>
                </div>
              )}
              
              <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs">
                <p>
                  💡 Try disconnecting and reconnecting your wallet, or refresh the page.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Connected but waiting for connector to be ready
  if (connectionStatus === 'connected' && connectorStatus !== 'connected') {
    return (
      <div className={cn('space-y-3', className)}>
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">
            Wallet Connecting...
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <div className="space-y-2">
              <p>Your wallet is connecting. Authentication will start automatically once ready.</p>
              
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  <Wallet className="h-3 w-3 mr-1" />
                  {address?.substring(0, 6)}...{address?.substring(38)}
                </Badge>
                
                
                <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="h-3 w-3 mr-1" />
                  {connectorStatus}
                </Badge>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Connected and ready - waiting for auto-auth
  if (connectionStatus === 'connected') {
    return (
      <div className={cn('space-y-3', className)}>
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <Wallet className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">
            Wallet Connected
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className="space-y-2">
              <p>Authentication will start automatically...</p>
              
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  <Wallet className="h-3 w-3 mr-1" />
                  {address?.substring(0, 6)}...{address?.substring(38)}
                </Badge>
                
              </div>
              
              <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-xs">
                <p className="flex items-center">
                  <Shield className="h-3 w-3 mr-1" />
                  You'll be asked to sign a message to verify ownership
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Disconnected state (only shown if showWhenDisconnected is true)
  if (showWhenDisconnected && !address) {
    return (
      <div className={cn('space-y-3', className)}>
        <Alert className="border-gray-200 bg-gray-50 dark:bg-gray-950/20">
          <Wallet className="h-4 w-4 text-gray-600" />
          <AlertTitle className="text-gray-900 dark:text-gray-100">
            No Wallet Connected
          </AlertTitle>
          <AlertDescription className="text-gray-800 dark:text-gray-200">
            <p>Click the "Connect Wallet" button above to get started.</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}
