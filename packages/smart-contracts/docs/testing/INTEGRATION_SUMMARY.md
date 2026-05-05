# Marketplace Purchase Flow Integration Summary

## Overview

This document summarizes the integration of the working marketplace purchase flow from scripts into the frontend, services, and API.

## Script Baseline (`purchase-with-usdc-eurc.ts`)

### Key Flow Steps:

1. **Load Configuration**
   - Marketplace proxy address
   - Payment token addresses (USDC/EURC)
   - Asset registry address
   - Buyer wallet and private key

2. **Validate Payment Token**
   - Check marketplace `paymentToken()` configuration
   - Verify payment token matches selected token
   - Error if ERC20 payments not enabled

3. **Fetch Asset Details**
   - Get asset from marketplace's registry (not script's registry)
   - Verify asset is active (status === 1)
   - Check available tokens >= requested amount

4. **Calculate Purchase Cost**
   - For USDC/EURC: Use `calculatePurchaseCostInPaymentToken()`
   - Returns `[totalCost, marketplaceFee]` in payment token units
   - Includes proper decimal handling (6 decimals for USDC/EURC)

5. **Check Balance and Allowance**
   - Check buyer's token balance
   - Check buyer's allowance for marketplace
   - Error if insufficient balance or allowance

6. **Execute Purchase**
   - Call `purchaseTokensWithERC20(assetId, tokenAmount)`
   - No `value` parameter (ERC20 handles transfer internally)
   - Wait for transaction confirmation

7. **Verify Results**
   - Check updated balance
   - Display transaction hash and block number

## Integration Points

### 1. Marketplace Service (`src/lib/contracts/marketplace-service.ts`)

**✅ COMPLETED:**
- Added `calculatePurchaseCostInPaymentToken()` method
- Added `purchaseTokensWithERC20()` method
- Added `getPaymentToken()` method
- Added balance and allowance checks
- Added proper error handling

### 2. Frontend Components

**🔄 IN PROGRESS:**
- Update `PurchaseDialog.tsx` to use `calculatePurchaseCostInPaymentToken` for USDC/EURC
- Update `purchase/page.tsx` to use `calculatePurchaseCostInPaymentToken` for USDC/EURC
- Add `calculatePurchaseCostInPaymentToken` to MARKETPLACE_ABI
- Update cost display logic to handle payment token decimals
- Update approval flow to use correct cost calculation

### 3. API Routes

**📋 TODO:**
- Update `crypto-purchase/route.ts` to handle payment token information
- Store payment token type (ETH/USDC/EURC) in investment record
- Validate payment token matches transaction

## Key Differences: Script vs Frontend

| Aspect | Script | Frontend |
|--------|--------|----------|
| Cost Calculation | `calculatePurchaseCostInPaymentToken()` for USDC/EURC | Currently uses `calculatePurchaseCost()` for all |
| Registry Address | Uses marketplace's registry via `assetRegistry()` | May use hardcoded registry |
| Error Handling | Comprehensive with clear messages | Basic error handling |
| Approval Flow | Separate script | Integrated in component |
| Balance Check | Explicit checks before purchase | Uses React hooks |

## Required Changes

### Frontend Components

1. **Add to MARKETPLACE_ABI:**
```typescript
'function calculatePurchaseCostInPaymentToken(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
```

2. **Conditional Cost Calculation:**
```typescript
// For ETH
const { data: purchaseCostData } = useReadContract({
  functionName: 'calculatePurchaseCost',
  // ...
});

// For USDC/EURC
const { data: purchaseCostData } = useReadContract({
  functionName: 'calculatePurchaseCostInPaymentToken',
  // ...
});
```

3. **Update Cost Display:**
```typescript
const decimals = cryptoPaymentToken === 'ETH' ? 18 : 6; // USDC/EURC use 6 decimals
const formattedCost = formatUnits(totalCost, decimals);
```

4. **Update Approval Check:**
```typescript
// Use payment token cost for allowance check
const needsApproval = allowance < totalCostTokens; // Not totalCostEth
```

### API Routes

1. **Update crypto-purchase route:**
```typescript
{
  paymentToken: 'USDC' | 'EURC' | 'ETH',
  paymentTokenAmount: string, // Amount in payment token units
  ethAmount?: string, // Only for ETH payments
}
```

## Testing Checklist

- [x] Marketplace service methods added
- [ ] Frontend uses `calculatePurchaseCostInPaymentToken` for USDC/EURC
- [ ] Cost display shows correct decimals (6 for USDC/EURC, 18 for ETH)
- [ ] Approval flow uses correct cost calculation
- [ ] Balance checks use correct decimals
- [ ] API records payment token information
- [ ] Error messages are user-friendly
- [ ] Transaction recording works correctly

## Next Steps

1. Update PurchaseDialog.tsx
2. Update purchase/page.tsx
3. Update API routes
4. Test all payment flows
5. Update documentation

