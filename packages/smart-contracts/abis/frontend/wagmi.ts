// Tiger Palace RWA Ecosystem - Wagmi Integration
// Auto-generated for sepolia network
// Generated: 2025-11-30T01:40:05.435Z

import { useContractRead, useContractWrite, useWaitForTransaction, usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESSES } from './contracts';

// ============================================================================
// Custom Hooks for RWA Ecosystem
// ============================================================================

export function useAssetRegistry() {
  const publicClient = usePublicClient();

  const getAsset = (assetId: bigint) => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.sepolia.RWAAssetRegistry,
      abi: [], // Import from generated ABI
      functionName: 'getAsset',
      args: [assetId],
      enabled: !!assetId,
    });
  };

  const registerAsset = () => {
    const { write, data } = useContractWrite({
      address: CONTRACT_ADDRESSES.sepolia.RWAAssetRegistry,
      abi: [], // Import from generated ABI
      functionName: 'registerAsset',
    });

    const { isLoading } = useWaitForTransaction({
      hash: data?.hash,
    });

    return { registerAsset: write, isLoading, hash: data?.hash };
  };

  return { getAsset, registerAsset };
}

export function useMarketplace() {
  const buyTokens = () => {
    const { write, data } = useContractWrite({
      address: CONTRACT_ADDRESSES.sepolia.RWAMarketplace,
      abi: [], // Import from generated ABI
      functionName: 'buyTokens',
    });

    const { isLoading } = useWaitForTransaction({
      hash: data?.hash,
    });

    return { buyTokens: write, isLoading, hash: data?.hash };
  };

  const sellTokens = () => {
    const { write, data } = useContractWrite({
      address: CONTRACT_ADDRESSES.sepolia.RWAMarketplace,
      abi: [], // Import from generated ABI
      functionName: 'sellTokens',
    });

    const { isLoading } = useWaitForTransaction({
      hash: data?.hash,
    });

    return { sellTokens: write, isLoading, hash: data?.hash };
  };

  return { buyTokens, sellTokens };
}

export function useStaking() {
  const getUserStakes = (userAddress?: `0x${string}`) => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.sepolia.RWAStaking,
      abi: [], // Import from generated ABI
      functionName: 'getUserStakes',
      args: userAddress ? [userAddress] : undefined,
      enabled: !!userAddress,
    });
  };

  const getAllPools = () => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.sepolia.RWAStaking,
      abi: [], // Import from generated ABI
      functionName: 'getAllPools',
    });
  };

  const stake = () => {
    const { write, data } = useContractWrite({
      address: CONTRACT_ADDRESSES.sepolia.RWAStaking,
      abi: [], // Import from generated ABI
      functionName: 'stake',
    });

    const { isLoading } = useWaitForTransaction({
      hash: data?.hash,
    });

    return { stake: write, isLoading, hash: data?.hash };
  };

  const claimRewards = () => {
    const { write, data } = useContractWrite({
      address: CONTRACT_ADDRESSES.sepolia.RWAStaking,
      abi: [], // Import from generated ABI
      functionName: 'claimRewards',
    });

    const { isLoading } = useWaitForTransaction({
      hash: data?.hash,
    });

    return { claimRewards: write, isLoading, hash: data?.hash };
  };

  return { getUserStakes, getAllPools, stake, claimRewards };
}

export function useRevenue() {
  const getRevenueStats = () => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.sepolia.RWARevenue,
      abi: [], // Import from generated ABI
      functionName: 'getRevenueStats',
    });
  };

  return { getRevenueStats };
}

export function useToken(tokenAddress?: `0x${string}`) {
  const getBalance = (userAddress?: `0x${string}`) => {
    return useContractRead({
      address: tokenAddress,
      abi: [], // ERC20 ABI
      functionName: 'balanceOf',
      args: userAddress ? [userAddress] : undefined,
      enabled: !!(tokenAddress && userAddress),
    });
  };

  const getAllowance = (owner?: `0x${string}`, spender?: `0x${string}`) => {
    return useContractRead({
      address: tokenAddress,
      abi: [], // ERC20 ABI
      functionName: 'allowance',
      args: owner && spender ? [owner, spender] : undefined,
      enabled: !!(tokenAddress && owner && spender),
    });
  };

  const approve = () => {
    const { write, data } = useContractWrite({
      address: tokenAddress,
      abi: [], // ERC20 ABI
      functionName: 'approve',
    });

    const { isLoading } = useWaitForTransaction({
      hash: data?.hash,
    });

    return { approve: write, isLoading, hash: data?.hash };
  };

  return { getBalance, getAllowance, approve };
}

// ============================================================================
// Configuration
// ============================================================================

export const wagmiConfig = {
  chains: [sepolia],
  connectors: [
    // Add your connectors here
  ],
  publicClient: ({ chainId }) => {
    if (chainId === 11155111) {
      return createPublicClient({
        chain: sepolia,
        transport: http('https://rpc.sepolia.org'),
      });
    }
    throw new Error(`Unsupported chainId: ${chainId}`);
  },
};

// ============================================================================
// Types
// ============================================================================

export interface Asset {
  id: bigint;
  owner: `0x${string}`;
  title: string;
  description: string;
  assetType: string;
  location: string;
  price: bigint;
  tokenPrice: bigint;
  totalTokens: bigint;
  availableTokens: bigint;
  soldTokens: bigint;
  status: number;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface Pool {
  poolId: bigint;
  name: string;
  duration: bigint;
  multiplier: bigint;
  active: boolean;
  totalStaked: bigint;
  totalRewards: bigint;
}

export interface UserStake {
  stakeId: bigint;
  poolId: bigint;
  amount: bigint;
  startTime: bigint;
  endTime: bigint;
  claimed: boolean;
  rewards: bigint;
}
