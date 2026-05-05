# Environment Variables Setup Instructions

## Quick Setup

The `.env.local` file is in `.gitignore` and `.cursorignore`, so you need to create it manually.

### Option 1: Copy Template

```bash
cd /Users/alexshapiro/tigerpalacepro/zenstack-docs
cp smart-contracts/scripts/.env.local.template .env.local
```

### Option 2: Manual Creation

Create `.env.local` in the project root with these contents:

```bash
# Tiger Palace Pro - Sepolia Testnet Contract Addresses
NEXT_PUBLIC_RWA_MARKETPLACE=0xc9C369525DFf385935dfDC6aC2F678C26998D0d7
NEXT_PUBLIC_RWA_MARKETPLACE_ADDRESS=0xc9C369525DFf385935dfDC6aC2F678C26998D0d7
NEXT_PUBLIC_TPT_ADDRESS=0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e
NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
NEXT_PUBLIC_EURC_ADDRESS=0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4
SEPOLIA_RPC_URL=https://rpc.sepolia.org
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://rpc.sepolia.org
MARKETPLACE_FEE_BPS=250
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_NETWORK=sepolia
```

## Verification

After creating `.env.local`, verify it's correct:

```bash
cd smart-contracts
bun run tsx scripts/verify-frontend-config.ts
```

You should see:
- ✅ Correct: 4 (or more if checking multiple files)
- ❌ Incorrect: 0
- ⚠️ Missing/Not Set: 0

## What Was Fixed

### Code Files Updated ✅
1. **`src/lib/store/contractStore.ts`** - Updated marketplace address
2. **`src/lib/contracts/abis/rwa-marketplace-deployment.ts`** - Updated default address
3. **`src/app/api/admin/blockchain/contracts/route.ts`** - Uses env var instead of hardcoded address

### Verification Script Improved ✅
- Fixed regex to handle whitespace and comments
- Improved path resolution
- Added debug output

## Next Steps

1. ✅ Create `.env.local` file (see above)
2. ✅ Run verification script to confirm
3. 🔄 Test marketplace functionality
4. 🔄 Verify wallet integration works

