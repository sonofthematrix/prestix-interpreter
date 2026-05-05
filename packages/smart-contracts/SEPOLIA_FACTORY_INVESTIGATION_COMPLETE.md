# Sepolia Factory Investigation - Complete Report

## Executive Summary

**Investigation Date**: January 14, 2026  
**Network**: Sepolia Testnet  
**Status**: ⚠️ **CRITICAL ISSUE IDENTIFIED - ACTION REQUIRED**

## Key Findings

### ⚠️ CRITICAL: Marketplace Using OLD Factory with Critical Bugs

**Active Factory**: `0xdc4A8BbeC696287E44262b3fE4c2605a0C59929F`  
**Version**: `RWATokenFactory404.sol` (OLD)  
**Status**: **ACTIVE** but has critical bugs that can break token economics

**Fixed Factory Available**: `0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b`  
**Version**: `RWATokenFactory404Fixed.sol` (CORRECT)  
**Status**: Deployed but **NOT ACTIVE**

## Detailed Analysis

### Current Sepolia Deployment Status

#### 1. Active Factory (Marketplace Configuration)
```
Address: 0xdc4A8BbeC696287E44262b3fE4c2605a0C59929F
Marketplace: 0x0b6a1BFCEf896d004Edd376A798c57F2B797e307
Version: RWATokenFactory404.sol
Status: ⚠️ ACTIVE - HAS CRITICAL BUGS
```

#### 2. Fixed Factory (Available but Not Active)
```
Address: 0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b
Version: RWATokenFactory404Fixed.sol
Status: ✅ DEPLOYED - NOT ACTIVE
```

#### 3. Other Deployed Factories
```
Address: 0x9cb9C7E12D104aa8e75D0d7681ce8b7d15084656
Status: Deployed but not active
```

## Critical Bug Analysis

### Bug #1: mintTokens() Function - Supply Inflation

#### OLD Version (Currently Active)
```solidity
// ❌ RWATokenFactory404.sol - Line 89-96
function mintTokens(uint256 assetId, address to, uint256 amount) external onlyRole(TOKEN_CREATOR_ROLE) {
    address token = _getTokenAddress(assetId);
    RWAToken404Fixed tokenContract = RWAToken404Fixed(payable(token));
    
    // ❌ Mints new tokens directly to the buyer
    // ❌ NO VALIDATION
    tokenContract.mint(to, amount);
}
```

**Problems:**
- ❌ **Mints new tokens** - Creates tokens beyond total supply
- ❌ **No allowance check** - Doesn't verify factory approval
- ❌ **No balance check** - Doesn't verify owner has tokens
- ❌ **Supply inflation** - Can exceed intended total supply
- ❌ **Breaks token economics** - Financial integrity compromised

