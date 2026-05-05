/**
 * Admin One-Click Authentication Component
 * 
 * Provides one-click authentication for admin users via:
 * - Email (@tokenizin.com)
 * - Wallet address (configured admin wallet)
 * - ENS domain (tokenizin.eth)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '../../components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Wallet, 
  Mail, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  validateAdmin, 
  validateAdminWallet,
  logWalletAdminValidation 
} from '@/lib/admin-validation';
import { cn } from '@/lib/utils';

interface AdminOneClickAuthProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  children?: React.ReactNode;
  showStatus?: boolean;
  redirectUrl?: string;
}

export function AdminOneClickAuth({
  onSuccess,
  onError,
  className,
  children,
  showStatus = true,
  redirectUrl = '/admin'
}: AdminOneClickAuthProps) {
  const { data: session, status: sessionStatus } = useSession();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'checking' | 'authenticated' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMethod, setAdminMethod] = useState<'email' | 'wallet' | 'ens' | null>(null);

  // Check admin status
  useEffect(() => {
    if (sessionStatus === 'loading') return;

    const checkAdminStatus = () => {
      const email = session?.user?.email;
      const walletAddress = address;

      if (!email && !walletAddress) {
        setIsAdmin(false);
        setAdminMethod(null);
        return;
      }

      const validation = validateAdmin(email, walletAddress);
      setIsAdmin(validation.isAdmin);
      setAdminMethod(validation.method);

      if (validation.isAdmin) {
        setAuthStatus('authenticated');
      }
    };

    checkAdminStatus();
  }, [session, address, sessionStatus]);

  // Handle wallet authentication via SIWE
  const handleWalletAuth = async () => {
    if (!address) {
      setErrorMessage('Please connect your wallet first');
      setAuthStatus('error');
      onError?.('Wallet not connected');
      return;
    }

    setIsAuthenticating(true);
    setAuthStatus('checking');
    setErrorMessage(null);

    try {
      // Check if wallet is admin
      const walletValidation = validateAdminWallet(address);
      
      if (!walletValidation.isAdmin) {
        throw new Error('Wallet address is not authorized for admin access');
      }

      logWalletAdminValidation(address, undefined, walletValidation);

      // Get nonce from server
      const nonceResponse = await fetch('/api/auth/siwe/nonce');
      if (!nonceResponse.ok) {
        throw new Error('Failed to get authentication nonce');
      }
      const { nonce } = await nonceResponse.json();

      // Create SIWE message
      const domain = window.location.host;
      const origin = window.location.origin;
      const message = `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nAdmin Sign In\n\nURI: ${origin}\nVersion: 1\nChain ID: 1\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;

      // Request signature (let connector use its active account)
      const signature = await signMessageAsync({
        message,
        account: address as `0x${string}`
      });

      // Verify signature and authenticate
      const verifyResponse = await fetch('/api/auth/siwe/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          signature,
          address,
          isAdmin: true // Flag this as admin authentication
        })
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.error || 'Authentication failed');
      }

      const { user } = await verifyResponse.json();

      // Sign in with NextAuth using the wallet credentials
      const result = await signIn('credentials', {
        redirect: false,
        email: user.email || address,
        walletAddress: address,
        isWalletAuth: true
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      setAuthStatus('authenticated');
      setIsAdmin(true);
      setAdminMethod('wallet');
      
      onSuccess?.();
      
      // Redirect to admin page
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } catch (error) {
      console.error('Wallet authentication error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Authentication failed';
      setErrorMessage(errorMsg);
      setAuthStatus('error');
      onError?.(errorMsg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle email authentication
  const handleEmailAuth = () => {
    window.location.href = '/auth/signin?callbackUrl=' + encodeURIComponent(redirectUrl);
  };

  // Render authenticated state
  if (authStatus === 'authenticated' && isAdmin) {
    return (
      <div className={cn('space-y-4', className)}>
        {showStatus && (
          <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                Admin Access Granted
              </p>
              <p className="text-xs text-green-700">
                Authenticated via {adminMethod}
              </p>
            </div>
            <Badge variant="default" className="bg-green-600">
              <Shield className="h-3 w-3 mr-1" />
              ADMIN
            </Badge>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Admin Badge */}
      <div className="flex items-center justify-center space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <Shield className="h-5 w-5 text-amber-600" />
        <span className="text-sm font-medium text-amber-900">
          Admin Authentication Required
        </span>
      </div>

      {/* Wallet Authentication */}
      <div className="space-y-2">
        <Button
          onClick={handleWalletAuth}
          disabled={!isConnected || isAuthenticating}
          className="w-full"
          size="lg"
        >
          {isAuthenticating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Authenticating...
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4 mr-2" />
              {children || 'Sign In with Wallet'}
            </>
          )}
        </Button>
        
        {!isConnected && (
          <p className="text-xs text-center text-muted-foreground">
            Connect your wallet to authenticate as admin
          </p>
        )}

        {isConnected && address && (
          <div className="text-xs text-center">
            <span className="text-muted-foreground">Connected: </span>
            <span className="font-mono">
              {address.substring(0, 6)}...{address.substring(38)}
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-background text-muted-foreground">or</span>
        </div>
      </div>

      {/* Email Authentication */}
      <Button
        onClick={handleEmailAuth}
        variant="outline"
        className="w-full"
        size="lg"
      >
        <Mail className="h-4 w-4 mr-2" />
        Sign In with Email
      </Button>

      {/* Error Message */}
      {authStatus === 'error' && errorMessage && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-900">{errorMessage}</p>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-center text-muted-foreground space-y-1">
        <p>✅ Admin email: @tokenizin.com</p>
        <p>✅ Admin wallet: Configured wallet address</p>
        <p>✅ Admin ENS: tokenizin.eth</p>
      </div>
    </div>
  );
}
