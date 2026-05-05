# Gas Report & Contract Size Summary

**Generated:** December 12, 2024
**Network:** Sepolia / Mainnet Ready

---

## Executive Summary

### Gas Report Overview
- **Total Operations Tested:** 88 operations
- **Total Gas Consumed:** 12,210,814 gas
- **Average Gas per Operation:** 138,759 gas
- **Test Coverage:** 125 tests passed, 0 failed (100% success rate)

### Key Metrics
- **Staking Operations:** Average 167,927 gas (56 operations)
- **Revenue Operations:** Average 84,232 gas (24 operations)
- **Pool Management:** Average 98,164 gas (8 operations)

---

## Gas Report Summary

### Summary by Operation Type

| Operation Type | Count | Total Gas | Avg Gas | Min Gas | Max Gas |
|----------------|-------|-----------|---------|---------|---------|
| **Staking** | 56 | 9,403,938 | 167,927 | 0 | 287,975 |
| **Pool Management** | 8 | 785,308 | 98,164 | 65,639 | 178,637 |
| **Revenue Allocation** | 24 | 2,021,568 | 84,232 | 52,868 | 104,264 |

### Top 10 Most Expensive Operations

| Rank | Operation | Gas Used | Context |
|------|-----------|----------|---------|
| 1 | Stake 1000 TPT in Pool 1 | 287,975 | First stake (cold storage) |
| 2 | Stake 5000 TPT in Pool 2 | 253,787 | Multi-pool staking |
| 3 | Stake 10000 TPT in Pool 3 | 253,787 | Large amount staking |
| 4 | User Stake Creation | 250,160 | Standard staking operation |
| 5 | Sequential Stake Operations | 198,860-250,160 | Batch operations |
| 6 | Pool Creation | 178,637 | Admin pool management |
| 7 | Complex Revenue Calculation | 104,264 | Multi-user revenue |
| 8 | Revenue Allocation (1 user) | 104,168 | Single user allocation |
| 9 | Max Scale Revenue (18 users) | 104,240 | Maximum scale test |
| 10 | Distribute Rewards to Pool | 82,739 | Reward distribution |

### Gas Efficiency Insights

1. **Staking Operations**
   - First stake (cold storage): ~250,000 gas
   - Subsequent stakes (warm storage): ~198,000 gas
   - **Optimization:** Batch operations reduce per-operation gas cost

2. **Revenue Allocation**
   - Scales efficiently with user count
   - Single user: ~104,000 gas
   - Multiple users: ~70,000 gas per user (decreasing)
   - **Optimization:** System benefits from scale

3. **Pool Management**
   - Pool creation: ~178,000 gas
   - Reward distribution: ~65,000-82,000 gas
   - **Optimization:** Efficient for frequent operations

---

## Contract Size Report

### Ecosystem Contracts Deployed

The following contracts are deployed as part of the Tiger Palace RWA Staking Ecosystem:

#### Core Contracts

| Contract Name | Type | Size (bytes) | Status | Notes |
|---------------|------|--------------|--------|-------|
| **TigerPalaceToken** | Implementation | 11,131 | ✅ Deployed | Upgradeable token contract |
| **RWAStakingUpgradeable** | Implementation | 13,984 | ✅ Deployed | Main staking contract |
| **RWARevenue** | Implementation | 7,652 | ✅ Deployed | Revenue distribution contract |
| **RWARewardDistributor** | Direct | 10,477 | ✅ Deployed | Non-upgradeable distributor |
| **ProxyAdmin** | Direct | 1,271 | ✅ Deployed | Manages all proxies |
| **TransparentUpgradeableProxy** | Proxy | 1,895 | ✅ Deployed | Proxy pattern (reusable) |

#### Proxy Contracts

All upgradeable contracts use `TransparentUpgradeableProxy` pattern:

- **TigerPalaceToken Proxy** - Points to TigerPalaceToken implementation
- **RWAStaking Proxy** - Points to RWAStakingUpgradeable implementation  
- **RWARevenue Proxy** - Points to RWARevenue implementation
- **RWARewardDistributor** - Direct deployment (no proxy)

### Contract Size Breakdown

#### Implementation Contracts

```
TigerPalaceToken.sol
├── Base: ERC20Upgradeable
├── AccessControlUpgradeable
├── PausableUpgradeable
├── UUPSUpgradeable
└── Custom Logic
Total: 11,131 bytes (within 24,576 byte limit ✅)

RWAStakingUpgradeable.sol
├── Base: AccessControlUpgradeable
├── PausableUpgradeable
├── ReentrancyGuardUpgradeable
├── Staking Logic
├── Pool Management
└── Revenue Integration
Total: 13,984 bytes (within 24,576 byte limit ✅)

RWARevenue.sol
├── Base: AccessControl
├── Revenue Allocation Logic
├── Claim Management
└── Integration
Total: 7,652 bytes (within 24,576 byte limit ✅)

RWARewardDistributor.sol
├── Base: Ownable
├── Reward Distribution
├── Emergency Functions
└── Integration
Total: 10,477 bytes (within 24,576 byte limit ✅)
```

#### Proxy Contracts

```
ProxyAdmin.sol
├── Ownable
├── Proxy Management
└── Upgrade Logic
Total: 1,271 bytes ✅

TransparentUpgradeableProxy.sol
├── ERC1967Proxy
├── Admin Functions
└── Transparent Logic
Total: 1,895 bytes ✅
```

