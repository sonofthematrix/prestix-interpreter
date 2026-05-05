# Contract Function Signatures Reference

This document provides the actual function signatures for all contracts used in tests.

## TigerPalaceToken (Upgradeable)

**Constructor**: `constructor()` - Empty constructor (disables initializers)

**Initialize**: `initialize(address admin)` - Initializes the upgradeable contract

**Key Functions**:
- `mint(address to, uint256 amount)` - Mint tokens (requires MINTER_ROLE)
- `pause()` - Pause transfers (requires PAUSER_ROLE)
- `unpause()` - Unpause transfers (requires PAUSER_ROLE)
- `totalSupply()` - Returns total supply
- `balanceOf(address account)` - Returns balance
- `transfer(address to, uint256 amount)` - Transfer tokens
- `approve(address spender, uint256 amount)` - Approve spender
- `transferFrom(address from, address to, uint256 amount)` - Transfer from

**NOTE**: TigerPalaceToken does NOT have:
- `setMaxWalletExemption(address, bool)` - NOT AVAILABLE
- `setTaxExemption(address, bool)` - NOT AVAILABLE
- `updateTaxRates(uint256, uint256)` - NOT AVAILABLE

## RWAStaking

**Constructor**: `constructor(address _tigerPalaceToken, address _rwaRevenue, address _rewardDistributor)`

**Key Functions**:
- `stake(uint256 poolId, uint256 amount)` - Stake tokens in a pool
- `claimRewards(uint256 stakeId)` - Claim rewards for a stake (requires maturity)
- `createPool(string memory name, uint256 duration, uint256 multiplier, uint256 minStake)` - Create pool (requires POOL_MANAGER_ROLE)
- `getPool(uint256 poolId)` - Returns PoolConfig
- `getUserStakes(address user)` - Returns UserStake[] array
- `getPendingRewards(address user, uint256 stakeId)` - Returns pending rewards
- `getStats()` - Returns (uint256 _totalStaked, uint256 _totalRewardsDistributed, uint256 _poolCount)
- `distributeRewards(uint256 poolId, uint256 amount)` - Distribute rewards (requires REWARD_MANAGER_ROLE)
- `updatePoolConfig(uint256 poolId, bool active, uint256 multiplier, uint256 minStake)` - Update pool config

**Pool IDs**: Start at 1 (not 0). Default pools 1-4 are created in constructor.

**Reward Calculation**: `rewards = amount * (multiplier - 10000) / 10000`
- Multiplier 10000 = 0% bonus
- Multiplier 12000 = 20% bonus
- Rewards only available after `block.timestamp >= endTime`

## RWARevenue

**Constructor**: `constructor(address _tigerPalaceToken, address _rewardDistributor)`

**Initialize**: `initialize(address _rwaStaking)` - Sets staking address (optional, can be called once)

**Key Functions**:
- `allocateRevenue(uint256 poolId, uint256 amount, string memory source)` - Allocate revenue (requires REVENUE_MANAGER_ROLE)
- `distributeRevenue(uint256 poolId, uint256 amount)` - Distribute revenue (requires DISTRIBUTOR_ROLE)
- `poolRevenueAllocated(uint256 poolId)` - Returns allocated revenue
- `poolRevenueDistributed(uint256 poolId)` - Returns distributed revenue
- `rwaStakingAddress()` - Returns staking address
- `rwaMulti()` - NOT AVAILABLE (use rwaStakingAddress instead)

## RWARewardDistributor

**Constructor**: `constructor(address _tigerPalaceToken, address _treasury, uint256 _initialRewardPool)`

**Initialize**: `initialize(address _rwaStaking, address _rwaRevenue, address _treasury)` - Optional initialization

**Key Functions**:
- `addRewards(uint256 amount, string memory source)` - Add rewards (requires REWARD_MANAGER_ROLE)
- `distributeRewards(uint256 amount, address to)` - Distribute rewards
- `emergencyWithdraw(address token, uint256 amount)` - Emergency withdraw (requires DEFAULT_ADMIN_ROLE)

## Common Patterns

### Deployment Order
1. TigerPalaceToken (deploy, then initialize)
2. RWARewardDistributor (deploy with constructor args)
3. RWARevenue (deploy with constructor args, then initialize)
4. RWAStaking (deploy with constructor args)
5. Grant roles and configure

### Initialization Checks
- Check if contract is already initialized before calling `initialize()`
- Use try-catch to handle "already initialized" errors
- Verify contract state after initialization

### Pool ID Handling
- Pools start at ID 1 (not 0)
- Default pools 1-4 created in RWAStaking constructor
- Always use `getStats()` to get actual pool count
- Verify pool exists and is active before staking

### Reward Expectations
- Rewards are multiplier-based, NOT proportional revenue distribution
- Rewards = (stakeAmount * multiplier / 10000) - stakeAmount
- Rewards only available after stake maturity (`block.timestamp >= endTime`)
- Advance time appropriately before checking rewards

