# Complete Fresh Ecosystem Deployment Guide

## 🎯 Overview

This guide walks through a **complete from-scratch deployment** of the RWA marketplace ecosystem, ensuring:
- ✅ ALL previous deployments are cleaned up
- ✅ ONLY latest contract versions are used
- ✅ ALL contracts are stored in database
- ✅ ALL ABIs are stored and accessible
- ✅ ALL roles and permissions are configured
- ✅ ALL contracts are verified on Etherscan

## 📋 Prerequisites

### Required Tools
- Node.js 18+ or Bun
- Hardhat environment configured
- PostgreSQL database running
- Etherscan API key

### Required Environment Variables

Create or update `.env.local` with:

```bash
# Network Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your_private_key_here

# Etherscan Verification
ETHERSCAN_API_KEY=your_etherscan_api_key
NEXT_PUBLIC_ETHERSCAN_API_KEY=your_etherscan_api_key

# Database (should already be configured)
DATABASE_URL=postgresql://...

# Payment Tokens (Optional - defaults will be used)
NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
NEXT_PUBLIC_TKNZN_ADDRESS=0x064682F1555d3baD3Dab5eDD0DEe45372F23a570
```

## 🚀 Step-by-Step Deployment

### Step 1: Complete Cleanup

**⚠️ WARNING: This will DELETE all previous deployment data!**

```bash
cd packages/smart-contracts

# Review what will be cleaned
cat scripts/complete-cleanup.ts

# Execute cleanup (will wait 3 seconds before starting)
bun run tsx scripts/complete-cleanup.ts
```

**What gets cleaned:**
- ✅ Build artifacts (`artifacts/`, `cache/`, `.openzeppelin/`)
- ✅ Deployment records (`deployed-addresses*.json`)
- ✅ Database records (all Sepolia contracts, ABIs, links)
- ℹ️ Environment variables (manual cleanup required)

**Expected Output:**
```
✅ Removed: artifacts
✅ Removed: cache
✅ Removed: .openzeppelin
✅ Deleted 15 deployed contracts
✅ Deleted 15 contract ABIs
✅ Deleted 12 asset contract links
✅ CLEANUP COMPLETE - SYSTEM READY FOR FRESH DEPLOY
```

### Step 2: Manual Environment Variable Cleanup

Edit `.env.local` and remove or comment out:

```bash
# OLD - Remove or comment these out:
# NEXT_PUBLIC_RWA_ASSET_REGISTRY=0x...
# NEXT_PUBLIC_RWA_TOKEN_FACTORY=0x...
# NEXT_PUBLIC_RWA_TOKEN_FACTORY_404=0x...
# NEXT_PUBLIC_RWA_MARKETPLACE=0x...
# NEXT_PUBLIC_RWA_MARKETPLACE_SETTER=0x...
# PROXY_ADMIN_ADDRESS=0x...
```

### Step 3: Fresh Deployment

```bash
# Still in packages/smart-contracts directory
bun run tsx scripts/deploy-complete-fresh-ecosystem.ts
```

**Deployment Process:**

The script will:
1. ✅ Deploy RWAAssetRegistryUpgradeable (UUPS Proxy)
2. ✅ Deploy RWATokenFactoryUpgradeable (UUPS Proxy)
3. ✅ Deploy RWATokenFactory404Fixed (Direct)
4. ✅ Deploy RWAMarketplaceUpgradeableSetter (UUPS Proxy)
5. ✅ Configure all roles and permissions
6. ✅ Verify all contracts on Etherscan
7. ✅ Store all contracts and ABIs in database
8. ✅ Generate deployment summary

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║   STEP 1: Deploy RWAAssetRegistryUpgradeable (UUPS)       ║
╚════════════════════════════════════════════════════════════╝

   📦 Deploying proxy with implementation...
   ✅ Proxy: 0x...
   ✅ Implementation: 0x...
   💾 Storing RWAAssetRegistryUpgradeable in database...
   ✅ Contract stored in database
   💾 Storing ABI in database...
   ✅ ABI stored (45 functions)
   🔍 Verifying on Etherscan...
   ✅ Contract verified successfully!

... (continues for all contracts) ...

