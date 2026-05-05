# ERC404 Testing Solution

## Problem Summary

All existing tokens are owned by contract address `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7` (an old marketplace contract), and we don't have access to its private key. This prevents direct token transfers for testing.

## Solution: Deploy New Test Token ✅

Deploy a new ERC404 token specifically for testing, with tokens minted directly to the buyer wallet.

### Quick Start

```bash
cd packages/smart-contracts
BUYER_WALLET_1=0xfe3dafa1c35b0562a910359f67d71ecb21328205 \
ASSET_ID=99 \
bun run hardhat run scripts/deploy-test-token-for-testing.ts --network sepolia
```

This will:
1. Register a new test asset in the registry (Asset ID 99)
2. Deploy a new ERC404 token via the fixed factory
3. Mint 1000 tokens directly to the buyer wallet
4. Verify the buyer has tokens for testing

### Then Run Lifecycle Tests

```bash
BUYER_WALLET_1=0xfe3dafa1c35b0562a910359f67d71ecb21328205 \
BUYER_KEY_1=f9ac6eb25ad51dd9c4d5605e9e2d97ed712f255267b2cd4b9455e2c08772d09b \
ASSET_IDS=99 \
bun run hardhat run scripts/test-erc404-token-lifecycle.ts --network sepolia
```

## Alternative Solutions

### Option 1: Direct Transfer (If You Have Holder's Key)

If you have the private key for `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7`:

```bash
HOLDER_KEY=<private_key> \
BUYER_WALLET_1=0xfe3dafa1c35b0562a910359f67d71ecb21328205 \
ASSET_IDS=1,2,3 \
bun run hardhat run scripts/transfer-tokens-for-testing.ts --network sepolia
```

### Option 2: Fix Marketplace Contract

Fix the marketplace contract's corrupted data to allow purchases:
- Registry shows: `0.000000000001 tokens` available (correct)
- Marketplace shows: `815492690561245246858434306133.286459396883480647 tokens` (corrupted)

This requires updating the marketplace contract's listing data.

## Scripts Created

1. **`deploy-test-token-for-testing.ts`** ✅ Recommended
   - Deploys new test token
   - Mints tokens directly to buyer wallet
   - No private key needed for holder

2. **`transfer-tokens-for-testing.ts`**
   - Transfers from holder to buyer
   - Requires holder's private key

3. **`mint-tokens-for-testing.ts`**
   - Uses factory mintTokens (transferFrom)
   - Requires owner approval (won't work without holder's key)

4. **`test-erc404-token-lifecycle.ts`**
   - Comprehensive ERC404 lifecycle tests
   - Tests: minting, token→NFT, NFT details, NFT→token, burning

5. **`find-token-holders.ts`**
   - Finds all token holders
   - Shows balances

6. **`check-buyer-token-balances.ts`**
   - Checks buyer wallet balances
   - Shows marketplace listings

7. **`debug-marketplace-purchase.ts`**
   - Debugs marketplace purchase issues
   - Identifies data corruption

8. **`check-holder-address.ts`**
   - Checks if holder is contract or EOA
   - Provides recommendations

## Test Coverage

Once tokens are acquired, the lifecycle test covers:

1. ✅ **Token Minting** - Verify token acquisition
2. ✅ **Token → NFT Conversion** - Convert 100% ownership to NFT
3. ✅ **NFT Details** - Check ownership, token ID, metadata URI
4. ✅ **NFT → Token Conversion** - Convert NFT back to tokens
5. ✅ **Token Burning** - Test burn functions

## Recommended Workflow

1. **Deploy Test Token**:
   ```bash
   BUYER_WALLET_1=0xfe3dafa1c35b0562a910359f67d71ecb21328205 ASSET_ID=99 \
   bun run hardhat run scripts/deploy-test-token-for-testing.ts --network sepolia
   ```

2. **Run Lifecycle Tests**:
   ```bash
   BUYER_WALLET_1=0xfe3dafa1c35b0562a910359f67d71ecb21328205 \
   BUYER_KEY_1=f9ac6eb25ad51dd9c4d5605e9e2d97ed712f255267b2cd4b9455e2c08772d09b \
   ASSET_IDS=99 \
   bun run hardhat run scripts/test-erc404-token-lifecycle.ts --network sepolia
   ```

3. **Verify Results**:
   - Check test output for successful conversions
   - Verify NFT creation and metadata
   - Confirm token burning works correctly

## Documentation

- `MARKETPLACE_ISSUE_DIAGNOSIS.md` - Marketplace data corruption analysis
- `ERC404_TEST_STATUS.md` - Current test status
- `TOKEN_TRANSFER_INSTRUCTIONS.md` - Token transfer options
- `ERC404_TESTING_SOLUTION.md` - This file
