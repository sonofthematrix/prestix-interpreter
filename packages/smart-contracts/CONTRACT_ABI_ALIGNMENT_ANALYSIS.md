# Contract ABI Alignment Analysis

## Summary

After reviewing the smart contracts and test files, I've identified several critical mismatches between contract ABIs and test function calls.

## Critical Issues Found

### 1. `claimRewards` Function Signature Mismatch

**Contract Signature** (RWAStaking.sol:174):
```solidity
function claimRewards(uint256 stakeId) external whenNotPaused nonReentrant
```

**Test Calls** (WRONG):
```typescript
await TigerStaking.claimRewards(poolId, stakeId, amount);  // 3 parameters
await TigerStaking.claimRewards(poolId, 0, 0);            // 3 parameters
```

**Correct Call**:
```typescript
await TigerStaking.claimRewards(stakeId);  // Only stakeId
```

**Affected Tests**:
- `failing-test-4-cross-pool.spec.ts` (lines 248, 285, 321, 461, 496)
- `revenue-distribution-tier-testing.spec.ts` (lines 472, 589)
- Multiple other test files

### 2. `getUserStake` Function Signature Mismatch

**Contract Signature** (RWAStaking.sol:210):
```solidity
function getUserStake(address user, uint256 stakeId) external view returns (UserStake memory)
```

**Test Calls** (WRONG):
```typescript
await TigerStaking.getUserStake(user, poolId, stakeId);  // 3 parameters
```

**Correct Call**:
```typescript
await TigerStaking.getUserStake(user, stakeId);  // Only user and stakeId
```

### 3. Non-Existent Functions Called

#### `kageGetPendingRevenue`
- **Status**: Does NOT exist in contract
- **Workaround**: Use `getPendingRewards(user, stakeId)` and sum for all stakes in pool
- **Affected**: Multiple test files

#### `kageGetUserStakesInPool`
- **Status**: Does NOT exist in contract
- **Workaround**: Use `getUserStakes(user)` and filter by `poolId`
- **Affected**: `realistic-production-scenarios.spec.ts`, `failing-test-4-cross-pool.spec.ts`

#### `kageGetTierCount`
- **Status**: Does NOT exist in contract
- **Workaround**: Use `getAllPools()` and count
- **Affected**: `failing-test-4-cross-pool.spec.ts:127`

#### `setExcludedFromFee`
- **Status**: Does NOT exist in TigerPalaceToken
- **Correct Function**: `setTaxExemption(address account, bool exempt)`
- **Affected**: `enhanced-revenue-allocation.spec.ts:149`

#### `getSystemStatus`
- **Status**: Does NOT exist in RWARevenue
- **Workaround**: Use `getPoolRevenueStats(poolId)` and `getRevenueStats()`
- **Affected**: `enhanced-revenue-allocation.spec.ts:218`

### 4. `DEFAULT_ADMIN_ROLE` Usage Error

**Contract** (AccessControl):
```solidity
bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
```

**Test Calls** (WRONG):
```typescript
await tigerRevenue.DEFAULT_ADMIN_ROLE();  // Called as function
```

**Correct Call**:
```typescript
await tigerRevenue.DEFAULT_ADMIN_ROLE;  // Access as constant property
// OR use hasRole:
await tigerRevenue.hasRole(await tigerRevenue.DEFAULT_ADMIN_ROLE(), deployer.address);
```

**Affected**: `comprehensive-revenue-tier-testing.spec.ts:106`

### 5. TigerPalaceToken Constructor Parameter Mismatch

**Contract Signature** (TigerPalaceToken.sol:47):
```solidity
constructor(
    address _owner,
    address _treasury,
    uint256 _initialSupply
)
```

**Test Calls** (WRONG):
```typescript
// Some tests pass an object with tax config
await TigerPalaceToken.deploy({
  buyTax: 500,
  maxSwapDivisor: 1000,
  maxTxDiv: 100,
  maxWalletDiv: 100,
  sellTax: 500
});
```

**Correct Call**:
```typescript
await TigerPalaceToken.deploy(
  deployer.getAddress(),
  treasury.getAddress(),
  INITIAL_SUPPLY
);
```

