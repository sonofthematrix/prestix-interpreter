# Deployment Script Resumability Guide

## Overview

The `deploy-rwa-marketplace-complete.ts` script has been enhanced with **comprehensive resumability** features. If the script fails or exits at any point, you can simply rerun it and it will automatically:

1. ✅ **Skip already deployed contracts** (validated on-chain)
2. ✅ **Resume from the last incomplete step**
3. ✅ **Validate on-chain state** before skipping steps
4. ✅ **Track initialization and configuration steps** separately
5. ✅ **Handle partial phase completion** gracefully

## How It Works

### State Management

The script maintains a `deployment-state.json` file that tracks:

```typescript
{
  "phase": 4,                    // Current phase (0-7)
  "step": "staking",             // Last completed step
  "completed": false,            // Overall completion status
  "addresses": { ... },          // All deployed contract addresses
  "completedSteps": {           // Granular step tracking
    "phase1": ["proxyAdmin", "tokenizinToken"],
    "phase2": ["registry", "factory"],
    "phase3": ["marketplace", "grantMarketplaceRoles"],
    "phase4": ["rewardDistributor", "revenue", "staking", "initializeRevenue", "initializeDistributor", "grantRevenueManagerRole"]
  },
  "initialized": {                // Track initialization status
    "RWARevenue": true,
    "RWARewardDistributor": true
  },
  "roleGrants": {                // Track role grants
    "RWARevenue": ["REVENUE_MANAGER_ROLE:0x..."],
    "RWAAssetRegistry": ["MARKETPLACE_ROLE:0x..."]
  },
  "timestamp": "2025-01-XX..."
}
```

### On-Chain Validation

Before skipping any deployment step, the script:

1. **Checks if contract exists on-chain** using `validateContractExists()`
2. **Validates contract code** is not empty (`code !== "0x"`)
3. **Redeploys if address exists but contract doesn't** (handles failed deployments)

### Step-by-Step Tracking

Each phase is broken down into granular steps:

#### Phase 1: Core Infrastructure
- `proxyAdmin` - Deploy ProxyAdmin
- `tokenizinToken` - Deploy TigerPalaceToken (if needed)

#### Phase 2: Core RWA Contracts
- `registry` - Deploy RWAAssetRegistry
- `factory` - Deploy RWATokenFactory

#### Phase 3: Marketplace
- `marketplace` - Deploy RWAMarketplace
- `grantMarketplaceRoles` - Grant MARKETPLACE_ROLE and TOKEN_CREATOR_ROLE

#### Phase 4: Staking Ecosystem
- `rewardDistributor` - Deploy RWARewardDistributor
- `revenue` - Deploy RWARevenue
- `staking` - Deploy RWAStaking
- `initializeRevenue` - Initialize RWARevenue with staking address
- `initializeDistributor` - Initialize RWARewardDistributor
- `grantRevenueManagerRole` - Grant REVENUE_MANAGER_ROLE to RWAStaking

#### Phase 5: Token Configuration
- `configureExemptions` - Configure token exemptions (if supported)
- `fundDistributor` - Fund RewardDistributor
- `grantAdminRoles` - Grant admin roles

#### Phase 6: Membership System
- `membership` - Deploy MembershipSystem

#### Phase 7: Verification & Documentation
- `verification` - Verify contracts and generate ABIs

## Usage Examples

### Scenario 1: Script Fails Mid-Deployment

```bash
# First run - fails at Phase 4, step "staking"
bun hardhat run scripts/deploy-rwa-marketplace-complete.ts --network sepolia
# Output: ❌ Deployment failed: Insufficient gas

# Second run - automatically resumes from Phase 4
bun hardhat run scripts/deploy-rwa-marketplace-complete.ts --network sepolia
# Output: 
# 🔄 RESUMING DEPLOYMENT
# 📊 Current Phase: 4
# ⏩ Skipping RWARewardDistributor deployment (already exists)
# ⏩ Skipping RWARevenue deployment (already exists)
# ⏩ Skipping RWAStaking deployment (already exists)
# 🔧 4d: Initializing RWARevenue with staking address...
```

### Scenario 2: Network Issues During Role Grants

```bash
# Script completes Phase 3 deployment but fails during role grants
# State shows: phase3 completedSteps = ["marketplace"]

# Rerun script
bun hardhat run scripts/deploy-rwa-marketplace-complete.ts --network sepolia
# Output:
# ⏩ Skipping RWAMarketplace deployment (already exists)
# 🔧 3b: Configuring contract relationships...
# ✅ Granted MARKETPLACE_ROLE to marketplace
# ✅ Granted TOKEN_CREATOR_ROLE to marketplace
```

