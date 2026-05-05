/**
 * RWAStaking ABI
 * Auto-generated from smart-contracts/abis/frontend/RWAStaking.json
 * DO NOT EDIT MANUALLY - This file is auto-generated
 */

export default {
  abi: {
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
  ],
  "network": "unknown",
  "chainId": 0,
  "deployedAt": "2025-10-31T16:41:03.232Z"
},
} as const;
