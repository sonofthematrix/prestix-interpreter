# Marketplace Token Setup Script

## Overview

This script configures the RWA Marketplace contract with all required token addresses after deployment and verification.

## Prerequisites

1. **Environment Variables** (in `smart-contracts/.env`):
   ```bash
   DEPLOYER_PRIVATE_KEY=your_private_key
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
   
   # Optional - will use defaults if not set
   NEXT_PUBLIC_RWA_MARKETPLACE=0x...
   NEXT_PUBLIC_TPT_ADDRESS=0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e
   NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
   NEXT_PUBLIC_EURC_ADDRESS=0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4
   MARKETPLACE_FEE_BPS=250  # Optional, default is 250 (2.5%)
   ```

2. **Deployer must have admin role** on the marketplace contract

## Usage

### ⚠️ CRITICAL: Must Use Hardhat with --network sepolia

**DO NOT use `bun run tsx` - it won't connect to Sepolia!**

When you run `bun run tsx`, Hardhat's network configuration is ignored and it defaults to Hardhat's local network (Chain ID: 31337). You **MUST** use Hardhat's `run` command with the `--network sepolia` flag.

### ✅ Correct Usage (REQUIRED)

```bash
cd smart-contracts
npx hardhat run scripts/setup-marketplace-tokens.ts --network sepolia
```

### With Marketplace Address Parameter

```bash
cd smart-contracts
npx hardhat run scripts/setup-marketplace-tokens.ts --network sepolia -- 0xYourMarketplaceAddress
```

**Note**: The `--` separates Hardhat flags from script arguments.

### ❌ WRONG - Don't Do This

```bash
# ❌ This will connect to Hardhat network (wrong!)
bun run tsx scripts/setup-marketplace-tokens.ts --network sepolia

# ❌ This will also connect to Hardhat network (wrong!)
bun run tsx scripts/setup-marketplace-tokens.ts
```

## What the Script Does

1. ✅ **Verifies marketplace contract** - Checks that contract exists and has required functions
2. ✅ **Checks admin permissions** - Verifies deployer has admin role
3. ✅ **Verifies token contracts** - Validates TPT, USDC, and EURC token addresses
4. ✅ **Configures marketplace fee** - Sets fee percentage (default 2.5% = 250 basis points)
5. ✅ **Unpauses marketplace** - Ensures marketplace is active
6. ✅ **Verifies final configuration** - Confirms all settings are correct

## Token Addresses (Sepolia Testnet)

- **TPT Token (Proxy)**: `0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e`
- **TPT Implementation**: `0x4EDc5EbfDA5986F5389763f6bf297480095c7379`
- **USDC**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **EURC**: `0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4`

## Expected Output

```
╔════════════════════════════════════════════════════════════╗
║   MARKETPLACE TOKEN SETUP SCRIPT                           ║
╚════════════════════════════════════════════════════════════╝

📋 Configuration:
   Marketplace: 0x...
   TPT Token (Proxy): 0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e
   TPT Implementation: 0x4EDc5EbfDA5986F5389763f6bf297480095c7379
   USDC Token: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
   EURC Token: 0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4
   Deployer: 0x...

🔍 Verifying marketplace contract at 0x...
✅ Marketplace contract verified
✅ Deployer has admin permissions

🔍 Verifying token contracts...
   ✅ TPT: Tiger Palace Token (TPT) - 18 decimals
   ✅ USDC: USD Coin (USDC) - 6 decimals
   ✅ EURC: Euro Coin (EURC) - 6 decimals

📊 Current marketplace configuration:
   Fee Percentage: 250 basis points (2.5%)
   Fee Recipient: 0x...
   Paused: No ✅

✅ Marketplace fee already configured correctly
✅ Marketplace is active (not paused)

🔍 Verifying final configuration...

======================================================================
🎉 MARKETPLACE TOKEN SETUP COMPLETE
======================================================================

📋 Setup Summary:
   Marketplace: 0x...

💰 Token Configuration:
   TPT: 0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e ✅
   USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 ✅
   EURC: 0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4 ✅

⚙️  Marketplace Settings:
   Fee: 250 bps (2.5%)
   Fee Recipient: 0x...
   Status: ✅ Active

🔗 Explorer Links:
   Marketplace: https://sepolia.etherscan.io/address/0x...
   TPT Token: https://sepolia.etherscan.io/address/0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e
   USDC Token: https://sepolia.etherscan.io/address/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
   EURC Token: https://sepolia.etherscan.io/address/0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4
======================================================================

📝 Next Steps:
   1. Verify token addresses in frontend environment variables
   2. Test marketplace functionality with test transactions
   3. Configure frontend to use these token addresses
   4. Update API endpoints to reference these addresses
```

## Configure Registry with TPT Token

After setting up the marketplace, configure the registry and factory contracts with the TPT token address:

```bash
cd smart-contracts
npx hardhat run scripts/configure-registry-tpt.ts --network sepolia
```

This script will:
- ✅ Set TPT token address in RWAAssetRegistry (if supported)
- ✅ Set TPT token address in RWATokenFactory (if supported)
- ✅ Configure existing RWA tokens with TPT token address
- ✅ Report configuration status for all contracts

**Note**: Individual RWA tokens need TPT configured for dividend distribution. The script attempts to configure all existing tokens automatically.

## Verify Frontend Configuration

After running the setup script, verify that frontend environment variables match:

```bash
cd smart-contracts
npx hardhat run scripts/verify-frontend-config.ts --network sepolia
```

This script will:
- ✅ Check all `.env` files for correct contract addresses
- ✅ Verify API endpoints use environment variables (not hardcoded addresses)
- ✅ Generate template `.env.local` file if needed
- ✅ Report any mismatches or missing variables

## Troubleshooting

### Error: "Marketplace contract verification failed"
- Check that the marketplace address is correct
- Verify the contract is deployed and verified on Etherscan
- Ensure the contract has the required functions (`assetRegistry`, `tokenFactory`, `getMarketplaceFeePercentage`)

### Error: "Deployer does not have admin permissions"
- The deployer wallet must have the `DEFAULT_ADMIN_ROLE` on the marketplace contract
- Check the marketplace contract's access control configuration

### Error: "Token contract verification failed"
- Verify token addresses are correct for Sepolia testnet
- Check that tokens are deployed and verified on Etherscan

## Notes

- The script uses the **marketplace proxy address**, not the implementation address
- The TPT implementation address (`0x4EDc5EbfDA5986F5389763f6bf297480095c7379`) is for reference only
- The script does **not** configure payment tokens in the marketplace contract (the upgradeable version doesn't support this)
- Token addresses are verified but not automatically configured in the marketplace (this may require contract upgrades)

