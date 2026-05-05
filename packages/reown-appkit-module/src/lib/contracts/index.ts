/**
 * Contract Services Index
 * Centralized exports for all contract services
 */

export { RWAMarketplaceService, getMarketplaceService } from './marketplace-service';
export type { MarketplaceConfig, ListingData, PurchaseCost } from './marketplace-service';

export { RWAStakingService, getStakingService } from './staking-service';
export type { PoolData, UserStake, StakingStats } from './staking-service';

export { RWARevenueService, getRevenueService } from './revenue-service';
export type { RevenueStats, PoolRevenueStats } from './revenue-service';

export { RWARewardDistributorService, getRewardDistributorService } from './reward-distributor-service';
export type { RewardPoolStats } from './reward-distributor-service';

export { TigerPalaceTokenService, getTokenService } from './token-service';
export type { TokenInfo, TokenBalance, TaxInfo } from './token-service';

// Re-export contract addresses
export { default as contractAddresses } from './abis/contract-addresses';

