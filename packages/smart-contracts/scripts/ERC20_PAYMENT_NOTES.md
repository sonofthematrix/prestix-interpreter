# ERC20 Payment Implementation Notes

## ✅ Completed

1. **Marketplace Contract Upgraded**: Added `purchaseTokensWithERC20()` function
2. **Payment Token Configured**: USDC set as payment token (`0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`)
3. **Properties Registered**: 4 properties registered with $1-$4 prices

## ⚠️ Known Issue: Price Conversion

The marketplace's `calculatePurchaseCost()` function returns costs in ETH (18 decimals), but USDC/EURC use 6 decimals. When purchasing with ERC20 tokens, the contract needs to:

1. **Option A**: Use a price oracle (Chainlink) to convert ETH price to USDC/EURC
2. **Option B**: Store separate prices for each payment token
3. **Option C**: Use a fixed conversion rate (not recommended for production)

### Current Behavior

- `calculatePurchaseCost(assetId, tokenAmount)` returns cost in ETH wei
- For USDC payments, this needs to be converted using current ETH/USDC rate
- Example: 0.0000000205 ETH ≈ $0.00006 USD (at $3000/ETH) = 0.00006 USDC

### Testing Workaround

For testing purposes, you can:
1. Use ETH payments instead (works perfectly)
2. Fund the buyer wallet with sufficient USDC/EURC (accounting for conversion)
3. Implement a price oracle in the contract

## Next Steps

1. **Implement Price Oracle**: Add Chainlink price feed for ETH/USDC and ETH/EURC
2. **Update calculatePurchaseCost**: Add parameter for payment token type
3. **Test with Oracle**: Verify purchases work correctly with price conversion

## Current Status

- ✅ Contract supports ERC20 payments
- ✅ Payment token configured
- ⚠️ Price conversion needs oracle implementation
- ✅ ETH payments work perfectly

