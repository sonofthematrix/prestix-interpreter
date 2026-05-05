# Sepolia Deployment Architecture

## Overview

This document describes the complete architecture and deployment process for the Tiger Palace RWA ecosystem on Sepolia testnet. The deployment uses a **TransparentUpgradeableProxy** pattern with a centralized **ProxyAdmin** contract for upgradeability.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEPOLIA DEPLOYMENT ARCHITECTURE              │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   ProxyAdmin     │  ← Centralized upgrade control
│  (0xB8AD57FC...) │     Owns all proxy contracts
└────────┬─────────┘
         │
         ├───────────────────────────────────────────────-──────-┐
         │                                                       │
    ┌────▼──────────┐                                      ┌───-─▼──────────┐
    │ RWAAssetRegistry│                                    │ RWATokenFactory│
    │   Proxy         │                                    │   Proxy        │
    │ (0xA1fb017a...) │                                    │ (0x25Ea896...) │
    └─────────────────┘                                    └──────────────--┘
         │                                                    │
         │                                                    │
    ┌────▼──────────┐                                    ┌────▼─────────--─┐
    │ RWAMarketplace│                                    │ RWAStaking      │
    │   Proxy       │                                    │   Proxy         │
    │ (0x5295d340...)│                                   |  (0x83897dE9...)│
    └───────────────┘                                    └───────────────--┘
         │                                                     │
         │                                                     │
    ┌────▼──────────┐                                     ┌────▼──────────--┐
    │ MembershipSystem│                                   │ TigerPalaceToken│
    │   Proxy         │                                   │   Proxy         │
    │ (0xef48e58c...) │                                   │ (0x5E53F7C9...) │
    └─────────────────┘                                   └───────────────-─┘

