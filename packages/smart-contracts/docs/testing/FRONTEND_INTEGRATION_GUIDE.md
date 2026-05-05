# Frontend Integration Guide - Marketplace Purchase Flow

## Overview

This guide documents the integration of the marketplace purchase flow from the working scripts into the frontend, services, and API.

## Key Changes from Scripts

### 1. Purchase Cost Calculation

**Script Pattern:**
```typescript
// For USDC/EURC, use calculatePurchaseCostInPaymentToken
const [totalCostTokens, marketplaceFeeTokens] = await marketplace.calculatePurchaseCostInPaymentToken(assetId, tokenAmount);
```

**Frontend Integration:**
- Use `calculatePurchaseCost` for ETH payments
- Use `calculatePurchaseCostInPaymentToken` for USDC/EURC payments
- Both methods return `[totalCost, marketplaceFee]` tuple

### 2. Payment Token Configuration Check

**Script Pattern:**
```typescript
const marketplacePaymentToken = await marketplace.paymentToken();
if (marketplacePaymentToken === ethers.ZeroAddress) {
  throw new Error('Marketplace ERC20 payments not configured');
}
```

**Frontend Integration:**
- Check `paymentToken()` before allowing USDC/EURC purchases
- Show appropriate error if ERC20 payments not enabled
- Allow ETH purchases regardless of payment token configuration

### 3. Balance and Allowance Checks

**Script Pattern:**
```typescript
const buyerBalance = await paymentToken.balanceOf(buyerSigner.address);
const buyerAllowance = await paymentToken.allowance(buyerSigner.address, MARKETPLACE_PROXY);

if (buyerAllowance < totalCost) {
  throw new Error('Insufficient token allowance. Please approve first.');
}
if (buyerBalance < totalCost) {
  throw new Error('Insufficient token balance');
}
```

**Frontend Integration:**
- Check balance before purchase
- Check allowance before purchase
- Show approval button if allowance insufficient
- Disable purchase button if balance insufficient

### 4. Purchase Execution

**Script Pattern:**
```typescript
// For ETH
const purchaseTx = await marketplace.purchaseTokens(assetId, tokenAmount, { value: totalCost });

// For USDC/EURC
const purchaseTx = await marketplace.purchaseTokensWithERC20(assetId, tokenAmount);
```

**Frontend Integration:**
- Use `purchaseTokens` for ETH (with `value` parameter)
- Use `purchaseTokensWithERC20` for USDC/EURC (no `value` parameter)
- Handle transaction confirmation and error states

## Updated Components

### 1. Marketplace Service (`src/lib/contracts/marketplace-service.ts`)

**Added Methods:**
- `calculatePurchaseCostInPaymentToken()` - Calculate cost in USDC/EURC
- `purchaseTokensWithERC20()` - Purchase with ERC20 tokens
- `getPaymentToken()` - Get configured payment token address

**Key Features:**
- Automatic balance and allowance checks
- Proper error handling
- Gas metrics tracking

### 2. Purchase Dialog (`src/components/marketplace/PurchaseDialog.tsx`)

**Updates:**
- Use `calculatePurchaseCostInPaymentToken` for USDC/EURC cost calculation
- Check marketplace payment token configuration
- Show approval button when needed
- Validate balance before purchase
- Handle both ETH and ERC20 purchases

### 3. Purchase Page (`src/app/marketplace/[id]/purchase/page.tsx`)

**Updates:**
- Same as PurchaseDialog
- Full-page purchase flow
- Transaction status tracking

## API Routes

### 1. Crypto Purchase Recording (`src/app/api/marketplace/crypto-purchase/route.ts`)

**Current Implementation:**
- Records purchase in database after on-chain transaction
- Links transaction hash to investment record

**Recommended Updates:**
- Add payment token field (ETH/USDC/EURC)
- Store payment token amount separately
- Validate payment token matches transaction

## Error Handling

### Common Errors and Solutions

1. **"Marketplace ERC20 payments not configured"**
   - Solution: Configure payment token on marketplace contract
   - Script: `configure-marketplace-payment-token.ts`

2. **"Insufficient token allowance"**
   - Solution: Approve marketplace to spend tokens
   - Frontend: Show approval button
   - Script: `approve-token-spending.ts`

3. **"Insufficient token balance"**
   - Solution: Fund wallet with payment token
   - Frontend: Show balance and required amount
   - Script: `fund-buyer-wallet.ts`

4. **"Asset not active"**
   - Solution: Activate asset in registry
   - Script: `activate-asset.ts`

5. **"Insufficient tokens available"**
   - Solution: Check asset availability
   - Frontend: Show available tokens

## Testing Checklist

- [ ] ETH purchase flow works
- [ ] USDC purchase flow works
- [ ] EURC purchase flow works
- [ ] Cost calculation correct for all payment tokens
- [ ] Balance checks work correctly
- [ ] Allowance checks work correctly
- [ ] Approval flow works
- [ ] Error messages are user-friendly
- [ ] Transaction recording works
- [ ] Gas metrics tracked

## Related Scripts

- `purchase-with-usdc-eurc.ts` - Reference implementation
- `approve-token-spending.ts` - Token approval helper
- `check-buyer-wallet-balances.ts` - Balance checking utility
- `configure-marketplace-payment-token.ts` - Payment token configuration
- `fix-marketplace-fee.ts` - Marketplace fee fix

## Next Steps

1. Update frontend components to use `calculatePurchaseCostInPaymentToken`
2. Add approval flow to frontend
3. Update API routes to handle payment token information
4. Add comprehensive error handling
5. Test all payment flows