### Scenario 3: Manual Intervention Needed

```bash
# Script pauses for manual verification
# You can safely exit (Ctrl+C) and resume later

# Resume deployment
bun hardhat run scripts/deploy-rwa-marketplace-complete.ts --network sepolia
# Script continues from where it left off
```

## Key Features

### ✅ On-Chain Validation

Every step validates contracts exist on-chain before skipping:

```typescript
const shouldDeploy = !addresses.ContractName || 
  !(await validateContractExists(addresses.ContractName, "ContractName"));
```

### ✅ Idempotent Operations

All operations are idempotent - safe to run multiple times:

- **Deployments**: Check if contract exists before deploying
- **Initializations**: Check if already initialized before initializing
- **Role Grants**: Check if role already granted before granting
- **Funding**: Check balance before transferring

### ✅ Graceful Error Handling

The script handles common errors gracefully:

- **"Already initialized"** → Skip initialization
- **"Role already granted"** → Skip role grant
- **"Contract already verified"** → Skip verification
- **"Insufficient balance"** → Warn and continue

### ✅ State Persistence

State is saved after **every step**, not just after phases:

```typescript
markStepCompleted(state, 4, "staking");
saveState({ ...state, phase: 4, step: "staking", addresses, timestamp });
```

## Resumability Checklist

When resuming a deployment, the script automatically:

- [x] Loads previous state from `deployment-state.json`
- [x] Validates all saved addresses exist on-chain
- [x] Skips completed deployment steps
- [x] Skips completed initialization steps
- [x] Skips completed role grant steps
- [x] Resumes from the last incomplete step
- [x] Displays clear resumability information
- [x] Updates state after each step

## State File Location

- **State File**: `deployment-state.json` (project root)
- **Addresses File**: `deployed-addresses-proxy.json` (project root)

## Cleanup

After successful deployment, the state file is automatically cleaned up:

```typescript
if (fs.existsSync(STATE_FILE)) {
  fs.unlinkSync(STATE_FILE);
  console.log(`✅ Cleaned up deployment state file`);
}
```

## Troubleshooting

### Issue: State file shows incorrect phase

**Solution**: Delete `deployment-state.json` and rerun. The script will validate on-chain state.

### Issue: Contract address exists but contract doesn't

**Solution**: The script automatically detects this and redeploys. If it doesn't, manually delete the address from state file.

### Issue: Role grants not completed

**Solution**: The script checks on-chain role status. If roles aren't granted, it will grant them on resume.

### Issue: Initialization failed but marked as complete

**Solution**: Delete the initialization step from `completedSteps` in state file and rerun.

## Best Practices

1. **Always check state file** before resuming to understand what's completed
2. **Validate addresses** match on-chain contracts before trusting state
3. **Don't manually edit state file** unless you understand the structure
4. **Let the script handle resumability** - it's designed to be safe
5. **Check logs** for `⏩ Skipping` messages to see what's being skipped

## Example State File

```json
{
  "phase": 4,
  "step": "staking",
  "completed": false,
  "addresses": {
    "ProxyAdmin": "0x...",
    "RWAAssetRegistry": "0x...",
    "RWATokenFactory": "0x...",
    "RWAMarketplace": "0x...",
    "RWARewardDistributor": "0x...",
    "RWARevenue": "0x...",
    "RWAStaking": "0x..."
  },
  "completedSteps": {
    "phase1": ["proxyAdmin", "tokenizinToken"],
    "phase2": ["registry", "factory"],
    "phase3": ["marketplace", "grantMarketplaceRoles"],
    "phase4": ["rewardDistributor", "revenue", "staking"]
  },
  "initialized": {},
  "roleGrants": {
    "RWAAssetRegistry": ["MARKETPLACE_ROLE:0x..."],
    "RWATokenFactory": ["TOKEN_CREATOR_ROLE:0x..."]
  },
  "timestamp": "2025-01-XX..."
}
```

## Summary

The deployment script is now **fully resumable** with:

- ✅ On-chain validation before skipping steps
- ✅ Granular step-by-step tracking
- ✅ Automatic recovery from failures
- ✅ Safe idempotent operations
- ✅ Clear resumability logging
- ✅ State persistence after every step

**You can safely interrupt and resume the deployment at any time!**

