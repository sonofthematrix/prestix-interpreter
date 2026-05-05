# Factory Version Investigation & Test Results

## Executive Summary

**Date**: January 14, 2026  
**Network**: Sepolia Testnet  
**Status**: ⚠️ **CRITICAL ISSUE IDENTIFIED**

## Current Deployment Status

### Active Factory (Marketplace Configuration)
- **Address**: `0xdc4A8BbeC696287E44262b3fE4c2605a0C59929F`
- **Marketplace**: `0x0b6a1BFCEf896d004Edd376A798c57F2B797e307`
- **Version**: ⚠️ **RWATokenFactory404.sol (OLD)**
- **Status**: **ACTIVE BUT HAS CRITICAL BUGS**

### Available Factories on Sepolia

1. **OLD Factory** (`0x9cb9C7E12D104aa8e75D0d7681ce8b7d15084656`)
   - Status: Deployed but not active
   - Version: Unknown

2. **NEW Factory** (`0xdc4A8BbeC696287E44262b3fE4c2605a0C59929F`) ⚠️ **ACTIVE**
   - Status: **Currently configured in marketplace**
   - Version: RWATokenFactory404.sol (OLD)
   - **Has Critical Bugs**: YES

3. **FIXED Factory** (`0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b`)
   - Status: Deployed but not active
   - Version: RWATokenFactory404Fixed.sol (CORRECT)
   - **Has Critical Bugs**: NO

## Critical Bug Analysis

### Bug in Active Factory (RWATokenFactory404.sol)

#### `mintTokens()` Function - CRITICAL BUG

**Current Implementation (OLD):**
```solidity
function mintTokens(uint256 assetId, address to, uint256 amount) external onlyRole(TOKEN_CREATOR_ROLE) {
    address token = _getTokenAddress(assetId);
    RWAToken404Fixed tokenContract = RWAToken404Fixed(payable(token));
    
    // ❌ Mints new tokens directly to the buyer
    tokenContract.mint(to, amount);  // NO VALIDATION
}
```

**Problems:**
- ❌ **Mints new tokens** instead of transferring existing ones
- ❌ **No allowance validation** - doesn't check if factory is approved
- ❌ **No balance validation** - doesn't check if owner has tokens
- ❌ **Can exceed total supply** - breaks token economics
- ❌ **Supply inflation** - creates tokens beyond initial supply

**Impact:**
- Token economics can be broken
- Total supply can exceed intended amount
- Marketplace purchases can create unlimited tokens
- Financial integrity compromised

### Fixed Implementation (RWATokenFactory404Fixed.sol)

**Correct Implementation:**
```solidity
function mintTokens(uint256 assetId, address to, uint256 amount) external onlyRole(TOKEN_CREATOR_ROLE) {
    address token = _getTokenAddress(assetId);
    RWAToken404Fixed tokenContract = RWAToken404Fixed(payable(token));
    
    // Get the asset owner (stored when token was created)
    address assetOwner = _assetToOwner[assetId];
    if (assetOwner == address(0)) revert TokenNotFound();
    
    // ✅ Gas optimized validation using custom errors
    uint256 allowance = tokenContract.allowance(assetOwner, address(this));
    if (allowance < amount) revert InsufficientAllowance(amount, allowance);
    
    uint256 ownerBalance = tokenContract.balanceOf(assetOwner);
    if (ownerBalance < amount) revert InsufficientBalance(amount, ownerBalance);
    
    // ✅ Transfer tokens from asset owner to buyer
    tokenContract.transferFrom(assetOwner, to, amount);
}
```

**Benefits:**
- ✅ **Transfers existing tokens** - maintains supply integrity
- ✅ **Validates allowance** - ensures factory is approved
- ✅ **Validates balance** - ensures owner has tokens
- ✅ **Prevents supply inflation** - maintains total supply
- ✅ **Gas optimized** - uses custom errors
- ✅ **Maintains token economics** - proper transfer semantics

## Test Results

### Factory-Specific Tests

#### RWATokenFactory404 (OLD Version)
- ✅ Token Creation: **PASSING** (3/3 tests)
- ✅ Token Management: **PASSING** (2/3 tests, 1 skipped)
- ✅ View Functions: **PASSING** (4/4 tests)
- **Total**: 9 passing, 1 skipped

