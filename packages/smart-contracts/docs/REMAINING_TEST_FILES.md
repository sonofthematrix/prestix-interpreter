# Remaining Test Files Requiring Updates

## Summary

This document lists all test files that still require updates to align with the current contract APIs.

---

## High Priority (Critical API Mismatches)

### 1. `test/tiger-revenue-error-emergency-tests.spec.ts`
**Status**: ~30 tests calling non-existent functions  
**Issues**:
- Calls to deprecated `kage*` functions
- Incorrect emergency function names
- Missing constructor parameters

**Required Updates**:
- Replace `kageAllocateRevenue` → `rwaAllocateRevenue` or `distributeRewards`
- Update `RWARewardDistributor` deployment to use constructor parameters
- Remove calls to non-existent emergency functions
- Add max wallet/tax exemptions before transfers

**Estimated Fix Time**: 2-3 hours

---

### 2. `test/tiger-staking-error-emergency-tests.spec.ts`
**Status**: ~40 tests calling non-existent functions  
**Issues**:
- Calls to deprecated staking functions
- Incorrect pool creation patterns
- Missing access control setup

**Required Updates**:
- Replace `kageCreatePool` → `rwaCreatePool` or `createPool`
- Replace .stake(` → `stake`
- Replace `userWithdraw` → `claimRewards`
- Update pool duration to be > 0
- Fix access control role assignments

**Estimated Fix Time**: 3-4 hours

---

### 3. `test/simple-error-emergency-tests.spec.ts`
**Status**: Partial fixes applied, still needs function call updates  
**Issues**:
- Deployment pattern corrections needed
- Some function calls still incorrect

**Required Updates**:
- Complete function name alignment
- Fix deployment patterns for contracts with constructors
- Remove `initialize` calls for contracts that use constructors

**Estimated Fix Time**: 1-2 hours

---

## Medium Priority (Business Logic Updates)

### 4. `test/failing-test-1-duration-tiers.spec.ts`
**Status**: Needs tier system removal  
**Issues**:
- RWAStaking no longer uses tier system
- Uses pools with multipliers instead

**Required Updates**:
- Remove all tier-related assertions
- Replace tier logic with pool multiplier logic
- Update test expectations to match pool-based rewards

**Estimated Fix Time**: 2-3 hours

---

### 5. `test/failing-test-2-partial-withdrawals.spec.ts`
**Status**: RWAStaking doesn't support partial withdrawals  
**Issues**:
- Tests expect partial withdrawal functionality
- Contract only supports full claim after maturity

**Required Updates**:
- Rewrite tests to reflect full claim-only model
- Update assertions to check for full stake maturity
- Remove partial withdrawal test cases

**Estimated Fix Time**: 2-3 hours

---

### 6. `test/failing-test-4-cross-pool.spec.ts`
**Status**: Cross-pool operations need validation  
**Issues**:
- Pool interaction patterns may be incorrect
- Need to validate cross-pool staking logic

**Required Updates**:
- Validate pool interaction patterns
- Update cross-pool staking tests
- Ensure proper pool ID handling

**Estimated Fix Time**: 1-2 hours

---

## Lower Priority (Enhanced Coverage)

### 7. `test/advanced-revenue-allocation.spec.ts`
**Status**: May need function name updates  
**Estimated Fix Time**: 1 hour

### 8. `test/comprehensive-revenue-tier-testing.spec.ts`
**Status**: May need tier → pool conversion  
**Estimated Fix Time**: 2 hours

### 9. `test/enhanced-revenue-allocation.spec.ts`
**Status**: May need function name updates  
**Estimated Fix Time**: 1 hour

### 10. `test/ecosystem-integration.spec.ts`
**Status**: Integration test, may need updates  
**Estimated Fix Time**: 2-3 hours

### 11. `test/ecosystem-performance.spec.ts`
**Status**: Performance test, may need updates  
**Estimated Fix Time**: 1-2 hours

### 12. `test/tiger-staking-refactored.spec.ts`
**Status**: Refactored test, needs validation  
**Estimated Fix Time**: 1-2 hours

### 13. `test/tiger-unified-staking-enhanced.spec.ts`
**Status**: Enhanced test, needs validation  
**Estimated Fix Time**: 1-2 hours

---

## Test Files Already Fixed ✅

- ✅ `test/minimal-staking-test.spec.ts`
- ✅ `test/simple-staking-test.spec.ts`
- ✅ `test/revenue-distribution-tier-testing.spec.ts`
- ✅ `test/reward-distributor-contract.spec.ts`
- ✅ `test/reward-distributor-error-emergency-tests.spec.ts` (mostly fixed)
- ✅ `test/failing-test-3-full-withdrawal.spec.ts`
- ✅ `test/proxy-staking-example.spec.ts`
- ✅ `test/realistic-production-scenarios.spec.ts`
- ✅ `test/usdc-integration.spec.ts`
- ✅ `test/rwa-staking-integration.spec.ts`

---

## Common Fix Patterns

### Pattern 1: Function Name Updates
```typescript
// ❌ OLD
await contract.kageCreatePool(...);
await contract.stake(...);
await contract.userWithdraw(...);

// ✅ NEW
await contract.rwaCreatePool(...);
await contract.stake(...);
await contract.claimRewards(stakeId);
```

### Pattern 2: Constructor Parameters
```typescript
// ❌ OLD
const contract = await Contract.deploy();
await contract.initialize(...);

// ✅ NEW
const contract = await Contract.deploy(
  param1,
  param2,
  param3
);
```

### Pattern 3: Max Wallet Exemptions
```typescript
// ✅ REQUIRED before transfers
await token.setMaxWalletExemption(contractAddress, true);
await token.setTaxExemption(contractAddress, true);
```

### Pattern 4: Pool Duration
```typescript
// ❌ OLD
await staking.createPool(..., 0, ...); // duration = 0

// ✅ NEW
await staking.createPool(..., 1, ...); // duration > 0 required
```

### Pattern 5: Address Access
```typescript
// ❌ OLD
const address = contract.address;

// ✅ NEW
const address = await contract.getAddress();
```

---

## Total Estimated Fix Time

- **High Priority**: 6-9 hours
- **Medium Priority**: 5-8 hours
- **Lower Priority**: 9-13 hours
- **Total**: 20-30 hours

---

## Recommended Fix Order

1. **Week 1**: High Priority files (1-3)
2. **Week 2**: Medium Priority files (4-6)
3. **Week 3**: Lower Priority files (7-13) as needed

---

**Last Updated**: 2025-01-XX

