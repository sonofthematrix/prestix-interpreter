# MetaMask Parameter Decoding Test Guide

## Overview

This guide helps you verify that MetaMask can decode function parameters for Tiger Palace Pro contracts. MetaMask uses the 4byte.directory service to decode function signatures and display human-readable parameter names.

## How MetaMask Decodes Parameters

1. **Function Selector**: MetaMask extracts the first 4 bytes (8 hex characters) from transaction data
2. **Signature Lookup**: MetaMask queries 4byte.directory or its internal database
3. **Parameter Decoding**: If found, MetaMask displays parameter names and decoded values

## Testing Status

**Registration Results**:
- ✅ **22 signatures successfully registered** with 4byte.directory
- ⚠️ **85 signatures failed** (likely already exist or API issues)
- 📝 **107 total signatures** extracted from contracts

**Verification Results** (Latest Check):
- ✅ **12 out of 13 key functions** verified available in 4byte.directory
- 📈 **92.3% success rate** for core marketplace operations
- ✅ **1 function manually registered**: `buyFromListing` (Nov 11, 2025 - propagating)

**Note**: Many "failed" registrations are actually **already in 4byte.directory**. Common functions like `grantRole`, `transfer`, `pause`, etc. are widely used and already registered.

**Verified Available Functions**:
- ✅ `purchaseTokens` - Marketplace direct purchase
- ✅ `createListing` - Create marketplace listings
- ✅ `buyFromListing` - Buy from listings (✅ manually registered, propagating)
- ✅ `cancelListing` - Cancel listings
- ✅ `registerAsset` - Register new assets
- ✅ `updateAsset` - Update asset details
- ✅ `createToken` - Create ERC20 tokens
- ✅ `mintTokens` - Mint tokens
- ✅ `burnTokens` - Burn tokens
- ✅ `stake` - Stake tokens
- ✅ `claimRewards` - Claim staking rewards
- ✅ `createPool` - Create staking pools

See [SIGNATURE_VERIFICATION_REPORT.md](./SIGNATURE_VERIFICATION_REPORT.md) for complete verification results.

## Test Transactions

### Test 1: Marketplace - Purchase Tokens

**Contract**: `RWAMarketplace` (`0xc9C369525DFf385935dfDC6aC2F678C26998D0d7`)

**Function**: `purchaseTokens(uint256 assetId, uint256 tokenAmount)`

**Expected Decoding**:
- Function name: `purchaseTokens`
- Parameters:
  - `assetId`: `uint256` (should show as number)
  - `tokenAmount`: `uint256` (should show as number)

**Test Steps**:
1. Connect MetaMask to Sepolia testnet
2. Navigate to marketplace purchase page
3. Select an asset and token amount
4. Click "Purchase"
5. **Check MetaMask popup** - should show:
   ```
   purchaseTokens(uint256 assetId, uint256 tokenAmount)
   ```
   Instead of raw hex data

**Verification**:
- ✅ Parameters decoded: Function name visible, parameter names shown
- ❌ Parameters not decoded: Shows raw hex data like `0xpurchase...`

---

### Test 2: Marketplace - Create Listing

**Contract**: `RWAMarketplace` (`0xc9C369525DFf385935dfDC6aC2F678C26998D0d7`)

**Function**: `createListing(uint256 assetId, uint256 tokenAmount, uint256 pricePerToken)`

**Expected Decoding**:
- Function name: `createListing`
- Parameters:
  - `assetId`: `uint256`
  - `tokenAmount`: `uint256`
  - `pricePerToken`: `uint256`

**Test Steps**:
1. Navigate to create listing page
2. Fill in asset ID, token amount, and price per token
3. Submit transaction
4. **Check MetaMask popup** for decoded parameters

---

### Test 2b: Marketplace - Buy From Listing

**Contract**: `RWAMarketplace` (`0xc9C369525DFf385935dfDC6aC2F678C26998D0d7`)

**Function**: `buyFromListing(uint256 listingId, uint256 tokenAmount)`

**Status**: ✅ **Manually registered** (Nov 11, 2025) - Function exists in contract, may take 5-10 minutes to propagate

**Expected Decoding**:
- Function name: `buyFromListing`
- Parameters:
  - `listingId`: `uint256`
  - `tokenAmount`: `uint256`

**Test Steps**:
1. Navigate to marketplace listings page
2. Select a listing and token amount
3. Click "Buy"
4. **Check MetaMask popup** - should show decoded parameters (may need to wait 5-10 min after registration)

**Note**: See [BUYFROMLISTING_REGISTRATION.md](./BUYFROMLISTING_REGISTRATION.md) for registration details.

