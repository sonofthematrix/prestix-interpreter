// Tiger Palace RWA Ecosystem - TypeScript Definitions
// Auto-generated for sepolia network (Chain ID: 11155111)
// Generated: 2025-11-30T01:40:05.434Z

import type { Address } from 'viem';

// ============================================================================
// Contract Addresses
// ============================================================================

export const CONTRACT_ADDRESSES = {
  sepolia: {
    ProxyAdmin: '0x1345f35238117b075056EeeF8fBe5e6504c632EB' as Address,
    RWAAssetRegistry: '0xf499a41F3dAeC24dae0a4E40dC965dB89E28fb28' as Address,
    RWATokenFactory: '0x743b2C7A1F2e325A9785252d21F99097B76A5E61' as Address,
    RWATokenFactory404: '0x7a6f7dE826064903f2e419833b9633560217FEe2' as Address,
    RWAMarketplace: '0xB9bcC66DcE89F6c4bfb03ed8a9E6EF7d447F2061' as Address,
    RWAStaking: '0x0368F457abB189fa08f88B02CAD429a243f15dCe' as Address,
    RWARewardDistributor: '0xda46ff9382dFFb49261774c8C3B0c6Ac5fB7D694' as Address,
    RWARevenue: '0x9DD2B48cA9D7147C30830D3629fDA8C1976F74Db' as Address,
    MembershipSystem: '0xcb1017dd96C3F2C8FC74C0a558adA1FCD906A6d0' as Address,
    RWAAssetRegistry_Implementation: '0x1C2B5e0181667B68aBB9a5DA9D6C74e07986b42F' as Address,
    RWATokenFactory_Implementation: '0x6f5b2ceE7b2ed493a00Fd259b5CE070d1B4Ade39' as Address,
    RWAMarketplace_Implementation: '0x770AbBC3636433994439221028E087c44c0Bad8D' as Address,
    RWAStaking_Implementation: '0x288C50AD4De731579B155Ac47e072798E9Dd0Dd0' as Address,
    MembershipSystem_Implementation: '0xa9F75C649CEab9Ec70514EC4De1d9361eD43d3a7' as Address,
  },
} as const;

export type ContractAddresses = typeof CONTRACT_ADDRESSES.sepolia;

// ============================================================================
// Type Definitions
// ============================================================================

export interface Asset {
  id: bigint;
  owner: Address;
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

export interface TokenInfo {
  assetId: bigint;
  tokenAddress: Address;
  name: string;
  symbol: string;
  totalSupply: bigint;
  decimals: number;
  isERC404: boolean;
}

export interface PoolInfo {
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

export interface RewardStats {
  totalRewardPool: bigint;
  distributedRewards: bigint;
  pendingRewards: bigint;
  availableBalance: bigint;
}

export interface RevenueStats {
  totalAllocated: bigint;
  totalDistributed: bigint;
  pendingRevenue: bigint;
  marketplaceFees: bigint;
  propertyDividends: bigint;
}

// ============================================================================
// Event Types
// ============================================================================

export interface ContractEvents {
  // Asset Registry Events
  AssetRegistered: {
    assetId: bigint;
    owner: Address;
    title: string;
    price: bigint;
  };

  // Marketplace Events
  TokensPurchased: {
    buyer: Address;
    assetId: bigint;
    amount: bigint;
    totalPrice: bigint;
  };

  TokensSold: {
    seller: Address;
    assetId: bigint;
    amount: bigint;
    totalReceived: bigint;
  };

  // Staking Events
  Staked: {
    user: Address;
    poolId: bigint;
    amount: bigint;
    stakeId: bigint;
  };

  RewardsClaimed: {
    user: Address;
    stakeId: bigint;
    amount: bigint;
  };

  // Revenue Events
  RevenueAllocated: {
    poolId: bigint;
    amount: bigint;
    source: string;
  };

  RevenueDistributed: {
    poolId: bigint;
    amount: bigint;
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fractionStr ? `${whole}.${fractionStr}` : whole.toString();
}

/**
 * Parse token amount from string
 */
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const wholePart = BigInt(whole || '0') * BigInt(10 ** decimals);
  const fractionPart = BigInt((fraction.padEnd(decimals, '0')).slice(0, decimals));
  return wholePart + fractionPart;
}

/**
 * Check if address is a valid Ethereum address
 */
export function isValidAddress(address: string): address is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: Address, chars: number = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// ============================================================================
// Network Configuration
// ============================================================================

export const NETWORK_CONFIG = {
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://rpc.sepolia.org',
    blockExplorer: 'https://sepolia.etherscan.io',
    contracts: CONTRACT_ADDRESSES.sepolia,
  },
} as const;

export type NetworkConfig = typeof NETWORK_CONFIG.sepolia;
