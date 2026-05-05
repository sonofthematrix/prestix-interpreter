# Tiger Palace RWA Ecosystem - Contract API Reference

## Overview

Complete API reference for all deployed contracts in the Tiger Palace RWA ecosystem.

**Network**: sepolia (Chain ID: 11155111)
**Generated**: 2025-11-30T01:40:05.436Z

## 📋 Contracts Summary

### RWAAssetRegistry
**Address**: `0xf499a41F3dAeC24dae0a4E40dC965dB89E28fb28`
**Type**: Proxy

### RWATokenFactory
**Address**: `0x743b2C7A1F2e325A9785252d21F99097B76A5E61`
**Type**: Proxy

### RWATokenFactory404
**Address**: `0x7a6f7dE826064903f2e419833b9633560217FEe2`
**Type**: Proxy

### RWAMarketplace
**Address**: `0xB9bcC66DcE89F6c4bfb03ed8a9E6EF7d447F2061`
**Type**: Proxy

### RWAStaking
**Address**: `0x0368F457abB189fa08f88B02CAD429a243f15dCe`
**Type**: Proxy

### RWARewardDistributor
**Address**: `0xda46ff9382dFFb49261774c8C3B0c6Ac5fB7D694`
**Type**: Proxy

### RWARevenue
**Address**: `0x9DD2B48cA9D7147C30830D3629fDA8C1976F74Db`
**Type**: Proxy

### MembershipSystem
**Address**: `0xcb1017dd96C3F2C8FC74C0a558adA1FCD906A6d0`
**Type**: Proxy

### ProxyAdmin
**Address**: `0x1345f35238117b075056EeeF8fBe5e6504c632EB`
**Type**: Proxy

### RWAAssetRegistry_Implementation
**Address**: `0x1C2B5e0181667B68aBB9a5DA9D6C74e07986b42F`
**Type**: Implementation

### RWATokenFactory_Implementation
**Address**: `0x6f5b2ceE7b2ed493a00Fd259b5CE070d1B4Ade39`
**Type**: Implementation

### RWAMarketplace_Implementation
**Address**: `0x770AbBC3636433994439221028E087c44c0Bad8D`
**Type**: Implementation

### RWAStaking_Implementation
**Address**: `0x288C50AD4De731579B155Ac47e072798E9Dd0Dd0`
**Type**: Implementation

### MembershipSystem_Implementation
**Address**: `0xa9F75C649CEab9Ec70514EC4De1d9361eD43d3a7`
**Type**: Implementation



---

## 🔧 RWAAssetRegistry

**Address**: `0xf499a41F3dAeC24dae0a4E40dC965dB89E28fb28`

### Write Functions

#### registerAsset
```solidity
function registerAsset(
    address owner,
    string memory title,
    string memory description,
    string memory assetType,
    string memory location,
    uint256 price,
    uint256 tokenPrice,
    uint256 totalTokens
) external returns (uint256 assetId)
```

Registers a new real estate asset.

**Parameters:**
- `owner`: Address of the asset owner
- `title`: Asset title
- `description`: Asset description
- `assetType`: Type of real estate (apartment, house, commercial, etc.)
- `location`: Geographic location
- `price`: Total asset price in wei
- `tokenPrice`: Price per token in wei
- `totalTokens`: Total number of tokens to create

**Returns:** Asset ID (uint256)

**Events:** `AssetRegistered(assetId, owner, title, price)`

#### updateAsset
```solidity
function updateAsset(
    uint256 assetId,
    string memory title,
    string memory description,
    string memory location,
    uint256 price,
    uint256 tokenPrice
) external
```

Updates asset information.

**Parameters:**
- `assetId`: Asset ID to update
- `title`: New title
- `description`: New description
- `location`: New location
- `price`: New total price
- `tokenPrice`: New token price

**Events:** `AssetUpdated(assetId, msg.sender, block.timestamp)`

### Read Functions

#### getAsset
```solidity
function getAsset(uint256 assetId) external view returns (
    uint256 id,
    address owner,
    string memory title,
    string memory description,
    string memory assetType,
    string memory location,
    uint256 price,
    uint256 tokenPrice,
    uint256 totalTokens,
    uint256 availableTokens,
    uint256 soldTokens,
    uint8 status,
    uint256 createdAt,
    uint256 updatedAt
)
```

Gets complete asset information.

**Returns:** Asset struct with all properties

#### getNextAssetId
```solidity
function getNextAssetId() external view returns (uint256)
```

Gets the next available asset ID.

**Returns:** Next asset ID

---

## 🏭 RWATokenFactory

**Address**: `0x743b2C7A1F2e325A9785252d21F99097B76A5E61`

### Write Functions

#### createToken
```solidity
function createToken(
    uint256 assetId,
    string memory name,
    string memory symbol,
    uint256 totalSupply,
    address owner
) external returns (address tokenAddress)
```

Creates a new ERC-404 token for an asset.

**Parameters:**
- `assetId`: Associated asset ID
- `name`: Token name
- `symbol`: Token symbol
- `totalSupply`: Total token supply
- `owner`: Initial token owner

