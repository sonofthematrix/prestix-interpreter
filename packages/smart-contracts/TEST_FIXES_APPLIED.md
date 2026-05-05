# Test File Fixes Applied

## Summary

Fixed critical test files with common issues:

### 1. core-contracts-focused.spec.ts ✅
- Fixed pool IDs: 0 → 1
- Fixed function calls: `rwaCreatePool` → `createPool`, `rwaPause` → `pause`, etc.
- Added access control: `.connect(deployer)` for admin functions
- Fixed `rwaGetPendingRevenue` usage

### 2. simple-staking-test.spec.ts ✅
- Fixed pool IDs: 0 → 1
- Fixed `rwaCreatePool` → `createPool` with correct parameters
- Added `.connect(deployer)` for pool creation
- Updated all pool references

### 3. failing-test-2-partial-withdrawals.spec.ts ⚠️
**Note**: This file tests partial withdrawals, but RWAStaking only supports full `claimRewards()` after maturity. Many tests need to be skipped or rewritten.

**Required fixes:**
- `defaultPoolId` should be 1 (from fixture)
- `userWithdraw()` → `claimRewards(stakeId)` (but requires maturity)
- `kageGetIndividualStakeInfo(user, poolId, stakeId)` → `getUserStake(user, stakeId)`
- `poolInfo(poolId)` → `getPool(poolId)`
- `kageGetUserStakesInPool(user, poolId)` returns array, not object with `totalUserStaked`/`activeStakes`

## Remaining Files to Fix

### High Priority:
1. `failing-test-2-partial-withdrawals.spec.ts` - Needs manual fixes (partial withdrawals don't exist)
2. `failing-test-4-cross-pool.spec.ts` - Pool ID fixes needed
3. `realistic-production-scenarios.spec.ts` - Multiple function fixes needed
4. `tiger-revenue-enhanced-coverage.spec.ts` - Function name fixes

### Medium Priority:
5. `comprehensive-revenue-tier-testing.spec.ts`
6. `revenue-distribution-tier-testing.spec.ts`
7. `ecosystem-integration.spec.ts`
8. `proxy-staking-example.spec.ts`

## Common Fix Patterns

### Pool ID Fixes:
```typescript
// Before
const poolId = 0;
await TigerStaking.stake(0, amount);

// After
const poolId = 1; // First pool (pools start at ID 1)
await TigerStaking.stake(1, amount);
```

### Function Name Fixes:
```typescript
// Before
await TigerStaking.userWithdraw(poolId, stakeId, amount);
const info = await TigerStaking.kageGetIndividualStakeInfo(user, poolId, stakeId);
const pool = await TigerStaking.poolInfo(poolId);

// After
// Note: claimRewards requires stake maturity
await TigerStaking.claimRewards(stakeId);
const info = await TigerStaking.getUserStake(user, stakeId);
const pool = await TigerStaking.getPool(poolId);
```

### Access Control Fixes:
```typescript
// Before
await TigerStaking.createPool(...);
await TigerStaking.pause();

// After
await TigerStaking.connect(deployer).createPool(...);
await TigerStaking.connect(deployer).pause();
```

### createPool Parameter Fix:
```typescript
// Before
await TigerStaking.rwaCreatePool(
  ethers.parseEther("500"), // minStaked
  1500, // apy
  0, // penaltyRate
);

// After
await TigerStaking.connect(deployer).createPool(
  "Pool Name",
  30 * 24 * 60 * 60, // duration in seconds
  150000, // multiplier in basis points (1500% = 150000)
);
```

## Running the Fix Script

```bash
cd smart-contracts
bun run scripts/fix-test-files.ts
```

Or manually apply fixes using the patterns above.

