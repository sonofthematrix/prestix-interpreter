/**
 * Admin Authentication Hook
 * 
 * Provides admin authentication using both email and wallet methods
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useAccount } from 'wagmi';
import { 
  validateAdmin, 
  validateAdminEmail, 
  validateAdminWallet 
} from '@/lib/admin-validation';

interface UseAdminAuthReturn {
  isAdmin: boolean;
  adminMethod: 'email' | 'wallet' | 'ens'  | null;
  isLoading: boolean;
  user: any;
  walletAddress: string | undefined;
  ensName: string | undefined;
  checkAdminStatus: () => Promise<void>;
}

export function useAdminAuth(): UseAdminAuthReturn {
  const { data: session, status } = useSession();
  const { address, isConnected } = useAccount();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMethod, setAdminMethod] = useState<'email' | 'wallet' | 'ens' | null>(null);
  const [ensName, setENSName] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminStatus = useCallback(async () => {
    setIsLoading(true);

    try {
      // Get user email from session
      const email = session?.user?.email;
      
      // Get wallet address from wagmi
      const walletAddress = address;

      // TODO: Fetch ENS name for the wallet address
      // This would require an ENS resolver integration
      // For now, we'll leave it as undefined
      let resolvedENS: string | undefined = undefined;

      // Perform comprehensive admin validation
      const validation = validateAdmin(email, walletAddress, resolvedENS);

      setIsAdmin(validation.isAdmin);
      setAdminMethod(validation.method);
      setENSName(resolvedENS);

      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 Admin Status Check:', {
          email,
          walletAddress: walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}` : 'none',
          ensName: resolvedENS || 'none',
          isAdmin: validation.isAdmin,
          method: validation.method,
          message: validation.message
        });
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setAdminMethod(null);
    } finally {
      setIsLoading(false);
    }
  }, [session, address]);

  // Check admin status when session or wallet changes
  useEffect(() => {
    if (status !== 'loading') {
      checkAdminStatus();
    }
  }, [status, session, address, checkAdminStatus]);

  return {
    isAdmin,
    adminMethod,
    isLoading: status === 'loading' || isLoading,
    user: session?.user,
    walletAddress: address,
    ensName,
    checkAdminStatus
  };
}
