/**
 * RWARevenue ABI
 * Auto-generated from smart-contracts/abis/frontend/RWARevenue.json
 * DO NOT EDIT MANUALLY - This file is auto-generated
 */

export default {
  abi: {
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
  ],
  "network": "unknown",
  "chainId": 0,
  "deployedAt": "2025-10-31T16:41:03.232Z"
},
} as const;
