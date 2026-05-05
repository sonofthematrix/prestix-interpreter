# Factory Version Investigation Report

## Executive Summary

**Date**: January 14, 2026  
**Network**: Sepolia Testnet  
**Investigation**: ERC404 Factory Contract Version Analysis

## Current Deployment Status

### Active Factory (Marketplace Configuration)
- **Address**: `0xdc4A8BbeC696287E44262b3fE4c2605a0C59929F`
- **Marketplace**: `0x0b6a1BFCEf896d004Edd376A798c57F2B797e307`
- **Status**: ⚠️ **OLD VERSION** (RWATokenFactory404.sol)
- **Has Fixes**: ❌ NO

### All Deployed Factories on Sepolia

1. **OLD Factory** (`0x9cb9C7E12D104aa8e75D0d7681ce8b7d15084656`)
   - Bytecode: 38,016 characters
   - Status: Deployed but not active

2. **NEW Factory** (`0xdc4A8BbeC696287E44262b3fE4c2605a0C59929F`) ⚠️ **ACTIVE**
   - Bytecode: 37,660 characters
   - Status: **Currently configured in marketplace**
   - Version: RWATokenFactory404.sol (OLD)

3. **FIXED Factory** (`0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b`)
   - Bytecode: 38,604 characters
   - Status: Deployed but not active
   - Version: RWATokenFactory404Fixed.sol (CORRECT)

## Critical Issues Identified

### ⚠️ Active Factory Has Critical Bug

The marketplace is currently using **RWATokenFactory404.sol** which has the following issues:

#### 1. **mintTokens() Function Bug**
```solidity
// ❌ OLD VERSION (CURRENTLY DEPLOYED)
function mintTokens(uint256 assetId, address to, uint256 amount) external onlyRole(TOKEN_CREATOR_ROLE) {
    address token = _getTokenAddress(assetId);
    RWAToken404Fixed tokenContract = RWAToken404Fixed(payable(token));
    
    // Mint new tokens directly to the buyer
    // The factory has MINTER_ROLE on the token contract
    tokenContract.mint(to, amount);  // ❌ NO VALIDATION
}
```

**Problems:**
- ❌ Mints new tokens instead of transferring existing ones
- ❌ No allowance validation
- ❌ No balance validation
- ❌ Can exceed total supply
- ❌ Breaks token economics

#### 2. **Fixed Version Has Proper Implementation**
```solidity
// ✅ FIXED VERSION (DEPLOYED BUT NOT ACTIVE)
function mintTokens(uint256 assetId, address to, uint256 amount) external onlyRole(TOKEN_CREATOR_ROLE) {
    address token = _getTokenAddress(assetId);
    RWAToken404Fixed tokenContract = RWAToken404Fixed(payable(token));
    
    // Get the asset owner (stored when token was created)
    address assetOwner = _assetToOwner[assetId];
    if (assetOwner == address(0)) revert TokenNotFound();
    
    // Gas optimized validation using custom errors
    uint256 allowance = tokenContract.allowance(assetOwner, address(this));
    if (allowance < amount) revert InsufficientAllowance(amount, allowance);
    
    uint256 ownerBalance = tokenContract.balanceOf(assetOwner);
    if (ownerBalance < amount) revert InsufficientBalance(amount, ownerBalance);
    
    // Transfer tokens from asset owner to buyer
    tokenContract.transferFrom(assetOwner, to, amount);  // ✅ PROPER TRANSFER
}
```

**Benefits:**
- ✅ Transfers existing tokens (no supply inflation)
- ✅ Validates allowance before transfer
- ✅ Validates balance before transfer
- ✅ Prevents exceeding total supply
- ✅ Maintains token economics integrity
- ✅ Gas-optimized custom errors

## Differences Between Versions

### Code Comparison

| Feature | RWATokenFactory404.sol (OLD) | RWATokenFactory404Fixed.sol (FIXED) |
|---------|------------------------------|-------------------------------------|
| **mintTokens()** | `mint()` - Creates new tokens | `transferFrom()` - Transfers existing tokens |
| **Allowance Check** | ❌ None | ✅ Validates before transfer |
| **Balance Check** | ❌ None | ✅ Validates before transfer |
| **Owner Tracking** | ❌ No `_assetToOwner` mapping | ✅ Tracks owner per asset |
| **Custom Errors** | Basic errors only | ✅ `InsufficientAllowance`, `InsufficientBalance` |
| **Gas Optimization** | Standard | ✅ Optimized with custom errors |
| **Supply Integrity** | ❌ Can exceed total supply | ✅ Maintains total supply |

### Additional Features in Fixed Version

1. **Owner Mapping**
   ```solidity
   mapping(uint256 => address) private _assetToOwner;
   ```
   - Tracks asset owner for proper token transfers
   - Stored during `createToken404()`

2. **Enhanced Error Handling**
   ```solidity
   error InsufficientAllowance(uint256 required, uint256 available);
   error InsufficientBalance(uint256 required, uint256 available);
   ```
   - More informative error messages
   - Gas-efficient error handling

## Recommendations

### Immediate Actions Required

1. **⚠️ CRITICAL**: Update marketplace to use FIXED factory
   ```bash
   # Update marketplace configuration
   bun run hardhat run scripts/set-marketplace-factory404.ts --network sepolia
   ```

2. **Verify Fixed Factory Deployment**
   - Address: `0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b`
   - Verify on Etherscan
   - Ensure marketplace has `TOKEN_CREATOR_ROLE`

3. **Test Fixed Factory**
   - Run comprehensive test suite
   - Verify `mintTokens()` behavior
   - Confirm allowance/balance validation

### Long-Term Actions

1. **Deprecate Old Factories**
   - Mark old factories as inactive in database
   - Document migration path

2. **Update Documentation**
   - Document factory version differences
   - Update deployment guides

3. **Monitor Token Economics**
   - Check for any tokens created with old factory
   - Verify total supply integrity

## Test Suite Status

### Factory-Specific Tests
- **File**: `test/rwa-token-factory-404.spec.ts`
- **Status**: Tests OLD version (`RWATokenFactory404`)
- **Action Required**: Create tests for FIXED version

### Test Coverage Needed

1. ✅ Token creation
2. ✅ Token validation
3. ⚠️ `mintTokens()` with allowance validation (needs update)
4. ⚠️ `mintTokens()` with balance validation (needs update)
5. ⚠️ Transfer vs mint behavior (needs update)

## Conclusion

**The marketplace is currently using the OLD factory version** which has critical bugs that can break token economics. The FIXED version is deployed but not active. **Immediate action is required** to switch to the FIXED factory.

## Next Steps

1. ✅ Investigation complete
2. ⏳ Run test suite for factory contracts
3. ⏳ Update marketplace to use FIXED factory
4. ⏳ Verify all tests pass with FIXED version
5. ⏳ Document migration completion
