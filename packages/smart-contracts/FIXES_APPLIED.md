# Test Failure Fixes Applied

## Summary

Applied Priority 1 critical fixes to resolve test failures in upgradeable contracts.

## Fixes Applied

### ✅ 1. RWAAssetRegistryUpgradeable Owner Assignment Fix
**File**: `contracts/upgradeable/RWAAssetRegistryUpgradeable.sol`

**Changes**:
- Line 78: Changed `owner: _msgSender()` → `owner: owner`
- Line 94: Changed `_assetsByOwner[_msgSender()]` → `_assetsByOwner[owner]`
- Line 98: Changed `emit AssetRegistered(assetId, _msgSender(), assetType)` → `emit AssetRegistered(assetId, owner, assetType)`

**Impact**: Assets are now correctly assigned to the specified owner parameter instead of the caller.

---

### ✅ 2. RWAAssetRegistryUpgradeable Auto Status Update Fix
**File**: `contracts/upgradeable/RWAAssetRegistryUpgradeable.sol`

**Changes**:
- Added automatic status update logic to `updateTokenAvailability()` function
- When `availableTokens` reaches 0 and status is ACTIVE (1), automatically sets status to SOLD_OUT (2)
- Removes asset from active assets list
- Emits `AssetStatusChanged` event

**Added Function**:
- `_removeFromActiveAssets(uint256 assetId)` - Internal helper to remove asset from active list

**Impact**: Marketplace purchases now automatically update asset status when all tokens are sold.

---

### ✅ 3. RWAMarketplaceUpgradeable ERC20 Fee Functions
**File**: `contracts/upgradeable/RWAMarketplaceUpgradeable.sol`

**Added Functions**:
- `getCollectedFeesERC20(address tokenAddress)` - View function to query collected fees for ERC20 token
- `withdrawFeesERC20(address tokenAddress)` - Admin function to withdraw collected ERC20 fees

**Added Events**:
- `PaymentTokenUpdated(address indexed oldToken, address indexed newToken)` - Already existed, verified
- `FeesWithdrawnERC20(address indexed token, uint256 amount)` - New event for fee withdrawals

**Impact**: Marketplace now supports querying and withdrawing ERC20 fees (USDC/EURC).

---

### ✅ 4. Storage Gap Verification
**File**: `contracts/upgradeable/RWAAssetRegistryUpgradeable.sol`

**Status**: Already present (line 259)
- Storage gap of 50 slots already exists
- No changes needed

---

## Test Impact

These fixes should resolve:
- ✅ Security audit fixes test suite (13 tests)
  - Owner assignment test
  - Purchase flow status update tests
- ✅ USDC integration test suite (9 tests)
  - Payment token configuration tests
  - Fee collection tests

## Next Steps

1. Run test suite: `bun test`
2. Verify all Priority 1 fixes are working
3. Review Priority 2 and Priority 3 items if needed
4. Document any remaining issues

## Files Modified

1. `contracts/upgradeable/RWAAssetRegistryUpgradeable.sol`
2. `contracts/upgradeable/RWAMarketplaceUpgradeable.sol`

## Verification

- ✅ No linter errors
- ✅ Code follows existing patterns
- ✅ Matches core contract implementations
- ✅ Storage layout preserved

