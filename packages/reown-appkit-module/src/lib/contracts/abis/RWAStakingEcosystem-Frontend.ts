/**
 * RWAStakingEcosystem-Frontend ABI
 * Auto-generated from smart-contracts/abis/frontend/RWAStakingEcosystem-Frontend.json
 * DO NOT EDIT MANUALLY - This file is auto-generated
 */

export default {
  abi: {
  "name": "RWAStakingEcosystem",
  "network": "unknown",
  "chainId": 0,
  "deployedAt": "2025-10-31T16:41:03.232Z",
  "contracts": [
    {
      "name": "TigerPalaceToken",
      "address": "0x0000000000000000000000000000000000000000",
      "abi": [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
        "function transfer(address, uint256) returns (bool)",
        "function transferFrom(address, address, uint256) returns (bool)",
        "function approve(address, uint256) returns (bool)",
        "function allowance(address, address) view returns (uint256)",
        "function buyTax() view returns (uint256)",
        "function sellTax() view returns (uint256)",
        "function treasuryAddress() view returns (address)",
        "function rewardDistributorAddress() view returns (address)",
        "function isExemptFromTax(address) view returns (bool)",
        "function isExemptFromMaxWallet(address) view returns (bool)",
        "function convertPropertyRevenueToRewards(uint256)",
        "event Transfer(address indexed from, address indexed to, uint256 value)",
        "event Approval(address indexed owner, address indexed spender, uint256 value)",
        "event TaxUpdated(uint256 buyTax, uint256 sellTax)",
        "event RevenueConverted(uint256 amount, address to)"
      ]
    },
    {
      "name": "RWARewardDistributor",
      "address": "0x0000000000000000000000000000000000000000",
      "abi": [
        "function tokenizinToken() view returns (address)",
        "function rwaStakingAddress() view returns (address)",
        "function rwaRevenueAddress() view returns (address)",
        "function treasuryAddress() view returns (address)",
        "function totalRewardPool() view returns (uint256)",
        "function distributedRewards() view returns (uint256)",
        "function pendingRewards() view returns (uint256)",
        "function addRewards(uint256, string)",
        "function distributeRewards(uint256)",
        "function collectMarketplaceFees(uint256)",
        "function collectPropertyDividends(uint256)",
        "function distributePropertyRevenue(uint256)",
        "function getAvailableBalance() view returns (uint256)",
        "function getRewardPoolStats() view returns (uint256, uint256, uint256, uint256, uint256, uint256)",
        "function pause()",
        "function unpause()",
        "function paused() view returns (bool)",
        "event RewardsAdded(uint256 amount, string source)",
        "event RewardsDistributed(uint256 amount, address to)",
        "event RevenueCollected(uint256 amount, string source)"
      ]
    },
    {
      "name": "RWARevenue",
      "address": "0x0000000000000000000000000000000000000000",
      "abi": [
        "function tokenizinToken() view returns (address)",
        "function rwaStakingAddress() view returns (address)",
        "function rewardDistributorAddress() view returns (address)",
        "function totalRevenueAllocated() view returns (uint256)",
        "function totalRevenueDistributed() view returns (uint256)",
        "function pendingRevenue() view returns (uint256)",
        "function allocateRevenue(uint256, uint256, string)",
        "function distributeRevenue(uint256, uint256)",
        "function receivePropertyDividends(uint256)",
        "function receiveMarketplaceFees(uint256)",
        "function receiveStakingRewards(uint256)",
        "function distributeMarketplaceFees(uint256)",
        "function getPoolRevenueStats(uint256) view returns (uint256, uint256, uint256)",
        "function getRevenueStats() view returns (uint256, uint256, uint256, uint256, uint256, uint256)",
        "function pause()",
        "function unpause()",
        "function paused() view returns (bool)",
        "event RevenueAllocated(uint256 poolId, uint256 amount, string source)",
        "event RevenueDistributed(uint256 poolId, uint256 amount)",
        "event PropertyDividendsReceived(uint256 amount)",
        "event MarketplaceFeesReceived(uint256 amount)"
      ]
    },
    {
      "name": "RWAStaking",
      "address": "0x0000000000000000000000000000000000000000",
      "abi": [
        "function tokenizinToken() view returns (address)",
        "function rwaRevenueAddress() view returns (address)",
        "function rewardDistributorAddress() view returns (address)",
        "function nextPoolId() view returns (uint256)",
        "function totalStaked() view returns (uint256)",
        "function totalRewardsDistributed() view returns (uint256)",
        "function pools(uint256) view returns (uint256, string, uint256, uint256, bool, uint256, uint256)",
        "function userStakes(address, uint256) view returns (uint256, uint256, uint256, uint256, bool, uint256)",
        "function createPool(string, uint256, uint256) returns (uint256)",
        "function stake(uint256, uint256)",
        "function claimRewards(uint256)",
        "function getUserStake(address, uint256) view returns (tuple(uint256, uint256, uint256, uint256, bool, uint256))",
        "function getUserStakes(address) view returns (tuple(uint256, uint256, uint256, uint256, bool, uint256)[])",
        "function getPendingRewards(address, uint256) view returns (uint256)",
        "function getPool(uint256) view returns (tuple(uint256, string, uint256, uint256, bool, uint256, uint256))",
        "function getAllPools() view returns (tuple(uint256, string, uint256, uint256, bool, uint256, uint256)[])",
        "function updatePoolConfig(uint256, bool, uint256)",
        "function distributeRewards(uint256, uint256)",
        "function getStats() view returns (uint256, uint256, uint256)",
        "function pause()",
        "function unpause()",
        "function paused() view returns (bool)",
        "event PoolCreated(uint256 poolId, string name, uint256 duration, uint256 multiplier)",
        "event StakeCreated(address indexed user, uint256 stakeId, uint256 poolId, uint256 amount, uint256 duration)",
        "event StakeClaimed(address indexed user, uint256 stakeId, uint256 amount, uint256 rewards)",
        "event RewardsDistributed(uint256 poolId, uint256 amount)"
      ]
    }
  ]
},
} as const;
