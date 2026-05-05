# Deployment Complete - Next Steps Guide

## ✅ Deployment Status

**Contracts Successfully Deployed to Sepolia:**

- **RWAAssetRegistry**: `0xB79dd89227d77C0349E1435EE86ACBAd6eDCFcD6` ✅ Verified
- **RWATokenFactory**: `0x8A5454Cb5Cce09DE2f9b0dCEbBD12856389C1a45` ✅ Verified  
- **RWAMarketplace**: `0xb4D541e83C097D66Db13A8D21AfBA435069306a1` ✅ Verified

**Deployment Details:**
- Network: Sepolia Testnet (Chain ID: 11155111)
- Deployer: `0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047`
- Fee Recipient: `0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047`
- Marketplace Fee: 250 bps (2.5%)
- All contracts verified on Etherscan ✅

## 📋 Next Steps

### 1. ✅ Environment Variables Exported

Environment variables have been exported to `.env.local`. You can verify with:

```bash
cat .env.local | grep NEXT_PUBLIC_RWA
```

### 2. Test Contract Interactions

Create a test script or use Hardhat console to verify contracts:

```bash
cd smart-contracts
bun run hardhat console --network sepolia
```

Then test basic interactions:
```javascript
const Registry = await ethers.getContractAt("RWAAssetRegistry", "0xB79dd89227d77C0349E1435EE86ACBAd6eDCFcD6");
const nextId = await Registry.getNextAssetId();
console.log("Next Asset ID:", nextId.toString());
```

### 3. Update Frontend Configuration

The frontend already reads from environment variables:
- `src/lib/contracts/abis/rwa-marketplace-deployment.ts` uses `process.env.NEXT_PUBLIC_RWA_MARKETPLACE_ADDRESS`

Verify the frontend can access the contracts:

```bash
# Check environment variables are loaded
bun run dev
# Visit http://localhost:3000 and check browser console for contract addresses
```

### 4. Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# First, set environment variables in Vercel
bun run deploy:env:vercel  # Shows commands to run

# Or manually set each variable:
vercel env add NEXT_PUBLIC_RWA_ASSET_REGISTRY_ADDRESS production
vercel env add NEXT_PUBLIC_RWA_TOKEN_FACTORY_ADDRESS production
vercel env add NEXT_PUBLIC_RWA_MARKETPLACE_ADDRESS production
# ... (see deploy:env:vercel output for all variables)

# Then deploy
vercel --prod
```

#### Option B: Using Vercel Dashboard

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add each variable from `.env.local`:
   - `NEXT_PUBLIC_RWA_ASSET_REGISTRY_ADDRESS`
   - `NEXT_PUBLIC_RWA_TOKEN_FACTORY_ADDRESS`
   - `NEXT_PUBLIC_RWA_MARKETPLACE_ADDRESS`
   - `NEXT_PUBLIC_CHAIN_ID`
   - `NEXT_PUBLIC_NETWORK_NAME`
   - `NEXT_PUBLIC_MARKETPLACE_FEE_BPS`
   - `NEXT_PUBLIC_EXPLORER_URL`
   - (and any other `NEXT_PUBLIC_*` variables)

### 5. Verify Frontend Integration

After deployment, verify:

1. **Contract Addresses Display Correctly**
   - Check marketplace page shows contract addresses
   - Verify explorer links work

2. **Contract Interactions Work**
   - Test asset registration (if you have ASSET_MANAGER_ROLE)
   - Test viewing assets
   - Test marketplace functionality

3. **Network Configuration**
   - Ensure wallet connects to Sepolia
   - Verify Chain ID is 11155111
   - Check transactions appear on Etherscan

## 🔗 Explorer Links

- **Registry**: https://sepolia.etherscan.io/address/0xB79dd89227d77C0349E1435EE86ACBAd6eDCFcD6
- **Factory**: https://sepolia.etherscan.io/address/0x8A5454Cb5Cce09DE2f9b0dCEbBD12856389C1a45
- **Marketplace**: https://sepolia.etherscan.io/address/0xb4D541e83C097D66Db13A8D21AfBA435069306a1

## 📝 Quick Commands

```bash
# Export environment variables
bun run deploy:env:export

# Show Vercel commands
bun run deploy:env:vercel

# Check deployment health
bun run deploy:contracts:health

# View deployment info
bun run deploy:env:info
```

## ⚠️ Important Notes

1. **Sensitive Keys**: Remember to add `ETHERSCAN_API_KEY` manually to `.env.local` if needed
2. **Vercel Variables**: Set all `NEXT_PUBLIC_*` variables in Vercel for production
3. **Network**: Ensure users connect to Sepolia testnet, not mainnet
4. **Test First**: Test all contract interactions before going to production

## 🎉 Deployment Complete!

Your RWA Marketplace contracts are now deployed and verified on Sepolia. The frontend can now interact with these contracts once you deploy to Vercel and set the environment variables.

