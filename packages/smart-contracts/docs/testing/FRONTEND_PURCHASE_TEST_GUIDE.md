# Frontend Purchase Flow Test Guide

## Overview
This guide provides step-by-step instructions for testing the marketplace purchase flow and verifying ERC404 token reuse functionality.

## Prerequisites

### 1. Environment Setup
- Frontend running on `http://localhost:3000`
- Wallet connected (MetaMask or AppKit)
- Sepolia testnet ETH in wallet
- Smart contracts deployed and verified

### 2. Test Assets
**Recommended for Testing** (1.0 ETH per token):
- Asset ID 9: Luxury Beachfront Villa Bali
- Asset ID 10: Modern Mountain Estate
- Asset ID 11: Mediterranean Coastal Villa
- Asset ID 12: Luxury Superyacht

**Not Recommended** (75-100 ETH per token):
- Asset IDs 1-8: Too expensive for testing

## Test Flow

### Step 1: Access Purchase Page

**URL Format**: `http://localhost:3000/marketplace/[asset-id]/purchase`

**Example URLs**:
- Asset 9: `http://localhost:3000/marketplace/9/purchase`
- Asset 10: `http://localhost:3000/marketplace/10/purchase`
- Asset 11: `http://localhost:3000/marketplace/11/purchase`

**Alternative Access**:
- Navigate to marketplace listing page
- Click "Purchase" button on asset card
- Or add `?action=purchase` to asset detail URL

### Step 2: Connect Wallet

1. Click "Connect Wallet" button
2. Choose wallet provider:
   - **MetaMask**: Browser extension
   - **AppKit**: WalletConnect modal
3. Select Sepolia network
4. Approve connection

**Expected Result**: Wallet address displayed, balance shown

### Step 3: Configure Purchase

1. **Select Token Amount**:
   - Start with 1 token for first purchase
   - Use input field to change amount
   - Verify cost calculation updates

2. **Choose Payment Method**:
   - **ETH** (Recommended for testing):
     - Direct ETH payment
     - No token approval needed
   - **USDC/EURC**:
     - Requires token approval first
     - More complex flow

3. **Review Purchase Details**:
   - Token amount
   - Total cost (including marketplace fee)
   - Estimated gas cost
   - Final total

### Step 4: Execute First Purchase

1. Click "Purchase" button
2. Review transaction in wallet
3. Confirm transaction
4. Wait for confirmation (usually 1-2 blocks)

**Expected Result**:
- Transaction submitted
- Success modal appears
- Transaction hash displayed
- Link to Sepolia explorer

### Step 5: Verify First Purchase

**Check Transaction**:
- Click explorer link
- Verify transaction details
- Confirm tokens purchased
- Note ERC404 token address (if visible)

**Check Database**:
- Investment record created
- Token balance updated
- Transaction logged

### Step 6: Execute Second Purchase (Token Reuse Test)

1. Navigate to same asset purchase page
2. Connect same wallet
3. Select token amount (e.g., 1 token)
4. Complete purchase

**Expected Result**:
- Same ERC404 token address used
- No new token created
- Tokens added to existing balance

### Step 7: Verify Token Reuse

**Run Verification Script**:
```bash
cd packages/smart-contracts
NEXT_PUBLIC_RWA_MARKETPLACE=0xc9C369525DFf385935dfDC6aC2F678C26998D0d7 \
  bun hardhat run scripts/verify-erc404-token-reuse.ts --network sepolia
```

**Expected Output**:
```
✅ VERIFICATION PASSED:
   - All assets use a single ERC404 token address
   - No duplicate tokens detected
   - ERC404 token reuse is working correctly
```

## Monitoring Purchases

### Real-Time Monitoring

**Run Monitoring Script**:
```bash
cd packages/smart-contracts
bun hardhat run scripts/monitor-marketplace-purchases.ts --network sepolia
```

**What It Shows**:
- Recent purchase events
- Token addresses used
- Purchase details (buyer, amount, cost)
- Duplicate detection

### Manual Verification

**Check ERC404 Factory**:
```bash
# Get token address for asset
cast call 0x7a6f7dE826064903f2e419833b9633560217FEe2 \
  "getTokenAddress(uint256)" 9 \
  --rpc-url $SEPOLIA_RPC_URL
```

**Check Marketplace Events**:
```bash
# Query purchase events
cast logs \
  --from-block 9765000 \
  --to-block latest \
  "TokensPurchased(uint256 indexed assetId, address indexed buyer, uint256 tokenAmount, uint256 totalCost)" \
  --address 0xc9C369525DFf385935dfDC6aC2F678C26998D0d7 \
  --rpc-url $SEPOLIA_RPC_URL
```

## Troubleshooting

### Issue: Wallet Not Connecting

**Solutions**:
- Check network is Sepolia
- Refresh page
- Clear browser cache
- Try different wallet provider

### Issue: Transaction Fails

**Common Causes**:
- Insufficient ETH balance
- Gas price too low
- Contract revert (check error message)
- Asset not registered on blockchain

**Solutions**:
- Add more ETH to wallet
- Increase gas price
- Check asset registration status
- Verify contract addresses

### Issue: High Gas Costs

**Solutions**:
- Use assets 9-20 (lower token prices)
- Purchase fewer tokens
- Wait for lower network congestion
- Use L2 network (if available)

### Issue: Token Not Found After Purchase

**Solutions**:
- Wait for more block confirmations
- Check transaction status
- Verify ERC404 token address
- Run verification script

## Success Criteria

### ✅ Purchase Flow Working
- [ ] Wallet connects successfully
- [ ] Purchase transaction executes
- [ ] Transaction confirms on blockchain
- [ ] Success modal displays correctly
- [ ] Database updated with investment

### ✅ Token Reuse Working
- [ ] First purchase creates ERC404 token
- [ ] Second purchase uses same token
- [ ] No duplicate tokens created
- [ ] Token balance accumulates correctly
- [ ] Verification script confirms reuse

### ✅ Monitoring Working
- [ ] Purchase events detected
- [ ] Token addresses verified
- [ ] No duplicates found
- [ ] Purchase details accurate

## Test Checklist

### First Purchase
- [ ] Navigate to purchase page
- [ ] Connect wallet
- [ ] Select token amount
- [ ] Choose payment method
- [ ] Execute purchase
- [ ] Verify transaction success
- [ ] Check ERC404 token created

### Second Purchase (Same Asset)
- [ ] Navigate to same asset
- [ ] Connect same wallet
- [ ] Execute purchase
- [ ] Verify same token address used
- [ ] Confirm no duplicate created

### Verification
- [ ] Run verification script
- [ ] Check monitoring output
- [ ] Verify token addresses match
- [ ] Confirm no duplicates

## Related Scripts

- **Verify Asset Prices**: `scripts/verify-asset-prices.ts`
- **Test Token Finding**: `scripts/test-erc404-token-finding.ts`
- **Monitor Purchases**: `scripts/monitor-marketplace-purchases.ts`
- **Verify Token Reuse**: `scripts/verify-erc404-token-reuse.ts`

## Related Documentation

- [ERC404 Testing Complete Guide](./ERC404_TESTING_COMPLETE.md)
- [ERC404 Token Finding Test Guide](./ERC404_TOKEN_FINDING_TEST_GUIDE.md)
- [Marketplace Configuration](../MARKETPLACE_CONFIGURATION_COMPLETE.md)

## Support

If you encounter issues:
1. Check transaction on Sepolia explorer
2. Review contract events
3. Run verification scripts
4. Check console logs
5. Review error messages