**Affected**: 
- `failing-test-1-duration-tiers.spec.ts`
- `ecosystem-performance.spec.ts`

### 6. Missing `withdraw` Function

**Issue**: Tests call `withdraw()` but contract only has `claimRewards()`
- `claimRewards()` handles both principal and rewards
- No separate `withdraw()` function exists

## Function Mapping Reference

### RWAStaking Contract

| Test Function Call | Actual Contract Function | Notes |
|-------------------|-------------------------|-------|
| `claimRewards(poolId, stakeId, amount)` | `claimRewards(stakeId)` | Only stakeId parameter |
| `getUserStake(user, poolId, stakeId)` | `getUserStake(user, stakeId)` | No poolId parameter |
| `kageGetPendingRevenue(poolId, user)` | `getPendingRewards(user, stakeId)` | Sum all stakes in pool |
| `kageGetUserStakesInPool(user, poolId)` | `getUserStakes(user)` | Filter by poolId |
| `kageGetTierCount()` | `getAllPools()` | Count pools |
| `withdraw(...)` | `claimRewards(stakeId)` | No withdraw function |

### TigerPalaceToken Contract

| Test Function Call | Actual Contract Function | Notes |
|-------------------|-------------------------|-------|
| `setExcludedFromFee(addr, bool)` | `setTaxExemption(addr, bool)` | Different name |
| Constructor with object | Constructor with 3 params | Individual params only |

### RWARevenue Contract

| Test Function Call | Actual Contract Function | Notes |
|-------------------|-------------------------|-------|
| `getSystemStatus(poolId)` | `getPoolRevenueStats(poolId)` | Different function |
| `DEFAULT_ADMIN_ROLE()` | `DEFAULT_ADMIN_ROLE` | Constant, not function |

## Recommended Fixes

1. **Update all `claimRewards` calls** to use single `stakeId` parameter
2. **Update all `getUserStake` calls** to remove `poolId` parameter
3. **Replace `setExcludedFromFee`** with `setTaxExemption`
4. **Fix `DEFAULT_ADMIN_ROLE`** usage (remove parentheses)
5. **Fix TigerPalaceToken constructor** calls to use individual parameters
6. **Create helper functions** for `kageGetPendingRevenue` and `kageGetUserStakesInPool` that wrap contract calls

## Critical Architectural Mismatch

### `claimRewards` Function Behavior Mismatch

**Contract Behavior** (RWAStaking.sol:174-197):
- Only claims **rewards** (not principal)
- Requires stake to be **matured** (`block.timestamp >= endTime`)
- Only accepts `stakeId` parameter
- Does NOT support partial withdrawals
- Does NOT return principal

**Test Expectations**:
- Tests call `claimRewards(poolId, stakeId, amount)` expecting:
  - Partial withdrawals
  - Principal return
  - Withdrawal before maturity

**Impact**: Many tests are fundamentally incompatible with the contract design. Tests expecting partial withdrawals or early withdrawals will need to be redesigned.

## Next Steps

1. **Immediate Fixes** (Function Signatures):
   - Fix `DEFAULT_ADMIN_ROLE()` → `DEFAULT_ADMIN_ROLE` (remove parentheses)
   - Fix `setExcludedFromFee` → `setTaxExemption`
   - Fix `claimRewards(poolId, stakeId, amount)` → `claimRewards(stakeId)` (note: behavior mismatch)
   - Fix `getUserStake(user, poolId, stakeId)` → `getUserStake(user, stakeId)`
   - Fix TigerPalaceToken constructor calls

2. **Architectural Decisions Needed**:
   - Decide if contract should support partial withdrawals
   - Decide if contract should support early withdrawals (with penalty)
   - If yes, contract needs to be updated
   - If no, tests need to be rewritten

3. **Test Updates Required**:
   - Remove partial withdrawal tests OR update contract
   - Update reward claiming logic to match contract behavior
   - Fix helper functions that wrap non-existent contract functions

4. **Verification**:
   - Compile contracts and verify ABIs
   - Run test suite after fixes
   - Document remaining mismatches

