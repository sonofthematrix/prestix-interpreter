/**
 * usePaymaster Hook
 * 
 * Hook for paymaster integration and gas sponsorship
 */

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { 
  checkPaymasterEligibility,
  preparePaymasterData,
  estimatePaymasterGas 
} from '../utils/paymaster';
import type { PaymasterConfig, SendTransactionOptions, ContractAddresses } from '../types';

export function usePaymaster(
  paymasterConfig?: PaymasterConfig,
  contractAddresses?: ContractAddresses
) {
  const { address } = useAccount();
  const [isChecking, setIsChecking] = useState(false);

  const checkEligibility = useCallback(async (
    transaction: SendTransactionOptions
  ): Promise<boolean> => {
    if (!paymasterConfig || !address) {
      return false;
    }

    try {
      setIsChecking(true);
      return await checkPaymasterEligibility(
        transaction,
        paymasterConfig,
        contractAddresses as { [key: string]: `0x${string}` }
      );
    } catch (error) {
      console.error('Failed to check paymaster eligibility:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [paymasterConfig, contractAddresses, address]);

  const prepareData = useCallback((
    transaction: SendTransactionOptions
  ) => {
    if (!paymasterConfig) {
      return undefined;
    }

    return preparePaymasterData(paymasterConfig, transaction);
  }, [paymasterConfig]);

  const estimateGas = useCallback(async (
    transaction: SendTransactionOptions
  ) => {
    if (!paymasterConfig) {
      return { eligible: false };
    }

    try {
      return await estimatePaymasterGas(transaction, paymasterConfig);
    } catch (error) {
      console.error('Failed to estimate paymaster gas:', error);
      return { eligible: false };
    }
  }, [paymasterConfig]);

  return {
    checkEligibility,
    prepareData,
    estimateGas,
    isChecking,
    isEnabled: !!paymasterConfig?.address,
  };
}

