# Frontend Purchase Testing Guide

## Overview

This guide provides step-by-step instructions for testing the marketplace purchase flow through the frontend and verifying ERC404 token reuse.

## Prerequisites

1. **Frontend Running**: Ensure the Next.js frontend is running
   ```bash
   bun run dev
   ```

2. **Wallet Connected**: Have MetaMask or AppKit wallet connected to Sepolia testnet

3. **Test Assets**: Use assets 9-20 (1.0 ETH per token) for cost-effective testing

4. **Test ETH**: Ensure wallet has sufficient Sepolia ETH for purchases and gas

## Testing Workflow

### Step 1: Verify Purchase Readiness

Before testing, verify the purchase workflow is ready:

```bash
cd packages/smart-contracts
ASSET_ID=9 bun hardhat run scripts/test-purchase-workflow.ts --network sepolia
```

This will verify:
- ✅ Asset exists and is active
- ✅ ERC404 factory is configured
- ✅ Purchase cost calculation works
- ✅ Sufficient balance available

### Step 2: Test Frontend Purchase Flow

1. **Navigate to Purchase Page**
   - Open browser to: `http://localhost:3000/marketplace/[assetId]/purchase`
   - Example: `http://localhost:3000/marketplace/9/purchase`
   - Use assets 9-20 for lower-cost testing (1.0 ETH per token)

2. **Connect Wallet**
   - Click "Connect Wallet" button
   - Select MetaMask or AppKit wallet
   - Approve connection to Sepolia testnet

3. **Select Purchase Details**
   - Enter token amount (start with 1 token for testing)
   - Select payment method:
     - **ETH**: Direct ETH payment
     - **USDC/EURC**: Token payment (requires approval)
     - **Stripe**: Fiat payment (if configured)

4. **Review Purchase**
   - Verify total cost (includes marketplace fee)
   - Check token amount
   - Review asset details

5. **Execute Purchase**
   - Click "Purchase" button
   - Approve transaction in wallet
   - Wait for confirmation

6. **Verify Success**
   - Transaction success modal should appear
   - Note transaction hash
   - Verify ERC404 tokens received in wallet

### Step 3: Monitor Purchase

After making a purchase, monitor it:

```bash
cd packages/smart-contracts
bun hardhat run scripts/monitor-marketplace-purchases.ts --network sepolia
```

This will show:
- Recent purchase events
- Token addresses used
- Purchase details
- Buyer information

### Step 4: Verify ERC404 Token Reuse

After making multiple purchases for the same asset, verify tokens are reused:

```bash
cd packages/smart-contracts
bun hardhat run scripts/verify-erc404-token-reuse.ts --network sepolia
```

This will verify:
- ✅ No duplicate tokens created
- ✅ Same ERC404 token address used for all purchases
- ✅ Token addresses match factory records
- ✅ Purchase events are correct

## Test Scenarios

### Scenario 1: First Purchase (Token Creation)

1. Select asset (e.g., Asset 9)
2. Purchase 1 token
3. Verify:
   - Transaction succeeds
   - ERC404 token is created
   - Token address stored in factory
   - Tokens received in wallet

### Scenario 2: Second Purchase (Token Reuse)

1. Select same asset (Asset 9)
2. Purchase 1 more token
3. Verify:
   - Transaction succeeds
   - **Same ERC404 token address** is used
   - **No duplicate token created**
   - Additional tokens minted to existing token

### Scenario 3: Multiple Buyers

1. Buyer 1 purchases tokens for Asset 9
2. Buyer 2 purchases tokens for Asset 9
3. Verify:
   - Both purchases use same ERC404 token address
   - No duplicate tokens created
   - Each buyer receives their tokens

### Scenario 4: Different Assets

1. Purchase tokens for Asset 9
2. Purchase tokens for Asset 10
3. Verify:
   - Each asset gets its own ERC404 token
   - No token address conflicts
   - Tokens are correctly associated with assets

## Verification Checklist

After each purchase, verify:

- [ ] Transaction confirmed on blockchain
- [ ] Purchase event emitted correctly
- [ ] ERC404 token address matches factory record
- [ ] Tokens received in wallet
- [ ] No duplicate tokens created
- [ ] Token balance updated correctly

## Troubleshooting

### Issue: Transaction Fails

**Possible Causes**:
- Insufficient balance (need ETH for purchase + gas)
- Asset not active
- Token price too high
- Network mismatch (ensure Sepolia)

**Solution**:
- Check wallet balance
- Verify asset status
- Use assets 9-20 (lower prices)
- Ensure connected to Sepolia

### Issue: Token Not Received

**Possible Causes**:
- Transaction not confirmed
- Wrong network
- Token address not found

**Solution**:
- Wait for transaction confirmation
- Verify network is Sepolia
- Check transaction on Etherscan
- Run verification script

### Issue: Duplicate Tokens Created

**Possible Causes**:
- Marketplace upgrade not active
- ERC404 factory not configured
- Token finding logic not working

**Solution**:
- Verify marketplace upgrade completed
- Check ERC404 factory configuration
- Run verification script
- Check contract addresses

## Expected Results

### ✅ Success Indicators

1. **First Purchase**:
   - ERC404 token created
   - Token address stored in factory
   - Tokens minted to buyer

2. **Subsequent Purchases**:
   - Same ERC404 token address used
   - No duplicate tokens created
   - Additional tokens minted

3. **Verification**:
   - All purchases use same token address
   - Factory records match purchase events
   - No duplicate tokens detected

## Scripts Reference

### Test Purchase Workflow
```bash
ASSET_ID=9 bun hardhat run scripts/test-purchase-workflow.ts --network sepolia
```

### Monitor Purchases
```bash
bun hardhat run scripts/monitor-marketplace-purchases.ts --network sepolia
```

### Verify Token Reuse
```bash
bun hardhat run scripts/verify-erc404-token-reuse.ts --network sepolia
```

### Verify Asset Prices
```bash
bun hardhat run scripts/verify-asset-prices.ts --network sepolia
```

## Next Steps

After completing frontend testing:

1. ✅ Verify all purchases use correct ERC404 tokens
2. ✅ Confirm no duplicate tokens created
3. ✅ Test with multiple assets
4. ✅ Test with multiple buyers
5. ✅ Monitor gas costs
6. ✅ Document any issues found

## Related Documentation

- `ERC404_TESTING_COMPLETE.md` - Complete testing guide
- `ERC404_TOKEN_FINDING_TEST_GUIDE.md` - Token finding test guide
- `.cursor/rules/erc404-marketplace-testing.mdc` - Testing patterns

