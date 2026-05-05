# Contract Review & Deployment Analysis

## Contract Overview

### Core Contracts (RWA Marketplace System)

1. **RWAAssetRegistry** (`contracts/core/RWAAssetRegistry.sol`)
   - **Type**: Regular contract (not upgradeable)
   - **Constructor**: No parameters
   - **Purpose**: Registry for Real World Assets with tokenization support
   - **Roles**: `ASSET_MANAGER_ROLE`, `MARKETPLACE_ROLE`
   - **Key Features**: Asset registration, status management, token availability tracking

2. **RWATokenFactory** (`contracts/core/RWATokenFactory.sol`)
   - **Type**: Regular contract (not upgradeable)
   - **Constructor**: No parameters
   - **Purpose**: Factory for creating RWA tokens (ERC20)
   - **Roles**: `TOKEN_CREATOR_ROLE`
   - **Key Features**: Token creation, minting, burning, dividend distribution

3. **RWAMarketplace** (`contracts/marketplace/RWAMarketplace.sol`)
   - **Type**: Regular contract (not upgradeable)
   - **Constructor**: 
     ```solidity
     constructor(
         address assetRegistry_,
         address tokenFactory_,
         address feeRecipient
     )
     ```
   - **Purpose**: Marketplace for trading RWA tokens (primary and secondary market)
   - **Roles**: `MARKETPLACE_ADMIN_ROLE`, `FEE_MANAGER_ROLE`
   - **Key Features**: Token purchases, listings, fee management

4. **RWAToken** (`contracts/core/RWAToken.sol`)
   - **Type**: Regular contract (not upgradeable)
   - **Constructor**: 
     ```solidity
     constructor(
         string memory name,
         string memory symbol,
         uint256 assetId_,
         uint256 totalSupply_,
         address owner
     )
     ```
   - **Purpose**: ERC20 token representing fractional ownership of a Real World Asset
   - **Note**: Created dynamically by RWATokenFactory, not deployed directly

### Staking Contracts

5. **RWAStaking** (`contracts/staking/RWAStaking.sol`)
   - **Type**: Regular contract (not upgradeable)
   - **Constructor**: 
     ```solidity
     constructor(
         address _tigerPalaceToken,
         address _rwaRevenue,
         address _rewardDistributor
     )
     ```
   - **Purpose**: Multi-pool staking contract with duration-based tiers
   - **Key Features**: Pool management, staking, rewards, duration multipliers

6. **RWARevenue** (`contracts/staking/RWARevenue.sol`)
   - **Type**: Regular contract (not upgradeable)
   - **Constructor**: 
     ```solidity
     constructor(
         address _tigerPalaceToken,
         address _rewardDistributor
     )
     ```
   - **Purpose**: Manages revenue distribution from property dividends and marketplace fees
   - **Note**: Has `initialize()` function to set `rwaStakingAddress` after deployment

## Contract Dependencies

```
RWAMarketplace
├── RWAAssetRegistry (immutable)
├── RWATokenFactory (immutable)
└── feeRecipient (address)

RWATokenFactory
└── (no dependencies)

RWAAssetRegistry
└── (no dependencies)

RWAStaking
├── TigerPalaceToken (ERC20)
├── RWARevenue
└── RewardDistributor

RWARevenue
├── TigerPalaceToken (ERC20)
└── RewardDistributor
```

## Deployment Order

### Phase 1: Core RWA Marketplace (Current Script)
1. **RWAAssetRegistry** (no dependencies)
2. **RWATokenFactory** (no dependencies)
3. **RWAMarketplace** (depends on Registry + Factory)
4. **Post-deployment wiring**:
   - Grant `MARKETPLACE_ROLE` to Marketplace on Registry
   - Grant `TOKEN_CREATOR_ROLE` to Marketplace on Factory

### Phase 2: Staking System (Additional Deployment Needed)
1. **RWARevenue** (depends on TigerPalaceToken + RewardDistributor)
2. **RWAStaking** (depends on TigerPalaceToken + RWARevenue + RewardDistributor)
3. **Post-deployment wiring**:
   - Initialize RWARevenue with RWAStaking address
   - Link contracts together

## Contract Issues & Recommendations

### ✅ Good Practices Found
1. **Access Control**: All contracts use OpenZeppelin AccessControl
2. **Reentrancy Protection**: Marketplace and Registry use ReentrancyGuard
3. **Pausable**: All contracts can be paused for emergencies
4. **Role-Based Permissions**: Proper role separation
5. **Immutable Variables**: Marketplace uses `immutable` for Registry and Factory

### ⚠️ Potential Issues

1. **RWAMarketplace Line 103**: 
   ```solidity
   assetRegistry.updateAssetStatus(assetId, 2);
   ```
   - Updates asset status to `2` (SOLD_OUT) immediately on purchase
   - Should check if all tokens are sold before marking as SOLD_OUT
   - **Issue**: Status updated before token availability is updated

2. **RWAMarketplace Line 103-110**:
   ```solidity
   assetRegistry.updateAssetStatus(assetId, 2);
   // ... token creation ...
   ```
   - Updates status before checking/creating token
   - Should create token first, then update status

3. **RWARevenue Missing initialize() Call**:
   - Constructor requires `_rewardDistributor` but `initialize()` sets `rwaStakingAddress`
   - Deployment script needs to call `initialize()` after RWAStaking is deployed

4. **No Upgradeability**:
   - All contracts are regular (not upgradeable)
   - Cannot upgrade without redeployment
   - Consider using upgradeable versions for production

### 📝 Verification Requirements

For Etherscan verification, you'll need:

1. **RWAAssetRegistry**: No constructor args
   ```bash
   hardhat verify --network sepolia <ADDRESS>
   ```

2. **RWATokenFactory**: No constructor args
   ```bash
   hardhat verify --network sepolia <ADDRESS>
   ```

3. **RWAMarketplace**: 3 constructor args
   ```bash
   hardhat verify --network sepolia <ADDRESS> \
     <REGISTRY_ADDRESS> \
     <FACTORY_ADDRESS> \
     <FEE_RECIPIENT_ADDRESS>
   ```

## Deployment Script Status

Current script (`deploy-sepolia.ts`) handles:
- ✅ Core RWA Marketplace deployment
- ✅ Post-deployment role grants
- ✅ Address persistence

Missing:
- ❌ Staking contracts deployment
- ❌ Revenue contract initialization
- ❌ Contract verification
- ❌ Gas estimation and reporting

## Recommendations

1. **Fix Marketplace Logic**: Update asset status after token availability update
2. **Add Verification**: Include automatic Etherscan verification after deployment
3. **Add Staking Deployment**: Create comprehensive deployment script for all contracts
4. **Add Validation**: Verify contract interactions after deployment
5. **Environment Variables**: Ensure all required addresses are set before deployment

## Next Steps

1. Review and fix Marketplace contract logic issues
2. Create comprehensive deployment script
3. Deploy to Sepolia testnet
4. Verify all contracts on Etherscan
5. Update frontend with new addresses

