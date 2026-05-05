# Complete Integration Plan - Marketplace Purchase Flow

## Executive Summary

This document provides a complete review of the marketplace purchase flow implementation, testing results, and integration plan for frontend, services, and API.

## 1. Script Implementation Review

### Working Script: `purchase-with-usdc-eurc.ts`

**Status:** ✅ Fully tested and working

**Key Features:**
- Supports USDC and EURC payments
- Validates marketplace payment token configuration
- Uses `calculatePurchaseCostInPaymentToken()` for accurate cost calculation
- Checks balance and allowance before purchase
- Handles errors gracefully with clear messages
- Records purchase transaction details

**Test Results:**
- ✅ Purchase with USDC successful (Asset 11, 1 token, 0.001025 USDC)
- ✅ Transaction hash: `0x85beb0104eade67c100bac21121fcaeeb2d84a5eb7ad91f894489ad468a2b03b`
- ✅ Gas used: 504,562
- ✅ Block: 9766007

### Bug Fixes Applied

1. **Marketplace Fee Bug** ✅ FIXED
   - Problem: Corrupted `_marketplaceFeePercentage` storage
   - Fix: Set fee to 250 (2.5%) using `setMarketplaceFee(250)`
   - Script: `fix-marketplace-fee.ts`

2. **Missing TOKEN_MANAGER_ROLE** ✅ FIXED
   - Problem: Marketplace missing `TOKEN_MANAGER_ROLE` on upgradeable token factory
   - Fix: Granted role using `grant-token-creator-role.ts`
   - Role hash: `0x74f7a545c65c11839a48d7453738b30c295408df2d944516167556759ddc6d06`

## 2. Current Frontend Implementation

### PurchaseDialog.tsx

**Current State:**
- ✅ Supports ETH, USDC, EURC payment methods
- ✅ Checks token balance and allowance
- ⚠️ Uses `calculatePurchaseCost()` for all payment types (should use `calculatePurchaseCostInPaymentToken` for USDC/EURC)
- ✅ Has approval flow (needs update to use correct cost calculation)
- ✅ Records purchase via API

**Issues:**
1. Uses ETH cost calculation for USDC/EURC (incorrect decimals)
2. Approval check uses ETH cost instead of payment token cost
3. Doesn't verify marketplace payment token configuration

### Purchase Page (`/marketplace/[id]/purchase`)

**Current State:**
- ✅ Similar to PurchaseDialog
- ✅ Full-page purchase flow
- ⚠️ Same issues as PurchaseDialog

### Marketplace Service (`marketplace-service.ts`)

**Current State:**
- ✅ Has `calculatePurchaseCost()` for ETH
- ✅ Has `purchaseTokens()` for ETH
- ✅ Added `calculatePurchaseCostInPaymentToken()` ✅ NEW
- ✅ Added `purchaseTokensWithERC20()` ✅ NEW
- ✅ Added `getPaymentToken()` ✅ NEW

## 3. Integration Requirements

### 3.1 Frontend Components

#### Update PurchaseDialog.tsx

**Changes Required:**

1. **Add to MARKETPLACE_ABI:**
```typescript
const MARKETPLACE_ABI = [
  // ... existing ...
  'function calculatePurchaseCostInPaymentToken(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
  'function assetRegistry() view returns (address)', // Already added
] as const;
```

2. **Conditional Cost Calculation:**
```typescript
// For ETH payments
const { data: purchaseCostDataETH } = useReadContract({
  address: MARKETPLACE_ADDRESS,
  abi: MARKETPLACE_ABI,
  functionName: 'calculatePurchaseCost',
  args: blockchainAssetId !== null ? [BigInt(blockchainAssetId), BigInt(tokenAmount)] : undefined,
  query: {
    enabled: blockchainAssetId !== null && tokenAmount > 0 && cryptoPaymentToken === 'ETH',
  },
});

// For USDC/EURC payments
const { data: purchaseCostDataERC20 } = useReadContract({
  address: MARKETPLACE_ADDRESS,
  abi: MARKETPLACE_ABI,
  functionName: 'calculatePurchaseCostInPaymentToken',
  args: blockchainAssetId !== null ? [BigInt(blockchainAssetId), BigInt(tokenAmount)] : undefined,
  query: {
    enabled: blockchainAssetId !== null && tokenAmount > 0 && (cryptoPaymentToken === 'USDC' || cryptoPaymentToken === 'EURC'),
  },
});

// Combine based on payment token
const purchaseCostData = cryptoPaymentToken === 'ETH' ? purchaseCostDataETH : purchaseCostDataERC20;
```