┌─────────────────────────────────────────────────────────────────-┐
│              NON-UPGRADEABLE CONTRACTS                           │ 
├─────────────────────────────────────────────────────────────────-┤
│ RWARewardDistributor: 0xEd4D6FdE0B663BAA5a0bc8DC3a50493D984FA833 │
│ RWARevenue:           0xd64867B8840c09e6Bc448fd2d70C0EA7b1E3D889 │
│ RWATokenFactory404:   0x7a6f7dE826064903f2e419833b9633560217FEe2 │
└─────────────────────────────────────────────────────────────────-┘
```

## Deployment Phases

### Phase 0: Pre-Deployment Verification
- **Security Checks**: Validates critical security fixes
- **Network Validation**: Ensures Sepolia network (Chain ID: 11155111)
- **Balance Check**: Verifies deployer has sufficient ETH
- **Environment Validation**: Checks required environment variables
- **Gas Estimation**: Calculates estimated deployment costs

### Phase 1: Core Infrastructure
**Dependencies**: None

1. **ProxyAdmin Deployment**
   - Deploys centralized ProxyAdmin contract
   - Address: `0xB8AD57FC91066Bba784186A307D9b0271ce4d789`
   - Purpose: Controls all upgradeable proxy contracts
   - Gas Estimate: ~800,000 gas

2. **TigerPalaceToken Deployment** (if not provided)
   - Deploys implementation contract
   - Deploys TransparentUpgradeableProxy
   - Initializes with admin address
   - Address: `0x5E53F7C9b586eE12CA8A579456af2a6093141D69`
   - Gas Estimate: ~2,500,000 gas

### Phase 2: Core RWA Contracts
**Dependencies**: Phase 1 (ProxyAdmin)

1. **RWAAssetRegistry**
   - Implementation: `0x0cFDc1d5B5BAF41d07D207ACAD28dDC4D7092F96`
   - Proxy: `0xA1fb017a8c89cCB76F63d2244C4a228964B50D80`
   - Purpose: Registry for all real-world assets
   - Gas Estimate: ~3,300,000 gas (impl + proxy)

2. **RWATokenFactory**
   - Implementation: `0x0b6120e21e98FedED4b54aA9Ca86B58953dd84b2`
   - Proxy: `0x25Ea8960676D017811039481A39516a7E7112133`
   - Purpose: Factory for creating ERC20 RWA tokens
   - Gas Estimate: ~2,800,000 gas (impl + proxy)

3. **RWATokenFactory404** (Non-upgradeable)
   - Address: `0x7a6f7dE826064903f2e419833b9633560217FEe2`
   - Purpose: Factory for creating ERC-404 RWA tokens
   - Gas Estimate: ~2,000,000 gas

### Phase 3: Marketplace
**Dependencies**: Phase 2 (Registry, Factory)

1. **RWAMarketplace**
   - Implementation: `0x6432709B40350cc74D3147B8aeB4181CF3F0197D`
   - Proxy: `0x5295d340a0B06A2552C2169E5D238849550ea9Fe`
   - Purpose: Marketplace for trading RWA tokens
   - Fee: 2.5% (250 basis points)
   - Gas Estimate: ~4,800,000 gas (impl + proxy)

2. **Role Configuration**
   - Grants `MARKETPLACE_ROLE` on Registry to Marketplace
   - Grants `TOKEN_CREATOR_ROLE` on Factory to Marketplace
   - Gas Estimate: ~200,000 gas

### Phase 4: Staking Ecosystem
**Dependencies**: Phase 1 (TigerPalaceToken), Phase 3 (Marketplace)

1. **RWARewardDistributor** (Non-upgradeable)
   - Address: `0xEd4D6FdE0B663BAA5a0bc8DC3a50493D984FA833`
   - Purpose: Centralized reward pool management
   - Gas Estimate: ~1,500,000 gas

2. **RWARevenue** (Non-upgradeable)
   - Address: `0xd64867B8840c09e6Bc448fd2d70C0EA7b1E3D889`
   - Purpose: Time-weighted revenue allocation
   - Gas Estimate: ~2,000,000 gas

3. **RWAStaking**
   - Implementation: `0x1e36c8940F7DEa536C8483A465719A3eeaE606ad`
   - Proxy: `0x83897dE9eF0c7fc3003fD9602231963D1649B357`
   - Purpose: Multi-pool staking with duration tiers
   - Gas Estimate: ~4,300,000 gas (impl + proxy)

4. **Ecosystem Initialization**
   - Initialize RWARevenue with RWAStaking address
   - Initialize RWARewardDistributor with addresses
   - Grant `REVENUE_MANAGER_ROLE` to RWAStaking on RWARevenue
   - Gas Estimate: ~300,000 gas

### Phase 5: Token Configuration
**Dependencies**: Phase 4 (Staking Ecosystem)

1. **Fee Exemptions**
   - Exempt RewardDistributor from token fees (if supported)
   - Gas Estimate: ~100,000 gas

2. **Funding**
   - Fund RewardDistributor with initial tokens
   - Set allowances: RewardDistributor → Staking, Revenue
   - Gas Estimate: ~200,000 gas

3. **Admin Roles**
   - Grant admin roles to deployer/admin
   - Gas Estimate: ~200,000 gas

### Phase 6: Membership System
**Dependencies**: Phase 1 (ProxyAdmin)

1. **MembershipSystem**
   - Implementation: `0x1083A8fd80419664A51dCaf1AC11fEE37Ada61cF`
   - Proxy: `0xef48e58ca2411A098F09Ac85ECe400A4f6FF03DA`
   - Purpose: Membership tier system
   - Gas Estimate: ~2,300,000 gas (impl + proxy)

### Phase 7: Verification & Documentation
**Dependencies**: All previous phases

1. **Etherscan Verification**
   - Verify all implementation contracts
   - Verify proxy contracts (automatic with implementation)
   - Verify non-upgradeable contracts

2. **ABI Generation**
   - Generate frontend ABIs
   - Update `deployed-addresses-proxy.json`
   - Generate environment variable files

## Contract Relationships

### Access Control Matrix

| Contract | Role | Granted To | Purpose |
|----------|------|------------|---------|
| RWAAssetRegistry | `MARKETPLACE_ROLE` | RWAMarketplace | Allow marketplace to register assets |
| RWATokenFactory | `TOKEN_CREATOR_ROLE` | RWAMarketplace | Allow marketplace to create tokens |
| RWARevenue | `REVENUE_MANAGER_ROLE` | RWAStaking | Allow staking to claim revenue |
| RWAStaking | `DEFAULT_ADMIN_ROLE` | Deployer | Admin control |
| RWAStaking | `POOL_MANAGER_ROLE` | Deployer | Pool management |
| RWAStaking | `REWARD_MANAGER_ROLE` | Deployer | Reward management |

### Contract Linkage

```
RWAMarketplace
  ├─→ RWAAssetRegistry (has MARKETPLACE_ROLE)
  └─→ RWATokenFactory (has TOKEN_CREATOR_ROLE)

RWAStaking
  ├─→ TigerPalaceToken (staking token)
  ├─→ RWARevenue (revenue source)
  └─→ RWARewardDistributor (reward pool)

RWARevenue
  ├─→ RWAStaking (revenue manager)
  └─→ TigerPalaceToken (revenue token)

RWARewardDistributor
  ├─→ RWAStaking (reward recipient)
  ├─→ RWARevenue (revenue recipient)
  └─→ Treasury (penalty recipient)