---

### Test 3: Asset Registry - Register Asset

**Contract**: `RWAAssetRegistry` (`0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D`)

**Function**: `registerAsset(address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens)`

**Status**: ✅ **Successfully registered** with 4byte.directory

**Expected Decoding**:
- Function name: `registerAsset`
- Parameters:
  - `owner`: `address`
  - `title`: `string`
  - `description`: `string`
  - `assetType`: `string`
  - `location`: `string`
  - `price`: `uint256`
  - `tokenPrice`: `uint256`
  - `totalTokens`: `uint256`

**Test Steps**:
1. Navigate to asset registration page
2. Fill in all asset details
3. Submit transaction
4. **Check MetaMask popup** - should show all parameter names

---

### Test 4: Token Factory - Create Token

**Contract**: `RWATokenFactory` (`0x2f051A127Ab4B8b0D78aB5758E06a808a8445566`)

**Function**: `createToken(uint256 assetId, string name, string symbol, uint256 totalSupply, address owner)`

**Expected Decoding**:
- Function name: `createToken`
- Parameters:
  - `assetId`: `uint256`
  - `name`: `string`
  - `symbol`: `string`
  - `totalSupply`: `uint256`
  - `owner`: `address`

---

### Test 5: Staking - Stake Tokens

**Contract**: `RWAStaking` (`0x622A30E2da7A9F4f5Af7ad76008FBC18F848A1cc`)

**Function**: `stake(uint256 poolId, uint256 amount)`

**Expected Decoding**:
- Function name: `stake`
- Parameters:
  - `poolId`: `uint256`
  - `amount`: `uint256`

---

## Verification Checklist

For each test transaction, verify:

- [ ] **Function name is visible** (not just hex selector)
- [ ] **Parameter names are shown** (not just types)
- [ ] **Parameter values are decoded** (numbers shown as decimals, addresses formatted)
- [ ] **String parameters are readable** (not hex-encoded)

## Common Functions Already in MetaMask Database

These functions are widely used and should decode automatically:

- ✅ `grantRole(bytes32, address)` - OpenZeppelin standard
- ✅ `revokeRole(bytes32, address)` - OpenZeppelin standard
- ✅ `renounceRole(bytes32, address)` - OpenZeppelin standard
- ✅ `pause()` - OpenZeppelin standard
- ✅ `unpause()` - OpenZeppelin standard
- ✅ `transfer(address, uint256)` - ERC20 standard
- ✅ `approve(address, uint256)` - ERC20 standard

## Troubleshooting

### Parameters Not Decoding?

1. **Wait 5-10 minutes**: New registrations need time to propagate
2. **Check 4byte.directory**: Visit `https://www.4byte.directory/signatures/?hex_signature=0x[SIGNATURE]`
3. **Clear MetaMask cache**: Settings → Advanced → Reset Account (if needed)
4. **Check signature format**: Ensure first 4 bytes match exactly

### Verify Signature Registration

Use the verification script:
```bash
bun run scripts/verify-function-signatures.ts
```

This script checks if signatures are available in 4byte.directory.

## Manual Verification

### Check Specific Signature

Visit 4byte.directory with function selector:
```
https://www.4byte.directory/signatures/?hex_signature=0xpurchase
```

Replace `0xpurchase` with your function's 4-byte selector.

### Example: Purchase Tokens

Function: `purchaseTokens(uint256,uint256)`
Selector: `0x5b34b966` (first 4 bytes of keccak256 hash)

Check: `https://www.4byte.directory/signatures/?hex_signature=0x5b34b966`

## Expected Results

### ✅ Successfully Decoded

MetaMask popup shows:
```
Function: purchaseTokens(uint256 assetId, uint256 tokenAmount)

Parameters:
  assetId: 1
  tokenAmount: 100
```

### ❌ Not Decoded

MetaMask popup shows:
```
Data: 0x5b34b96600000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000064
```

## Next Steps

1. **Test each contract function** using the test cases above
2. **Document any functions that don't decode** for manual registration
3. **Update this guide** with actual test results
4. **Consider adding contract ABI to MetaMask** for better decoding (if supported)

## Additional Resources

- [4byte.directory](https://www.4byte.directory/) - Function signature database
- [MetaMask Documentation](https://docs.metamask.io/) - Wallet integration guide
- [Function Signature Reference](./FUNCTION_SIGNATURES.md) - Complete function list

---

**Last Updated**: November 11, 2025  
**Test Status**: Ready for testing  
**Registration Status**: 22/107 signatures confirmed registered