3. **Update Cost Display:**
```typescript
const decimals = cryptoPaymentToken === 'ETH' ? 18 : 6; // USDC/EURC use 6 decimals
const [totalCost] = purchaseCostData as [bigint, bigint];
const formattedCost = formatUnits(totalCost, decimals);
```

4. **Update Approval Check:**
```typescript
// Use payment token cost for allowance check
useEffect(() => {
  if (purchaseCostData && tokenAllowanceData && paymentTokenAddress) {
    const [totalCost] = purchaseCostData as [bigint, bigint];
    const allowance = tokenAllowanceData as bigint;
    setNeedsApproval(allowance < totalCost);
  }
}, [purchaseCostData, tokenAllowanceData, paymentTokenAddress]);
```

5. **Add Marketplace Payment Token Check:**
```typescript
const { data: marketplacePaymentToken } = useReadContract({
  address: MARKETPLACE_ADDRESS,
  abi: MARKETPLACE_ABI,
  functionName: 'paymentToken',
});

// Show warning if ERC20 payments not configured
useEffect(() => {
  if (cryptoPaymentToken !== 'ETH' && marketplacePaymentToken === ethers.ZeroAddress) {
    // Show error: ERC20 payments not enabled
  }
}, [cryptoPaymentToken, marketplacePaymentToken]);
```

#### Update Purchase Page

**Same changes as PurchaseDialog.tsx**

### 3.2 API Routes

#### Update `/api/marketplace/crypto-purchase/route.ts`

**Current Implementation:**
- Records purchase with `ethAmount` and `usdAmount`
- Doesn't store payment token type

**Required Changes:**

```typescript
interface PurchaseRequest {
  assetId: string;
  tokenAmount: number;
  walletAddress: string;
  transactionHash: string;
  paymentToken: 'ETH' | 'USDC' | 'EURC'; // ✅ ADD
  paymentTokenAmount?: string; // ✅ ADD - Amount in payment token units
  ethAmount?: string; // Only for ETH payments
  usdAmount: string;
  marketplaceAddress: string;
}

// Store payment token in investment metadata
const investment = await db.investment.create({
  data: {
    // ... existing fields ...
    metadata: {
      ...existingMetadata,
      paymentToken: body.paymentToken,
      paymentTokenAmount: body.paymentTokenAmount,
    },
  },
});
```

### 3.3 Error Handling

**Add Comprehensive Error Handling:**

```typescript
// Based on script error handling patterns
try {
  // Purchase logic
} catch (error: any) {
  if (error.message.includes('insufficient token balance')) {
    // Show balance error with required amount
  } else if (error.message.includes('insufficient token allowance')) {
    // Show approval button
  } else if (error.message.includes('ERC20 payments not enabled')) {
    // Show configuration error
  } else if (error.message.includes('asset not active')) {
    // Show asset status error
  } else {
    // Generic error
  }
}
```

## 4. Testing Plan

### Unit Tests

- [ ] Test `calculatePurchaseCostInPaymentToken` with different assets
- [ ] Test balance and allowance checks
- [ ] Test error handling for each error type

### Integration Tests

- [ ] Test ETH purchase flow end-to-end
- [ ] Test USDC purchase flow end-to-end
- [ ] Test EURC purchase flow end-to-end
- [ ] Test approval flow
- [ ] Test error scenarios

### Manual Testing

