# RWA Marketplace Sequential Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the RWA Marketplace smart contract system to Sepolia testnet, following XMCP deployment patterns with security checks and verification.

## Prerequisites

### Required Environment Variables

Ensure your `.env` file in `smart-contracts/` contains:

```bash
# Deployment Account
TGR_DEPLOY_PRVT_KEY=0x...your_private_key
# OR
TGR_DEPLOY_SEED_PHRASE="your twelve word mnemonic phrase"

# Network Configuration
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
# OR
SEPOLIA_URL=https://ethereum-sepolia-rpc.publicnode.com

# Etherscan Verification
ETHERSCAN_API_KEY=your_etherscan_api_key
NEXT_PUBLIC_ETHERSCAN_API_KEY=your_etherscan_api_key

# Marketplace Configuration (Optional)
FEE_RECIPIENT=0x...fee_recipient_address
MARKETPLACE_FEE_BPS=250  # Default 2.5%
```

### Required Tools

- **Node.js** >= 20.0.0
- **Bun** >= 1.1.0
- **Hardhat** (installed in smart-contracts)
- **Sufficient Sepolia ETH** (minimum 0.1 ETH recommended)

## Deployment Process

### Step 1: Compile Contracts

```bash
cd smart-contracts
bun run compile
```

### Step 2: Deploy Contracts Sequentially

```bash
# From project root
bun run deploy:contracts

# Or directly
cd smart-contracts
bun run deploy:sequential:sepolia
```

This will:
1. ✅ Check deployer balance
2. ✅ Run security audit checks
3. ✅ Deploy RWAAssetRegistry
4. ✅ Deploy RWATokenFactory
5. ✅ Deploy RWAMarketplace
6. ✅ Configure contract roles
7. ✅ Verify contracts on Etherscan (if API key provided)
8. ✅ Generate deployment result file
9. ✅ Generate environment variables file

### Step 3: Verify Deployment

```bash
# Verify contracts on Etherscan
bun run deploy:contracts:verify

# Or manually verify all contracts
cd smart-contracts
bun run verify:deployment
```

### Step 4: Health Check

```bash
# Run health check on deployed contracts
bun run deploy:contracts:health

# Or directly
cd smart-contracts
bun run health:check
```

### Step 5: Export Environment Variables

```bash
# Show deployment info
bun run deploy:env:info

# Generate .env.deployment file
bun run deploy:env:generate

# Export to .env.local
bun run deploy:env:export

# Show Vercel environment variable commands
bun run deploy:env:vercel
```

## Full Deployment Workflow

### Automated Full Deployment

```bash
# Run complete deployment pipeline
bun run deploy:full
```

This command executes:
1. Contract deployment
2. Contract verification
3. Health checks
4. Environment variable export

### Manual Step-by-Step

```bash
# 1. Compile contracts
cd smart-contracts && bun run compile

# 2. Deploy contracts
bun run deploy:sequential:sepolia

# 3. Verify contracts
bun run verify:deployment

# 4. Health check
bun run health:check

# 5. Export environment variables
cd ..
bun run deploy:env:export
```

## Contract Deployment Order

The deployment follows this sequential order:

1. **RWAAssetRegistry** (no dependencies)
   - No constructor arguments
   - Sets up roles and initial state

2. **RWATokenFactory** (no dependencies)
   - No constructor arguments
   - Sets up token creation roles

3. **RWAMarketplace** (depends on Registry and Factory)
   - Constructor: `(registryAddress, factoryAddress, feeRecipient)`
   - Sets up marketplace roles

4. **Post-Deployment Configuration**:
   - Grant `MARKETPLACE_ROLE` to marketplace on registry
   - Grant `TOKEN_CREATOR_ROLE` to marketplace on factory
   - Set marketplace fee percentage

## Security Features

### Pre-Deployment Checks

- ✅ Balance verification (minimum 0.1 ETH)
- ✅ Network verification (Sepolia Chain ID: 11155111)
- ✅ Security audit checks

### Security Audit Checks

The deployment script performs these security checks:

- ✅ **Reentrancy Protection**: Contracts use ReentrancyGuard
- ✅ **Access Control**: Role-based access control implemented
- ✅ **Pausable Functions**: Emergency pause mechanism available
- ✅ **Input Validation**: Comprehensive validation in place
- ✅ **Safe Math**: SafeMath library used

### Known Issues

⚠️ **CRITICAL-001**: Marketplace status update order
- **Location**: `RWAMarketplace.sol:103`
- **Impact**: Potential state inconsistency
- **Status**: Documented - Requires fix before production

