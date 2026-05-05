# Marketplace Purchase Issue Diagnosis

## Root Cause Identified ✅

### Problem Summary

Marketplace purchases fail with `insufficient available tokens` despite showing billions of tokens available. The issue is **data corruption in the marketplace contract**.

### Key Findings

#### 1. Registry vs Marketplace Data Mismatch

**Registry (Correct)**:
- Available tokens: `0.000000000001 tokens` (1 wei = essentially 0)
- Status: `1` (ACTIVE)
- Token price: `0.01 ETH`

**Marketplace (Corrupted)**:
- Available tokens: `815492690561245246858434306133.286459396883480647 tokens` (corrupted data)
- Seller address: `0x000000000000000000000000002386F26fc10000` (suspicious - lots of zeros)
- Seller balance: `0 tokens`

#### 2. Purchase Failure Reason

The marketplace contract checks the registry for available tokens before allowing purchases. Since the registry correctly shows `0.000000000001 tokens` (essentially 0), purchases fail with:
```
execution reverted: RWAMarketplaceFixedV2: insufficient available tokens
```

#### 3. Actual Token Holder

All tokens are actually held by:
- **Address**: `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7`
- **Holdings**:
  - Asset 1: 1000.0 ASSET1 (100%)
  - Asset 2: 2000.0 ASSET2 (100%)
  - Asset 3: 500.0 ASSET3 (100%)
  - Asset 4: 1000000.0 ASSET4 (100%)

## Solution for Testing

Since marketplace purchases are blocked by corrupted data, we can transfer tokens directly from the holder for ERC404 lifecycle testing:

### Option 1: Direct Token Transfer (Recommended for Testing)

Use the `transfer-tokens-for-testing.ts` script:

```bash
cd packages/smart-contracts
HOLDER_KEY=<private_key_of_0xc9C369525DFf385935dfDC6aC2F678C26998D0d7> \
BUYER_WALLET_1=0xfe3dafa1c35b0562a910359f67d71ecb21328205 \
ASSET_IDS=1,2,3 \
bun run hardhat run scripts/transfer-tokens-for-testing.ts --network sepolia
```

This will transfer 100 tokens (or 10% of balance) from the holder to the buyer wallet for each asset.

### Option 2: Fix Marketplace Contract

The marketplace contract needs to be fixed to:
1. Correct the corrupted available tokens data
2. Update seller addresses to the actual token holder
3. Sync with registry data properly

## Test Scripts Created

### 1. `find-token-holders.ts`
- Finds all token holders by querying Transfer events
- Shows current balances for each holder
- Identifies largest holders

### 2. `transfer-tokens-for-testing.ts`
- Transfers tokens from holder to buyer wallet
- Requires holder's private key
- Transfers 100 tokens or 10% of balance (whichever is smaller)

### 3. `debug-marketplace-purchase.ts`
- Investigates marketplace purchase failures
- Compares registry vs marketplace data
- Identifies corrupted data issues

### 4. `check-buyer-token-balances.ts`
- Checks buyer wallet balances across all assets
- Shows marketplace listings

### 5. `test-erc404-token-lifecycle.ts`
- Comprehensive ERC404 lifecycle testing
- Tests: minting, token→NFT conversion, NFT details, NFT→token conversion, burning

## Next Steps

1. **For Testing**: Transfer tokens directly using `transfer-tokens-for-testing.ts`
2. **For Production**: Fix marketplace contract data corruption issue
3. **Run Tests**: Execute `test-erc404-token-lifecycle.ts` after acquiring tokens

## Files Created

- `scripts/find-token-holders.ts` - Find token holders
- `scripts/transfer-tokens-for-testing.ts` - Transfer tokens for testing
- `scripts/debug-marketplace-purchase.ts` - Debug marketplace issues
- `scripts/check-buyer-token-balances.ts` - Check buyer balances
- `scripts/test-erc404-token-lifecycle.ts` - ERC404 lifecycle tests
- `ERC404_TEST_STATUS.md` - Test status documentation
- `MARKETPLACE_ISSUE_DIAGNOSIS.md` - This file
