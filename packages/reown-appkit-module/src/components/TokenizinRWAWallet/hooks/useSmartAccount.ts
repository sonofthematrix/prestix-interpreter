/**
 * useSmartAccount Hook
 * 
 * Hook for detecting and working with Smart Accounts
 */

import { useEffect, useState, useMemo, useRef } from 'react';
// ✅ CORRECT: Use AppKit hooks instead of wagmi hooks to avoid WagmiProvider dependency
import { useAppKitAccount, useAppKitState } from '@reown/appkit/react';
import { Address } from 'viem';
import { 
  checkSendCallsSupport, 
  getSmartAccountCapabilities,
  detectAccountType,
  isSmartAccount 
} from '../utils/smartAccount';
import type { SmartAccountCapabilities } from '../types';

export function useSmartAccount() {
  // ✅ CORRECT: Use AppKit hooks instead of wagmi hooks to avoid WagmiProvider dependency
  const appKitAccount = useAppKitAccount();
  const appKitState = useAppKitState();
  const { address, isConnected } = appKitAccount;
  
  // Wallet client is optional - capabilities checking will be skipped if not available
  // AppKit account info is the primary source for account type detection
  // Note: Getting wallet client synchronously from connectors is not reliable
  // If needed, it should be retrieved asynchronously when WagmiProvider is available
  const walletClient = null; // Optional - set to null to avoid WagmiProvider dependency
  
  const [capabilities, setCapabilities] = useState<SmartAccountCapabilities>({
    supportsSendCalls: false,
    supportsPaymaster: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [accountType, setAccountType] = useState<'eoa' | 'social' | 'smart'>('eoa');

  // Extract initialized flag (primitive value, stable)
  const isInitialized = appKitState.initialized;

  // Extract primitive values for stable comparison
  const allAccountsLength = appKitAccount.allAccounts?.length ?? 0;
  const firstAccountType = appKitAccount.allAccounts?.[0]?.type;
  const firstAccountAddress = appKitAccount.allAccounts?.[0]?.address;
  const embeddedAccountType = appKitAccount.embeddedWalletInfo?.accountType;
  const isSmartAccountDeployed = appKitAccount.embeddedWalletInfo?.isSmartAccountDeployed ?? false;
  const preferredAccountType = (appKitAccount.embeddedWalletInfo?.user as any)?.preferredAccountType;
  const embeddedAccountsLength = appKitAccount.embeddedWalletInfo?.user?.accounts?.length ?? 0;

  // Create stable key from account data to prevent unnecessary re-runs
  const accountDataKey = useMemo(() => {
    try {
      return JSON.stringify({
        allAccounts: appKitAccount.allAccounts?.map(acc => ({
          type: acc.type,
          address: acc.address,
        })) || [],
        embeddedWalletInfo: appKitAccount.embeddedWalletInfo ? {
          accountType: embeddedAccountType,
          isSmartAccountDeployed,
          preferredAccountType,
          accounts: appKitAccount.embeddedWalletInfo.user?.accounts?.map(acc => ({
            type: acc.type,
            address: acc.address,
          })) || [],
        } : null,
      });
    } catch {
      return '';
    }
  }, [
    embeddedAccountType,
    isSmartAccountDeployed,
    preferredAccountType,
    appKitAccount.allAccounts,
    appKitAccount.embeddedWalletInfo,
  ]);

  // Use ref to track if we've already processed this account data
  const processedAccountKeyRef = useRef<string>('');

  useEffect(() => {
    async function checkCapabilities() {
      if (!address || !isConnected) {
        setIsLoading(false);
        return;
      }
      
      // Wallet client is optional - if not available, skip capabilities checking
      // Account type detection from AppKit is still available
      if (!walletClient) {
        // Still detect account type from AppKit even without wallet client
        const detectedType = detectAccountType(appKitAccount as any);
        setAccountType(detectedType);
        setIsLoading(false);
        return;
      }

      // Skip if we've already processed this account data
      if (accountDataKey === processedAccountKeyRef.current && accountDataKey !== '') {
        return;
      }

      // Mark as processed
      processedAccountKeyRef.current = accountDataKey;

      try {
        setIsLoading(true);

        // Wait for AppKit to be initialized before checking capabilities
        if (!isInitialized) {
          setIsLoading(false);
          return;
        }

        // Detect account type from AppKit
        const detectedType = detectAccountType(appKitAccount as any);
        setAccountType(detectedType);

        // Check Smart Account capabilities
        const smartAccountCaps = await getSmartAccountCapabilities(walletClient);
        setCapabilities(smartAccountCaps);
      } catch (error) {
        console.error('Failed to check Smart Account capabilities:', error);
        setCapabilities({
          supportsSendCalls: false,
          supportsPaymaster: false,
        });
      } finally {
        setIsLoading(false);
      }
    }

    checkCapabilities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, walletClient, accountDataKey, isInitialized]);

  // Get all account addresses (EOA + Smart Accounts)
  const allAccountAddresses = useMemo(() => {
    const addresses: Address[] = [];
    
    // Add primary address
    if (address) {
      addresses.push(address as Address);
    }

    // Add accounts from allAccounts
    if (appKitAccount.allAccounts) {
      appKitAccount.allAccounts.forEach((account: any) => {
        if (account.address && !addresses.includes(account.address as Address)) {
          addresses.push(account.address as Address);
        }
      });
    }

    // Add Smart Account addresses from embeddedWalletInfo
    if (appKitAccount.embeddedWalletInfo?.user?.accounts) {
      appKitAccount.embeddedWalletInfo.user.accounts.forEach((account: any) => {
        if (account.address && !addresses.includes(account.address as Address)) {
          addresses.push(account.address as Address);
        }
      });
    }

    return addresses;
  }, [address, appKitAccount.allAccounts, appKitAccount.embeddedWalletInfo]);

  return {
    accountType,
    isSmartAccount: isSmartAccount(appKitAccount as any),
    capabilities,
    isLoading,
    address,
    allAccounts: allAccountAddresses.map((addr) => ({
      address: addr,
      type: accountType,
    })),
    embeddedWalletInfo: appKitAccount.embeddedWalletInfo,
  };
}