- [ ] Purchase with ETH
- [ ] Purchase with USDC
- [ ] Purchase with EURC
- [ ] Test insufficient balance error
- [ ] Test insufficient allowance error
- [ ] Test approval flow
- [ ] Verify transaction recording

## 5. Implementation Checklist

### Phase 1: Service Layer ✅ COMPLETE
- [x] Add `calculatePurchaseCostInPaymentToken()` to marketplace service
- [x] Add `purchaseTokensWithERC20()` to marketplace service
- [x] Add `getPaymentToken()` to marketplace service

### Phase 2: Frontend Components
- [ ] Update PurchaseDialog.tsx
  - [ ] Add `calculatePurchaseCostInPaymentToken` to ABI
  - [ ] Conditional cost calculation
  - [ ] Update cost display
  - [ ] Update approval check
  - [ ] Add payment token configuration check
- [ ] Update purchase/page.tsx (same changes)

### Phase 3: API Routes
- [ ] Update crypto-purchase route
  - [ ] Add payment token fields
  - [ ] Store payment token in investment metadata

### Phase 4: Error Handling
- [ ] Add comprehensive error handling
- [ ] User-friendly error messages
- [ ] Error recovery flows

### Phase 5: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] Edge case testing

## 6. Files to Update

### Frontend
1. `src/components/marketplace/PurchaseDialog.tsx`
2. `src/app/marketplace/[id]/purchase/page.tsx`

### Services
1. `src/lib/contracts/marketplace-service.ts` ✅ COMPLETE

### API
1. `src/app/api/marketplace/crypto-purchase/route.ts`

### Documentation
1. `packages/smart-contracts/docs/testing/INTEGRATION_SUMMARY.md` ✅ CREATED
2. `packages/smart-contracts/docs/testing/FRONTEND_INTEGRATION_GUIDE.md` ✅ CREATED
3. `packages/smart-contracts/docs/testing/COMPLETE_INTEGRATION_PLAN.md` ✅ CREATED

## 7. Key Learnings from Scripts

1. **Always use `calculatePurchaseCostInPaymentToken` for USDC/EURC**
   - Returns correct decimals (6 for USDC/EURC)
   - Uses price oracle for accurate conversion

2. **Check marketplace payment token configuration**
   - Verify `paymentToken()` is not zero address
   - Match selected token with configured token

3. **Use marketplace's registry address**
   - Get via `marketplace.assetRegistry()`
   - Don't assume registry address

4. **Comprehensive error handling**
   - Check balance before purchase
   - Check allowance before purchase
   - Verify asset is active
   - Verify tokens available

5. **Proper decimal handling**
   - ETH: 18 decimals
   - USDC/EURC: 6 decimals
   - Always use correct decimals for formatting

## 8. Next Steps

1. **Review this plan** with team
2. **Update frontend components** (PurchaseDialog, Purchase Page)
3. **Update API routes** (crypto-purchase)
4. **Add error handling** based on script patterns
5. **Test all payment flows**
6. **Deploy and monitor**

## 9. Related Documentation

- [Marketplace Bug Fix Summary](./MARKETPLACE_BUG_FIX_SUMMARY.md)
- [Frontend Integration Guide](./FRONTEND_INTEGRATION_GUIDE.md)
- [Integration Summary](./INTEGRATION_SUMMARY.md)
- [ERC404 Token Finding Test Guide](./ERC404_TOKEN_FINDING_TEST_GUIDE.md)

## 10. Scripts Reference

All working scripts are in `packages/smart-contracts/scripts/`:

- `purchase-with-usdc-eurc.ts` - Main purchase script (reference implementation)
- `approve-token-spending.ts` - Token approval helper
- `check-buyer-wallet-balances.ts` - Balance checking utility
- `configure-marketplace-payment-token.ts` - Payment token configuration
- `fix-marketplace-fee.ts` - Marketplace fee fix
- `grant-token-creator-role.ts` - Role management
- `update-asset-token-price.ts` - Asset price updates
- `activate-asset.ts` - Asset activation

