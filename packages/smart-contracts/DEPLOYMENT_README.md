# 🚀 Fresh Ecosystem Deployment - Quick Reference

## 🎯 What You Need

This directory contains everything needed for a **complete from-scratch deployment** of the RWA marketplace ecosystem.

## 📦 What's Included

### Main Scripts
1. **`scripts/complete-cleanup.ts`** - Removes ALL previous deployment traces
2. **`scripts/deploy-complete-fresh-ecosystem.ts`** - Deploys entire ecosystem fresh
3. **`EXECUTE_FRESH_DEPLOY.sh`** - Automated execution script (recommended)

### Documentation
- **`FRESH_DEPLOYMENT_GUIDE.md`** - Comprehensive step-by-step guide
- **`scripts/DEPLOYMENT_SOLUTION_SUMMARY.md`** - Complete solution overview

## ⚡ Quick Start (Recommended)

```bash
# 1. Navigate to smart contracts directory
cd packages/smart-contracts

# 2. Ensure environment variables are set in .env.local:
#    - SEPOLIA_RPC_URL
#    - PRIVATE_KEY
#    - ETHERSCAN_API_KEY or NEXT_PUBLIC_ETHERSCAN_API_KEY
#    - DATABASE_URL

# 3. Run automated deployment script
./EXECUTE_FRESH_DEPLOY.sh
```

The script will:
- ✅ Clean up all previous deployments
- ✅ Deploy all 4 core contracts
- ✅ Configure roles and permissions
- ✅ Verify all contracts on Etherscan
- ✅ Store everything in database
- ✅ Generate deployment summary

## 📋 Manual Execution (Alternative)

If you prefer manual control:

```bash
# Step 1: Cleanup
bun run tsx scripts/complete-cleanup.ts

# Step 2: Update .env.local
# (Remove old contract addresses)

# Step 3: Deploy
bun run tsx scripts/deploy-complete-fresh-ecosystem.ts

# Step 4: Update .env.local
# (Add new contract addresses from output)
```

## 🎯 What Gets Deployed

| Contract | Type | Purpose |
|----------|------|---------|
| RWAAssetRegistryUpgradeable | UUPS Proxy | Property registry |
| RWATokenFactoryUpgradeable | UUPS Proxy | ERC20 token factory |
| RWATokenFactory404Fixed | Direct | ERC404 token factory |
| RWAMarketplaceUpgradeableSetter | UUPS Proxy | Token marketplace |

## ✅ Success Indicators

Deployment is successful when you see:

```
╔════════════════════════════════════════════════════════════╗
║   ✅ DEPLOYMENT COMPLETED SUCCESSFULLY!                    ║
╚════════════════════════════════════════════════════════════╝

📋 Deployed Contracts:
   Registry Proxy:              0x...
   Factory Proxy:               0x...
   Factory404:                  0x...
   Marketplace Proxy:           0x...

✅ All contracts verified on Etherscan
✅ All ABIs stored in database
✅ All roles configured
```

## 📊 Expected Output Files

After deployment:
- `deployment-summary-fresh.json` - Complete deployment state
- `deployed-addresses-fresh.json` - Contract addresses only

## 🔍 Verification Commands

```bash
# Check database records
psql $DATABASE_URL -c "SELECT contract_name, contract_address FROM deployed_contracts WHERE network_id = '11155111';"

# View deployment summary
cat deployment-summary-fresh.json

# Check environment variables
grep "NEXT_PUBLIC_RWA" ../../.env.local
```

## 🐛 Troubleshooting

| Issue | Quick Fix |
|-------|-----------|
| Environment variables missing | Check `.env.local` has all required vars |
| Cleanup fails on database | Run: `psql $DATABASE_URL -c "DELETE FROM asset_contract_links WHERE network_id = '11155111';"` |
| Deployment fails at step X | Review error, fix, and re-run deployment script |
| Etherscan verification fails | Wait 30s and script will retry automatically |

## 📚 Full Documentation

For detailed information:
- **Complete Guide**: `FRESH_DEPLOYMENT_GUIDE.md`
- **Solution Summary**: `scripts/DEPLOYMENT_SOLUTION_SUMMARY.md`

## ⏱️ Time Estimates

- **Cleanup**: ~30 seconds
- **Deployment**: ~5-10 minutes (includes Etherscan verification)
- **Total**: ~10-15 minutes

## 💰 Gas Costs

Estimated gas costs on Sepolia:
- Registry: ~0.05 ETH
- Factory: ~0.05 ETH
- Factory404: ~0.03 ETH
- Marketplace: ~0.08 ETH
- **Total**: ~0.21 ETH on Sepolia

*Make sure deployer wallet has at least 0.5 ETH on Sepolia*

## 🎉 Next Steps

After successful deployment:

1. **Update Environment**
   ```bash
   # Add to .env.local:
   NEXT_PUBLIC_RWA_ASSET_REGISTRY=0x... (from output)
   NEXT_PUBLIC_RWA_TOKEN_FACTORY=0x... (from output)
   NEXT_PUBLIC_RWA_TOKEN_FACTORY_404=0x... (from output)
   NEXT_PUBLIC_RWA_MARKETPLACE=0x... (from output)
   ```

2. **Register Properties**
   ```bash
   bun run tsx scripts/register-asset-in-registry.ts
   ```

3. **Deploy Tokens**
   ```bash
   bun run tsx scripts/deploy-token-for-asset.ts --assetId 1
   ```

4. **Create Listings**
   ```bash
   bun run tsx scripts/create-marketplace-listing.ts --assetId 1
   ```

5. **Test Purchases**
   ```bash
   bun run tsx scripts/test-purchase-flow.ts --assetId 1
   ```

## 📞 Support

- Review `FRESH_DEPLOYMENT_GUIDE.md` for detailed troubleshooting
- Check Etherscan links for contract verification
- Verify database records for data integrity
- Review `deployment-summary-fresh.json` for deployment state

---

**Ready to deploy?**

```bash
./EXECUTE_FRESH_DEPLOY.sh
```

🚀 **Let's build the future of real estate tokenization!**