## Deployment Output

### Deployment Result File

Location: `smart-contracts/deployments/sepolia.json`

```json
{
  "network": "sepolia",
  "deployer": "0x...",
  "feeRecipient": "0x...",
  "timestamp": "2025-01-XX...",
  "contracts": {
    "RWAAssetRegistry": {
      "contractName": "RWAAssetRegistry",
      "address": "0x...",
      "blockNumber": 12345678,
      "gasUsed": "1234567",
      "constructorArgs": [],
      "verified": true
    },
    ...
  },
  "configuration": {
    "marketplaceFeeBps": 250,
    "rolesConfigured": true
  },
  "explorerLinks": {
    "registry": "https://sepolia.etherscan.io/address/0x...",
    ...
  }
}
```

### Environment Variables File

Location: `.env.deployment` or `.env.local` (when exported)

```bash
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_NETWORK_NAME=sepolia
NEXT_PUBLIC_RWA_ASSET_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_RWA_TOKEN_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_RWA_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_FEE_BPS=250
FEE_RECIPIENT=0x...
...
```

## Vercel Deployment

### Setting Environment Variables

After deployment, set these in Vercel:

```bash
# Use the helper script
bun run deploy:env:vercel

# Or manually set each variable
vercel env add NEXT_PUBLIC_RWA_ASSET_REGISTRY_ADDRESS production
vercel env add NEXT_PUBLIC_RWA_TOKEN_FACTORY_ADDRESS production
vercel env add NEXT_PUBLIC_RWA_MARKETPLACE_ADDRESS production
# ... etc
```

### Vercel Configuration

The `vercel.json` file is configured to:
- ✅ Build smart contracts before deployment
- ✅ Set environment variables from deployment
- ✅ Configure API routes
- ✅ Set CORS headers

## Troubleshooting

### Common Issues

#### 1. Insufficient Balance

**Error**: `Insufficient balance: X ETH < 0.1 ETH`

**Solution**: Fund your deployer wallet with Sepolia ETH
- Use a Sepolia faucet: https://sepoliafaucet.com/
- Minimum 0.1 ETH recommended

#### 2. Network Mismatch

**Error**: `Warning: Not deploying to Sepolia testnet!`

**Solution**: Verify `SEPOLIA_URL` in `.env` points to Sepolia RPC

#### 3. Verification Failed

**Error**: `Verification failed: ...`

**Solution**: 
- Wait 30-60 seconds after deployment
- Run verification manually: `bun run verify:deployment`
- Check Etherscan API key is correct

#### 4. Contract Configuration Issues

**Error**: Health check shows `rolesConfigured: false`

**Solution**: 
- Re-run deployment script
- Manually grant roles if needed
- Check contract addresses are correct

## Next Steps After Deployment

1. **Update Frontend Configuration**
   ```bash
   # Copy environment variables
   cp .env.deployment .env.local
   
   # Add sensitive keys manually
   echo "ETHERSCAN_API_KEY=your_key" >> .env.local
   ```

2. **Test Contract Interactions**
   - Test asset registration
   - Test token creation
   - Test marketplace operations

3. **Deploy Frontend to Vercel**
   ```bash
   vercel --prod
   ```

4. **Monitor Deployment**
   - Check contract addresses on Etherscan
   - Monitor transaction logs
   - Verify contract functions work correctly

## Security Best Practices

### Before Production

- [ ] Fix CRITICAL-001 vulnerability
- [ ] Complete external security audit
- [ ] Test all contract functions
- [ ] Review access control configuration
- [ ] Set up monitoring and alerts
- [ ] Document emergency procedures

### Ongoing Maintenance

- [ ] Regularly check contract health
- [ ] Monitor for unusual activity
- [ ] Keep dependencies updated
- [ ] Review security best practices
- [ ] Maintain deployment documentation

## Additional Resources

- **Contract Documentation**: `docs/implementation/architecture/RWA_MARKETPLACE_ARCHITECTURE_AND_SECURITY.md`
- **Security Audit**: `docs/implementation/architecture/RWA_SECURITY_AUDIT_REPORT.md`
- **Vulnerability Analysis**: `docs/implementation/architecture/RWA_VULNERABILITY_ANALYSIS.md`
- **Storage Analysis**: `docs/implementation/architecture/RWA_STORAGE_LAYER_ANALYSIS.md`

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review contract documentation
3. Run health check: `bun run deploy:contracts:health`
4. Check deployment logs in `smart-contracts/deployments/`

---

**Last Updated**: January 2025  
**Network**: Sepolia Testnet  
**Chain ID**: 11155111

