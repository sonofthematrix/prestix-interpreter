# Upgradeable Proxy Deployment - Status & Next Steps

## ✅ Completed

1. **Rules Updated** - `.cursor/rules/smart-contract-deployment-patterns.mdc` now reflects upgradeable proxy pattern
2. **Deployment Script Created** - `smart-contracts/scripts/deploy-upgradeable-ecosystem.ts` with ABI export functionality

## ⚠️ Required: Create Missing Upgradeable Contracts

The following upgradeable contracts need to be created:

### 1. TigerPalaceTokenUpgradeable
**Location:** `smart-contracts/contracts/upgradeable/TigerPalaceTokenUpgradeable.sol`
- Convert from `TigerPalaceToken` (non-upgradeable)
- Use OpenZeppelin upgradeable contracts:
  - `ERC20Upgradeable` instead of `ERC20`
  - `AccessControlUpgradeable` instead of `AccessControl`
  - `PausableUpgradeable` instead of `Pausable`
  - `Initializable` pattern
- Add `initialize()` function instead of constructor
- Add `constructor() { _disableInitializers(); }`

### 2. RWARevenueUpgradeable
**Location:** `smart-contracts/contracts/upgradeable/RWARevenueUpgradeable.sol`
- Convert from `RWARevenue` (non-upgradeable)
- Use upgradeable contracts pattern
- Initialize with `initialize()` function

### 3. RWARewardDistributorUpgradeable
**Location:** `smart-contracts/contracts/upgradeable/RWARewardDistributorUpgradeable.sol`
- Convert from `RWARewardDistributor` (non-upgradeable)
- Use upgradeable contracts pattern
- Initialize with `initialize()` function

## Deployment Process

Once upgradeable contracts are created:

1. **Compile contracts:**
   ```bash
   cd smart-contracts
   bun hardhat compile
   ```

2. **Deploy upgradeable ecosystem:**
   ```bash
   bun hardhat run scripts/deploy-upgradeable-ecosystem.ts --network sepolia
   ```

3. **ABIs will be automatically exported to:**
   - `smart-contracts/abis/TigerPalaceTokenUpgradeable.json`
   - `smart-contracts/abis/RWARewardDistributorUpgradeable.json`
   - `smart-contracts/abis/RWARevenueUpgradeable.json`
   - `smart-contracts/abis/RWAStakingUpgradeable.json`

4. **Deployment addresses saved to:**
   - `smart-contracts/deployed-addresses-upgradeable.json`

## Frontend Integration

After deployment, use proxy addresses (not implementation addresses) for frontend integration:

```typescript
// Use proxy addresses from deployed-addresses-upgradeable.json
const TIGER_PALACE_TOKEN_PROXY = "0x..."; // Proxy address
const RWA_STAKING_PROXY = "0x..."; // Proxy address
const RWA_REVENUE_PROXY = "0x..."; // Proxy address
const RWA_REWARD_DISTRIBUTOR_PROXY = "0x..."; // Proxy address

// Load ABIs from smart-contracts/abis/
import TigerPalaceTokenABI from "../abis/TigerPalaceTokenUpgradeable.json";
import RWAStakingABI from "../abis/RWAStakingUpgradeable.json";
// ... etc
```

## Next Steps

1. Create the three missing upgradeable contracts
2. Test compilation
3. Deploy to Sepolia testnet
4. Verify contracts on Etherscan
5. Export ABIs for frontend integration
6. Update frontend to use proxy addresses

