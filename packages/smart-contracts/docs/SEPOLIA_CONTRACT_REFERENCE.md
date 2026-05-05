# Tiger Palace Pro - Sepolia Contract Deployment & Verification Report

**Network**: Sepolia Testnet  
**Chain ID**: 11155111  
**Deployment Date**: November 11, 2025  
**Deployer**: `0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047`

---

## 📊 Architecture Diagrams

For detailed architecture diagrams showing contract integration and Tiger Wallet component flow, see:

- **[Contract Release and Wallet Integration](./CONTRACT_RELEASE_AND_WALLET_INTEGRATION.md)** - Complete architecture diagrams
- **[Tiger Wallet Integration Summary](../../docs/TIGER_WALLET_INTEGRATION_SUMMARY.md)** - Component flow and system architecture

---

## ✅ Verification Status Summary

**All 14 contracts verified successfully on Etherscan!**

| Contract | Type | Verified | Etherscan Link |
|----------|------|----------|----------------|
| ProxyAdmin | Direct | ✅ | [View](https://sepolia.etherscan.io/address/0x9d55BcFA47e88868B54C811041A942250d7F3DD9) |
| RWAAssetRegistry | Proxy | ✅ | [View](https://sepolia.etherscan.io/address/0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D) |
| RWAAssetRegistry | Implementation | ✅ | [View](https://sepolia.etherscan.io/address/0x9e2eD8f46fEb7f70158f1201C06944B724e83411) |
| RWATokenFactory | Proxy | ✅ | [View](https://sepolia.etherscan.io/address/0x2f051A127Ab4B8b0D78aB5758E06a808a8445566) |
| RWATokenFactory | Implementation | ✅ | [View](https://sepolia.etherscan.io/address/0x8239db9a077397a6CE0482A4B4bbf21f00D0815A) |
| RWATokenFactory404 | Direct | ✅ | [View](https://sepolia.etherscan.io/address/0xdC2AE75dC0D14E2f450156bE83c1F71920b6a896) |
| RWAMarketplace | Proxy | ✅ | [View](https://sepolia.etherscan.io/address/0xc9C369525DFf385935dfDC6aC2F678C26998D0d7) |
| RWAMarketplace | Implementation | ✅ | [View](https://sepolia.etherscan.io/address/0x3E8b80714196ecB6925150347215bDF4C1420a8d) |
| RWAStaking | Proxy | ✅ | [View](https://sepolia.etherscan.io/address/0x622A30E2da7A9F4f5Af7ad76008FBC18F848A1cc) |
| RWAStaking | Implementation | ✅ | [View](https://sepolia.etherscan.io/address/0x4547421b68B6d8071A924F079f19EE9BA3C0d33D) |
| RWARewardDistributor | Direct | ✅ | [View](https://sepolia.etherscan.io/address/0x9cF49bB1D64c8D40c693FcAA9d326950b5F29EaB) |
| RWARevenue | Direct | ✅ | [View](https://sepolia.etherscan.io/address/0x55b23576e535504F6db282159CD082bD97e16989) |
| MembershipSystem | Proxy | ✅ | [View](https://sepolia.etherscan.io/address/0xB43cb5D178D8361307950da607D4A58C78aE8473) |
| MembershipSystem | Implementation | ✅ | [View](https://sepolia.etherscan.io/address/0x7dE5CcEfcfEa8fA59262a6899d81f01cc69C5949) |

---

## 📋 Contract Details

### 🔧 ProxyAdmin

**Address**: `0x9d55BcFA47e88868B54C811041A942250d7F3DD9`  
**Type**: Direct (Non-upgradeable)  
**Verified**: ✅ Yes  
**Etherscan**: [View Contract](https://sepolia.etherscan.io/address/0x9d55BcFA47e88868B54C811041A942250d7F3DD9#code)  
**ABI Generated**: ✅ Yes  
**Frontend Integrated**: ⚠️ Admin only

**Purpose**: Manages all upgradeable proxy contracts. Controls upgrades and admin changes.

**Key Functions**:
- `upgrade(TransparentUpgradeableProxy proxy, address implementation)` - Upgrade a proxy
- `upgradeAndCall(TransparentUpgradeableProxy proxy, address implementation, bytes data)` - Upgrade and call
- `changeProxyAdmin(TransparentUpgradeableProxy proxy, address newAdmin)` - Change proxy admin
- `getProxyImplementation(TransparentUpgradeableProxy proxy)` - Get implementation address
- `getProxyAdmin(TransparentUpgradeableProxy proxy)` - Get admin address

---

### 📦 RWAAssetRegistry

**Proxy Address**: `0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D`  
**Implementation Address**: `0x9e2eD8f46fEb7f70158f1201C06944B724e83411`  
**Proxy Admin**: `0x9d55BcFA47e88868B54C811041A942250d7F3DD9`  
**Type**: Upgradeable Proxy (TransparentUpgradeableProxy)  
**Proxy Verified**: ✅ Yes  
**Implementation Verified**: ✅ Yes  
**Etherscan Proxy**: [View Proxy](https://sepolia.etherscan.io/address/0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D#code)  
**Etherscan Implementation**: [View Implementation](https://sepolia.etherscan.io/address/0x9e2eD8f46fEb7f70158f1201C06944B724e83411#code)  
**ABI Generated**: ✅ Yes (`smart-contracts/artifacts/contracts/upgradeable/RWAAssetRegistryUpgradeable.sol/RWAAssetRegistryUpgradeable.json`)  
**Frontend Integrated**: ✅ Yes (`src/lib/services/enhanced-contract-factory-service.ts`)

**Purpose**: Registry for all real-world assets. Tracks asset ownership, tokenization, and availability.

#### Write Functions (State-Changing)

| Function Signature | Parameters | Description |
|-------------------|------------|-------------|
| `registerAsset(address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens)` | `owner`: Asset owner address<br>`title`: Asset title<br>`description`: Asset description<br>`assetType`: Type (e.g., "VILLA", "YACHT")<br>`location`: Asset location<br>`price`: Total asset price (wei)<br>`tokenPrice`: Price per token (wei)<br>`totalTokens`: Total tokens to issue | Register a new RWA asset |
| `updateAsset(uint256 assetId, uint256 newPrice, uint256 newTokenPrice)` | `assetId`: Asset ID<br>`newPrice`: New total price<br>`newTokenPrice`: New token price | Update asset pricing |
| `updateAssetStatus(uint256 assetId, uint8 newStatus)` | `assetId`: Asset ID<br>`newStatus`: Status (0=INACTIVE, 1=ACTIVE, 2=SOLD_OUT, 3=PAUSED) | Update asset status |
| `updateTokenAvailability(uint256 assetId, uint256 soldAmount)` | `assetId`: Asset ID<br>`soldAmount`: Tokens sold | Update token availability (marketplace only) |
| `transferAsset(uint256 assetId, address newOwner)` | `assetId`: Asset ID<br>`newOwner`: New owner address | Transfer asset ownership |
| `addMarketplace(address marketplace)` | `marketplace`: Marketplace contract address | Grant MARKETPLACE_ROLE |
| `removeMarketplace(address marketplace)` | `marketplace`: Marketplace contract address | Revoke MARKETPLACE_ROLE |
| `emergencyPause()` | None | Pause all operations |
| `unpause()` | None | Resume operations |

#### Read Functions (View)

| Function Signature | Parameters | Returns |
|-------------------|------------|---------|
| `getAsset(uint256 assetId)` | `assetId`: Asset ID | `AssetDetails` struct |
| `getAssetsByOwner(address owner)` | `owner`: Owner address | `uint256[]` asset IDs |
| `getActiveAssets()` | None | `uint256[]` active asset IDs |
| `getAssetsByType(string assetType)` | `assetType`: Asset type string | `uint256[]` asset IDs |
| `isAssetActive(uint256 assetId)` | `assetId`: Asset ID | `bool` |
| `getNextAssetId()` | None | `uint256` next asset ID |

---

### 🏭 RWATokenFactory

**Proxy Address**: `0x2f051A127Ab4B8b0D78aB5758E06a808a8445566`  
**Implementation Address**: `0x8239db9a077397a6CE0482A4B4bbf21f00D0815A`  
**Proxy Admin**: `0x9d55BcFA47e88868B54C811041A942250d7F3DD9`  
**Type**: Upgradeable Proxy (TransparentUpgradeableProxy)  
**Proxy Verified**: ✅ Yes  
**Implementation Verified**: ✅ Yes  
**Etherscan Proxy**: [View Proxy](https://sepolia.etherscan.io/address/0x2f051A127Ab4B8b0D78aB5758E06a808a8445566#code)  
**Etherscan Implementation**: [View Implementation](https://sepolia.etherscan.io/address/0x8239db9a077397a6CE0482A4B4bbf21f00D0815A#code)  
**ABI Generated**: ✅ Yes (`smart-contracts/artifacts/contracts/upgradeable/RWATokenFactoryUpgradeable.sol/RWATokenFactoryUpgradeable.json`)  
**Frontend Integrated**: ✅ Yes (`src/lib/services/enhanced-contract-factory-service.ts`)

**Purpose**: Factory for creating ERC20 RWA tokens for assets.

#### Write Functions (State-Changing)

| Function Signature | Parameters | Description |
|-------------------|------------|-------------|
| `createToken(uint256 assetId, string name, string symbol, uint256 totalSupply, address owner)` | `assetId`: Asset ID<br>`name`: Token name<br>`symbol`: Token symbol<br>`totalSupply`: Total supply<br>`owner`: Token owner | Create ERC20 token for asset |
| `mintTokens(uint256 assetId, address to, uint256 amount)` | `assetId`: Asset ID<br>`to`: Recipient address<br>`amount`: Amount to mint | Mint tokens |
| `burnTokens(uint256 assetId, address from, uint256 amount)` | `assetId`: Asset ID<br>`from`: Holder address<br>`amount`: Amount to burn | Burn tokens |
| `updateAssetValue(uint256 assetId, uint256 newValue)` | `assetId`: Asset ID<br>`newValue`: New asset value | Update asset value |
| `distributeDividends(uint256 assetId, uint256 totalAmount)` | `assetId`: Asset ID<br>`totalAmount`: Total dividend amount | Distribute dividends to token holders |
| `addTokenCreator(address creator)` | `creator`: Creator address | Grant TOKEN_CREATOR_ROLE |
| `removeTokenCreator(address creator)` | `creator`: Creator address | Revoke TOKEN_CREATOR_ROLE |
| `emergencyPause()` | None | Pause operations |
| `unpause()` | None | Resume operations |

#### Read Functions (View)

| Function Signature | Parameters | Returns |
|-------------------|------------|---------|
| `getTokenAddress(uint256 assetId)` | `assetId`: Asset ID | `address` token address |
| `getAssetId(address tokenAddress)` | `tokenAddress`: Token address | `uint256` asset ID |
| `isValidToken(address tokenAddress)` | `tokenAddress`: Token address | `bool` |
| `getAllTokens()` | None | `address[]` all token addresses |

---

### 🏭 RWATokenFactory404

**Address**: `0xdC2AE75dC0D14E2f450156bE83c1F71920b6a896`  
**Type**: Direct (Non-upgradeable)  
**Verified**: ✅ Yes  
**Etherscan**: [View Contract](https://sepolia.etherscan.io/address/0xdC2AE75dC0D14E2f450156bE83c1F71920b6a896#code)  
**ABI Generated**: ✅ Yes (`smart-contracts/artifacts/contracts/core/RWATokenFactory404.sol/RWATokenFactory404.json`)  
**Frontend Integrated**: ✅ Yes (`src/lib/services/enhanced-contract-factory-service.ts`)

**Purpose**: Factory for creating ERC-404 RWA tokens (NFT + ERC20 hybrid).

#### Write Functions (State-Changing)

| Function Signature | Parameters | Description |
|-------------------|------------|-------------|
| `createToken404(uint256 assetId, string name, string symbol, uint256 totalSupply, address owner, string tokenURI)` | `assetId`: Asset ID<br>`name`: Token name<br>`symbol`: Token symbol<br>`totalSupply`: Total supply<br>`owner`: Token owner<br>`tokenURI`: NFT metadata URI | Create ERC-404 token |
| `mintTokens(uint256 assetId, address to, uint256 amount)` | `assetId`: Asset ID<br>`to`: Recipient<br>`amount`: Amount | Mint tokens |
| `burnTokens(uint256 assetId, address from, uint256 amount)` | `assetId`: Asset ID<br>`from`: Holder<br>`amount`: Amount | Burn tokens |
| `updateAssetValue(uint256 assetId, uint256 newValue)` | `assetId`: Asset ID<br>`newValue`: New value | Update asset value |
| `distributeDividends(uint256 assetId, uint256 totalAmount)` | `assetId`: Asset ID<br>`totalAmount`: Total amount | Distribute dividends |

#### Read Functions (View)

| Function Signature | Parameters | Returns |
|-------------------|------------|---------|
| `getTokenAddress(uint256 assetId)` | `assetId`: Asset ID | `address` token address |
| `getAssetId(address tokenAddress)` | `tokenAddress`: Token address | `uint256` asset ID |
| `isValidToken(address tokenAddress)` | `tokenAddress`: Token address | `bool` |
| `getAllTokens()` | None | `address[]` all tokens |

---

### 🛒 RWAMarketplace

**Proxy Address**: `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7`  
**Implementation Address**: `0x3E8b80714196ecB6925150347215bDF4C1420a8d`  
**Proxy Admin**: `0x9d55BcFA47e88868B54C811041A942250d7F3DD9`  
**Type**: Upgradeable Proxy (TransparentUpgradeableProxy)  
**Proxy Verified**: ✅ Yes  
**Implementation Verified**: ✅ Yes  
**Etherscan Proxy**: [View Proxy](https://sepolia.etherscan.io/address/0xc9C369525DFf385935dfDC6aC2F678C26998D0d7#code)  
**Etherscan Implementation**: [View Implementation](https://sepolia.etherscan.io/address/0x3E8b80714196ecB6925150347215bDF4C1420a8d#code)  
**ABI Generated**: ✅ Yes (`smart-contracts/artifacts/contracts/upgradeable/RWAMarketplaceUpgradeable.sol/RWAMarketplaceUpgradeable.json`)  
**Frontend Integrated**: ✅ Yes (`src/lib/contracts/marketplace-service.ts`)

**Purpose**: Marketplace for trading RWA tokens. Handles listings, purchases, and fee collection.

**Configuration**:
- **Fee Recipient**: `0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047`
- **Marketplace Fee**: 250 bps (2.5%)
- **Asset Registry**: `0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D`
- **Token Factory**: `0x2f051A127Ab4B8b0D78aB5758E06a808a8445566`

#### Write Functions (State-Changing)

| Function Signature | Parameters | Description |
|-------------------|------------|-------------|
| `purchaseTokens(uint256 assetId, uint256 tokenAmount)` | `assetId`: Asset ID<br>`tokenAmount`: Tokens to purchase | Purchase tokens directly from asset (payable) |
| `createListing(uint256 assetId, uint256 tokenAmount, uint256 pricePerToken)` | `assetId`: Asset ID<br>`tokenAmount`: Tokens to list<br>`pricePerToken`: Price per token (wei) | Create a listing for tokens |
| `buyFromListing(uint256 listingId, uint256 tokenAmount)` | `listingId`: Listing ID<br>`tokenAmount`: Tokens to buy | Buy tokens from a listing (payable) |
| `cancelListing(uint256 listingId)` | `listingId`: Listing ID | Cancel an active listing |
| `setMarketplaceFee(uint256 newFeePercentage)` | `newFeePercentage`: New fee in basis points | Update marketplace fee (admin only) |
| `setFeeRecipient(address newFeeRecipient)` | `newFeeRecipient`: New fee recipient address | Update fee recipient (admin only) |
| `withdrawFees()` | None | Withdraw collected fees (admin only) |
| `emergencyPause()` | None | Pause marketplace (admin only) |
| `unpause()` | None | Resume marketplace (admin only) |

#### Read Functions (View)

| Function Signature | Parameters | Returns |
|-------------------|------------|---------|
| `getActiveListing(uint256 listingId)` | `listingId`: Listing ID | `Listing` struct |
| `getListingsByAsset(uint256 assetId)` | `assetId`: Asset ID | `Listing[]` array |
| `getListingsBySeller(address seller)` | `seller`: Seller address | `Listing[]` array |
| `calculatePurchaseCost(uint256 assetId, uint256 tokenAmount)` | `assetId`: Asset ID<br>`tokenAmount`: Token amount | `(uint256 totalCost, uint256 marketplaceFee)` |
| `getMarketplaceFee()` | None | `uint256` fee in basis points |
| `getCollectedFees()` | None | `uint256` total collected fees |
| `getFeeRecipient()` | None | `address` fee recipient |

---

### 💰 RWAStaking

**Proxy Address**: `0x622A30E2da7A9F4f5Af7ad76008FBC18F848A1cc`  
**Implementation Address**: `0x4547421b68B6d8071A924F079f19EE9BA3C0d33D`  
**Proxy Admin**: `0x9d55BcFA47e88868B54C811041A942250d7F3DD9`  
**Type**: Upgradeable Proxy (TransparentUpgradeableProxy)  
**Proxy Verified**: ✅ Yes  
**Implementation Verified**: ✅ Yes  
**Etherscan Proxy**: [View Proxy](https://sepolia.etherscan.io/address/0x622A30E2da7A9F4f5Af7ad76008FBC18F848A1cc#code)  
**Etherscan Implementation**: [View Implementation](https://sepolia.etherscan.io/address/0x4547421b68B6d8071A924F079f19EE9BA3C0d33D#code)  
**ABI Generated**: ✅ Yes (`smart-contracts/abis/frontend/RWAStaking.json`)  
**Frontend Integrated**: ⚠️ Partial (ABI exists, integration pending)

**Purpose**: Staking system for RWA tokens with multiple pools and reward distribution.

#### Write Functions (State-Changing)

| Function Signature | Parameters | Description |
|-------------------|------------|-------------|
| `createPool(string name, uint256 duration, uint256 multiplier, uint256 minStake)` | `name`: Pool name<br>`duration`: Lock duration (seconds)<br>`multiplier`: Reward multiplier (bps)<br>`minStake`: Minimum stake amount | Create staking pool |
| `stake(uint256 poolId, uint256 amount)` | `poolId`: Pool ID<br>`amount`: Amount to stake | Stake tokens |
| `claimStake(uint256 stakeId)` | `stakeId`: Stake ID | Claim staked tokens and rewards |
| `updatePoolConfig(uint256 poolId, bool active, uint256 multiplier, uint256 minStake)` | `poolId`: Pool ID<br>`active`: Active status<br>`multiplier`: New multiplier<br>`minStake`: New minimum | Update pool configuration |
| `distributeRewards(uint256 poolId, uint256 amount)` | `poolId`: Pool ID<br>`amount`: Reward amount | Distribute rewards to pool |
| `emergencyPause()` | None | Pause staking |
| `unpause()` | None | Resume staking |

#### Read Functions (View)

| Function Signature | Parameters | Returns |
|-------------------|------------|---------|
| `getPool(uint256 poolId)` | `poolId`: Pool ID | `PoolConfig` struct |
| `getUserStakes(address user)` | `user`: User address | `UserStake[]` array |
| `getUserStake(address user, uint256 stakeId)` | `user`: User address<br>`stakeId`: Stake ID | `UserStake` struct |
| `getTotalStaked()` | None | `uint256` total staked |
| `getTotalRewardsDistributed()` | None | `uint256` total rewards |

---

### 💸 RWARewardDistributor

**Address**: `0x9cF49bB1D64c8D40c693FcAA9d326950b5F29EaB`  
**Type**: Direct (Non-upgradeable)  
**Verified**: ✅ Yes  
**Etherscan**: [View Contract](https://sepolia.etherscan.io/address/0x9cF49bB1D64c8D40c693FcAA9d326950b5F29EaB#code)  
**ABI Generated**: ✅ Yes (`smart-contracts/abis/frontend/RWARewardDistributor.json`)  
**Frontend Integrated**: ⚠️ Partial (ABI exists, integration pending)

**Purpose**: Manages reward pool distribution for staking system.

#### Write Functions (State-Changing)

| Function Signature | Parameters | Description |
|-------------------|------------|-------------|
| `addRewards(uint256 amount, string source)` | `amount`: Reward amount<br>`source`: Source description | Add rewards to pool |
| `distributeRewards(uint256 amount)` | `amount`: Amount to distribute | Distribute rewards to staking contract |
| `initialize(address TigerStaking, address rwaRevenue, address treasury)` | `TigerStaking`: Staking address<br>`rwaRevenue`: Revenue address<br>`treasury`: Treasury address | Initialize contract addresses |
| `setContractAddresses(address TigerStaking, address rwaRevenue, address treasury)` | `TigerStaking`: Staking address<br>`rwaRevenue`: Revenue address<br>`treasury`: Treasury address | Update contract addresses |
| `emergencyWithdraw(address token, uint256 amount)` | `token`: Token address<br>`amount`: Amount | Emergency withdrawal (admin only) |
| `pause()` | None | Pause operations |
| `unpause()` | None | Resume operations |

#### Read Functions (View)

| Function Signature | Parameters | Returns |
|-------------------|------------|---------|
| `getTotalRewardPool()` | None | `uint256` total pool |
| `getDistributedRewards()` | None | `uint256` distributed |
| `getPendingRewards()` | None | `uint256` pending |
| `getTotalRevenueCollected()` | None | `uint256` total revenue |

---

### 💵 RWARevenue

**Address**: `0x55b23576e535504F6db282159CD082bD97e16989`  
**Type**: Direct (Non-upgradeable)  
**Verified**: ✅ Yes  
**Etherscan**: [View Contract](https://sepolia.etherscan.io/address/0x55b23576e535504F6db282159CD082bD97e16989#code)  
**ABI Generated**: ✅ Yes (`smart-contracts/abis/frontend/RWARevenue.json`)  
**Frontend Integrated**: ⚠️ Partial (ABI exists, integration pending)

**Purpose**: Manages revenue distribution from property dividends and marketplace fees.

#### Write Functions (State-Changing)

| Function Signature | Parameters | Description |
|-------------------|------------|-------------|
| `allocateRevenue(uint256 poolId, uint256 amount, string source)` | `poolId`: Pool ID<br>`amount`: Amount<br>`source`: Source description | Allocate revenue to pool |
| `distributeRevenue(uint256 poolId, uint256 amount)` | `poolId`: Pool ID<br>`amount`: Amount | Distribute revenue to stakers |
| `initialize(address TigerStaking)` | `TigerStaking`: Staking address | Initialize staking address |
| `pause()` | None | Pause operations |
| `unpause()` | None | Resume operations |

#### Read Functions (View)

| Function Signature | Parameters | Returns |
|-------------------|------------|---------|
| `getTotalRevenueAllocated()` | None | `uint256` total allocated |
| `getTotalRevenueDistributed()` | None | `uint256` total distributed |
| `getPendingRevenue()` | None | `uint256` pending |
| `getPoolRevenueAllocated(uint256 poolId)` | `poolId`: Pool ID | `uint256` allocated to pool |

---

### 👥 MembershipSystem

**Proxy Address**: `0xB43cb5D178D8361307950da607D4A58C78aE8473`  
**Implementation Address**: `0x7dE5CcEfcfEa8fA59262a6899d81f01cc69C5949`  
**Proxy Admin**: `0x9d55BcFA47e88868B54C811041A942250d7F3DD9`  
**Type**: Upgradeable Proxy (TransparentUpgradeableProxy)  
**Proxy Verified**: ✅ Yes  
**Implementation Verified**: ✅ Yes  
**Etherscan Proxy**: [View Proxy](https://sepolia.etherscan.io/address/0xB43cb5D178D8361307950da607D4A58C78aE8473#code)  
**Etherscan Implementation**: [View Implementation](https://sepolia.etherscan.io/address/0x7dE5CcEfcfEa8fA59262a6899d81f01cc69C5949#code)  
**ABI Generated**: ✅ Yes (`smart-contracts/artifacts/contracts/upgradeable/MembershipSystemUpgradeable.sol/MembershipSystemUpgradeable.json`)  
**Frontend Integrated**: ⚠️ Partial (ABI exists, integration pending)

**Purpose**: Membership tier system with engagement-based benefits.

#### Write Functions (State-Changing)

| Function Signature | Parameters | Description |
|-------------------|------------|-------------|
| `registerMember(address member)` | `member`: Member address | Register new member |
| `updateMemberTier(address member, uint8 tier)` | `member`: Member address<br>`tier`: Tier (0=Bronze, 1=Silver, 2=Gold) | Update member tier |
| `recordEngagement(address member, uint256 points)` | `member`: Member address<br>`points`: Engagement points | Record engagement activity |
| `emergencyPause()` | None | Pause operations |
| `unpause()` | None | Resume operations |

#### Read Functions (View)

| Function Signature | Parameters | Returns |
|-------------------|------------|---------|
| `getMemberTier(address member)` | `member`: Member address | `uint8` tier |
| `getMemberPoints(address member)` | `member`: Member address | `uint256` points |
| `isMember(address member)` | `member`: Member address | `bool` |

---

## 📊 ABI Generation Status

| Contract | ABI Location | Status |
|----------|--------------|--------|
| ProxyAdmin | `smart-contracts/artifacts/contracts/proxy/ProxyAdmin.sol/ProxyAdmin.json` | ✅ Generated |
| RWAAssetRegistry | `smart-contracts/artifacts/contracts/upgradeable/RWAAssetRegistryUpgradeable.sol/RWAAssetRegistryUpgradeable.json` | ✅ Generated |
| RWATokenFactory | `smart-contracts/artifacts/contracts/upgradeable/RWATokenFactoryUpgradeable.sol/RWATokenFactoryUpgradeable.json` | ✅ Generated |
| RWATokenFactory404 | `smart-contracts/artifacts/contracts/core/RWATokenFactory404.sol/RWATokenFactory404.json` | ✅ Generated |
| RWAMarketplace | `smart-contracts/artifacts/contracts/upgradeable/RWAMarketplaceUpgradeable.sol/RWAMarketplaceUpgradeable.json` | ✅ Generated |
| RWAStaking | `smart-contracts/abis/frontend/RWAStaking.json` | ✅ Generated |
| RWARewardDistributor | `smart-contracts/abis/frontend/RWARewardDistributor.json` | ✅ Generated |
| RWARevenue | `smart-contracts/abis/frontend/RWARevenue.json` | ✅ Generated |
| MembershipSystem | `smart-contracts/artifacts/contracts/upgradeable/MembershipSystemUpgradeable.sol/MembershipSystemUpgradeable.json` | ✅ Generated |

---

## 🔗 Frontend Integration Status

| Contract | Service File | Status | Notes |
|----------|--------------|--------|-------|
| RWAAssetRegistry | `src/lib/services/enhanced-contract-factory-service.ts` | ✅ Integrated | Used for asset registration |
| RWATokenFactory | `src/lib/services/enhanced-contract-factory-service.ts` | ✅ Integrated | Used for ERC20 token creation |
| RWATokenFactory404 | `src/lib/services/enhanced-contract-factory-service.ts` | ✅ Integrated | Used for ERC-404 token creation |
| RWAMarketplace | `src/lib/contracts/marketplace-service.ts` | ✅ Integrated | Full marketplace operations |
| RWAStaking | N/A | ⚠️ Pending | ABI exists, service pending |
| RWARewardDistributor | N/A | ⚠️ Pending | ABI exists, service pending |
| RWARevenue | N/A | ⚠️ Pending | ABI exists, service pending |
| MembershipSystem | N/A | ⚠️ Pending | ABI exists, service pending |

---

## 🔐 Environment Variables

All addresses are configured in `.env.local`:

```bash
# Proxy Admin
SEPOLIA_PROXY_ADMIN=0x9d55BcFA47e88868B54C811041A942250d7F3DD9

# Core Contracts (Use PROXY addresses)
RWA_ASSET_REGISTRY=0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D
RWA_TOKEN_FACTORY=0x2f051A127Ab4B8b0D78aB5758E06a808a8445566
RWA_TOKEN_FACTORY_404=0xdC2AE75dC0D14E2f450156bE83c1F71920b6a896
RWA_MARKETPLACE=0xc9C369525DFf385935dfDC6aC2F678C26998D0d7

# Staking Contracts
RWA_STAKING=0x622A30E2da7A9F4f5Af7ad76008FBC18F848A1cc
RWA_REWARD_DISTRIBUTOR=0x9cF49bB1D64c8D40c693FcAA9d326950b5F29EaB
RWA_REVENUE=0x55b23576e535504F6db282159CD082bD97e16989

# Membership System
MEMBERSHIP_SYSTEM=0xB43cb5D178D8361307950da607D4A58C78aE8473

# Public addresses (for frontend)
NEXT_PUBLIC_RWA_ASSET_REGISTRY=0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D
NEXT_PUBLIC_RWA_TOKEN_FACTORY=0x2f051A127Ab4B8b0D78aB5758E06a808a8445566
NEXT_PUBLIC_RWA_TOKEN_FACTORY_404=0xdC2AE75dC0D14E2f450156bE83c1F71920b6a896
NEXT_PUBLIC_RWA_MARKETPLACE=0xc9C369525DFf385935dfDC6aC2F678C26998D0d7
NEXT_PUBLIC_RWA_STAKING=0x622A30E2da7A9F4f5Af7ad76008FBC18F848A1cc
NEXT_PUBLIC_MEMBERSHIP_SYSTEM=0xB43cb5D178D8361307950da607D4A58C78aE8473
```

---

## 📝 Function Signature Registration

To enable MetaMask to decode function parameters, function signatures must be registered with the 4byte directory. See the script below for automated registration.

---

## 🔗 Quick Links

### Etherscan Explorer
- [ProxyAdmin](https://sepolia.etherscan.io/address/0x9d55BcFA47e88868B54C811041A942250d7F3DD9)
- [RWAAssetRegistry Proxy](https://sepolia.etherscan.io/address/0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D)
- [RWATokenFactory Proxy](https://sepolia.etherscan.io/address/0x2f051A127Ab4B8b0D78aB5758E06a808a8445566)
- [RWATokenFactory404](https://sepolia.etherscan.io/address/0xdC2AE75dC0D14E2f450156bE83c1F71920b6a896)
- [RWAMarketplace Proxy](https://sepolia.etherscan.io/address/0xc9C369525DFf385935dfDC6aC2F678C26998D0d7)
- [RWAStaking Proxy](https://sepolia.etherscan.io/address/0x622A30E2da7A9F4f5Af7ad76008FBC18F848A1cc)
- [RWARewardDistributor](https://sepolia.etherscan.io/address/0x9cF49bB1D64c8D40c693FcAA9d326950b5F29EaB)
- [RWARevenue](https://sepolia.etherscan.io/address/0x55b23576e535504F6db282159CD082bD97e16989)
- [MembershipSystem Proxy](https://sepolia.etherscan.io/address/0xB43cb5D178D8361307950da607D4A58C78aE8473)

---

**Last Updated**: November 11, 2025  
**Verification Status**: ✅ All contracts verified  
**Deployment Status**: ✅ Complete

