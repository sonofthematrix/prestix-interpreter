# Factory Contract Split Summary

## Problem
The `RWATokenFactoryEnhanced` contract exceeded the 24KB mainnet deployment limit (was 34,998 bytes) because it imported both `RWAToken` and `RWAToken404` contracts, bringing in all their bytecode.

## Solution
Split into two separate factory contracts:

### 1. `RWATokenFactory.sol` (ERC20 Only)
- **Purpose**: Creates and manages ERC20 RWA tokens
- **Size**: Under 24KB limit ✅
- **Imports**: Only `RWAToken.sol`
- **Functions**:
  - `createToken()` - Create ERC20 token
  - `mintTokens()` - Mint tokens
  - `burnTokens()` - Burn tokens
  - `updateAssetValue()` - Update asset value
  - `distributeDividends()` - Distribute dividends
  - View functions: `getTokenAddress()`, `getAssetId()`, `isValidToken()`, `getAllTokens()`

### 2. `RWATokenFactory404.sol` (ERC-404 Only)
- **Purpose**: Creates and manages ERC-404 RWA tokens
- **Size**: Under 24KB limit ✅
- **Imports**: Only `RWAToken404.sol`
- **Functions**:
  - `createToken404()` - Create ERC-404 token
  - `mintTokens()` - Mint tokens
  - `burnTokens()` - Burn tokens
  - `updateAssetValue()` - Update asset value
  - `distributeDividends()` - Distribute dividends
  - View functions: `getTokenAddress()`, `getAssetId()`, `isValidToken()`, `getAllTokens()`

## Key Optimizations Applied

1. **Custom Errors**: Replaced all `require()` strings with custom errors (saves ~100-200 bytes per error)
2. **Consolidated Validation**: Shared validation logic in private functions
3. **Removed Redundancy**: Eliminated token type tracking (not needed in separate factories)
4. **Optimizer**: Set to `runs: 1` for bytecode size optimization
5. **Minimal Comments**: Removed verbose documentation comments

## Migration Path

### For ERC20 Tokens:
```solidity
// Old
RWATokenFactoryEnhanced factory = RWATokenFactoryEnhanced(factoryAddress);
factory.createToken(assetId, name, symbol, totalSupply, owner);

// New
RWATokenFactory factory = RWATokenFactory(factoryAddress);
factory.createToken(assetId, name, symbol, totalSupply, owner);
```

### For ERC-404 Tokens:
```solidity
// Old
RWATokenFactoryEnhanced factory = RWATokenFactoryEnhanced(factoryAddress);
factory.createToken404(assetId, name, symbol, totalSupply, owner, tokenURI);

// New
RWATokenFactory404 factory = RWATokenFactory404(factoryAddress);
factory.createToken404(assetId, name, symbol, totalSupply, owner, tokenURI);
```

## Benefits

1. ✅ **Deployable to Mainnet**: Both contracts are under 24KB limit
2. ✅ **Reduced Gas Costs**: Smaller contracts = lower deployment costs
3. ✅ **Clear Separation**: Each factory has a single responsibility
4. ✅ **Maintainability**: Easier to update one token type without affecting the other
5. ✅ **Backward Compatible**: `RWATokenFactoryEnhanced` can remain for legacy support (if needed)

## Next Steps

1. Deploy `RWATokenFactory` for ERC20 token creation
2. Deploy `RWATokenFactory404` for ERC-404 token creation
3. Update frontend/services to use the appropriate factory based on token type
4. Consider deprecating `RWATokenFactoryEnhanced` after migration

## Files Created

- `smart-contracts/contracts/core/RWATokenFactory.sol`
- `smart-contracts/contracts/core/RWATokenFactory404.sol`
- `smart-contracts/contracts/libraries/TokenOperations.sol` (can be removed if not used elsewhere)

## Testing

Both contracts maintain the same interface patterns, so existing tests can be adapted:
- Update test fixtures to use the appropriate factory
- Test ERC20 factory separately from ERC-404 factory
- Verify all proxy functions work correctly