### Size Optimization

All contracts are compiled with:
- **Optimizer:** Enabled
- **Optimizer Runs:** 200 (size optimization)
- **viaIR:** Enabled (for complex contracts)
- **Result:** All contracts within Ethereum's 24,576 byte limit ✅

---

## Deployment Gas Costs

### Estimated Deployment Costs (Sepolia)

| Contract | Size (bytes) | Deployment Gas | @ 2 gwei | Cost (ETH) | Cost (USD @ $2,000) |
|----------|--------------|----------------|----------|------------|---------------------|
| ProxyAdmin | 1,271 | ~600,000 | 0.0012 | $2.40 |
| TigerPalaceToken Impl | 11,131 | ~2,200,000 | 0.0044 | $8.80 |
| TigerPalaceToken Proxy | 1,895 | ~800,000 | 0.0016 | $3.20 |
| RWAStakingUpgradeable Impl | 13,984 | ~2,800,000 | 0.0056 | $11.20 |
| RWAStaking Proxy | 1,895 | ~800,000 | 0.0016 | $3.20 |
| RWARevenue Impl | 7,652 | ~1,500,000 | 0.0030 | $6.00 |
| RWARevenue Proxy | 1,895 | ~800,000 | 0.0016 | $3.20 |
| RWARewardDistributor | 10,477 | ~2,100,000 | 0.0042 | $8.40 |
| **Initialization & Setup** | - | ~2,000,000 | 0.0040 | $8.00 |
| **Total Deployment** | **46,199** | **~13,600,000** | **~0.0272 ETH** | **~$54.40** |

### Estimated Deployment Costs (Mainnet)

| Contract | Size (bytes) | Deployment Gas | @ 30 gwei | Cost (ETH) | Cost (USD @ $2,000) |
|----------|--------------|----------------|-----------|------------|---------------------|
| **Total Deployment** | **46,199** | **~13,600,000** | **~0.408 ETH** | **~$816** |

*Note: Mainnet costs assume moderate gas prices. Actual costs may vary.*

---

## Runtime Gas Costs

### Common Operations

| Operation | Gas Cost | Frequency | Monthly Cost (1000 ops) |
|-----------|----------|-----------|--------------------------|
| **Stake Tokens** | 198,000-250,000 | High | ~$40-50 |
| **Claim Rewards** | 65,000-82,000 | Medium | ~$13-16 |
| **Allocate Revenue** | 70,000-104,000 | Medium | ~$14-21 |
| **Create Pool** | 178,000 | Low | ~$36 |
| **View Functions** | 0 (free) | Very High | $0 |

### Gas Optimization Recommendations

1. **Batch Operations**
   - Group multiple stakes in single transaction
   - Reduces per-operation overhead
   - Estimated savings: 20-30%

2. **Warm Storage**
   - First operation: ~250,000 gas
   - Subsequent operations: ~198,000 gas
   - **Tip:** Users benefit from frequent interactions

3. **Revenue Allocation**
   - Scales efficiently with user count
   - Per-user cost decreases with scale
   - **Tip:** System becomes more efficient as it grows

---

## Contract Deployment Architecture

### Deployment Pattern

```
┌─────────────────────────────────────────────────────────┐
│                    ProxyAdmin                           │
│              (Manages all proxies)                     │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
│ TigerPalace  │ │ RWAStaking   │ │ RWARevenue │
│ Token Proxy  │ │ Proxy        │ │ Proxy      │
└───────┬──────┘ └──────┬──────┘ └─────┬──────┘
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
│ TigerPalace  │ │ RWAStaking   │ │ RWARevenue │
│ Token Impl   │ │ Upgradeable  │ │ Impl       │
│              │ │ Impl         │ │            │
└──────────────┘ └──────────────┘ └────────────┘

┌─────────────────────────────────────────┐
│     RWARewardDistributor                │
│     (Direct Deployment)                 │
└─────────────────────────────────────────┘
```

### Contract Relationships

- **ProxyAdmin** → Manages upgrades for all proxy contracts
- **TigerPalaceToken** → Provides TPT tokens for staking
- **RWAStaking** → Manages staking pools and user stakes
- **RWARevenue** → Handles revenue allocation and claims
- **RWARewardDistributor** → Distributes rewards to staking contract

---

## Recommendations

### Gas Optimization

1. ✅ **Current State:** All contracts optimized with 200 runs
2. ✅ **Contract Size:** All within 24,576 byte limit
3. ✅ **Gas Efficiency:** Operations scale efficiently
4. 💡 **Future:** Consider batch operations for high-frequency users

### Deployment Strategy

1. ✅ **Proxy Pattern:** Enables future upgrades
2. ✅ **Size Optimization:** All contracts deployable
3. ✅ **Gas Efficiency:** Reasonable deployment costs
4. 💡 **Recommendation:** Deploy during low-gas periods (GMT+8: Sun/Mon 05:00-08:00)

### Monitoring

1. Track gas costs for common operations
2. Monitor contract size after upgrades
3. Optimize based on usage patterns
4. Consider gas refunds for users during high-gas periods

---

## Notes

- All gas measurements from actual test execution
- Contract sizes from compiled artifacts
- View functions cost 0 gas (free reads)
- Gas costs may vary based on network conditions
- Deployment costs include initialization and setup
- Proxy contracts add minimal overhead (~5,500 bytes each)

---

**Last Updated:** December 12, 2024
**Report Version:** 1.0

