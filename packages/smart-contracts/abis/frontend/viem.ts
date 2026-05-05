// Tiger Palace RWA Ecosystem - Viem Integration
// Auto-generated for sepolia network
// Generated: 2025-11-30T01:40:05.434Z

import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { sepolia } from 'viem/chains';
import { CONTRACT_ADDRESSES } from './contracts';

// ============================================================================
// Viem Client Setup
// ============================================================================

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://rpc.sepolia.org'),
});

export function createWalletClient(privateKey: `0x${string}`) {
  return createWalletClient({
    chain: sepolia,
    transport: http('https://rpc.sepolia.org'),
    account: privateKey,
  });
}

// ============================================================================
// Contract Instances
// ============================================================================


// ProxyAdmin
export const ProxyAdminContract = {
  address: CONTRACT_ADDRESSES.sepolia.ProxyAdmin as Address,
  abi: [], // Import ABI from generated JSON files
} as const;


// RWAAssetRegistry
export const RWAAssetRegistryContract = {
  address: CONTRACT_ADDRESSES.sepolia.RWAAssetRegistry as Address,
  abi: [], // Import ABI from generated JSON files
} as const;


// RWATokenFactory
export const RWATokenFactoryContract = {
  address: CONTRACT_ADDRESSES.sepolia.RWATokenFactory as Address,
  abi: [], // Import ABI from generated JSON files
} as const;


// RWATokenFactory404
export const RWATokenFactory404Contract = {
  address: CONTRACT_ADDRESSES.sepolia.RWATokenFactory404 as Address,
  abi: [], // Import ABI from generated JSON files
} as const;


// RWAMarketplace
export const RWAMarketplaceContract = {
  address: CONTRACT_ADDRESSES.sepolia.RWAMarketplace as Address,
  abi: [], // Import ABI from generated JSON files
} as const;


// RWAStaking
export const RWAStakingContract = {
  address: CONTRACT_ADDRESSES.sepolia.RWAStaking as Address,
  abi: [], // Import ABI from generated JSON files
} as const;


// RWARewardDistributor
export const RWARewardDistributorContract = {
  address: CONTRACT_ADDRESSES.sepolia.RWARewardDistributor as Address,
  abi: [], // Import ABI from generated JSON files
} as const;


// RWARevenue
export const RWARevenueContract = {
  address: CONTRACT_ADDRESSES.sepolia.RWARevenue as Address,
  abi: [], // Import ABI from generated JSON files
} as const;


// MembershipSystem
export const MembershipSystemContract = {
  address: CONTRACT_ADDRESSES.sepolia.MembershipSystem as Address,
  abi: [], // Import ABI from generated JSON files
} as const;


// RWAAssetRegistry_Implementation
export const RWAAssetRegistry_ImplementationContract = {
  address: CONTRACT_ADDRESSES.sepolia.RWAAssetRegistry_Implementation as Address,
  abi: [], // Import ABI from generated JSON files
} as const;


// RWATokenFactory_Implementation
export const RWATokenFactory_ImplementationContract = {
  address: CONTRACT_ADDRESSES.sepolia.RWATokenFactory_Implementation as Address,
  abi: [], // Import ABI from generated JSON files
} as const;


// RWAMarketplace_Implementation
export const RWAMarketplace_ImplementationContract = {
  address: CONTRACT_ADDRESSES.sepolia.RWAMarketplace_Implementation as Address,
  abi: [], // Import ABI from generated JSON files
} as const;


// RWAStaking_Implementation
export const RWAStaking_ImplementationContract = {
  address: CONTRACT_ADDRESSES.sepolia.RWAStaking_Implementation as Address,
  abi: [], // Import ABI from generated JSON files
} as const;


// MembershipSystem_Implementation
export const MembershipSystem_ImplementationContract = {
  address: CONTRACT_ADDRESSES.sepolia.MembershipSystem_Implementation as Address,
  abi: [], // Import ABI from generated JSON files
} as const;


// ============================================================================
// Read Functions
// ============================================================================

export async function getAsset(assetId: bigint) {
  return await publicClient.readContract({
    ...RWAAssetRegistryContract,
    functionName: 'getAsset',
    args: [assetId],
  });
}

export async function getUserStakes(userAddress: Address) {
  return await publicClient.readContract({
    ...RWAStakingContract,
    functionName: 'getUserStakes',
    args: [userAddress],
  });
}

export async function getAllPools() {
  return await publicClient.readContract({
    ...RWAStakingContract,
    functionName: 'getAllPools',
  });
}

export async function getTokenBalance(tokenAddress: Address, userAddress: Address) {
  return await publicClient.readContract({
    address: tokenAddress,
    abi: [], // ERC20 ABI
    functionName: 'balanceOf',
    args: [userAddress],
  });
}

export async function getRevenueStats() {
  return await publicClient.readContract({
    ...RWARevenueContract,
    functionName: 'getRevenueStats',
  });
}

// ============================================================================
// Write Functions (requires wallet client)
// ============================================================================

export async function stake(walletClient: any, poolId: bigint, amount: bigint) {
  const { request } = await publicClient.simulateContract({
    ...RWAStakingContract,
    functionName: 'stake',
    args: [poolId, amount],
    account: walletClient.account,
  });

  return await walletClient.writeContract(request);
}

export async function buyTokens(walletClient: any, assetId: bigint, amount: bigint, value: bigint) {
  const { request } = await publicClient.simulateContract({
    ...RWAMarketplaceContract,
    functionName: 'buyTokens',
    args: [assetId, amount],
    value,
    account: walletClient.account,
  });

  return await walletClient.writeContract(request);
}

export async function approveToken(walletClient: any, tokenAddress: Address, spender: Address, amount: bigint) {
  const { request } = await publicClient.simulateContract({
    address: tokenAddress,
    abi: [], // ERC20 ABI
    functionName: 'approve',
    args: [spender, amount],
    account: walletClient.account,
  });

  return await walletClient.writeContract(request);
}

export async function claimRewards(walletClient: any, stakeId: bigint) {
  const { request } = await publicClient.simulateContract({
    ...RWAStakingContract,
    functionName: 'claimRewards',
    args: [stakeId],
    account: walletClient.account,
  });

  return await walletClient.writeContract(request);
}

// ============================================================================
// Event Listeners
// ============================================================================

export function watchStakingEvents(onEvent: (event: any) => void) {
  return publicClient.watchContractEvent({
    ...RWAStakingContract,
    eventName: 'Staked',
    onLogs: (logs) => {
      logs.forEach((log) => onEvent(log));
    },
  });
}

export function watchMarketplaceEvents(onEvent: (event: any) => void) {
  return publicClient.watchContractEvent({
    ...RWAMarketplaceContract,
    eventName: 'TokensPurchased',
    onLogs: (logs) => {
      logs.forEach((log) => onEvent(log));
    },
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

export async function getBlockNumber() {
  return await publicClient.getBlockNumber();
}

export async function getGasPrice() {
  return await publicClient.getGasPrice();
}

export async function estimateGas(tx: any) {
  return await publicClient.estimateGas(tx);
}
