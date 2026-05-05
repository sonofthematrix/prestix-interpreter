# Testing Setup Complete

## ✅ Completed Tasks

### 1. Reduced Property Prices to Testing Values ($1-$4)
- **File**: `seed-data.json` and `seed-data-example.json`
- **Updated Prices**:
  - Property 1: $1 (was $5M)
  - Property 2: $2 (was $10M)
  - Property 3: $3 (new)
  - Property 4: $4 (new)
- **Token Prices**: Adjusted proportionally (0.00000002 - 0.00000008 ETH per token)

### 2. Added ERC20 Payment Support to Marketplace
- **Contract**: `RWAMarketplaceUpgradeable.sol`
- **Added Functions**:
  - `purchaseTokensWithERC20()` - Purchase tokens using USDC/EURC
  - `setPaymentToken()` - Configure payment token address
  - `getPaymentToken()` - Get current payment token
- **State Variables**:
  - `paymentToken` - Current payment token address
  - `_collectedFeesERC20` - Track fees collected per token
- **Events**:
  - `TokensPurchasedWithERC20` - Emitted on ERC20 purchases

### 3. Created Test Scripts
- **`test-purchase-usdc-eurc.ts`**: Test purchases with USDC/EURC
- **`upgrade-marketplace-erc20.ts`**: Upgrade marketplace and configure payment tokens

### 4. Database Sync
- **Status**: ✅ Script working, connects to database successfully
- **Note**: Properties need to exist in database first (test properties don't exist yet)

### 5. Frontend Configuration
- **Status**: ✅ Already configured
- **Files**: `frontend-integration/rwa-contracts.ts`, `abis/frontend/`
- **Types**: `RealEstateAsset` interface includes all on-chain fields
- **Integration**: Frontend can display assets using `tokenContractAddress` field

## 📋 Next Steps

### 1. Upgrade Marketplace Contract
```bash
# Upgrade marketplace to add ERC20 support
bun hardhat run scripts/upgrade-marketplace-erc20.ts --network sepolia USDC

# Or for EURC:
bun hardhat run scripts/upgrade-marketplace-erc20.ts --network sepolia EURC
```

### 2. Register New Properties with Updated Prices
```bash
# Register properties with $1-$4 prices
bun hardhat run scripts/register-seed-assets-onchain.ts --network sepolia
```

### 3. Test USDC Purchase
```bash
# Test purchasing tokens with USDC
ASSET_ID=5 TOKEN_AMOUNT=10 PAYMENT_TOKEN=USDC bun hardhat run scripts/test-purchase-usdc-eurc.ts --network sepolia
```

### 4. Test EURC Purchase
```bash
# Test purchasing tokens with EURC
ASSET_ID=5 TOKEN_AMOUNT=10 PAYMENT_TOKEN=EURC bun hardhat run scripts/test-purchase-usdc-eurc.ts --network sepolia
```

### 5. Sync Database
```bash
# After registering properties, sync to database
/9-sync-chain
# or
bun run tsx scripts/sync-assets-to-database.ts
```

## 🔧 Configuration

### Payment Token Addresses (Sepolia)
- **USDC**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **EURC**: `0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4`

### Environment Variables
```bash
NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
NEXT_PUBLIC_EURC_ADDRESS=0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4
DATABASE_URL=postgresql://... # Already set in .env.local
```

## 📝 Notes

1. **Marketplace Upgrade Required**: The marketplace contract needs to be upgraded before ERC20 payments will work
2. **Payment Token Configuration**: After upgrade, set payment token using `setPaymentToken()`
3. **User Approval Required**: Users must approve marketplace to spend USDC/EURC before purchasing
4. **Database Properties**: Properties must exist in database with matching IDs for sync to work

## 🎯 Testing Checklist

- [ ] Upgrade marketplace contract
- [ ] Configure USDC as payment token
- [ ] Configure EURC as payment token  
- [ ] Register properties with new prices
- [ ] Test USDC purchase
- [ ] Test EURC purchase
- [ ] Sync database with asset IDs
- [ ] Verify frontend displays on-chain assets

