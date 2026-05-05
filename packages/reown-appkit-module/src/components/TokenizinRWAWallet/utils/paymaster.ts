/**
 * Paymaster Utilities
 * 
 * Utilities for paymaster integration and gas sponsorship
 */

import { Address, Hex } from 'viem';
import type { PaymasterConfig, SendTransactionOptions } from '../types';

/**
 * Check if transaction is eligible for paymaster sponsorship
 */
export async function checkPaymasterEligibility(
  transaction: SendTransactionOptions,
  paymasterConfig: PaymasterConfig,
  contractAddresses?: { [key: string]: Address }
): Promise<boolean> {
  // Check if paymaster is enabled
  if (!paymasterConfig.address) {
    return false;
  }

  // Check if transaction explicitly requests paymaster
  if (transaction.usePaymaster === false) {
    return false;
  }

  // Check if transaction is to an eligible contract
  if (paymasterConfig.eligibleContracts && contractAddresses) {
    const isEligibleContract = paymasterConfig.eligibleContracts.some(
      (addr) => addr.toLowerCase() === transaction.to.toLowerCase()
    );
    
    if (!isEligibleContract) {
      return false;
    }
  }

  // Check gas limits
  // Note: Actual gas estimation would happen on the backend
  // This is a preliminary check

  return true;
}

/**
 * Prepare paymaster data for transaction
 */
export function preparePaymasterData(
  paymasterConfig: PaymasterConfig,
  transaction: SendTransactionOptions
): {
  paymaster: Address;
  paymasterData?: Hex;
} {
  const paymasterAddress = paymasterConfig.address;

  // Pimlico ERC-20: paymasterData is filled by Pimlico when building the userOp (pm_getPaymasterData).
  // Callers that support paymasterContext should pass { token: paymasterConfig.erc20Token }.
  if (paymasterConfig.type === 'pimlico_erc20' && paymasterConfig.erc20Token) {
    return {
      paymaster: paymasterAddress,
      // paymasterData comes from Pimlico API when building userOp; not available here
      paymasterData: undefined,
    };
  }

  // Verifying paymaster: use policyId as paymasterData
  return {
    paymaster: paymasterAddress,
    paymasterData: paymasterConfig.policyId
      ? (`0x${paymasterConfig.policyId}` as Hex)
      : undefined,
  };
}

/**
 * Get paymaster context for Pimlico ERC-20 (token to pay gas with).
 * Use when sending via a path that supports paymasterContext (e.g. SmartAccountClient with Pimlico).
 */
export function getPimlicoErc20PaymasterContext(paymasterConfig: PaymasterConfig): { token: Address } | undefined {
  if (paymasterConfig.type === 'pimlico_erc20' && paymasterConfig.erc20Token) {
    return { token: paymasterConfig.erc20Token };
  }
  return undefined;
}

/**
 * Estimate paymaster gas sponsorship
 */
export async function estimatePaymasterGas(
  transaction: SendTransactionOptions,
  paymasterConfig: PaymasterConfig
): Promise<{
  eligible: boolean;
  estimatedGas?: string;
  maxGas?: string;
}> {
  const isEligible = await checkPaymasterEligibility(
    transaction,
    paymasterConfig
  );

  if (!isEligible) {
    return { eligible: false };
  }

  // Note: Actual gas estimation would be done via paymaster API
  // This is a placeholder
  return {
    eligible: true,
    maxGas: paymasterConfig.maxGasPerTx,
  };
}

