'use client';

import React, { useState, useCallback } from 'react';  
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { signIn, signOut } from 'next-auth/react';
import { useSession } from '@/lib/auth/appkit-session';
import { useToast } from '@/hooks/useToast';

interface WalletAuthState {
  isConnecting: boolean;
  isAuthenticating: boolean;
  isConnected: boolean;
  isAuthenticated: boolean;
  address?: string;
  error?: string;
}

export function useWalletAuth() {
  const { address, isConnected } = useAccount();
  const { data: session, status } = useSession();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const toast = useToast();
  
  const [state, setState] = useState<WalletAuthState>({
    isConnecting: false,
    isAuthenticating: false,
    isConnected: false,
    isAuthenticated: false,
  });

  const authenticateWithWallet = useCallback(async () => {
    if (!address) {
      toast("Please connect your wallet first.", "error");
      return;
    }

    setState(prev => ({ ...prev, isAuthenticating: true, error: undefined }));

    try {
      // Step 1: Get SIWE nonce and message
      const nonceResponse = await fetch(`/api/auth/wallet/nonce?address=${address}`);
      if (!nonceResponse.ok) {
        throw new Error('Failed to get authentication nonce');
      }
      
      const { message, nonce } = await nonceResponse.json();

      // Step 2: Sign the message with wallet
      const signature = await signMessageAsync({ account: address, message });

      // Step 3: Verify signature and authenticate
      const verifyResponse = await fetch('/api/wallet-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          signature,
          nonce,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'Authentication failed');
      }

      const { user } = await verifyResponse.json();

      // Step 4: Sign in with NextAuth
      const result = await signIn('credentials', {
        email: user.email,
        password: '', // Not used for wallet auth
        redirect: false,
      });

      if (result?.error) {
        // Even if NextAuth fails, we have wallet authentication
        toast(`Welcome, ${user.name || address.slice(0, 6)}...${address.slice(-4)}!`);
      } else {
        toast(`Welcome back, ${user.name || address.slice(0, 6)}...${address.slice(-4)}!`);
      }

      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        isAuthenticating: false,
        address,
      }));

    } catch (error) {
      console.error('Wallet authentication error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      
      setState(prev => ({
        ...prev,
        isAuthenticating: false,
        error: errorMessage,
      }));

      toast(errorMessage, "error");
    }
  }, [address, signMessageAsync, toast]);

  const disconnectWallet = useCallback(async () => {
    try {
      await signOut({ redirect: false });
      disconnect();
      
      setState({
        isConnecting: false,
        isAuthenticating: false,
        isConnected: false,
        isAuthenticated: false,
      });

      toast("You have been signed out successfully.");
    } catch (error) {
      console.error('Wallet disconnect error:', error);
      toast("There was an error disconnecting your wallet.", "error");
    }
  }, [disconnect, toast]);

  // Update state when wallet connection changes
  const updateConnectionState = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConnected,
      address: address || undefined,
      isAuthenticated: status === 'authenticated' && !!session?.user,
    }));
  }, [isConnected, address, status, session]);

  // Update state when dependencies change
  React.useEffect(() => {
    updateConnectionState();
  }, [updateConnectionState]);

  return {
    ...state,
    authenticateWithWallet,
    disconnectWallet,
    session,
    isLoading: status === 'loading',
  };
}
