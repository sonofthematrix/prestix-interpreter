# Next Steps Completion Guide

This document tracks the completion of post-deployment tasks for the RWA Marketplace.

## ✅ Completed Tasks

### 1. Update Database with Asset IDs and Token Addresses
**Status**: ⚠️ Partial (requires DATABASE_URL)

- **Script**: `scripts/sync-assets-to-database.ts`
- **Result**: Script executed successfully but skipped database update due to missing `DATABASE_URL` environment variable
- **Action Required**: Set `DATABASE_URL` in your environment and re-run:
  ```bash
  cd smart-contracts
  bun run tsx scripts/sync-assets-to-database.ts
  ```

**Registered Assets**:
- Asset ID 3: `test-property-1` → Token: `0x1203259Ec9E820f3551512191b2bB68Ce648b4a5`
- Asset ID 4: `test-property-2` → Token: `0x70916f62f534A184b31B8F17170c7dea7ea40e5e`

### 2. Verify Contracts on Etherscan
**Status**: ✅ Ready to Run

- **Script**: `scripts/verify-sepolia-contracts.ts` (updated to use correct addresses)
- **Usage**:
  ```bash
  cd smart-contracts
  bun hardhat run scripts/verify-sepolia-contracts.ts --network sepolia
  ```

**Contracts to Verify**:
- RWAAssetRegistry: `0xA1fb017a8c89cCB76F63d2244C4a228964B50D80`
- RWATokenFactory: `0x25Ea8960676D017811039481A39516a7E7112133`
- RWAMarketplace: `0x5295d340a0B06A2552C2169E5D238849550ea9Fe`

**Note**: The marketplace was recently upgraded. The new implementation (`0xFC33528bc00F413BfDADf55D9efB0E1419774859`) should also be verified.

### 3. Test Actual Token Purchases
**Status**: ✅ Script Ready

- **Script**: `scripts/test-token-purchase.ts`
- **Usage**:
  ```bash
  # Show available assets
  bun hardhat run scripts/test-token-purchase.ts --network sepolia
  
  # Purchase tokens
  bun hardhat run scripts/test-token-purchase.ts --network sepolia [assetId] [tokenAmount]
  bun hardhat run scripts/test-token-purchase.ts --network sepolia 3 10
  ```

**Example Purchase**:
- Asset ID 3: Purchase 10 tokens
- Expected Cost: ~1.025 ETH (0.1025 ETH per token + 2.5% marketplace fee)

### 4. Register Additional Properties from Database
**Status**: ✅ Ready

- **Query Script**: `scripts/query-seed-data.ts` (run from project root)
- **Registration Script**: `scripts/register-seed-assets-onchain.ts`

**Process**:
```bash
# 1. Query database for unregistered properties (from project root)
cd /path/to/project/root
bun run tsx packages/smart-contracts/scripts/query-seed-data.ts

# 2. Review the output JSON file
# 3. Register properties on-chain (from smart-contracts directory)
cd packages/smart-contracts
SEED_DATA_FILE=path/to/output.json bun hardhat run scripts/register-seed-assets-onchain.ts --network sepolia

# 4. Sync back to database
bun run tsx scripts/sync-assets-to-database.ts
```

## 📋 Quick Reference

### Contract Addresses (Sepolia)
All addresses are in `deployed-addresses-proxy.json`:

```json
{
  "RWAAssetRegistry": "0xA1fb017a8c89cCB76F63d2244C4a228964B50D80",
  "RWATokenFactory": "0x25Ea8960676D017811039481A39516a7E7112133",
  "RWAMarketplace": "0x5295d340a0B06A2552C2169E5D238849550ea9Fe",
  "ProxyAdmin": "0xB8AD57FC91066Bba784186A307D9b0271ce4d789"
}
```

### Registration Results
See `seed-assets-registration-results.json` for all registered assets.

### Marketplace Fix
✅ **Completed**: Marketplace registry address has been fixed and upgraded.
- Old registry: `0xAEbB6ea247fE26F3c1EbaD21CfeDF60AdE7c58ED`
- New registry: `0xA1fb017a8c89cCB76F63d2244C4a228964B50D80`
- Upgrade transaction: `0x6778f997fb5e41844c103693da4f7f00340633a102eb5dbe43b52c795da9ee6d`
- Registry update transaction: `0x81482981d7dcba3a83b48a8eb0cc613900bf6c8d1850346674e5e6a209b7cfd8`

## 🔧 Environment Setup

### Required Environment Variables

```bash
# Database (for sync script)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Etherscan (for verification)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Network (already configured)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_project_id
DEPLOYER_PRIVATE_KEY=your_private_key
```

## 📝 Next Actions

1. **Set DATABASE_URL** and run database sync
2. **Run Etherscan verification** for all contracts
3. **Test a small token purchase** (1-10 tokens) to verify marketplace functionality
4. **Query database** for additional properties to register
5. **Register properties** in batches (recommend 5-10 at a time)

## 🎯 Testing Checklist

- [ ] Database sync completed
- [ ] All contracts verified on Etherscan
- [ ] Test purchase executed successfully
- [ ] Token balance verified after purchase
- [ ] Additional properties queried from database
- [ ] Additional properties registered on-chain

## 📚 Related Documentation

- `README_SEED_REGISTRATION.md` - Complete registration guide
- `scripts/register-seed-assets-onchain.ts` - Main registration script
- `scripts/sync-assets-to-database.ts` - Database sync script
- `scripts/query-seed-data.ts` - Database query script
- `scripts/test-token-purchase.ts` - Purchase test script
- `scripts/verify-sepolia-contracts.ts` - Etherscan verification script

---

**Last Updated**: December 2025
**Status**: Ready for execution

