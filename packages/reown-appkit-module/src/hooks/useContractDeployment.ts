/**
 * Contract Deployment Hook
 * 
 * Integrates wallet authentication with contract factory service
 * Handles property token creation with user's connected wallet
 */

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { BrowserProvider, Eip1193Provider } from 'ethers';
import { useToast } from '@/hooks/use-toast';
import type { PropertyTokenParams, ContractDeploymentResult } from '@/lib/services/contract-factory-service';

// ============================================================================
// TYPES
// ============================================================================

export interface DeploymentState {
  isDeploying: boolean;
  currentStep: 'idle' | 'validating' | 'registering' | 'creating' | 'saving' | 'complete' | 'error';
  progress: number; // 0-100
  result: ContractDeploymentResult | null;
  error: string | null;
}

export interface DeploymentOptions {
  onSuccess?: (result: ContractDeploymentResult) => void;
  onError?: (error: string) => void;
  onProgress?: (step: string, progress: number) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useContractDeployment(options: DeploymentOptions = {}) {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  const [state, setState] = useState<DeploymentState>({
    isDeploying: false,
    currentStep: 'idle',
    progress: 0,
    result: null,
    error: null,
  });

  /**
   * Update deployment progress
   */
  const updateProgress = useCallback((step: DeploymentState['currentStep'], progress: number) => {
    setState(prev => ({ ...prev, currentStep: step, progress }));
    options.onProgress?.(step, progress);
  }, [options]);

  /**
   * Deploy property token contract
   */
  const deployPropertyToken = useCallback(async (params: PropertyTokenParams) => {
    // Validation
    if (!isConnected || !address) {
      const error = 'Please connect your wallet first';
      toast({
        title: 'Wallet Not Connected',
        description: error,
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, error, currentStep: 'error' }));
      options.onError?.(error);
      return null;
    }

    if (address.toLowerCase() !== params.ownerAddress.toLowerCase()) {
      const error = 'Connected wallet must match owner address';
      toast({
        title: 'Address Mismatch',
        description: error,
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, error, currentStep: 'error' }));
      options.onError?.(error);
      return null;
    }

    // Reset state
    setState({
      isDeploying: true,
      currentStep: 'validating',
      progress: 0,
      result: null,
      error: null,
    });

    try {
      // Step 1: Validate parameters (10%)
      updateProgress('validating', 10);
      console.log('🔍 Validating deployment parameters...');

      // Step 2: Get signer from wallet
      updateProgress('validating', 20);
      console.log('🔐 Getting wallet signer...');

      // Check if we have window.ethereum (MetaMask or similar)
      if (!window.ethereum) {
        throw new Error('No Ethereum provider found. Please install MetaMask.');
      }

      const provider = new BrowserProvider(window.ethereum as unknown as Eip1193Provider);
      const signer = await provider.getSigner();

      // Verify signer address matches
      const signerAddress = await signer.getAddress();
      if (signerAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Signer address does not match connected wallet');
      }

      // Step 3: Call API to deploy contracts
      updateProgress('registering', 30);
      console.log('📡 Calling deployment API...');

      toast({
        title: 'Starting Deployment',
        description: 'Please confirm the transactions in your wallet...',
      });

      const response = await fetch('/api/blockchain/deploy-property-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          params,
          walletAddress: address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Deployment API call failed');
      }

      const apiResult = await response.json();

      // Step 4: Wait for user to sign registration transaction
      updateProgress('registering', 50);
      console.log('📝 Waiting for asset registration transaction...');

      toast({
        title: 'Confirm Registration',
        description: 'Please confirm the asset registration transaction in your wallet',
      });

      // Registration is handled server-side, but we track progress
      
      // Step 5: Wait for token creation transaction
      updateProgress('creating', 70);
      console.log('🪙 Waiting for token creation transaction...');

      toast({
        title: 'Confirm Token Creation',
        description: 'Please confirm the token creation transaction in your wallet',
      });

      // Step 6: Save to database
      updateProgress('saving', 90);
      console.log('💾 Saving deployment records...');

      const result: ContractDeploymentResult = apiResult.result;

      if (!result.success) {
        throw new Error(result.error || 'Deployment failed');
      }

      // Step 7: Complete
      updateProgress('complete', 100);
      console.log('✅ Property token deployed successfully!');

      setState(prev => ({
        ...prev,
        isDeploying: false,
        currentStep: 'complete',
        progress: 100,
        result,
      }));

      toast({
        title: 'Deployment Successful! 🎉',
        description: `Token created at ${result.tokenAddress?.slice(0, 10)}...`,
      });

      options.onSuccess?.(result);
      return result;

    } catch (error: any) {
      console.error('❌ Deployment failed:', error);

      const errorMessage = error.message || 'Deployment failed';

      setState(prev => ({
        ...prev,
        isDeploying: false,
        currentStep: 'error',
        error: errorMessage,
      }));

      toast({
        title: 'Deployment Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      options.onError?.(errorMessage);
      return null;
    }
  }, [address, isConnected, toast, options, updateProgress]);

  /**
   * Estimate deployment cost
   */
  const estimateDeploymentCost = useCallback(async (params: PropertyTokenParams) => {
    if (!address) {
      return null;
    }

    try {
      const response = await fetch('/api/blockchain/estimate-deployment-cost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          params,
          walletAddress: address,
        }),
      });

      if (!response.ok) {
        throw new Error('Cost estimation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to estimate cost:', error);
      return null;
    }
  }, [address]);

  /**
   * Reset deployment state
   */
  const reset = useCallback(() => {
    setState({
      isDeploying: false,
      currentStep: 'idle',
      progress: 0,
      result: null,
      error: null,
    });
  }, []);

  return {
    // State
    ...state,
    isWalletConnected: isConnected,
    walletAddress: address,

    // Actions
    deployPropertyToken,
    estimateDeploymentCost,
    reset,
  };
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Deployment progress messages
 */
export const DEPLOYMENT_STEPS = {
  idle: { message: 'Ready to deploy', progress: 0 },
  validating: { message: 'Validating parameters...', progress: 20 },
  registering: { message: 'Registering asset on blockchain...', progress: 50 },
  creating: { message: 'Creating property token...', progress: 70 },
  saving: { message: 'Saving deployment records...', progress: 90 },
  complete: { message: 'Deployment complete!', progress: 100 },
  error: { message: 'Deployment failed', progress: 0 },
};

/**
 * Get step description
 */
export function getStepDescription(step: DeploymentState['currentStep']): string {
  return DEPLOYMENT_STEPS[step]?.message || 'Processing...';
}

