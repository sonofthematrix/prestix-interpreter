/**
 * useAdminWallet Hook
 * 
 * Hook for checking admin wallet status and capabilities
 */

import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Address } from 'viem';

export interface AdminWalletCapabilities {
  isAdmin: boolean;
  canMint: boolean;
  canDeployFactory: boolean;
  canLazyMint: boolean;
  canUsePaymaster: boolean;
  adminWalletAddress?: Address;
}

export function useAdminWallet(): AdminWalletCapabilities & { isLoading: boolean } {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(true);
  const [adminStatus, setAdminStatus] = useState<AdminWalletCapabilities>({
    isAdmin: false,
    canMint: false,
    canDeployFactory: false,
    canLazyMint: false,
    canUsePaymaster: false,
  });

  useEffect(() => {
    async function checkAdminStatus() {
      if (!address) {
        setAdminStatus({
          isAdmin: false,
          canMint: false,
          canDeployFactory: false,
          canLazyMint: false,
          canUsePaymaster: false,
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Check admin status via API
        const response = await fetch('/api/admin/wallet/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ walletAddress: address }),
        });

        if (response.ok) {
          const data = await response.json();
          setAdminStatus({
            isAdmin: data.isAdmin || false,
            canMint: data.canMint || false,
            canDeployFactory: data.canDeployFactory || false,
            canLazyMint: data.canLazyMint || false,
            canUsePaymaster: data.canUsePaymaster || false,
            adminWalletAddress: data.adminWalletAddress as Address | undefined,
          });
        } else {
          // Fallback: Check against environment variable
          const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;
          const isAdminWallet = adminWallet && address.toLowerCase() === adminWallet.toLowerCase();
          
          setAdminStatus({
            isAdmin: isAdminWallet || false,
            canMint: isAdminWallet || false,
            canDeployFactory: isAdminWallet || false,
            canLazyMint: isAdminWallet || false,
            canUsePaymaster: isAdminWallet || false,
            adminWalletAddress: adminWallet as Address | undefined,
          });
        }
      } catch (error) {
        console.error('Failed to check admin wallet status:', error);
        
        // Fallback: Check against environment variable
        const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;
        const isAdminWallet = adminWallet && address?.toLowerCase() === adminWallet.toLowerCase();
        
        setAdminStatus({
          isAdmin: isAdminWallet || false,
          canMint: isAdminWallet || false,
          canDeployFactory: isAdminWallet || false,
          canLazyMint: isAdminWallet || false,
          canUsePaymaster: isAdminWallet || false,
          adminWalletAddress: adminWallet as Address | undefined,
        });
      } finally {
        setIsLoading(false);
      }
    }

    checkAdminStatus();
  }, [address]);

  return {
    ...adminStatus,
    isLoading,
  };
}

