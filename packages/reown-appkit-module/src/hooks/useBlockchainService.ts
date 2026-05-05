/**
 * Global Blockchain Transaction Service
 * 
 * Provides a unified interface for all blockchain interactions with:
 * - Automatic transaction recording
 * - State management (pending, success, failure)
 * - Database synchronization
 * - Admin reconciliation support
 */

import React from 'react';
import { Eip1193Provider, ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';

export interface BlockchainCallOptions {
  contractAddress: string;
  abi: any[];
  functionName: string;
  args?: any[];
  value?: string; // ETH value in wei
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  
  // Metadata for database tracking
  userId?: string;
  relatedEntityType?: string; // e.g., "Investment", "Listing", "Asset"
  relatedEntityId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  receipt?: ethers.TransactionReceipt;
  error?: string;
  errorCode?: string;
  transactionId?: string; // Database ID
}

export interface TransactionState {
  id: string;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed' | 'reverted';
  blockNumber?: number;
  confirmations: number;
  createdAt: Date;
  confirmedAt?: Date;
  error?: string;
}

/**
 * Global Blockchain Service Hook
 * 
 * Usage:
 * ```tsx
 * const { executeTransaction, transactionState, isPending } = useBlockchainService();
 * 
 * const result = await executeTransaction({
 *   contractAddress: '0x...',
 *   abi: ContractABI,
 *   functionName: 'purchaseTokens',
 *   args: [assetId, tokenAmount],
 *   value: totalCostWei,
 *   userId: user.id,
 *   relatedEntityType: 'Investment',
 *   relatedEntityId: investment.id,
 *   description: 'Purchase tokens for asset'
 * });
 * ```
 */
export function useBlockchainService() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [transactionState, setTransactionState] = React.useState<TransactionState | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  /**
   * Execute a blockchain transaction with automatic tracking
   */
  const executeTransaction = async (
    options: BlockchainCallOptions
  ): Promise<TransactionResult> => {
    if (!isConnected || !address || !walletClient) {
      return {
        success: false,
        error: 'Wallet not connected',
        errorCode: 'WALLET_NOT_CONNECTED',
      };
    }

    setIsPending(true);
    setTransactionState(null);

    try {
      // Create provider and signer from wallet client
      const provider = new ethers.BrowserProvider(window.ethereum as unknown as Eip1193Provider);
      const signer = await provider.getSigner();

      // Create contract instance
      const contract = new ethers.Contract(
        options.contractAddress,
        options.abi,
        signer
      );

      // Prepare transaction
      const txOptions: ethers.ContractTransaction = {
        to: options.contractAddress,
        data: options.args?.join(','),
      };

      // Get function and estimate gas
      const contractFunction = contract[options.functionName];
      if (!contractFunction) {
        throw new Error(`Function ${options.functionName} not found in contract ABI`);
      }

      // Estimate gas
      let estimatedGas: bigint;
      try {
        estimatedGas = await contractFunction.estimateGas(
          ...(options.args || []),
          txOptions
        );
        txOptions.gasLimit = estimatedGas + (estimatedGas / BigInt(10)); // Add 10% buffer
      } catch (gasError: any) {
        console.warn('Gas estimation failed:', gasError);
        // Use default if estimation fails
        txOptions.gasLimit = options.gasLimit || BigInt(500000);
      }

      // Send transaction
      const tx = await contractFunction(...(options.args || []), txOptions);

      // Record transaction in database (before confirmation)
      let transactionId: string | undefined;
      try {
        const recordResponse = await fetch('/api/blockchain/transactions/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            txHash: tx.hash,
            contractAddress: options.contractAddress,
            from: address,
            to: options.contractAddress,
            functionName: options.functionName,
            functionSignature: contractFunction.fragment.format('full'),
            inputData: tx.data,
            decodedInput: options.args,
            value: options.value || '0',
            gasLimit: txOptions.gasLimit?.toString(),
            gasPrice: txOptions.gasPrice?.toString(),
            maxFeePerGas: txOptions.maxFeePerGas?.toString(),
            maxPriorityFeePerGas: txOptions.maxPriorityFeePerGas?.toString(),
            userId: options.userId,
            relatedEntityType: options.relatedEntityType,
            relatedEntityId: options.relatedEntityId,
            description: options.description,
            metadata: options.metadata,
            status: 'pending',
          }),
        });

        if (recordResponse.ok) {
          const recordData = await recordResponse.json();
          transactionId = recordData.transactionId;
        }
      } catch (recordError) {
        console.warn('Failed to record transaction in database:', recordError);
        // Continue even if recording fails
      }

      // Update state
      setTransactionState({
        id: transactionId || tx.hash,
        txHash: tx.hash,
        status: 'pending',
        confirmations: 0,
        createdAt: new Date(),
      });

      // Wait for confirmation
      const receipt = await tx.wait();

      // Update state with confirmation
      setTransactionState({
        id: transactionId || tx.hash,
        txHash: tx.hash,
        status: receipt.status === 1 ? 'confirmed' : 'reverted',
        blockNumber: Number(receipt.blockNumber),
        confirmations: receipt.confirmations,
        createdAt: new Date(),
        confirmedAt: new Date(),
      });

      // Update database with receipt
      try {
        await fetch('/api/blockchain/transactions/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            txHash: tx.hash,
            blockNumber: receipt.blockNumber.toString(),
            blockHash: receipt.blockHash,
            blockTimestamp: new Date(),
            transactionIndex: receipt.index,
            gasUsed: receipt.gasUsed.toString(),
            effectiveGasPrice: receipt.gasPrice?.toString(),
            status: receipt.status === 1,
            outputData: receipt.logs.length > 0 ? JSON.stringify(receipt.logs) : undefined,
          }),
        });
      } catch (updateError) {
        console.warn('Failed to update transaction in database:', updateError);
      }

      setIsPending(false);

      if (receipt.status === 0) {
        return {
          success: false,
          txHash: tx.hash,
          receipt,
          error: 'Transaction reverted',
          errorCode: 'TRANSACTION_REVERTED',
          transactionId,
        };
      }

      return {
        success: true,
        txHash: tx.hash,
        receipt,
        transactionId,
      };
    } catch (error: any) {
      setIsPending(false);

      // Handle user rejection
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        return {
          success: false,
          error: 'Transaction rejected by user',
          errorCode: 'USER_REJECTED',
        };
      }

      // Handle insufficient funds
      if (
        error.message?.includes('insufficient funds') ||
        error.message?.includes('insufficient balance')
      ) {
        return {
          success: false,
          error: 'Insufficient funds for transaction',
          errorCode: 'INSUFFICIENT_FUNDS',
        };
      }

      // Handle other errors
      return {
        success: false,
        error: error.message || 'Transaction failed',
        errorCode: error.code || 'UNKNOWN_ERROR',
      };
    }
  };

  return {
    executeTransaction,
    transactionState,
    isPending,
    isConnected,
    address,
  };
}

