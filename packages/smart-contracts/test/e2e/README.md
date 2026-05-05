# Tiger Palace Marketplace - Comprehensive E2E Test Suite

## Overview

This test suite provides complete end-to-end coverage for the Tiger Palace Marketplace, testing all critical flows from asset registration through token purchase and delivery.

## Test File

**File**: `tiger-palace-marketplace-comprehensive.spec.ts`

## Test Coverage

### 1. 🏠 Asset Registration
- ✅ Register real estate assets
- ✅ Register multiple assets
- ✅ Verify asset details and status
- ✅ Verify asset ownership

### 2. 🏭 ERC404 Factory Deployment & Token Creation
- ✅ Deploy ERC404 tokens via factory
- ✅ Mint tokens via factory
- ✅ Verify token creation and registration
- ✅ Verify factory token mapping

### 3. 🏪 Marketplace Listing
- ✅ Enable marketplace for purchases
- ✅ Verify marketplace roles and permissions
- ✅ Verify token discovery by marketplace

### 4. 💰 Token Purchase with ETH
- ✅ Purchase tokens with ETH
- ✅ Deliver 404-tokens to buyer wallet
- ✅ Verify payment processing
- ✅ Verify asset availability updates
- ✅ Handle multiple ETH purchases from different buyers

### 5. 💵 Token Purchase with Stable Coins (USDC/EURC)
- ✅ Purchase tokens with USDC
- ✅ Purchase tokens with EURC
- ✅ Deliver 404-tokens to buyer wallet
- ✅ Verify stable coin payment processing
- ✅ Handle token approvals

### 6. 🪙 Token Purchase with TPT (TigerPalaceToken)
- ✅ Purchase tokens with TPT
- ✅ Deliver 404-tokens to buyer wallet
- ✅ Verify TPT payment processing

### 7. 🎯 Complete E2E Flow - All Payment Methods
- ✅ Complete flow: Registration → Token Creation → Multiple Purchases
- ✅ Test all payment methods in sequence
- ✅ Verify final state and balances

### 8. 🔄 Token Transfer & Ownership Verification
- ✅ Transfer 404-tokens between wallets
- ✅ Verify token ownership
- ✅ Verify balance updates

## Test Setup

The test suite sets up:
- **TigerPalaceToken** (TPT) - Utility token
- **RWAAssetRegistry** (upgradeable proxy)
- **RWATokenFactory** - ERC20 token factory
- **RWATokenFactory404** - ERC404 token factory
- **RWAMarketplace** (upgradeable proxy)
- **MockUSDC** - Mock USDC token (6 decimals)
- **MockEURC** - Mock EURC token (6 decimals)

## Test Accounts

- **deployer**: Contract deployer with admin roles
- **assetOwner**: Asset owner who registers properties
- **buyer1**: Purchases with ETH
- **buyer2**: Purchases with USDC/EURC
- **buyer3**: Purchases with TPT
- **treasury**: Fee recipient

## Running the Tests

```bash
# Run all E2E tests
bun run test test/e2e/tiger-palace-marketplace-comprehensive.spec.ts

# Run specific test suite
bun run test test/e2e/tiger-palace-marketplace-comprehensive.spec.ts --grep "Asset Registration"

# Run with gas reporting
REPORT_GAS=true bun run test test/e2e/tiger-palace-marketplace-comprehensive.spec.ts
```

## Key Test Scenarios

### Scenario 1: ETH Purchase Flow
1. Register asset
2. Create ERC404 token
3. Buyer purchases tokens with ETH
4. Verify tokens delivered to buyer wallet
5. Verify payment to asset owner
6. Verify marketplace fee collection

### Scenario 2: USDC Purchase Flow
1. Configure marketplace for USDC
2. Buyer approves marketplace to spend USDC
3. Buyer purchases tokens with USDC
4. Verify tokens delivered to buyer wallet
5. Verify USDC payment processing

### Scenario 3: TPT Purchase Flow
1. Configure marketplace for TPT
2. Buyer approves marketplace to spend TPT
3. Buyer purchases tokens with TPT
4. Verify tokens delivered to buyer wallet
5. Verify TPT payment processing

### Scenario 4: Multi-Buyer Flow
1. Register asset and create token
2. Multiple buyers purchase with different payment methods
3. Verify all tokens delivered correctly
4. Verify asset availability updated correctly

## Mock Contracts

### MockUSDC
- **Location**: `contracts/usdc/mock/MockUSDC.sol`
- **Decimals**: 6
- **Features**: Mint, burn, standard ERC20

### MockEURC
- **Location**: `contracts/usdc/mock/MockEURC.sol`
- **Decimals**: 6
- **Features**: Mint, burn, standard ERC20

## Payment Token Configuration

The marketplace supports multiple payment tokens:
- **ETH**: Native token (18 decimals)
- **USDC**: Stable coin (6 decimals)
- **EURC**: Stable coin (6 decimals)
- **TPT**: TigerPalaceToken (18 decimals)

Payment tokens are configured via `marketplace.setPaymentToken(address)`.

## Important Notes

1. **Price Conversion**: For stable coins (USDC/EURC), the test uses simplified conversion (ETH cost / 10^12). In production, use a price oracle.

2. **Token Approvals**: ERC20 payments require buyers to approve the marketplace to spend tokens before purchase.

3. **404-Token Delivery**: All purchases automatically mint and deliver ERC404 tokens to buyer wallets via the factory.

4. **Asset Availability**: The marketplace automatically updates asset availability after each purchase.

## Test Data

- **Asset Price**: 1000 ETH total
- **Token Price**: 10 ETH per token
- **Total Tokens**: 100 tokens per asset
- **Purchase Amounts**: 10, 5, 15 tokens (varies by buyer)

## Expected Results

All tests should:
- ✅ Complete without errors
- ✅ Verify token delivery to buyer wallets
- ✅ Verify payment processing
- ✅ Verify asset availability updates
- ✅ Verify marketplace fee collection
- ✅ Verify token ownership

## Related Files

- **Marketplace Contract**: `contracts/upgradeable/RWAMarketplaceUpgradeable.sol`
- **Asset Registry**: `contracts/upgradeable/RWAAssetRegistryUpgradeable.sol`
- **Token Factory 404**: `contracts/core/RWATokenFactory404.sol`
- **Token 404**: `contracts/core/RWAToken404.sol`

## Troubleshooting

### Common Issues

1. **"Insufficient balance"**: Ensure test accounts are funded in `beforeEach`
2. **"Insufficient allowance"**: Approve marketplace before ERC20 purchases
3. **"Token not found"**: Ensure token is created before purchase
4. **"Asset not active"**: Verify asset status is ACTIVE (1)

### Debug Tips

- Enable console logging in tests
- Check token balances before/after transactions
- Verify marketplace configuration (payment token, factory 404)
- Check role grants (MARKETPLACE_ROLE, TOKEN_CREATOR_ROLE)

