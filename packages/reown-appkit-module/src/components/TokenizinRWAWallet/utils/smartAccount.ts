/**
 * Smart Account Utilities
 * 
 * Utilities for detecting and working with Smart Accounts (ERC-4337)
 */

import { Address, WalletClient } from 'viem';

/**
 * Check if wallet supports EIP 5792 (sendCalls)
 */
export async function checkSendCallsSupport(
  walletClient: WalletClient | null
): Promise<boolean> {
  if (!walletClient) return false;

  try {
    // Check if wallet supports getCapabilities
    if (typeof walletClient.getCapabilities !== 'function') {
      return false;
    }

    const capabilities = await walletClient.getCapabilities();
    
    // Check if wallet supports sendCalls
    // Capabilities structure varies by wallet, check for sendCalls support
    if (capabilities && typeof capabilities === 'object') {
      // Check if capabilities has sendCalls method or property
      const caps = capabilities as any;
      return caps.sendCalls === true || 
             (caps.wallet && Array.isArray(caps.wallet) && caps.wallet.includes('sendCalls')) ||
             (typeof caps === 'object' && 'sendCalls' in caps);
    }
    
    return false;
  } catch (error) {
    console.warn('Failed to check sendCalls support:', error);
    return false;
  }
}

/**
 * Get Smart Account capabilities
 */
export async function getSmartAccountCapabilities(
  walletClient: WalletClient | null
): Promise<{
  supportsSendCalls: boolean;
  supportsPaymaster: boolean;
  maxBatchSize?: number;
  supportedChains?: number[];
}> {
  if (!walletClient) {
    return {
      supportsSendCalls: false,
      supportsPaymaster: false,
    };
  }

  try {
    const capabilities = await walletClient.getCapabilities();
    
    // Handle different capabilities structures
    const caps = capabilities as any;
    const supportsSendCalls = 
      caps?.sendCalls === true ||
      (caps?.wallet && Array.isArray(caps.wallet) && caps.wallet.includes('sendCalls')) ||
      (typeof caps === 'object' && 'sendCalls' in caps);
    
    const supportsPaymaster = 
      caps?.paymaster === true ||
      caps?.paymasterService?.supported === true ||
      (caps?.wallet && Array.isArray(caps.wallet) && caps.wallet.includes('paymaster'));
    
    return {
      supportsSendCalls: supportsSendCalls ?? false,
      supportsPaymaster: supportsPaymaster ?? false,
      maxBatchSize: caps?.maxBatchSize || caps?.wallet?.maxBatchSize,
      supportedChains: caps?.supportedChains || caps?.wallet?.supportedChains,
    };
  } catch (error) {
    console.warn('Failed to get Smart Account capabilities:', error);
    return {
      supportsSendCalls: false,
      supportsPaymaster: false,
    };
  }
}

/**
 * Detect account type from AppKit account
 * 
 * Uses embeddedWalletInfo to determine actual account type, as allAccounts
 * may only show EOA addresses even when Smart Account is deployed
 */
export function detectAccountType(
  appKitAccount?: {
    allAccounts?: Array<{ type?: string; address?: Address }>;
    embeddedWalletInfo?: {
      accountType?: string;
      isSmartAccountDeployed?: boolean;
      user?: {
        preferredAccountType?: string;
        accounts?: Array<{ type?: string; address?: Address }>;
      };
    };
  }
): 'eoa' | 'social' | 'smart' {
  if (!appKitAccount) {
    return 'eoa';
  }

  // Check embeddedWalletInfo first (most accurate)
  const embeddedInfo = appKitAccount.embeddedWalletInfo;
  
  if (embeddedInfo) {
    // Check accountType from embeddedWalletInfo
    if (embeddedInfo.accountType === 'smartAccount' || embeddedInfo.isSmartAccountDeployed) {
      return 'smart';
    }
    
    // Check preferredAccountType
    if (embeddedInfo.user?.preferredAccountType === 'smartAccount') {
      return 'smart';
    }
    
    // Check accounts array in embeddedWalletInfo
    const smartAccount = embeddedInfo.user?.accounts?.find(acc => acc.type === 'smartAccount');
    if (smartAccount) {
      return 'smart';
    }
    
    // Check if authProvider indicates social account
    if ((embeddedInfo as any).authProvider && (embeddedInfo as any).authProvider !== 'wallet') {
      return 'social';
    }
  }

  // Fallback to allAccounts check
  const allAccounts = appKitAccount.allAccounts;
  if (allAccounts && allAccounts.length > 0) {
    const accountType = allAccounts[0]?.type;
    
    if (accountType === 'social') {
      return 'social';
    }
    
    if (accountType === 'smartAccount') {
      return 'smart';
    }
  }

  // Default to EOA if type is unknown
  return 'eoa';
}

/**
 * Check if account is a Smart Account
 */
export function isSmartAccount(
  appKitAccount?: {
    allAccounts?: Array<{ type?: string; address?: Address }>;
    embeddedWalletInfo?: {
      accountType?: string;
      isSmartAccountDeployed?: boolean;
      user?: {
        preferredAccountType?: string;
        accounts?: Array<{ type?: string; address?: Address }>;
      };
    };
  }
): boolean {
  const accountType = detectAccountType(appKitAccount);
  return accountType === 'social' || accountType === 'smart';
}

