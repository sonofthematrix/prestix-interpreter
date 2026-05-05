# RWA Marketplace Complete Deployment Guide

This guide walks you through deploying the complete RWA Marketplace ecosystem to Sepolia testnet.

## Prerequisites

### Environment Variables

Create `.env.local` or `.env` in the `smart-contracts` directory with:

```bash
# Deployer Wallet (REQUIRED)
TGR_DEPLOY_PRVT_KEY=your_private_key_here
# OR
TGR_DEPLOY_SEED_PHRASE=your_mnemonic_phrase_here
# OR
PRIVATE_KEY=your_private_key_here

# Admin Wallet Address (REQUIRED)
ADMIN_WALLET_ADDRESS=0x...
# OR
NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=0x...

# Network Configuration (REQUIRED)
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
# OR
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Etherscan Verification (REQUIRED for verification)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Optional Configuration
FEE_RECIPIENT=0x... # Defaults to admin address
TREASURY_ADDRESS=0x... # Defaults to admin address
TIGER_PALACE_TOKEN_ADDRESS=0x... # Required for staking ecosystem
USDC_ADDRESS=0x... # Optional payment token
```

### Required Balance

Ensure your deployer wallet has at least **0.1 ETH** on Sepolia testnet.

## Deployment Steps

### Step 1: Compile Contracts

```bash
cd smart-contracts
bun run compile
```

### Step 2: Run Deployment Script

```bash
bun hardhat run scripts/deploy-rwa-marketplace-complete.ts --network sepolia
```

The script will:
1. ✅ Deploy ProxyAdmin
2. ✅ Deploy RWAAssetRegistry (implementation + proxy)
3. ✅ Deploy RWATokenFactory (implementation + proxy)
4. ✅ Deploy RWAMarketplace (implementation + proxy)
5. ✅ Configure contract roles and relationships
6. ✅ Deploy RWARewardDistributor (if token address provided)
7. ✅ Deploy RWARevenue (if token address provided)
8. ✅ Deploy RWAStaking (if token address provided)
9. ✅ Deploy MembershipSystem (implementation + proxy)
10. ✅ Verify all contracts on Etherscan
11. ✅ Update `deployed-addresses-proxy.json`

**Note**: The script is resumable. If deployment fails mid-way, you can run it again and it will skip already-deployed contracts.

### Step 3: Update Address References

After deployment completes, update all address references across the codebase:

```bash
bun hardhat run scripts/update-addresses-after-deployment.ts
```

This will update:
- Environment files (`.env.local`, `.env.example`)
- Code files (TypeScript files)
- Documentation files
- Test files
- Rule files (`.cursor/rules/*.mdc`)

### Step 4: Update Frontend Integration File

Specifically update the frontend contracts file:

```bash
bun hardhat run scripts/update-frontend-contracts.ts
```

This updates `frontend-integration/rwa-contracts.ts` with the new addresses.

### Step 5: Verify Address Updates

Check that all old addresses have been replaced:

```bash
bun hardhat run scripts/verify-address-updates.ts
```

This will:
- Search for old addresses in the codebase
- Report which files need updates
- Verify frontend integration file

### Step 6: Generate Vercel Commands

Generate commands to update Vercel environment variables:

```bash
bun hardhat run scripts/generate-vercel-env-commands.ts
```

This creates:
- `vercel-env-commands.sh` - Vercel CLI commands
- `vercel-env.local` - Environment variables in .env format

### Step 7: Update Vercel Environment Variables

#### Option A: Using Vercel CLI (Interactive)

```bash
vercel env add NEXT_PUBLIC_RWA_ASSET_REGISTRY_ADDRESS production
# Paste the address when prompted
```

Repeat for each variable from `vercel-env.local`.

#### Option B: Using Vercel CLI (Non-interactive)

```bash
echo "0x..." | vercel env add NEXT_PUBLIC_RWA_ASSET_REGISTRY_ADDRESS production
```

Use the commands from `vercel-env-commands.sh`.

#### Option C: Using Vercel Dashboard

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add/update variables from `vercel-env.local`

### Step 8: Redeploy Frontend

After updating environment variables, trigger a new deployment:

```bash
vercel --prod
```

Or push to your main branch if auto-deploy is enabled.

## Deployment Verification

### On-Chain Verification

1. Check contract addresses on Etherscan:
   - ProxyAdmin: `https://sepolia.etherscan.io/address/{ProxyAdmin}`
   - Registry: `https://sepolia.etherscan.io/address/{RWAAssetRegistry}`
   - Factory: `https://sepolia.etherscan.io/address/{RWATokenFactory}`
   - Marketplace: `https://sepolia.etherscan.io/address/{RWAMarketplace}`

2. Verify contracts are verified (check for green checkmark on Etherscan)

3. Test contract interactions using Hardhat console:

```bash
bun hardhat console --network sepolia
```

```javascript
const Registry = await ethers.getContractAt("RWAAssetRegistryUpgradeable", "0x...");
const nextId = await Registry.getNextAssetId();
console.log("Next Asset ID:", nextId.toString());
```

### Code Verification

1. Verify `deployed-addresses-proxy.json` contains all new addresses
2. Verify `frontend-integration/rwa-contracts.ts` has updated addresses
3. Run address verification script to ensure no old addresses remain

### Frontend Verification

1. Check that frontend can read contract addresses
2. Test contract interactions from the frontend
3. Verify explorer links work correctly

## Troubleshooting

### Deployment Fails Mid-Way

The deployment script saves state after each step. Simply run it again:

```bash
bun hardhat run scripts/deploy-rwa-marketplace-complete.ts --network sepolia
```

It will skip already-deployed contracts and continue from where it left off.

### Verification Fails

If Etherscan verification fails:
1. Wait 30-60 seconds after deployment
2. Check Etherscan API key is correct
3. Try manual verification on Etherscan

### Address Update Fails

If address update script fails:
1. Check `deployed-addresses-proxy.json` exists and is valid
2. Manually update critical files:
   - `frontend-integration/rwa-contracts.ts`
   - `.env.local`
3. Run verification script to find remaining old addresses

### Vercel Deployment Issues

1. Ensure all `NEXT_PUBLIC_*` variables are set in Vercel
2. Check variable names match exactly (case-sensitive)
3. Verify addresses are valid Ethereum addresses
4. Check Vercel build logs for errors

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Deployer wallet funded (≥0.1 ETH)
- [ ] Contracts compiled successfully
- [ ] Deployment script completed
- [ ] All contracts verified on Etherscan
- [ ] Address update script run
- [ ] Frontend contracts file updated
- [ ] Address verification passed
- [ ] Vercel environment variables updated
- [ ] Frontend redeployed
- [ ] On-chain verification passed
- [ ] Frontend integration tested

## File Locations

- **Deployment Script**: `scripts/deploy-rwa-marketplace-complete.ts`
- **Address Update Script**: `scripts/update-addresses-after-deployment.ts`
- **Frontend Update Script**: `scripts/update-frontend-contracts.ts`
- **Verification Script**: `scripts/verify-address-updates.ts`
- **Vercel Commands Script**: `scripts/generate-vercel-env-commands.ts`
- **Deployed Addresses**: `deployed-addresses-proxy.json`
- **Frontend Contracts**: `frontend-integration/rwa-contracts.ts`

## Support

For issues or questions:
1. Check deployment logs
2. Review contract verification status on Etherscan
3. Verify environment variables are set correctly
4. Check network connectivity (RPC endpoint)

