# Latest Deployment Documentation

**Last Updated**: January 2025  
**Network**: Sepolia Testnet (Chain ID: 11155111)

## Quick Reference

### Deployment Script
```bash
bun hardhat run scripts/deploy-rwa-marketplace-complete.ts --network sepolia
```

### Current Deployment Status
- ✅ All contracts deployed and verified
- ✅ Proxy pattern: TransparentUpgradeableProxy with ProxyAdmin
- ✅ Resumable deployment with state persistence
- ✅ All ABIs generated for frontend integration

## Sepolia Contract Addresses

### ProxyAdmin
- **Address**: `0xB8AD57FC91066Bba784186A307D9b0271ce4d789`
- **Purpose**: Centralized upgrade control for all proxy contracts

### Core Contracts (Proxies)
- **RWAAssetRegistry**: `0xA1fb017a8c89cCB76F63d2244C4a228964B50D80`
- **RWATokenFactory**: `0x25Ea8960676D017811039481A39516a7E7112133`
- **RWAMarketplace**: `0x5295d340a0B06A2552C2169E5D238849550ea9Fe`
- **RWAStaking**: `0x83897dE9eF0c7fc3003fD9602231963D1649B357`
- **MembershipSystem**: `0xef48e58ca2411A098F09Ac85ECe400A4f6FF03DA`
- **TigerPalaceToken**: `0x5E53F7C9b586eE12CA8A579456af2a6093141D69`

### Non-Upgradeable Contracts
- **RWARewardDistributor**: `0xEd4D6FdE0B663BAA5a0bc8DC3a50493D984FA833`
- **RWARevenue**: `0xd64867B8840c09e6Bc448fd2d70C0EA7b1E3D889`
- **RWATokenFactory404**: `0x7a6f7dE826064903f2e419833b9633560217FEe2`

## Deployment Architecture

### Pattern
- **Upgradeable Contracts**: TransparentUpgradeableProxy pattern
- **Proxy Admin**: Single ProxyAdmin contract manages all upgrades
- **Non-Upgradeable**: RWARewardDistributor, RWARevenue, RWATokenFactory404

### Deployment Phases
1. **Phase 0**: Pre-deployment verification
2. **Phase 1**: Core infrastructure (ProxyAdmin, TigerPalaceToken)
3. **Phase 2**: Core RWA contracts (Registry, Factory, Factory404)
4. **Phase 3**: Marketplace + role grants
5. **Phase 4**: Staking ecosystem (Distributor, Revenue, Staking)
6. **Phase 5**: Token configuration (exemptions, funding, roles)
7. **Phase 6**: Membership system
8. **Phase 7**: Verification & documentation

### Resumability
- State persisted in `deployment-state.json`
- On-chain validation before skipping steps
- Granular step tracking per phase
- Safe to interrupt and resume at any time

## Key Features

### Gas Optimization
- **Total Estimated**: ~28M gas
- **At 30 gwei**: ~0.84 ETH minimum (1.0 ETH with buffer)
- **Optimizer**: `runs: 1` for implementations, `runs: 999999` for proxies

### Security
- All contracts verified on Etherscan
- Access control via OpenZeppelin AccessControl
- ProxyAdmin ownership should transfer to multi-sig for production
- Emergency pause functionality available

### Contract Relationships
- **RWAMarketplace** → RWAAssetRegistry (MARKETPLACE_ROLE)
- **RWAMarketplace** → RWATokenFactory (TOKEN_CREATOR_ROLE)
- **RWAStaking** → RWARevenue (REVENUE_MANAGER_ROLE)
- **RWAStaking** ↔ RWARevenue (bidirectional linkage)
- **RWARewardDistributor** → RWAStaking, RWARevenue (allowances)

## Documentation Files