**Returns:** Token contract address

**Events:** `TokenCreated(assetId, tokenAddress, name, symbol, totalSupply)`

### Read Functions

#### getTokenAddress
```solidity
function getTokenAddress(uint256 assetId) external view returns (address)
```

Gets token address for an asset.

**Parameters:**
- `assetId`: Asset ID

**Returns:** Token contract address

#### getAllTokens
```solidity
function getAllTokens() external view returns (address[] memory)
```

Gets all created token addresses.

**Returns:** Array of token addresses

---

## 🏪 RWAMarketplace

**Address**: `0xB9bcC66DcE89F6c4bfb03ed8a9E6EF7d447F2061`

### Write Functions

#### buyTokens
```solidity
function buyTokens(uint256 assetId, uint256 amount) external payable
```

Purchases tokens for an asset.

**Parameters:**
- `assetId`: Asset ID to purchase tokens for
- `amount`: Number of tokens to purchase

**Value:** Total payment in ETH (must equal amount * tokenPrice)

**Events:** `TokensPurchased(msg.sender, assetId, amount, msg.value)`

#### sellTokens
```solidity
function sellTokens(
    uint256 assetId,
    uint256 amount,
    uint256 minPrice
) external
```

Sells tokens back to the marketplace.

**Parameters:**
- `assetId`: Asset ID
- `amount`: Number of tokens to sell
- `minPrice`: Minimum price per token (slippage protection)

**Events:** `TokensSold(msg.sender, assetId, amount, totalReceived)`

### Read Functions

#### getTokenPrice
```solidity
function getTokenPrice(uint256 assetId) external view returns (uint256)
```

Gets current token price for an asset.

**Returns:** Price per token in wei

#### getMarketplaceFee
```solidity
function getMarketplaceFee() external view returns (uint256)
```

Gets current marketplace fee percentage.

**Returns:** Fee in basis points (e.g., 250 = 2.5%)

---

## 💰 RWAStaking

**Address**: `0x0368F457abB189fa08f88B02CAD429a243f15dCe`

### Write Functions

#### createPool
```solidity
function createPool(
    string memory name,
    uint256 duration,
    uint256 multiplier
) external returns (uint256 poolId)
```

Creates a new staking pool.

**Parameters:**
- `name`: Pool name
- `duration`: Lock duration in seconds
- `multiplier`: Reward multiplier in basis points

**Returns:** Pool ID

**Events:** `PoolCreated(poolId, name, duration, multiplier)`

#### stake
```solidity
function stake(uint256 poolId, uint256 amount) external
```

Stakes tokens in a pool.

**Parameters:**
- `poolId`: Pool ID to stake in
- `amount`: Amount of tokens to stake

**Events:** `Staked(msg.sender, poolId, amount, stakeId)`

#### claimRewards
```solidity
function claimRewards(uint256 stakeId) external
```

Claims rewards for a stake.

**Parameters:**
- `stakeId`: Stake ID to claim rewards for

**Events:** `RewardsClaimed(msg.sender, stakeId, amount)`

### Read Functions

#### getUserStakes
```solidity
function getUserStakes(address user) external view returns (
    uint256[] memory stakeIds,
    uint256[] memory poolIds,
    uint256[] memory amounts,
    uint256[] memory startTimes,
    uint256[] memory endTimes,
    bool[] memory claimed,
    uint256[] memory rewards
)
```

Gets all stakes for a user.

**Returns:** Arrays containing stake information

#### getAllPools
```solidity
function getAllPools() external view returns (
    uint256[] memory poolIds,
    string[] memory names,
    uint256[] memory durations,
    uint256[] memory multipliers,
    bool[] memory actives,
    uint256[] memory totalStakeds,
    uint256[] memory totalRewardss
)
```

Gets all staking pools.

**Returns:** Arrays containing pool information

#### getPool
```solidity
function getPool(uint256 poolId) external view returns (
    uint256 id,
    string memory name,
    uint256 duration,
    uint256 multiplier,
    bool active,
    uint256 totalStaked,
    uint256 totalRewards
)
```

Gets information for a specific pool.

**Returns:** Pool struct

---

## 💵 RWARevenue

**Address**: `0x9DD2B48cA9D7147C30830D3629fDA8C1976F74Db`

### Write Functions

#### allocateRevenue
```solidity
function allocateRevenue(
    uint256 poolId,
    uint256 amount,
    string memory source
) external
```

Allocates revenue to a staking pool.

**Parameters:**
- `poolId`: Pool ID to allocate to
- `amount`: Amount of revenue to allocate
- `source`: Revenue source description

**Events:** `RevenueAllocated(poolId, amount, source)`

#### distributeRevenue
```solidity
function distributeRevenue(uint256 poolId, uint256 amount) external
```

Distributes allocated revenue to stakers.

**Parameters:**
- `poolId`: Pool ID
- `amount`: Amount to distribute

**Events:** `RevenueDistributed(poolId, amount)`

#### claimRevenue
```solidity
function claimRevenue(uint256 poolId) external
```

Claims revenue share for the caller.

**Parameters:**
- `poolId`: Pool ID to claim from

