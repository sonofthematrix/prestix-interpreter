# Seed Assets On-Chain Registration - Quick Start

## Overview

This guide helps you register seed properties and investments from your database as on-chain assets in the Tiger Palace RWA Marketplace.

## Prerequisites

1. ✅ Contracts deployed to Sepolia (see `deployed-addresses-proxy.json`)
2. ✅ Deployer wallet funded with ETH for gas
3. ✅ Deployer has `ASSET_MANAGER_ROLE` on `RWAAssetRegistry`
4. ✅ Deployer has `TOKEN_CREATOR_ROLE` on `RWATokenFactory`
5. ✅ Database connection configured (`DATABASE_URL`)

## Quick Start

### Option 1: Use Example Seed Data (Testing)

```bash
cd smart-contracts

# Test with example data
bun run tsx scripts/register-seed-assets-onchain.ts scripts/seed-data-example.json --network sepolia
```

### Option 2: Query from Database

**Important**: The database query scripts need to be run from the project root (not `smart-contracts/`) to access ZenStack utilities.

```bash
# From project root
cd ../..

# Query seed data from database
bun run tsx packages/smart-contracts/scripts/query-seed-data.ts packages/smart-contracts/seed-data.json

# Register assets on-chain
cd packages/smart-contracts
bun run tsx scripts/register-seed-assets-onchain.ts seed-data.json --network sepolia

# Sync database with on-chain data
cd ../..
bun run tsx packages/smart-contracts/scripts/sync-assets-to-database.ts packages/smart-contracts/seed-assets-registration-results.json
```

## Step-by-Step Process

### Step 1: Prepare Seed Data

Create a `seed-data.json` file with this structure:

```json
{
  "properties": [
    {
      "id": "property-1",
      "title": "Luxury Villa in Monaco",
      "description": "Premium waterfront villa...",
      "propertyType": "VILLA",
      "location": "Monaco, Monaco",
      "price": "5000000",
      "tokenPrice": "0.1",
      "totalTokens": "50000000",
      "owner": "0x..." // Optional, defaults to deployer
    }
  ],
  "investments": []
}
```

**Field Notes:**
- `price`: Total property price (in ETH or wei)
- `tokenPrice`: Price per token (in ETH or wei)
- `totalTokens`: Total number of tokens to mint
- `propertyType`: Must match contract expectations (e.g., "VILLA", "COMMERCIAL", "YACHT")
- Validation: `price >= totalTokens * tokenPrice`

### Step 2: Register Assets On-Chain

```bash
cd smart-contracts
bun run tsx scripts/register-seed-assets-onchain.ts seed-data.json --network sepolia
```

This will:
- ✅ Register each property in `RWAAssetRegistry`
- ✅ Deploy `RWAToken` for each asset via `RWATokenFactory`
- ✅ Verify marketplace integration
- ✅ Save results to `seed-assets-registration-results.json`

### Step 3: Verify Registration

Check the results file:

```bash
cat seed-assets-registration-results.json
```

Verify on Etherscan:
- Asset Registry: `https://sepolia.etherscan.io/address/{REGISTRY_ADDRESS}`
- Token Factory: `https://sepolia.etherscan.io/address/{FACTORY_ADDRESS}`
- Individual Tokens: Check token addresses from results

### Step 4: Sync Database (Optional)

If you want to update your database with on-chain asset IDs:

```bash
# From project root
bun run tsx packages/smart-contracts/scripts/sync-assets-to-database.ts packages/smart-contracts/seed-assets-registration-results.json
```

**Note**: This requires the database schema to have `tokenContractAddress` field on `RealEstateAsset` model.

## Troubleshooting

### Error: "Deployer does not have ASSET_MANAGER_ROLE"

Grant the role:

```bash
# Using Hardhat console
npx hardhat console --network sepolia

const registry = await ethers.getContractAt("RWAAssetRegistry", "0x...");
const ASSET_MANAGER_ROLE = await registry.ASSET_MANAGER_ROLE();
await registry.grantRole(ASSET_MANAGER_ROLE, "0x..."); // Your deployer address
```

### Error: "Price is less than minimum required"

Ensure `price >= totalTokens * tokenPrice`. Example:
- Price: 5,000,000 ETH
- Token Price: 0.1 ETH
- Total Tokens: 50,000,000
- Check: 5,000,000 >= 50,000,000 * 0.1 ✅

### Error: "Could not import ZenStack client"

The database scripts need to run from project root. Use:

```bash
# From project root
bun run tsx packages/smart-contracts/scripts/query-seed-data.ts
```

Or use the API endpoint fallback by setting:
```bash
export NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Payment Token Configuration

### Current Status

The deployed `RWAMarketplaceUpgradeable` supports:
- ✅ **ETH (Native Sepolia)** - Via `purchaseTokens()`

### Adding USDC/EURC Support

To enable multiple payment tokens, you can:

1. **Use separate marketplace instances** (current limitation)
2. **Upgrade marketplace contract** to support multiple tokens (recommended)

See `SEED_ASSETS_ONCHAIN_REGISTRATION.md` for detailed payment token setup.

## Next Steps

After successful registration:

1. ✅ Verify all assets on Etherscan
2. ✅ Test token purchases: `purchaseTokens(assetId, tokenAmount)` with ETH
3. ✅ Update frontend to display on-chain assets
4. ✅ Monitor marketplace activity
5. ✅ Set up event listeners for real-time updates

## Files Reference

- `scripts/register-seed-assets-onchain.ts` - Main registration script
- `scripts/query-seed-data.ts` - Database query script (run from root)
- `scripts/sync-assets-to-database.ts` - Database sync script (run from root)
- `scripts/seed-data-example.json` - Example seed data
- `seed-assets-registration-results.json` - Registration results (generated)

## Support

For issues:
1. Check `seed-assets-registration-results.json` for error details
2. Verify contract addresses in `deployed-addresses-proxy.json`
3. Check network configuration in `hardhat.config.ts`
4. Review Etherscan for transaction details

---

**Status**: ✅ Ready for Use  
**Last Updated**: January 2025