### Architecture & Deployment
- **[SEPOLIA_DEPLOYMENT_ARCHITECTURE.md](./deployment/SEPOLIA_DEPLOYMENT_ARCHITECTURE.md)**: Complete architecture documentation
- **[DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)**: Step-by-step deployment guide
- **[DEPLOYMENT_RESUMABILITY_GUIDE.md](../DEPLOYMENT_RESUMABILITY_GUIDE.md)**: Resumability features
- **[SEPOLIA_DEPLOYMENT_COMPLETE.md](../SEPOLIA_DEPLOYMENT_COMPLETE.md)**: Deployment completion summary

### Integration
- **[ABI_INTEGRATION_GUIDE.md](./ABI_INTEGRATION_GUIDE.md)**: Frontend ABI integration
- **[FRONTEND_INTEGRATION_GUIDE.md](./frontend/FRONTEND_INTEGRATION_GUIDE.md)**: Frontend integration patterns
- **[CONTRACT_API_REFERENCE.md](./CONTRACT_API_REFERENCE.md)**: Contract API reference

### Testing & Verification
- **[PROXY_FIXTURE_GUIDE.md](./testing/PROXY_FIXTURE_GUIDE.md)**: Upgradeable testing patterns
- **[CONTRACT_VERIFICATION_GUIDE.md](./deployment/CONTRACT_VERIFICATION_GUIDE.md)**: Etherscan verification

## Environment Variables

### Required
```bash
# Deployment Account
TGR_DEPLOY_PRVT_KEY=0x...your_private_key

# Network Configuration
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Etherscan Verification
ETHERSCAN_API_KEY=your_etherscan_api_key

# Admin Configuration
ADMIN_WALLET_ADDRESS=0x...admin_address
```

### Optional
```bash
TREASURY_ADDRESS=0x...treasury_address
TIGER_PALACE_TOKEN_ADDRESS=0x... # If reusing existing
USDC_ADDRESS=0x... # Payment token
FEE_RECIPIENT=0x... # Defaults to admin
```

## Quick Commands

### Deployment
```bash
# Deploy complete ecosystem
bun hardhat run scripts/deploy-rwa-marketplace-complete.ts --network sepolia

# Verify contracts
bun hardhat verify --network sepolia <ADDRESS>

# Health check
bun hardhat run scripts/health-check.ts --network sepolia
```

### Testing
```bash
# Run all tests
bun run test

# Run with gas reporting
REPORT_GAS=true bun run test

# Run specific test suite
bun run test test/rwa-staking.spec.ts
```

### Compilation
```bash
# Clean and compile
bun hardhat clean && bun hardhat compile

# Generate TypeChain types
bun hardhat typechain

# Build artifacts
bun hardhat build
```

## Post-Deployment Checklist

- [x] All contracts deployed
- [x] All contracts verified on Etherscan
- [x] Contract addresses saved to `deployed-addresses-proxy.json`
- [x] Environment variables updated
- [x] Frontend ABIs generated
- [x] Contract relationships validated
- [x] Role grants verified
- [x] Initial funding completed (if applicable)
- [x] Health checks passed
- [x] Documentation updated

## Important Notes

1. **Always use proxy addresses** for frontend integration, not implementation addresses
2. **ProxyAdmin ownership** should be transferred to multi-sig for production
3. **State file** (`deployment-state.json`) is auto-created and auto-cleaned on completion
4. **Resumability** allows safe interruption and resumption of deployment
5. **Gas costs** vary with network conditions; always check before deploying

## Support & References

- **Deployment Script**: `scripts/deploy-rwa-marketplace-complete.ts`
- **State File**: `deployment-state.json`
- **Addresses File**: `deployed-addresses-proxy.json`
- **Rules**: `.cursor/rules/sepolia-deployment-architecture.mdc`
- **Architecture**: `docs/deployment/SEPOLIA_DEPLOYMENT_ARCHITECTURE.md`

---

**For detailed architecture information, see [SEPOLIA_DEPLOYMENT_ARCHITECTURE.md](./deployment/SEPOLIA_DEPLOYMENT_ARCHITECTURE.md)**

