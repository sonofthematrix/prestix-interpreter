/**
 * useSendCalls Hook
 * 
 * Hook for executing batch transactions via EIP 5792 sendCalls
 * Supports Smart Account batch transactions with paymaster integration
 */

import { useState, useCallback } from 'react';
// ✅ CORRECT: Use AppKit hooks instead of wagmi hooks to avoid WagmiProvider dependency
import { useAppKitAccount } from '@reown/appkit/react';
import { Address, Hex } from 'viem';
import { useSmartAccount } from './useSmartAccount';
import { usePaymaster } from './usePaymaster';
import type { SendCallsOptions, Transaction, PaymasterConfig, ContractAddresses } from '../types';

interface SendCallsResult {
  success: boolean;
  transactionHash?: string;
  userOperationHash?: string;
  error?: Error;
}

export function useSendCalls(
  paymasterConfig?: PaymasterConfig,
  contractAddresses?: ContractAddresses
) {
  // ✅ CORRECT: Use AppKit hooks instead of wagmi hooks to avoid WagmiProvider dependency
  const appKitAccount = useAppKitAccount();
  const { address, isConnected } = appKitAccount;
  const { capabilities, isSmartAccount } = useSmartAccount();
  const { checkEligibility, prepareData } = usePaymaster(paymasterConfig, contractAddresses);
  
  // Wallet client is required for sendCalls but optional for component rendering
  // If not available, sendCalls will return an error
  // Note: Getting wallet client synchronously from connectors is not reliable
  // If WagmiProvider is available, useWalletClient() hook should be used instead
  // For now, set to null to avoid WagmiProvider dependency - sendCalls will handle gracefully
  const walletClient = null; // Optional - set to null to avoid WagmiProvider dependency

  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Execute batch calls via sendCalls (EIP 5792)
   */
  const sendCalls = useCallback(async (
    options: SendCallsOptions
  ): Promise<SendCallsResult> => {
    if (!isConnected || !address || !walletClient) {
      return {
        success: false,
        error: new Error('Wallet not connected'),
      };
    }

    // Check if account supports sendCalls
    if (!capabilities.supportsSendCalls) {
      return {
        success: false,
        error: new Error('Account does not support sendCalls (EIP 5792)'),
      };
    }

    setIsSending(true);
    setError(null);

    try {
      // Prepare calls
      const calls = options.calls.map((call) => ({
        to: call.to as Address,
        value: call.value ? BigInt(call.value) : undefined,
        data: call.data as Hex | undefined,
      }));

      // Check paymaster eligibility if requested
      let paymasterData: { paymaster: Address; paymasterData?: Hex } | undefined;
      
      if (options.usePaymaster && paymasterConfig) {
        // Check if first call is eligible for paymaster
        const firstCall = calls[0];
        if (firstCall) {
          const isEligible = await checkEligibility({
            to: firstCall.to,
            value: firstCall.value?.toString(),
            data: firstCall.data,
            usePaymaster: true,
            accountType: isSmartAccount ? 'social' : 'eoa',
          });

          if (isEligible) {
            paymasterData = prepareData({
              to: firstCall.to,
              value: firstCall.value?.toString(),
              data: firstCall.data,
              usePaymaster: true,
            });
          }
        }
      }

      // Execute sendCalls
      // Note: EIP 5792 sendCalls returns { id: string } for batch ID
      // Some implementations may return { hash: string } directly
      let result: any;

      if (typeof walletClient.sendCalls === 'function') {
        // Direct sendCalls support
        result = await walletClient.sendCalls({
          calls,
          capabilities: options.capabilities,
          ...(paymasterData && { paymaster: paymasterData.paymaster, paymasterData: paymasterData.paymasterData }),
        } as any);
      } else {
        // Fallback: Try to use wallet's request method
        const provider = (walletClient as any).provider;
        if (provider && typeof provider.request === 'function') {
          result = await provider.request({
            method: 'wallet_sendCalls',
            params: [
              {
                calls,
                capabilities: options.capabilities,
                ...(paymasterData && { paymaster: paymasterData.paymaster, paymasterData: paymasterData.paymasterData }),
              },
            ],
          });
        } else {
          throw new Error('sendCalls not supported by wallet client');
        }
      }

      // Handle different return formats:
      // - EIP 5792 standard: { id: string } (batch ID)
      // - Some implementations: { hash: string } (transaction hash)
      // - Smart Account: { hash: string, userOperationHash?: string }
      const transactionHash = result.hash || result.id || result.transactionHash;
      const userOperationHash = result.userOperationHash || result.userOpHash;

      if (!transactionHash) {
        throw new Error('sendCalls did not return a transaction hash or batch ID');
      }

      return {
        success: true,
        transactionHash,
        userOperationHash,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send calls');
      setError(error);
      return {
        success: false,
        error,
      };
    } finally {
      setIsSending(false);
    }
  }, [
    isConnected,
    address,
    walletClient,
    capabilities,
    isSmartAccount,
    checkEligibility,
    prepareData,
    paymasterConfig,
  ]);

  /**
   * Send a single transaction (convenience method)
   */
  const sendTransaction = useCallback(async (
    to: Address,
    value?: string,
    data?: Hex,
    usePaymaster?: boolean
  ): Promise<SendCallsResult> => {
    return sendCalls({
      calls: [{ to, value, data }],
      usePaymaster,
    });
  }, [sendCalls]);

  /**
   * Send token transfer (ERC20)
   */
  const sendTokenTransfer = useCallback(async (
    tokenAddress: Address,
    to: Address,
    amount: string,
    decimals: number = 18,
    usePaymaster?: boolean
  ): Promise<SendCallsResult> => {
    // ERC20 transfer function signature: transfer(address,uint256)
    const transferData = `0xa9059cbb${to.slice(2).padStart(64, '0')}${BigInt(amount).toString(16).padStart(64, '0')}` as Hex;

    return sendCalls({
      calls: [{
        to: tokenAddress,
        data: transferData,
      }],
      usePaymaster,
    });
  }, [sendCalls]);

  return {
    sendCalls,
    sendTransaction,
    sendTokenTransfer,
    isSending,
    error,
    supportsSendCalls: capabilities.supportsSendCalls,
    isSmartAccount,
  };
}

