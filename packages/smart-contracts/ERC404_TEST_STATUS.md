# ERC404 Token Lifecycle Test Status

## Test Script Created

**File**: `packages/smart-contracts/scripts/test-erc404-token-lifecycle.ts`

## Current Status

### ✅ Script Functionality
The comprehensive test script has been created and successfully:
- ✅ Connects to the fixed factory (`RWATokenFactory404Fixed`)
- ✅ Retrieves all deployed tokens
- ✅ Attempts to acquire tokens via marketplace purchase
- ✅ Checks token balances
- ✅ Validates ERC404 contract interfaces

### ⚠️ Test Execution Status

**Buyer Wallet**: `0xFe3DafA1c35b0562A910359f67d71eCB21328205`

**Current Issue**: All marketplace purchases fail with:
```
execution reverted: RWAMarketplaceFixedV2: insufficient available tokens
```

**Root Cause Identified**: Marketplace contract has corrupted data:
- **Registry (Correct)**: Shows `0.000000000001 tokens` available (essentially 0)
- **Marketplace (Corrupted)**: Shows `815492690561245246858434306133.286459396883480647` tokens available
- **Actual Token Holder**: `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7` owns 100% of all tokens

**Solution**: Transfer tokens directly from holder for testing (see `MARKETPLACE_ISSUE_DIAGNOSIS.md`)

## Test Coverage

The script tests the complete ERC404 lifecycle:

### 1. Token Minting ✅
- Checks buyer wallet balance
- Attempts marketplace purchase
- Validates token acquisition

### 2. Token → NFT Conversion ⏳
- Requires: Buyer owns 100% of tokens
- Tests: `convertToNFT()` function
- Validates: NFT creation and token burning

### 3. NFT Details Verification ⏳
- Checks: `nftExists()`, `nftOwner()`, `nftTokenId()`
- Retrieves: `tokenURI()` metadata
- Validates: NFT ownership and metadata

### 4. NFT → Token Conversion ⏳
- Tests: `convertToFungible()` function
- Validates: Token restoration and NFT burning

### 5. Token Burning ⏳
- Tests: `burn()` and `burnFrom()` functions
- Validates: Token supply reduction

## Next Steps to Complete Testing

### Option 1: Fix Marketplace Issue
Investigate why `getActiveListing()` reports incorrect available tokens and why `purchaseTokens()` fails despite showing availability.

### Option 2: Direct Token Transfer
If buyer wallet needs tokens for testing:
1. Identify token holders (via Transfer events)
2. Transfer tokens directly from holders to buyer wallet
3. Run lifecycle tests with acquired tokens

### Option 3: Create Test Token
Deploy a new test token specifically for ERC404 lifecycle testing:
1. Deploy via factory
2. Mint tokens to buyer wallet
3. Run comprehensive tests

## Script Usage

### With Buyer Wallet Credentials
```bash
cd packages/smart-contracts
BUYER_WALLET_1=0xfe3dafa1c35b0562a910359f67d71ecb21328205 \
BUYER_KEY_1=f9ac6eb25ad51dd9c4d5605e9e2d97ed712f255267b2cd4b9455e2c08772d09b \
ASSET_IDS=1,2,3 \
bun run hardhat run scripts/test-erc404-token-lifecycle.ts --network sepolia
```

### Check Buyer Balances
```bash
BUYER_WALLET_1=0xfe3dafa1c35b0562a910359f67d71ecb21328205 \
BUYER_KEY_1=f9ac6eb25ad51dd9c4d5605e9e2d97ed712f255267b2cd4b9455e2c08772d09b \
bun run hardhat run scripts/check-buyer-token-balances.ts --network sepolia
```

## Test Results Summary

**Assets Tested**: 4 (Asset IDs: 1, 2, 3, 4)

**Results**:
- ✅ Script execution: Successful
- ⚠️ Token acquisition: Failed (marketplace issue)
- ⏳ ERC404 lifecycle tests: Pending (requires tokens)

**Recommendation**: Investigate marketplace contract to resolve token availability issue, or acquire tokens via direct transfer for testing.
