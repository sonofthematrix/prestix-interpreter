# Test Files Function Call Fixes Summary

## Critical Function Replacements Required

### 1. Staking Functions
- `createUserStake(poolId, amount)` → `stake(poolId, amount)`
- `userWithdraw(poolId, stakeId, amount)` → `claimRewards(stakeId)` (requires stake maturity)
- `kageCreatePool(...)` → `createPool(name, duration, multiplier)`
- `rwaCreatePool(...)` → `createPool(name, duration, multiplier)`

### 2. Pool Management Functions
- `kagePoolLength()` → `getStats()` returns tuple `[totalStaked, totalRewardsDistributed, poolCount]`
- `kagePoolInfo(poolId)` → `getPool(poolId)`
- `rwaPoolInfo(poolId)` → `getPool(poolId)`
- `kageTotalStaked(poolId)` → Use `getPool(poolId).totalStaked`
- `rwaTotalStaked(poolId)` → Use `getPool(poolId).totalStaked`

### 3. Token Functions
- `setExcludedFromFee(address, bool)` → `setTaxExemption(address, bool)`
- `multisend(...)` → `transfer(...)` (with `setMaxWalletExemption` first)

### 4. Emergency Functions
- `rwaPause()` → `pause()`
- `rwaUnpause()` → `unpause()`

### 5. Removed Functions (Tests Should Be Removed/Skipped)
- `rwaSetRewardDistributor()` → Use `updateAddresses()` instead
- `rwaSetTreasury()` → Use `updateAddresses()` instead
- `addTierConfig()` → Tier system removed
- `rwaUpdateTierConfig()` → Tier system removed
- `rwaAllocateRevenue()` → Revenue allocation handled by RWARevenue contract
- `rwaClaimRevenue()` → Revenue claiming handled differently
- `rwaGetPendingRevenue()` → Use `getPendingRewards(user, stakeId)` instead
- `rwaGetUserTotalStaked()` → Use `getUserStakes(user)` and sum
- `rwaGetUserStakesInPool()` → Use `getUserStakes(user)` and filter by poolId
- `rwaGetStakersPaginated()` → Not available, use `getAllPools()` and iterate
- `rwaGetTotalWeightedStakes()` → Not available
- `rwaGetUserWeightedStake()` → Not available
- `rwaGetPoolStakers()` → Not available
- `rwaGetIndividualStakeInfo()` → Use `getUserStake(user, stakeId)` instead
- `rwaValidatePoolState()` → Not available
- `rwaClaimIndividualStakeRewards()` → Use `claimRewards(stakeId)` instead
- `rwaGetTierCount()` → Tier system removed
- `rwaGetTierConfig()` → Tier system removed
- `rwaGetAllTierConfigs()` → Tier system removed
- `updatePool(...)` → Use `updatePoolConfig(poolId, active, multiplier)` instead
- `approveERC20()` → RWARewardDistributor doesn't have this, use standard IERC20 approve

### 6. Constructor Signatures

#### TigerPalaceToken
```typescript
// ❌ OLD
await TigerPalaceToken.deploy(
  deployer.address,
  deployer.address,
  { buyTax: 500, sellTax: 500, ... },
  taxWallets
);

// ✅ NEW
await TigerPalaceToken.deploy(
  deployer.address, // owner
  treasury.address, // treasury
  parseEther("1000000") // initial supply
);
```

#### RWAStaking
```typescript
// ❌ OLD (proxy pattern with initialize)
const impl = await RWAStaking.deploy();
const proxy = await TransparentProxy.deploy(...);
await staking.initialize(...);

// ✅ NEW (direct deployment with constructor)
await RWAStaking.deploy(
  await tokenizinToken.getAddress(),
  await rwaRevenue.getAddress(),
  await rewardDistributor.getAddress()
);
```

#### RWARewardDistributor
```typescript
// ❌ OLD (proxy pattern)
const impl = await RWARewardDistributor.deploy();
await distributor.initialize(...);

// ✅ NEW (direct deployment with constructor)
await RWARewardDistributor.deploy(
  await tokenizinToken.getAddress(),
  treasury.address,
  parseEther("1000") // initial reward pool
);
```

#### RWARevenue
```typescript
// ❌ OLD (proxy pattern)
const impl = await RWARevenue.deploy();
await revenue.initialize(...);

// ✅ NEW (direct deployment with constructor)
await RWARevenue.deploy(
  await tokenizinToken.getAddress(),
  await rewardDistributor.getAddress()
);
// Then initialize separately:
await rwaRevenue.initialize(await TigerStaking.getAddress());
```

### 7. Property Access Patterns
```typescript
// ❌ OLD
const address = contract.address;
const token = staking.tokenizinToken();

// ✅ NEW
const address = await contract.getAddress();
const token = staking.tokenizinToken; // Direct property access
```

### 8. getStats() Tuple Destructuring
```typescript
// ✅ CORRECT
const [totalStaked, totalRewardsDistributed, poolCount] = await TigerStaking.getStats();
```

### 9. Pool Creation Parameters
```typescript
// ✅ CORRECT
await TigerStaking.createPool(
  "Pool Name",      // string name
  86400,            // uint256 duration (in seconds, must be > 0)
  12000             // uint256 multiplier (in basis points, must be >= 10000)
);
```

### 10. Stake Maturity Requirement
```typescript
// ✅ CORRECT - Must wait for stake to mature before claiming
const stakeId = 0;
const userStake = await TigerStaking.getUserStake(user.address, stakeId);

// Advance time so stake matures
const currentTime = await time.latest();
const endTime = Number(userStake.endTime);
if (currentTime < endTime) {
  const timeNeeded = endTime - currentTime + 1;
  await time.increase(timeNeeded);
}

// Now can claim rewards
await TigerStaking.connect(user).claimRewards(stakeId);
```

### 11. Max Wallet Exemptions (Required Before Transfers)
```typescript
// ✅ REQUIRED before any transfers
await tokenizinToken.setMaxWalletExemption(contractAddress, true);
await tokenizinToken.setTaxExemption(contractAddress, true);
```

## Files Requiring Fixes

### High Priority
1. `test/tiger-staking-error-emergency-tests.spec.ts` - Many outdated function calls
2. `test/ecosystem-integration.spec.ts` - Wrong deployment pattern, outdated functions
3. `test/realistic-production-scenarios.spec.ts` - Outdated function calls
4. `test/simple-error-emergency-tests.spec.ts` - Outdated function calls
5. `test/failing-test-1-duration-tiers.spec.ts` - Tier system removed

### Medium Priority
6. `test/failing-test-2-partial-withdrawals.spec.ts` - Partial withdrawals not supported
7. `test/failing-test-4-cross-pool.spec.ts` - May need updates
8. `test/tiger-staking-refactored.spec.ts` - Needs validation
9. `test/tiger-unified-staking-enhanced.spec.ts` - Needs validation
10. `test/advanced-revenue-allocation.spec.ts` - May need updates

## Next Steps

1. Fix deployment patterns in all test files
2. Replace all function calls with correct names
3. Remove/skip tests for removed functionality
4. Update constructor calls
5. Add max wallet exemptions where needed
6. Fix stake maturity checks before claimRewards calls

