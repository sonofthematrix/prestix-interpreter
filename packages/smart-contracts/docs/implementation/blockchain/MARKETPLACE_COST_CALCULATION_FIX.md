# Marketplace Cost Calculation Bug Fix

## Issue Summary

The `calculatePurchaseCost` function in `RWAMarketplaceUpgradeable` was returning extremely large values (e.g., 43,492,943,496,599,743,780,807,527,789,624,454,973,052,765.72 ETH instead of 0.533 ETH for Asset ID 30).

## Root Cause Analysis

The registry contract returns correct values when queried directly, but the marketplace's calculation was incorrect. Possible causes:

1. **Struct field misalignment**: When reading `AssetDetails` struct from the registry, the `tokenPrice` field may be read incorrectly due to how Solidity handles structs with strings in memory
2. **Storage slot corruption**: The upgradeable proxy pattern may have storage layout issues
3. **ABI encoding issue**: The struct return value may be decoded incorrectly

## Fix Applied

Added comprehensive validation to the `calculatePurchaseCost` function:

1. **Asset validation**: Ensures asset exists and is active
2. **TokenPrice validation**: Validates tokenPrice is reasonable (0 < tokenPrice <= 1000 ETH)
3. **TokenAmount validation**: Ensures tokenAmount is valid and doesn't exceed available tokens
4. **BasePrice validation**: Validates calculated basePrice is reasonable (<= 1 billion ETH)

### Code Changes

```solidity
function calculatePurchaseCost(
    uint256 assetId,
    uint256 tokenAmount
) public view override returns (uint256 totalCost, uint256 marketplaceFee) {
    IRWAAssetRegistry.AssetDetails memory asset = assetRegistry.getAsset(assetId);
    
    // Validate asset exists and is active
    require(asset.id != 0, "RWAMarketplace: asset not found");
    require(asset.status == 1, "RWAMarketplace: asset not active");
    
    // Validate tokenPrice is reasonable (not corrupted)
    require(asset.tokenPrice > 0 && asset.tokenPrice <= 1e21, "RWAMarketplace: invalid token price");
    
    // Validate tokenAmount is reasonable
    require(tokenAmount > 0 && tokenAmount <= asset.availableTokens, "RWAMarketplace: invalid token amount");
    
    // Calculate base price: tokenAmount * tokenPrice
    uint256 basePrice = tokenAmount.mul(asset.tokenPrice);
    
    // Validate basePrice is reasonable (prevent overflow/corruption)
    require(basePrice <= 1e27, "RWAMarketplace: price calculation overflow");
    
    // Calculate marketplace fee: basePrice * feePercentage / BASIS_POINTS
    marketplaceFee = basePrice.mul(_marketplaceFeePercentage).div(BASIS_POINTS);
    
    // Calculate total cost: basePrice + marketplaceFee
    totalCost = basePrice.add(marketplaceFee);
    
    return (totalCost, marketplaceFee);
}
```

## Testing

### Diagnostic Script

Run the diagnostic script to verify the fix:

```bash
ASSET_ID=30 TOKEN_AMOUNT=1 bun hardhat run scripts/diagnose-marketplace-cost-bug.ts --network sepolia
```

### Expected Behavior

- **Before fix**: Function returns astronomically large values
- **After fix**: 
  - If tokenPrice is corrupted: Function reverts with "RWAMarketplace: invalid token price"
  - If tokenPrice is correct: Function returns correct calculation

## Next Steps

1. **Deploy updated implementation**: Deploy the fixed contract implementation
2. **Upgrade marketplace proxy**: Upgrade the marketplace proxy to use the new implementation
3. **Verify fix**: Run diagnostic script to confirm correct behavior
4. **Test purchases**: Test actual token purchases to ensure they work correctly

## Deployment

The marketplace uses UUPS upgrade pattern. To upgrade:

1. Deploy new implementation
2. Call `upgradeTo(newImplementation)` on the marketplace proxy (requires `UPGRADER_ROLE`)
3. Verify the upgrade was successful

## Related Files

- Contract: `contracts/upgradeable/RWAMarketplaceUpgradeable.sol`
- Diagnostic Script: `scripts/diagnose-marketplace-cost-bug.ts`
- Registry Contract: `contracts/upgradeable/RWAAssetRegistryUpgradeable.sol`

## Notes

- The validation bounds (1000 ETH max token price, 1 billion ETH max total price) are intentionally generous to allow for legitimate high-value assets while catching corruption
- If validation fails, it indicates the root cause needs further investigation (storage layout, proxy mismatch, etc.)
- The registry contract itself appears to be working correctly based on direct queries

