/**
 * RWARewardDistributor ABI
 * Auto-generated from smart-contracts/abis/frontend/RWARewardDistributor.json
 * DO NOT EDIT MANUALLY - This file is auto-generated
 */

export default {
  abi: {
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
  ],
  "network": "unknown",
  "chainId": 0,
  "deployedAt": "2025-10-31T16:41:03.232Z"
},
} as const;
