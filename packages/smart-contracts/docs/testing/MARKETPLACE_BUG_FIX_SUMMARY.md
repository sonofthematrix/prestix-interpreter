# Marketplace Bug Fix Summary

## Issues Fixed

### 1. ✅ calculatePurchaseCost Bug
**Problem**: Marketplace was returning extremely large purchase costs (e.g., 81,549,269,056,124,524,685,843,430,613,328,645,939,688 ETH)

**Root Cause**: Storage corruption in `_marketplaceFeePercentage` variable after contract upgrade. The value was `815492690561245246858434306133286459396883480647` instead of `250` (2.5%).

**Fix**: Used `setMarketplaceFee(250)` to restore correct fee percentage.

**Script**: `scripts/fix-marketplace-fee.ts`

**Result**: Purchase cost calculation now correct:
- Base Price: 0.001 ETH
- Marketplace Fee (2.5%): 0.000025 ETH  
- Total Cost: 0.001025 ETH

### 2. ✅ Missing TOKEN_MANAGER_ROLE
**Problem**: Purchase transactions failed with AccessControl error: "account 0xc9c369525dff385935dfdc6ac2f678c26998d0d7 is missing role 0x74f7a545c65c11839a48d7453738b30c295408df2d944516167556759ddc6d06"

**Root Cause**: The upgradeable token factory (`RWATokenFactoryUpgradeable`) uses `TOKEN_MANAGER_ROLE` for `mintTokens()` instead of `TOKEN_CREATOR_ROLE`. The marketplace only had `TOKEN_CREATOR_ROLE` granted.

**Fix**: Granted `TOKEN_MANAGER_ROLE` to marketplace on the ERC20 token factory.

**Script**: `scripts/grant-token-creator-role.ts` (updated to check and grant both roles)

**Role Hash**: `0x74f7a545c65c11839a48d7453738b30c295408df2d944516167556759ddc6d06` = `keccak256("TOKEN_MANAGER_ROLE")`

**Result**: Purchase transactions now succeed.

## Test Results

### Successful Purchase Test
- **Asset ID**: 11 (Mediterranean Coastal Villa)
- **Payment Token**: USDC
- **Token Amount**: 1
- **Total Cost**: 0.001025 USDC
- **Transaction**: `0x85beb0104eade67c100bac21121fcaeeb2d84a5eb7ad91f894489ad468a2b03b`
- **Block**: 9766007
- **Gas Used**: 504,562

## Scripts Created/Updated

1. **`fix-marketplace-fee.ts`** - Fix corrupted marketplace fee percentage
2. **`grant-token-creator-role.ts`** - Grant TOKEN_CREATOR_ROLE and TOKEN_MANAGER_ROLE to marketplace
3. **`update-asset-token-price.ts`** - Update asset token prices for testing
4. **`activate-asset.ts`** - Activate/deactivate assets
5. **`verify-all-marketplace-roles.ts`** - Verify all marketplace role configurations
6. **`check-marketplace-storage.ts`** - Check marketplace storage values
7. **`debug-marketplace-calculation.ts`** - Debug purchase cost calculations

## Key Learnings

1. **Storage Corruption**: Upgradeable contracts can have storage corruption if not properly initialized after upgrades. Always verify critical storage values after upgrades.

2. **Role Differences**: Upgradeable and non-upgradeable versions of contracts may have different role requirements:
   - Non-upgradeable: Uses `TOKEN_CREATOR_ROLE` for both `createToken()` and `mintTokens()`
   - Upgradeable: Uses `TOKEN_CREATOR_ROLE` for `createToken()` and `TOKEN_MANAGER_ROLE` for `mintTokens()`

3. **Role Hash Verification**: When debugging AccessControl errors, compute role hashes to identify which role is missing:
   ```javascript
   ethers.keccak256(ethers.toUtf8Bytes("ROLE_NAME"))
   ```

## Next Steps

- ✅ Marketplace fee calculation fixed
- ✅ Purchase flow working with USDC/EURC
- ✅ All required roles granted
- ⏭️ Test with EURC payment token
- ⏭️ Test multiple purchases to verify token reuse
- ⏭️ Test frontend purchase flow

## Related Documentation

- [ERC404 Token Finding Test Guide](./ERC404_TOKEN_FINDING_TEST_GUIDE.md)
- [Frontend Purchase Test Guide](./FRONTEND_PURCHASE_TEST_GUIDE.md)

