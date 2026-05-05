/**
 * RWA Contract Interfaces for Frontend DAPP Integration
 * Tiger Palace RWA Marketplace
 *
 * This file provides TypeScript interfaces and helper functions for interacting
 * with RWA smart contracts from the frontend DAPP.
 *
 * Auto-generated from deployment addresses for sepolia network
 * Generated: 2025-11-30T01:40:05.435Z
 */

import { Address } from 'viem';

// ============================================================================
// Contract Addresses
// ============================================================================

export const CONTRACT_ADDRESSES = {
  // Sepolia Testnet (current deployment)
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
  // Mainnet (to be deployed)
  mainnet: {
    ProxyAdmin: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update after mainnet deployment
    RWAAssetRegistry: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update after mainnet deployment
    RWATokenFactory: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update after mainnet deployment
    RWATokenFactory404: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update after mainnet deployment
    RWAMarketplace: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update after mainnet deployment
    RWAStaking: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update after mainnet deployment
    RWARewardDistributor: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update after mainnet deployment
    RWARevenue: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update after mainnet deployment
    MembershipSystem: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update after mainnet deployment
    RWAAssetRegistry_Implementation: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update after mainnet deployment
    RWATokenFactory_Implementation: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update after mainnet deployment
    RWAMarketplace_Implementation: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update after mainnet deployment
    RWAStaking_Implementation: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update after mainnet deployment
    MembershipSystem_Implementation: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update after mainnet deployment
  },
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

export interface RealEstateAsset {
  id: number;
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
  status: number; // 0=DRAFT, 1=ACTIVE, 2=SOLD
  createdAt: bigint;
  updatedAt: bigint;
}

export interface TokenInfo {
  assetId: number;
  tokenAddress: Address;
  name: string;
  symbol: string;
  totalSupply: bigint;
  isERC404: boolean;
  nftExists?: boolean;
  nftOwner?: Address;
  nftTokenId?: number;
}

export interface UserTokenBalance {
  assetId: number;
  tokenAddress: Address;
  balance: bigint;
  isNFT: boolean;
  nftTokenId?: number;
}

export interface PoolInfo {
  poolId: number;
  name: string;
  duration: bigint;
  multiplier: bigint; // Basis points (10000 = 100%)
  active: boolean;
  totalStaked: bigint;
  totalRewards: bigint;
}

export interface UserStake {
  stakeId: number;
  poolId: number;
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
// Contract ABIs (Complete - loaded from generated files)
// ============================================================================

// Import ABIs from generated files
import RWA_ASSET_REGISTRY_ABI from '../abis/frontend/RWAAssetRegistry_ABI.json';
import RWA_TOKEN_FACTORY_ABI from '../abis/frontend/RWATokenFactory_ABI.json';
import RWA_TOKEN_404_ABI from '../abis/frontend/RWATokenFactory404_ABI.json';
import RWA_MARKETPLACE_ABI from '../abis/frontend/RWAMarketplace_ABI.json';
import RWA_STAKING_ABI from '../abis/frontend/RWAStaking_ABI.json';
import RWA_REWARD_DISTRIBUTOR_ABI from '../abis/frontend/RWARewardDistributor_ABI.json';
import RWA_REVENUE_ABI from '../abis/frontend/RWARevenue_ABI.json';
import MEMBERSHIP_SYSTEM_ABI from '../abis/frontend/MembershipSystem_ABI.json';

export { RWA_ASSET_REGISTRY_ABI };
export { RWA_TOKEN_FACTORY_ABI };
export { RWA_TOKEN_404_ABI };
export { RWA_MARKETPLACE_ABI };
export { RWA_STAKING_ABI };
export { RWA_REWARD_DISTRIBUTOR_ABI };
export { RWA_REVENUE_ABI };
export { MEMBERSHIP_SYSTEM_ABI };

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0');
  return `${whole}.${fractionStr}`;
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
 * Check if user owns 100% of tokens (can convert to NFT)
 */
export async function canConvertToNFT(
  tokenAddress: Address,
  userAddress: Address,
  totalSupply: bigint
): Promise<boolean> {
  // This would use wagmi/viem to read contract
  // Implementation depends on your chosen library
  return false; // Placeholder
}

/**
 * Get token type (ERC20 or ERC-404)
 */
export async function getTokenType(tokenAddress: Address): Promise<'ERC20' | 'ERC404'> {
  // Check if token has ERC-404 functions
  // Implementation depends on your chosen library
  return 'ERC404'; // Placeholder
}

/**
 * Get contract address for current network
 */
export function getContractAddress(contractName: keyof typeof CONTRACT_ADDRESSES.sepolia): Address {
  return CONTRACT_ADDRESSES.sepolia[contractName];
}

/**
 * Check if running on supported network
 */
export function isSupportedNetwork(chainId: number): boolean {
  return chainId === 11155111; // sepolia chain ID
}

// ============================================================================
// Database Schema Alignment
// ============================================================================

/**
 * Sync contract data to database schema
 *
 * The RealEstateAsset model in schema.zmodel should include:
 * - assetId: Int? @unique (from RWAAssetRegistry)
 * - tokenAddress: String? (RWAToken contract address)
 * - nftTokenId: Int? (ERC-404 NFT token ID if converted)
 * - tokenizationStatus: TokenizationStatus
 * - isNFT: Boolean @default(false)
 * - nftOwner: String? (Current NFT owner address)
 * - contractAddress: String? (RWAToken contract address)
 * - isOnChain: Boolean @default(false)
 * - lastSyncedAt: DateTime?
 */

export interface DatabaseSyncData {
  assetId: number;
  tokenAddress: Address;
  tokenizationStatus: 'NOT_TOKENIZED' | 'PENDING_TOKENIZATION' | 'TOKENIZED' | 'NFT_CONVERTED' | 'BURNED';
  isNFT: boolean;
  nftOwner?: Address;
  nftTokenId?: number;
  lastSyncedAt: Date;
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