```

## Deployment Script Architecture

### Main Deployment Script
**File**: `scripts/deploy-rwa-marketplace-complete.ts`

**Features**:
- ✅ Resumable deployment with state persistence
- ✅ On-chain validation before skipping steps
- ✅ Gas estimation and cost tracking
- ✅ Automatic Etherscan verification
- ✅ ABI generation for frontend
- ✅ Environment variable updates

### State Management

**State File**: `deployment-state.json`

```json
{
  "phase": 4,
  "step": "staking",
  "completed": false,
  "addresses": { ... },
  "completedSteps": {
    "phase1": ["proxyAdmin", "tokenizinToken"],
    "phase2": ["registry", "factory"],
    "phase3": ["marketplace", "grantMarketplaceRoles"],
    "phase4": ["rewardDistributor", "revenue", "staking"]
  },
  "initialized": {
    "RWARevenue": true,
    "RWARewardDistributor": true
  },
  "roleGrants": {
    "RWAAssetRegistry": ["MARKETPLACE_ROLE:0x..."],
    "RWARevenue": ["REVENUE_MANAGER_ROLE:0x..."]
  },
  "timestamp": "2025-01-XX..."
}
```

### Resumability Features

1. **On-Chain Validation**: Checks if contracts exist before skipping
2. **Step Tracking**: Granular step-by-step completion tracking
3. **Initialization Tracking**: Tracks initialization status separately
4. **Role Grant Tracking**: Tracks which roles have been granted
5. **State Persistence**: Saves state after every step

## Gas Optimization

### Optimizer Configuration
- **Implementation Contracts**: `runs: 1` (optimize for deployment cost)
- **Proxy Contracts**: `runs: 999999` (optimize for runtime performance)

### Estimated Gas Costs

| Phase | Operation | Gas Estimate |
|-------|-----------|--------------|
| Phase 1 | ProxyAdmin | 800,000 |
| Phase 1 | TigerPalaceToken | 2,500,000 |
| Phase 2 | RWAAssetRegistry | 3,300,000 |
| Phase 2 | RWATokenFactory | 2,800,000 |
| Phase 2 | RWATokenFactory404 | 2,000,000 |
| Phase 3 | RWAMarketplace | 4,800,000 |
| Phase 3 | Role Grants | 200,000 |
| Phase 4 | RWARewardDistributor | 1,500,000 |
| Phase 4 | RWARevenue | 2,000,000 |
| Phase 4 | RWAStaking | 4,300,000 |
| Phase 4 | Initialization | 300,000 |
| Phase 5 | Configuration | 500,000 |
| Phase 6 | MembershipSystem | 2,300,000 |
| **Total** | | **~28,000,000** |

At 30 gwei: ~0.84 ETH minimum (with 20% buffer: ~1.0 ETH)

## Security Considerations

### ProxyAdmin Security
- **Single Point of Control**: ProxyAdmin owns all upgradeable contracts
- **Recommendation**: Transfer to multi-sig wallet for production
- **Current Owner**: Deployer address

### Access Control
- All contracts use OpenZeppelin's AccessControl
- Roles are granted explicitly during deployment
- Admin roles should be transferred to multi-sig post-deployment

### Emergency Controls
- Contracts support `pause()` functionality
- Circuit breaker patterns implemented
- Emergency withdrawal functions available

## Verification Process

### Etherscan Verification
1. Verify implementation contracts first
2. Proxy contracts auto-verify when implementation is verified
3. Non-upgradeable contracts verified directly

### Verification Commands
```bash
# Verify implementation
npx hardhat verify --network sepolia <IMPLEMENTATION_ADDRESS>

# Proxy verification is automatic when implementation is verified
```

## Post-Deployment Checklist

- [ ] All contracts verified on Etherscan
- [ ] Contract addresses saved to `deployed-addresses-proxy.json`
- [ ] Environment variables updated in `.env.local`
- [ ] Frontend ABIs generated
- [ ] Contract relationships validated
- [ ] Role grants verified
- [ ] Initial funding completed
- [ ] Health checks passed
- [ ] Documentation updated

## Network Configuration

### Sepolia Testnet
- **Chain ID**: 11155111
- **RPC URL**: `https://sepolia.infura.io/v3/YOUR_KEY` or public RPC
- **Explorer**: https://sepolia.etherscan.io
- **Currency**: Sepolia ETH (testnet)

### Required Environment Variables

```bash
# Deployment Account
TGR_DEPLOY_PRVT_KEY=0x...your_private_key

# Network Configuration
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Etherscan Verification
ETHERSCAN_API_KEY=your_etherscan_api_key

# Admin Configuration
ADMIN_WALLET_ADDRESS=0x...admin_address
TREASURY_ADDRESS=0x...treasury_address

# Optional Configuration
TIGER_PALACE_TOKEN_ADDRESS=0x... # If reusing existing token
USDC_ADDRESS=0x... # Payment token
FEE_RECIPIENT=0x... # Defaults to admin
```

## Troubleshooting

### Common Issues

1. **Insufficient Gas**
   - Check deployer balance
   - Increase gas price if needed
   - Deploy in phases during low gas periods

2. **Verification Failures**
   - Wait for Etherscan indexing (30+ seconds)
   - Check constructor arguments match
   - Verify compiler version matches

3. **Resume Failures**
   - Check `deployment-state.json` for current state
   - Validate addresses exist on-chain
   - Delete state file to restart if needed

4. **Role Grant Failures**
   - Check if role already granted
   - Verify contract addresses are correct
   - Ensure deployer has admin role

## References

- **Deployment Script**: `scripts/deploy-rwa-marketplace-complete.ts`
- **State File**: `deployment-state.json`
- **Addresses File**: `deployed-addresses-proxy.json`
- **Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- **Resumability Guide**: `DEPLOYMENT_RESUMABILITY_GUIDE.md`
- **Sepolia Deployment Complete**: `SEPOLIA_DEPLOYMENT_COMPLETE.md`