╔════════════════════════════════════════════════════════════╗
║   ✅ DEPLOYMENT COMPLETED SUCCESSFULLY!                    ║
╚════════════════════════════════════════════════════════════╝
```

### Step 4: Update Environment Variables

Copy the environment variable section from the deployment output:

```bash
# Add to .env.local:
NEXT_PUBLIC_RWA_ASSET_REGISTRY=0x... (from output)
NEXT_PUBLIC_RWA_TOKEN_FACTORY=0x... (from output)
NEXT_PUBLIC_RWA_TOKEN_FACTORY_404=0x... (from output)
NEXT_PUBLIC_RWA_MARKETPLACE=0x... (from output)
```

### Step 5: Verify Deployment

Check the deployment summary file:

```bash
cat deployment-summary-fresh.json
```

Verify on Etherscan (links provided in output):
- ✅ Registry: Verified and accessible
- ✅ Factory: Verified and accessible
- ✅ Factory404: Verified and accessible
- ✅ Marketplace: Verified and accessible

Verify in Database:

```bash
# Run verification script (if needed)
bun run tsx scripts/verify-deployment.ts
```

## 📊 Contract Versions Used

All contracts use the **LATEST VERSIONS** with all fixes applied:

| Contract | Version | Type | Features |
|----------|---------|------|----------|
| RWAAssetRegistryUpgradeable | Latest | UUPS Proxy | Asset management, metadata storage |
| RWATokenFactoryUpgradeable | Latest | UUPS Proxy | ERC20 token factory |
| RWATokenFactory404Fixed | Latest | Direct | ERC404 token factory with all fixes |
| RWAMarketplaceUpgradeableSetter | Latest | UUPS Proxy | Marketplace with setter methods |

## 🔍 Verification Checklist

After deployment, verify:

- [ ] ✅ All contracts deployed and verified on Etherscan
- [ ] ✅ All contracts stored in `deployed_contracts` table
- [ ] ✅ All ABIs stored in `contract_abis` table
- [ ] ✅ Registry has MARKETPLACE_ROLE granted to marketplace
- [ ] ✅ Factory has TOKEN_CREATOR_ROLE granted to marketplace
- [ ] ✅ Factory404 has TOKEN_CREATOR_ROLE granted to marketplace
- [ ] ✅ Marketplace fee is 250 bps (2.5%)
- [ ] ✅ Marketplace is not paused
- [ ] ✅ Factory404 is configured in marketplace
- [ ] ✅ Environment variables updated in `.env.local`

## 📝 Database Schema

After deployment, database will have:

### deployed_contracts Table
```sql
contract_address | contract_name                    | contract_type   | network_id | is_upgradeable | proxy_type
-----------------|----------------------------------|-----------------|------------|----------------|------------
0x...            | RWAAssetRegistryUpgradeable      | REGISTRY        | 11155111   | true           | UUPS
0x...            | RWATokenFactoryUpgradeable       | FACTORY         | 11155111   | true           | UUPS
0x...            | RWATokenFactory404Fixed          | ERC404_FACTORY  | 11155111   | false          | NULL
0x...            | RWAMarketplaceUpgradeableSetter  | MARKETPLACE     | 11155111   | true           | UUPS
```

### contract_abis Table
```sql
contract_address | network_id | abi_hash     | verification_source
-----------------|------------|--------------|--------------------
0x...            | 11155111   | abc123...    | deployment-script
0x...            | 11155111   | def456...    | deployment-script
0x...            | 11155111   | ghi789...    | deployment-script
0x...            | 11155111   | jkl012...    | deployment-script
```

## 🧪 Next Steps

After successful deployment:

### 1. Register Properties in Registry

```bash
# Register your first property
bun run tsx scripts/register-asset-in-registry.ts
```

### 2. Deploy ERC404 Tokens

```bash
# Deploy tokens for registered properties
bun run tsx scripts/deploy-token-for-asset.ts --assetId 1
```

### 3. Create Marketplace Listings

```bash
# Create listings for deployed tokens
bun run tsx scripts/create-marketplace-listing.ts --assetId 1 --pricePerToken 0.01
```

### 4. Test Purchase Flow

```bash
# Test token purchase
bun run tsx scripts/test-purchase-flow.ts --assetId 1 --tokenAmount 10
```

## 🐛 Troubleshooting

### Issue: Cleanup script fails on database

**Solution:**
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1;"

# Manually clean if needed
psql $DATABASE_URL -c "DELETE FROM asset_contract_links WHERE network_id = '11155111';"
psql $DATABASE_URL -c "DELETE FROM contract_abis WHERE network_id = '11155111';"
psql $DATABASE_URL -c "DELETE FROM deployed_contracts WHERE network_id = '11155111';"
```

### Issue: Deployment fails on Etherscan verification

**Solution:**
- Check `ETHERSCAN_API_KEY` is set correctly
- Wait 30 seconds and retry deployment
- Verification will retry automatically up to 5 times

### Issue: "Contract already verified" but deployment continues

**Solution:**
- This is normal - the script treats "already verified" as success
- Continue with deployment

### Issue: Role configuration fails

**Solution:**
```bash
# Manually grant roles if needed
bun run tsx scripts/grant-marketplace-roles.ts
```

## 📚 Related Documentation

- [Token Supply Wei Conversion Rule](/.cursor/rules/token-supply-wei-conversion.mdc)
- [Contract Deployment Verification](/.cursor/rules/contract-deployment-verification.mdc)
- [Contract Database Comprehensive](/.cursor/rules/contract-database-comprehensive.mdc)
- [System Data Alignment](/.cursor/rules/system-data-alignment.mdc)

## ⚠️ Important Notes

1. **Backup Before Cleanup**: The cleanup script is destructive! Make sure you have backups if needed.

2. **Network ID**: All scripts use Sepolia (Chain ID: 11155111). To use a different network, update the `NETWORK_ID` constant in the scripts.

3. **Gas Costs**: Fresh deployment requires significant gas. Ensure deployer wallet has at least 0.5 ETH on Sepolia.

4. **Verification Time**: Etherscan verification may take 1-2 minutes per contract. The script will wait automatically.

5. **Database Connection**: Ensure your PostgreSQL database is accessible and the connection string in `.env.local` is correct.

## ✅ Success Criteria

Deployment is successful when:
- ✅ All 4 main contracts deployed (Registry, Factory, Factory404, Marketplace)
- ✅ All contracts verified on Etherscan
- ✅ All contracts and ABIs stored in database
- ✅ All roles and permissions configured
- ✅ Marketplace fee is 250 bps (2.5%)
- ✅ Factory404 is set in marketplace
- ✅ Environment variables updated

## 🎉 Completion

Once all steps are complete, your fresh RWA marketplace ecosystem is ready for:
- Property registration
- Token deployment
- Marketplace listings
- Token purchases
- Full ecosystem operations

---

**Need Help?**
- Review the deployment summary in `deployment-summary-fresh.json`
- Check Etherscan links for contract verification
- Verify database records using database tools
- Review logs for any error messages