**Events:** `RevenueClaimed(msg.sender, poolId, amount)`

### Read Functions

#### getRevenueStats
```solidity
function getRevenueStats() external view returns (
    uint256 totalAllocated,
    uint256 totalDistributed,
    uint256 pendingRevenue,
    uint256 marketplaceFees,
    uint256 propertyDividends,
    uint256 stakingRewards
)
```

Gets comprehensive revenue statistics.

**Returns:** Revenue statistics struct

#### getPoolRevenueStats
```solidity
function getPoolRevenueStats(uint256 poolId) external view returns (
    uint256 allocated,
    uint256 distributed,
    uint256 pending
)
```

Gets revenue statistics for a specific pool.

**Returns:** Pool revenue statistics

---

## 🎁 RWARewardDistributor

**Address**: `0xda46ff9382dFFb49261774c8C3B0c6Ac5fB7D694`

### Write Functions

#### addRewards
```solidity
function addRewards(uint256 amount, string memory source) external
```

Adds rewards to the reward pool.

**Parameters:**
- `amount`: Amount of rewards to add
- `source`: Reward source description

**Events:** `RewardsAdded(amount, source)`

#### distributeRewards
```solidity
function distributeRewards(uint256 amount) external
```

Distributes rewards to stakers.

**Parameters:**
- `amount`: Amount to distribute

**Events:** `RewardsDistributed(amount, stakingContract)`

### Read Functions

#### getRewardPoolStats
```solidity
function getRewardPoolStats() external view returns (
    uint256 totalRewardPool,
    uint256 distributedRewards,
    uint256 pendingRewards,
    uint256 totalRevenueCollected,
    uint256 marketplaceFeesCollected,
    uint256 propertyDividendsCollected
)
```

Gets comprehensive reward pool statistics.

**Returns:** Reward pool statistics

#### getAvailableBalance
```solidity
function getAvailableBalance() external view returns (uint256)
```

Gets available reward token balance.

**Returns:** Available balance

---

## 👥 MembershipSystem

**Address**: `0xcb1017dd96C3F2C8FC74C0a558adA1FCD906A6d0`

### Write Functions

#### createMembership
```solidity
function createMembership(
    address member,
    string memory tier,
    uint256 duration
) external
```

Creates a membership for a user.

**Parameters:**
- `member`: Member address
- `tier`: Membership tier
- `duration`: Membership duration in seconds

**Events:** `MembershipCreated(member, membershipId, tier, expiry)`

#### renewMembership
```solidity
function renewMembership(uint256 membershipId, uint256 duration) external
```

Renews an existing membership.

**Parameters:**
- `membershipId`: Membership ID to renew
- `duration`: Additional duration in seconds

**Events:** `MembershipRenewed(membershipId, newExpiry)`

### Read Functions

#### getMembership
```solidity
function getMembership(uint256 membershipId) external view returns (
    uint256 id,
    address member,
    string memory tier,
    uint256 createdAt,
    uint256 expiresAt,
    bool active
)
```

Gets membership information.

**Returns:** Membership struct

#### getUserMemberships
```solidity
function getUserMemberships(address user) external view returns (uint256[] memory)
```

Gets all membership IDs for a user.

**Returns:** Array of membership IDs

---

## 🔐 Access Control

### Roles

- `DEFAULT_ADMIN_ROLE`: Full administrative access
- `POOL_MANAGER_ROLE`: Pool creation and management
- `REWARD_MANAGER_ROLE`: Reward distribution
- `TOKEN_CREATOR_ROLE`: Token creation
- `MARKETPLACE_ROLE`: Marketplace operations

### Role Management

```solidity
function grantRole(bytes32 role, address account) external
function revokeRole(bytes32 role, address account) external
function hasRole(bytes32 role, address account) external view returns (bool)
```

---

## 📊 Data Structures

### Asset Struct
```solidity
struct Asset {
    uint256 id;
    address owner;
    string title;
    string description;
    string assetType;
    string location;
    uint256 price;
    uint256 tokenPrice;
    uint256 totalTokens;
    uint256 availableTokens;
    uint256 soldTokens;
    uint8 status;
    uint256 createdAt;
    uint256 updatedAt;
}
```

### Pool Struct
```solidity
struct Pool {
    uint256 poolId;
    string name;
    uint256 duration;
    uint256 multiplier;
    bool active;
    uint256 totalStaked;
    uint256 totalRewards;
}
```

### Stake Struct
```solidity
struct Stake {
    uint256 stakeId;
    uint256 poolId;
    uint256 amount;
    uint256 startTime;
    uint256 endTime;
    bool claimed;
    uint256 rewards;
}
```

---

## 🚨 Error Messages

### Common Errors

- `AssetNotFound`: Asset does not exist
- `PoolNotActive`: Pool is not active
- `InsufficientBalance`: Insufficient token balance
- `UnauthorizedAccess`: Missing required role
- `InvalidAmount`: Invalid amount parameter
- `TransferFailed`: Token transfer failed

---

**Generated**: 2025-11-30T01:40:05.436Z
**Network**: sepolia
**Version**: 2.0.0
