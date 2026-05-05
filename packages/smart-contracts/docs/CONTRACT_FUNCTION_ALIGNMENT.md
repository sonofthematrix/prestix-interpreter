# Contract Function Alignment Summary

## Overview
This document summarizes the alignment of test cases with actual contract function signatures.

## RWARewardDistributor Contract Functions

### ✅ Actual Functions (Available)
- `pause()` / `unpause()` - Pause/unpause contract
- `emergencyWithdraw(address token, uint256 amount)` - Emergency withdrawal to treasury
- `addRewards(uint256 amount, string memory source)` - Add rewards to pool
- `distributeRewards(uint256 amount)` - Distribute rewards to staking contract
- `collectMarketplaceFees(uint256 amount)` - Collect marketplace fees
- `collectPropertyDividends(uint256 amount)` - Collect property dividends
- `distributePropertyRevenue(uint256 amount)` - Distribute property revenue
- `getAvailableBalance()` - Get available token balance
- `getRewardPoolStats()` - Get reward pool statistics
- `updateAddresses(address _rwaStaking, address _rwaRevenue, address _treasury)` - Update contract addresses
- `initialize(address _rwaStaking, address _rwaRevenue, address _treasury)` - Initialize contract (for proxy)

### ❌ Non-Existent Functions (Removed from Tests)
- `enableEmergencyMode()` / `disableEmergencyMode()` / `emergencyMode()` - Don't exist
- `approveERC20()` / `batchApproveERC20()` - Don't exist
- `emergencyTransfer()` - Should use `emergencyWithdraw()` instead
- `setAllowanceThreshold()` - Doesn't exist
- `__RewardDistributor_init()` - Should use constructor or `initialize()`

## RWARevenue Contract Functions

### ✅ Actual Functions (Available)
- `initialize(address _rwaStaking)` - Initialize with staking address
- `allocateRevenue(uint256 poolId, uint256 amount, string memory source)` - Allocate revenue to pool
- `distributeRevenue(uint256 poolId, uint256 amount)` - Distribute revenue to stakers
- `receivePropertyDividends(uint256 amount)` - Receive property dividends
- `receiveMarketplaceFees(uint256 amount)` - Receive marketplace fees
- `receiveStakingRewards(uint256 amount)` - Receive staking rewards
- `distributeMarketplaceFees(uint256 totalAmount)` - Distribute marketplace fees
- `getPoolRevenueStats(uint256 poolId)` - Get pool revenue statistics
- `getRevenueStats()` - Get overall revenue statistics
- `updateAddresses(address _rwaStaking, address _rewardDistributor)` - Update addresses
- `pause()` / `unpause()` - Pause/unpause contract

### ❌ Non-Existent Functions (Removed from Tests)
- `__RWARevenue_init()` - Should use `initialize()` instead
- `emergencyMode()` / `setEmergencyMode()` - Don't exist
- `kageAllocateRevenue()` - Should use `allocateRevenue()` instead
- `kageEmergencyAllocateRevenue()` - Doesn't exist
- `setTreasury()` / `setTigerMulti()` - Don't exist
- `setMaxBatchSize()` - Doesn't exist
- `setCircuitBreakerThreshold()` - Doesn't exist
- `kagePause()` / `kageUnpause()` - Should use `pause()` / `unpause()` instead

## RWAStaking Contract Functions

### ✅ Actual Functions (Available)
- `createPool(string memory name, uint256 duration, uint256 multiplier)` - Create new pool
- `stake(uint256 poolId, uint256 amount)` - Stake tokens in pool
- `claimRewards(uint256 stakeId)` - Claim rewards for a stake
- `getUserStake(address user, uint256 stakeId)` - Get user stake info
- `getUserStakes(address user)` - Get all user stakes
- `getPendingRewards(address user, uint256 stakeId)` - Get pending rewards
- `getPool(uint256 poolId)` - Get pool information
- `getAllPools()` - Get all pools
- `updatePoolConfig(uint256 poolId, bool active, uint256 multiplier)` - Update pool config
- `distributeRewards(uint256 poolId, uint256 amount)` - Distribute rewards to pool
- `getStats()` - Get contract statistics
- `updateAddresses(address _rwaRevenue, address _rewardDistributor)` - Update addresses
- `pause()` / `unpause()` - Pause/unpause contract

### Properties (Not Functions)
- `tokenizinToken` - Token address (property, not function)
- `rwaRevenueAddress` - Revenue address (property, not function)
- `rewardDistributorAddress` - Reward distributor address (property, not function)

### ❌ Non-Existent Functions (Removed from Tests)
- `poolInfo()` - Should use `getPool()` instead
- `kageGetTierCount()` / `kageGetTierConfig()` - Don't exist (no tier system)
- `kageGetUserStakesInPool()` - Should use `getUserStakes()` and filter
- `kageGetIndividualStakeInfo()` - Should use `getUserStake()` instead
- `kageCreatePool()` - Should use `createPool()` instead
- `kagePause()` / `kageUnpause()` - Should use `pause()` / `unpause()` instead
- `rwaAcceptedToken()` - Compatibility wrapper maps to `tokenizinToken` property
- `initialize()` - RWAStaking uses constructor, not initialize (unless upgradeable version)

## Deployment Patterns

### RWARewardDistributor
```solidity
// Constructor parameters
constructor(
    address _tigerPalaceToken,
    address _treasury,
    uint256 _initialRewardPool
)

// OR for proxy deployment
function initialize(
    address _rwaStaking,
    address _rwaRevenue,
    address _treasury
) external onlyRole(DEFAULT_ADMIN_ROLE)
```

### RWARevenue
```solidity
// Constructor parameters
constructor(
    address _tigerPalaceToken,
    address _rewardDistributor
)

// Initialize for proxy
function initialize(address _rwaStaking) external onlyRole(DEFAULT_ADMIN_ROLE)
```

### RWAStaking
```solidity
// Constructor parameters (no initialize function in base contract)
constructor(
    address _tigerPalaceToken,
    address _rwaRevenue,
    address _rewardDistributor
)
```

## Test File Updates

### ✅ Fixed Files
1. `test/reward-distributor-error-emergency-tests.spec.ts` - Updated to use actual functions
2. `test/simple-error-emergency-tests.spec.ts` - Needs update (see below)

### 🔄 Files Needing Updates
1. `test/simple-error-emergency-tests.spec.ts` - Many incorrect function calls
2. `test/failing-test-2-partial-withdrawals.spec.ts` - Uses `poolInfo()`, `kageGetTierCount()`, etc.
3. Other test files using `kage*` or incorrect function names

## Compatibility Wrapper

The `contract-compatibility.ts` wrapper provides backward compatibility for legacy function names:
- `kage*` → `rwa*` → actual contract API
- `rwaAcceptedToken()` → `tokenizinToken` property
- `rwaCreatePool()` → `createPool()` with correct parameters

## Next Steps

1. Update `simple-error-emergency-tests.spec.ts` to use correct functions
2. Review and update other test files with incorrect function calls
3. Ensure all tests use typed parameters matching contract signatures
4. Verify compatibility wrapper covers all legacy function names

