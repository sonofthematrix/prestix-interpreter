# Function Signatures for MetaMask Parameter Decoding

This document contains all write function signatures for Tiger Palace Pro contracts.

## Registration Status

Function signatures are registered with [4byte.directory](https://www.4byte.directory/) to enable MetaMask parameter decoding.

## Function Signatures by Contract

### ProxyAdmin

**Contract Address**: `0x9d55BcFA47e88868B54C811041A942250d7F3DD9`

| Function Signature | Full Signature | Parameters |
|---------------------|----------------|------------|
| `changePr` | `changeProxyAdmin(address, address)` | address proxy, address newAdmin |
| `transfer` | `transferOwnership(address)` | address _newOwner |
| `upgrade(` | `upgrade(address, address)` | address proxy, address implementation |
| `upgradeA` | `upgradeAndCall(address, address, bytes)` | address proxy, address implementation, bytes data |

### RWAAssetRegistry

**Contract Address**: `0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D`

| Function Signature | Full Signature | Parameters |
|---------------------|----------------|------------|
| `addMarke` | `addMarketplace(address)` | address marketplace |
| `emergenc` | `emergencyPause()` | None |
| `grantRol` | `grantRole(bytes32, address)` | bytes32 role, address account |
| `initiali` | `initialize(address)` | address admin |
| `register` | `registerAsset(address, string, string, string, string, uint256, uint256, uint256)` | address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens |
| `removeMa` | `removeMarketplace(address)` | address marketplace |
| `renounce` | `renounceRole(bytes32, address)` | bytes32 role, address account |
| `revokeRo` | `revokeRole(bytes32, address)` | bytes32 role, address account |
| `transfer` | `transferAsset(uint256, address)` | uint256 assetId, address newOwner |
| `unpause(` | `unpause()` | None |
| `updateAs` | `updateAsset(uint256, uint256, uint256)` | uint256 assetId, uint256 newPrice, uint256 newTokenPrice |
| `updateAs` | `updateAssetStatus(uint256, uint8)` | uint256 assetId, uint8 newStatus |
| `updateTo` | `updateTokenAvailability(uint256, uint256)` | uint256 assetId, uint256 soldAmount |
| `upgradeT` | `upgradeTo(address)` | address newImplementation |
| `upgradeT` | `upgradeToAndCall(address, bytes)` | address newImplementation, bytes data |

### RWATokenFactory

**Contract Address**: `0x2f051A127Ab4B8b0D78aB5758E06a808a8445566`

| Function Signature | Full Signature | Parameters |
|---------------------|----------------|------------|
| `addToken` | `addTokenCreator(address)` | address creator |
| `burnToke` | `burnTokens(uint256, address, uint256)` | uint256 assetId, address from, uint256 amount |
| `createTo` | `createToken(uint256, string, string, uint256, address)` | uint256 assetId, string name, string symbol, uint256 totalSupply, address owner |
| `distribu` | `distributeDividends(uint256, uint256)` | uint256 assetId, uint256 amount |
| `emergenc` | `emergencyPause()` | None |
| `grantRol` | `grantRole(bytes32, address)` | bytes32 role, address account |
| `initiali` | `initialize(address)` | address admin |
| `mintToke` | `mintTokens(uint256, address, uint256)` | uint256 assetId, address to, uint256 amount |
| `removeTo` | `removeTokenCreator(address)` | address creator |
| `renounce` | `renounceRole(bytes32, address)` | bytes32 role, address account |
| `revokeRo` | `revokeRole(bytes32, address)` | bytes32 role, address account |
| `unpause(` | `unpause()` | None |
| `updateAs` | `updateAssetValue(uint256, uint256)` | uint256 assetId, uint256 newValue |
| `upgradeT` | `upgradeTo(address)` | address newImplementation |
| `upgradeT` | `upgradeToAndCall(address, bytes)` | address newImplementation, bytes data |

### RWATokenFactory404

**Contract Address**: `0xdC2AE75dC0D14E2f450156bE83c1F71920b6a896`

| Function Signature | Full Signature | Parameters |
|---------------------|----------------|------------|
| `burnToke` | `burnTokens(uint256, address, uint256)` | uint256 assetId, address from, uint256 amount |
| `createTo` | `createToken404(uint256, string, string, uint256, address, string)` | uint256 assetId, string name, string symbol, uint256 totalSupply, address owner, string tokenURI |
| `distribu` | `distributeDividends(uint256, uint256)` | uint256 assetId, uint256 amount |
| `grantRol` | `grantRole(bytes32, address)` | bytes32 role, address account |
| `mintToke` | `mintTokens(uint256, address, uint256)` | uint256 assetId, address to, uint256 amount |
| `pause()` | `pause()` | None |
| `renounce` | `renounceRole(bytes32, address)` | bytes32 role, address account |
| `revokeRo` | `revokeRole(bytes32, address)` | bytes32 role, address account |
| `unpause(` | `unpause()` | None |
| `updateAs` | `updateAssetValue(uint256, uint256)` | uint256 assetId, uint256 newValue |

### RWAMarketplace

**Contract Address**: `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7`

| Function Signature | Full Signature | Parameters |
|---------------------|----------------|------------|
| `buyFromL` | `buyFromListing(uint256, uint256)` | uint256 listingId, uint256 tokenAmount |
| `cancelLi` | `cancelListing(uint256)` | uint256 listingId |
| `createLi` | `createListing(uint256, uint256, uint256)` | uint256 assetId, uint256 tokenAmount, uint256 pricePerToken |
| `emergenc` | `emergencyPause()` | None |
| `grantRol` | `grantRole(bytes32, address)` | bytes32 role, address account |
| `initiali` | `initialize(address, address, address, address)` | address assetRegistry_, address tokenFactory_, address feeRecipient, address admin |
| `purchase` | `purchaseTokens(uint256, uint256)` | uint256 assetId, uint256 tokenAmount |
| `renounce` | `renounceRole(bytes32, address)` | bytes32 role, address account |
| `revokeRo` | `revokeRole(bytes32, address)` | bytes32 role, address account |
| `setFeeRe` | `setFeeRecipient(address)` | address newFeeRecipient |
| `setMarke` | `setMarketplaceFee(uint256)` | uint256 newFeePercentage |
| `unpause(` | `unpause()` | None |
| `upgradeT` | `upgradeTo(address)` | address newImplementation |
| `upgradeT` | `upgradeToAndCall(address, bytes)` | address newImplementation, bytes data |
| `withdraw` | `withdrawFees()` | None |

### RWAStaking

**Contract Address**: `0x622A30E2da7A9F4f5Af7ad76008FBC18F848A1cc`

| Function Signature | Full Signature | Parameters |
|---------------------|----------------|------------|
| `claimRew` | `claimRewards(uint256)` | uint256 stakeId |
| `createPo` | `createPool(string, uint256, uint256, uint256)` | string name, uint256 duration, uint256 multiplier, uint256 minStake |
| `distribu` | `distributeRewards(uint256, uint256)` | uint256 poolId, uint256 amount |
| `grantRol` | `grantRole(bytes32, address)` | bytes32 role, address account |
| `initiali` | `initialize(address, address, address, address)` | address _tigerPalaceToken, address _rwaRevenue, address _rewardDistributor, address _admin |
| `pause()` | `pause()` | None |
| `renounce` | `renounceRole(bytes32, address)` | bytes32 role, address account |
| `revokeRo` | `revokeRole(bytes32, address)` | bytes32 role, address account |
| `stake(ui` | `stake(uint256, uint256)` | uint256 poolId, uint256 amount |
| `unpause(` | `unpause()` | None |
| `updateAd` | `updateAddresses(address, address)` | address _rwaRevenue, address _rewardDistributor |
| `updatePo` | `updatePoolConfig(uint256, bool, uint256, uint256)` | uint256 poolId, bool active, uint256 multiplier, uint256 minStake |

### RWARewardDistributor

**Contract Address**: `0x9cF49bB1D64c8D40c693FcAA9d326950b5F29EaB`

| Function Signature | Full Signature | Parameters |
|---------------------|----------------|------------|
| `addRewar` | `addRewards(uint256, string)` | uint256 amount, string source |
| `collectM` | `collectMarketplaceFees(uint256)` | uint256 amount |
| `collectP` | `collectPropertyDividends(uint256)` | uint256 amount |
| `distribu` | `distributePropertyRevenue(uint256)` | uint256 amount |
| `distribu` | `distributeRewards(uint256)` | uint256 amount |
| `emergenc` | `emergencyWithdraw(address, uint256)` | address token, uint256 amount |
| `grantRol` | `grantRole(bytes32, address)` | bytes32 role, address account |
| `initiali` | `initialize(address, address, address)` | address _rwaStaking, address _rwaRevenue, address _treasury |
| `pause()` | `pause()` | None |
| `renounce` | `renounceRole(bytes32, address)` | bytes32 role, address account |
| `revokeRo` | `revokeRole(bytes32, address)` | bytes32 role, address account |
| `unpause(` | `unpause()` | None |
| `updateAd` | `updateAddresses(address, address, address)` | address _rwaStaking, address _rwaRevenue, address _treasury |

### RWARevenue

**Contract Address**: `0x55b23576e535504F6db282159CD082bD97e16989`

| Function Signature | Full Signature | Parameters |
|---------------------|----------------|------------|
| `allocate` | `allocateRevenue(uint256, uint256, string)` | uint256 poolId, uint256 amount, string source |
| `distribu` | `distributeMarketplaceFees(uint256)` | uint256 totalAmount |
| `distribu` | `distributeRevenue(uint256, uint256)` | uint256 poolId, uint256 amount |
| `grantRol` | `grantRole(bytes32, address)` | bytes32 role, address account |
| `initiali` | `initialize(address)` | address _rwaStaking |
| `pause()` | `pause()` | None |
| `receiveM` | `receiveMarketplaceFees(uint256)` | uint256 amount |
| `receiveP` | `receivePropertyDividends(uint256)` | uint256 amount |
| `receiveS` | `receiveStakingRewards(uint256)` | uint256 amount |
| `renounce` | `renounceRole(bytes32, address)` | bytes32 role, address account |
| `revokeRo` | `revokeRole(bytes32, address)` | bytes32 role, address account |
| `unpause(` | `unpause()` | None |
| `updateAd` | `updateAddresses(address, address)` | address _rwaStaking, address _rewardDistributor |

### MembershipSystem

**Contract Address**: `0xB43cb5D178D8361307950da607D4A58C78aE8473`

| Function Signature | Full Signature | Parameters |
|---------------------|----------------|------------|
| `grantRol` | `grantRole(bytes32, address)` | bytes32 role, address account |
| `initiali` | `initialize(address)` | address admin |
| `pause()` | `pause()` | None |
| `register` | `registerMember(address, uint8)` | address member, uint8 tier |
| `renounce` | `renounceRole(bytes32, address)` | bytes32 role, address account |
| `revokeRo` | `revokeRole(bytes32, address)` | bytes32 role, address account |
| `unpause(` | `unpause()` | None |
| `upgradeM` | `upgradeMembership(address, uint8)` | address member, uint8 newTier |
| `upgradeT` | `upgradeTo(address)` | address newImplementation |
| `upgradeT` | `upgradeToAndCall(address, bytes)` | address newImplementation, bytes data |