#### RWATokenFactory404Fixed (FIXED Version)
- ✅ mintTokens() - Fixed Implementation: **PASSING** (5/5 tests)
  - ✅ Should transfer tokens from owner to buyer (not mint)
  - ✅ Should revert if allowance is insufficient
  - ✅ Should revert if owner balance is insufficient
  - ✅ Should revert if allowance is less than requested amount
  - ✅ Should maintain total supply integrity
- ✅ Token Creation: **PASSING** (1/1 test)
- ✅ View Functions: **PASSING** (4/4 tests)
- **Total**: 10 passing, 0 failing

### Key Test Findings

1. **Fixed Version Properly Validates Transfers**
   - ✅ Tests confirm allowance validation works
   - ✅ Tests confirm balance validation works
   - ✅ Tests confirm total supply integrity maintained

2. **Old Version Has Known Issues**
   - ⚠️ Tests pass but don't validate the critical bug
   - ⚠️ `mintTokens()` can exceed total supply (not tested)
   - ⚠️ No validation tests for allowance/balance

## Differences Summary

| Feature | RWATokenFactory404 (OLD) | RWATokenFactory404Fixed (FIXED) |
|---------|--------------------------|----------------------------------|
| **mintTokens()** | `mint()` - Creates new tokens | `transferFrom()` - Transfers existing |
| **Allowance Check** | ❌ None | ✅ Validates before transfer |
| **Balance Check** | ❌ None | ✅ Validates before transfer |
| **Owner Tracking** | ❌ No mapping | ✅ `_assetToOwner` mapping |
| **Custom Errors** | Basic only | ✅ `InsufficientAllowance`, `InsufficientBalance` |
| **Supply Integrity** | ❌ Can exceed total supply | ✅ Maintains total supply |
| **Gas Optimization** | Standard | ✅ Optimized with custom errors |
| **Test Coverage** | Basic | ✅ Comprehensive validation tests |

## Recommendations

### Immediate Actions Required

1. **⚠️ CRITICAL**: Update marketplace to use FIXED factory
   ```bash
   # Update marketplace configuration
   cd packages/smart-contracts
   bun run hardhat run scripts/set-marketplace-factory404.ts --network sepolia
   ```
   - Set marketplace `tokenFactory404` to `0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b`
   - Grant `TOKEN_CREATOR_ROLE` to marketplace on fixed factory

2. **Verify Fixed Factory Deployment**
   - Address: `0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b`
   - Verify on Etherscan
   - Ensure marketplace has `TOKEN_CREATOR_ROLE`

3. **Update Database**
   - Update `deployed_contracts` table to mark old factory as inactive
   - Update `deployed_contracts` table to mark fixed factory as active
   - Update marketplace configuration references

### Long-Term Actions

1. **Deprecate Old Factories**
   - Mark old factories as inactive in database
   - Document migration path
   - Monitor for any tokens created with old factory

2. **Update Documentation**
   - Document factory version differences
   - Update deployment guides
   - Add factory version verification to deployment checklist

3. **Monitor Token Economics**
   - Check for any tokens created with old factory
   - Verify total supply integrity for all tokens
   - Audit marketplace purchases for supply inflation

## Test Suite Status

### Factory Tests
- ✅ **RWATokenFactory404**: 9 passing, 1 skipped
- ✅ **RWATokenFactory404Fixed**: 10 passing, 0 failing

### Full Test Suite
- ⏳ Running comprehensive test suite...
- ⏳ Results pending...

## Conclusion

**The marketplace is currently using the OLD factory version** (`RWATokenFactory404.sol`) which has critical bugs that can break token economics by allowing unlimited token minting. The FIXED version (`RWATokenFactory404Fixed.sol`) is deployed but not active.

**Immediate action is required** to switch the marketplace to the FIXED factory to prevent token supply inflation and maintain financial integrity.

## Next Steps

1. ✅ Investigation complete
2. ✅ Factory tests passing
3. ⏳ Run full test suite
4. ⏳ Update marketplace to use FIXED factory
5. ⏳ Verify all tests pass with FIXED version
6. ⏳ Document migration completion