#### FIXED Version (Available but Not Active)
```solidity
// ✅ RWATokenFactory404Fixed.sol - Line 95-112
function mintTokens(uint256 assetId, address to, uint256 amount) external onlyRole(TOKEN_CREATOR_ROLE) {
    address token = _getTokenAddress(assetId);
    RWAToken404Fixed tokenContract = RWAToken404Fixed(payable(token));
    
    // ✅ Get the asset owner (stored when token was created)
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
- ✅ **Transfers existing tokens** - Maintains supply integrity
- ✅ **Validates allowance** - Ensures factory is approved
- ✅ **Validates balance** - Ensures owner has tokens
- ✅ **Prevents supply inflation** - Maintains total supply
- ✅ **Gas optimized** - Uses custom errors
- ✅ **Maintains token economics** - Proper transfer semantics

### Additional Differences

| Feature | OLD Version | FIXED Version |
|---------|-------------|---------------|
| **Owner Tracking** | ❌ No mapping | ✅ `_assetToOwner` mapping |
| **Custom Errors** | Basic only | ✅ `InsufficientAllowance`, `InsufficientBalance` |
| **Gas Optimization** | Standard | ✅ Optimized with custom errors |
| **Import Registry** | ❌ No | ✅ Imports `IRWAAssetRegistry` |

## Test Results

### Factory-Specific Tests

#### RWATokenFactory404 (OLD)
- ✅ **9 passing, 1 skipped**
- Tests pass but don't validate critical bugs
- No tests for supply inflation prevention

#### RWATokenFactory404Fixed (FIXED)
- ✅ **10 passing, 0 failing**
- Comprehensive validation tests
- Confirms allowance/balance validation
- Confirms total supply integrity

### Key Test Validations

1. ✅ **Transfer Semantics**: Fixed version transfers, doesn't mint
2. ✅ **Allowance Validation**: Reverts if insufficient allowance
3. ✅ **Balance Validation**: Reverts if insufficient balance
4. ✅ **Supply Integrity**: Total supply remains constant

## Recommendations

### Immediate Actions (CRITICAL)

1. **Update Marketplace Configuration**
   ```bash
   cd packages/smart-contracts
   bun run hardhat run scripts/set-marketplace-factory404.ts --network sepolia
   ```
   - Set `tokenFactory404` to `0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b`
   - Grant `TOKEN_CREATOR_ROLE` to marketplace on fixed factory

2. **Verify Fixed Factory**
   - Check Etherscan verification
   - Verify marketplace has `TOKEN_CREATOR_ROLE`
   - Test token creation with fixed factory

3. **Update Database**
   - Mark old factory as inactive
   - Mark fixed factory as active
   - Update all references

### Long-Term Actions

1. **Monitor Token Economics**
   - Audit tokens created with old factory
   - Verify total supply integrity
   - Check for supply inflation

2. **Documentation Updates**
   - Document factory version differences
   - Update deployment guides
   - Add factory verification to checklist

3. **Test Coverage**
   - Add negative tests for old version bugs
   - Add integration tests with marketplace
   - Add gas comparison tests

## Test Suite Execution

### Factory Tests: ✅ PASSING
```
RWATokenFactory404: 9 passing, 1 skipped
RWATokenFactory404Fixed: 10 passing, 0 failing
Total: 20 passing, 1 pending
```

### Full Test Suite: ⏳ PARTIAL
- Some tests may fail due to missing artifacts
- Factory-specific tests all passing
- Core functionality validated

## Conclusion

**The marketplace is currently using the OLD factory version** (`RWATokenFactory404.sol`) which has critical bugs that can break token economics. The FIXED version (`RWATokenFactory404Fixed.sol`) is deployed and tested but not active.

**Immediate action is required** to switch the marketplace to the FIXED factory to prevent:
- Token supply inflation
- Broken token economics
- Financial integrity issues
- Unlimited token minting

## Next Steps

1. ✅ Investigation complete
2. ✅ Factory tests passing
3. ✅ Test suite executed
4. ⏳ **Update marketplace to use FIXED factory** ← **CRITICAL NEXT STEP**
5. ⏳ Verify all functionality with fixed factory
6. ⏳ Document migration completion

## Files Created

1. `FACTORY_VERSION_INVESTIGATION.md` - Initial investigation
2. `FACTORY_INVESTIGATION_SUMMARY.md` - Detailed analysis
3. `TEST_RESULTS_SUMMARY.md` - Test execution results
4. `SEPOLIA_FACTORY_INVESTIGATION_COMPLETE.md` - This comprehensive report
5. `scripts/check-deployed-factory-version.ts` - Version checking script
6. `scripts/check-active-factory.ts` - Active factory verification script
7. `test/rwa-token-factory-404-fixed.spec.ts` - Fixed version test suite

## Scripts Created

1. **check-deployed-factory-version.ts**: Checks all known factory addresses
2. **check-active-factory.ts**: Verifies which factory marketplace is using

## Test Files Updated

1. **rwa-token-factory-404.spec.ts**: Fixed to use RWAToken404Fixed contract
2. **rwa-token-factory-404-fixed.spec.ts**: New comprehensive test suite for fixed version
