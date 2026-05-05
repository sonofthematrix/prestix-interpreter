// Tiger Palace RWA Ecosystem - React Hooks
// Auto-generated for sepolia network
// Generated: 2025-11-30T01:40:05.434Z

import { useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi';
import { CONTRACT_ADDRESSES } from './contracts';

// ============================================================================
// Asset Registry Hooks
// ============================================================================

export function useAsset(assetId: bigint) {
  return useContractRead({
    address: CONTRACT_ADDRESSES.sepolia.RWAAssetRegistry,
    abi: [], // Import from generated ABI
    functionName: 'getAsset',
    args: [assetId],
    enabled: assetId > 0n,
  });
}

export function useRegisterAsset() {
  const { write, data } = useContractWrite({
    address: CONTRACT_ADDRESSES.sepolia.RWAAssetRegistry,
    abi: [], // Import from generated ABI
    functionName: 'registerAsset',
  });

  const { isLoading } = useWaitForTransaction({
    hash: data?.hash,
  });

  return {
    registerAsset: write,
    isLoading,
    hash: data?.hash,
  };
}

// ============================================================================
// Marketplace Hooks
// ============================================================================

export function useBuyTokens() {
  const { write, data } = useContractWrite({
    address: CONTRACT_ADDRESSES.sepolia.RWAMarketplace,
    abi: [], // Import from generated ABI
    functionName: 'buyTokens',
  });

  const { isLoading } = useWaitForTransaction({
    hash: data?.hash,
  });

  return {
    buyTokens: write,
    isLoading,
    hash: data?.hash,
  };
}

export function useSellTokens() {
  const { write, data } = useContractWrite({
    address: CONTRACT_ADDRESSES.sepolia.RWAMarketplace,
    abi: [], // Import from generated ABI
    functionName: 'sellTokens',
  });

  const { isLoading } = useWaitForTransaction({
    hash: data?.hash,
  });

  return {
    sellTokens: write,
    isLoading,
    hash: data?.hash,
  };
}

// ============================================================================
// Staking Hooks
// ============================================================================

export function useUserStakes(userAddress?: `0x${string}`) {
  return useContractRead({
    address: CONTRACT_ADDRESSES.sepolia.RWAStaking,
    abi: [], // Import from generated ABI
    functionName: 'getUserStakes',
    args: userAddress ? [userAddress] : undefined,
    enabled: !!userAddress,
  });
}

export function useStake() {
  const { write, data } = useContractWrite({
    address: CONTRACT_ADDRESSES.sepolia.RWAStaking,
    abi: [], // Import from generated ABI
    functionName: 'stake',
  });

  const { isLoading } = useWaitForTransaction({
    hash: data?.hash,
  });

  return {
    stake: write,
    isLoading,
    hash: data?.hash,
  };
}

export function useClaimRewards() {
  const { write, data } = useContractWrite({
    address: CONTRACT_ADDRESSES.sepolia.RWAStaking,
    abi: [], // Import from generated ABI
    functionName: 'claimRewards',
  });

  const { isLoading } = useWaitForTransaction({
    hash: data?.hash,
  });

  return {
    claimRewards: write,
    isLoading,
    hash: data?.hash,
  };
}

export function useAllPools() {
  return useContractRead({
    address: CONTRACT_ADDRESSES.sepolia.RWAStaking,
    abi: [], // Import from generated ABI
    functionName: 'getAllPools',
  });
}

// ============================================================================
// Revenue Hooks
// ============================================================================

export function useRevenueStats() {
  return useContractRead({
    address: CONTRACT_ADDRESSES.sepolia.RWARevenue,
    abi: [], // Import from generated ABI
    functionName: 'getRevenueStats',
  });
}

// ============================================================================
// Token Hooks
// ============================================================================

export function useTokenBalance(tokenAddress: `0x${string}`, userAddress?: `0x${string}`) {
  return useContractRead({
    address: tokenAddress,
    abi: [], // ERC20 ABI
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    enabled: !!userAddress,
  });
}

export function useTokenAllowance(
  tokenAddress: `0x${string}`,
  owner?: `0x${string}`,
  spender?: `0x${string}`
) {
  return useContractRead({
    address: tokenAddress,
    abi: [], // ERC20 ABI
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    enabled: !!(owner && spender),
  });
}

export function useApproveToken() {
  const { write, data } = useContractWrite({
    abi: [], // ERC20 ABI
    functionName: 'approve',
  });

  const { isLoading } = useWaitForTransaction({
    hash: data?.hash,
  });

  return {
    approve: write,
    isLoading,
    hash: data?.hash,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

export function useContractAddress(contractName: keyof typeof CONTRACT_ADDRESSES.sepolia) {
  return CONTRACT_ADDRESSES.sepolia[contractName];
}

export function useNetworkConfig() {
  return {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://rpc.sepolia.org',
    blockExplorer: 'https://sepolia.etherscan.io',
  };
}
