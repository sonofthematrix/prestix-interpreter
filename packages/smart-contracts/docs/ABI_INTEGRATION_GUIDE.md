# Tiger Palace RWA Ecosystem - Frontend Integration Guide

## Overview

This guide provides comprehensive documentation for integrating the Tiger Palace RWA (Real World Asset) ecosystem into your frontend application.

**Network**: sepolia (Chain ID: 11155111)
**Version**: 2.0.0
**Generated**: 2025-11-30T01:40:05.435Z

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install wagmi viem @wagmi/core @wagmi/vue ethers
# or
yarn add wagmi viem @wagmi/core @wagmi/vue ethers
# or
bun add wagmi viem @wagmi/core @wagmi/vue ethers
```

### 2. Configure Wagmi

```typescript
import { createConfig, WagmiProvider } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { createPublicClient, http } from 'viem';

export const config = createConfig({
  chains: [sepolia],
  client: ({ chain }) => ({
    chain,
    transport: http('https://rpc.sepolia.org'),
  }),
});
```

### 3. Import Contract Addresses and ABIs

```typescript
import { CONTRACT_ADDRESSES, RWA_MARKETPLACE_ABI, RWA_STAKING_ABI } from './abis/frontend/contracts';
import { useStaking, useMarketplace } from './abis/frontend/hooks';
```

## 📋 Contract Addresses

| Contract | Address | Description |
|----------|---------|-------------|
| RWAAssetRegistry | `0xf499a41F3dAeC24dae0a4E40dC965dB89E28fb28` |  r w a asset registry |
| RWATokenFactory | `0x743b2C7A1F2e325A9785252d21F99097B76A5E61` |  r w a token factory |
| RWATokenFactory404 | `0x7a6f7dE826064903f2e419833b9633560217FEe2` |  r w a token factory404 |
| RWAMarketplace | `0xB9bcC66DcE89F6c4bfb03ed8a9E6EF7d447F2061` |  r w a marketplace |
| RWAStaking | `0x0368F457abB189fa08f88B02CAD429a243f15dCe` |  r w a staking |
| RWARewardDistributor | `0xda46ff9382dFFb49261774c8C3B0c6Ac5fB7D694` |  r w a reward distributor |
| RWARevenue | `0x9DD2B48cA9D7147C30830D3629fDA8C1976F74Db` |  r w a revenue |
| MembershipSystem | `0xcb1017dd96C3F2C8FC74C0a558adA1FCD906A6d0` |  membership system |
| ProxyAdmin | `0x1345f35238117b075056EeeF8fBe5e6504c632EB` |  proxy admin |
| RWAAssetRegistry_Implementation | `0x1C2B5e0181667B68aBB9a5DA9D6C74e07986b42F` |  r w a asset registry_ implementation |
| RWATokenFactory_Implementation | `0x6f5b2ceE7b2ed493a00Fd259b5CE070d1B4Ade39` |  r w a token factory_ implementation |
| RWAMarketplace_Implementation | `0x770AbBC3636433994439221028E087c44c0Bad8D` |  r w a marketplace_ implementation |
| RWAStaking_Implementation | `0x288C50AD4De731579B155Ac47e072798E9Dd0Dd0` |  r w a staking_ implementation |
| MembershipSystem_Implementation | `0xa9F75C649CEab9Ec70514EC4De1d9361eD43d3a7` |  membership system_ implementation |

## 🔧 Core Contracts

### RWAAssetRegistry

**Purpose**: Manages real estate asset registrations and metadata.

**Key Functions**:
- `registerAsset(owner, title, description, assetType, location, price, tokenPrice, totalTokens)`
- `getAsset(assetId)` - Get asset details
- `updateAsset(assetId, ...)` - Update asset information
- `getNextAssetId()` - Get next available asset ID

**Events**:
- `AssetRegistered(assetId, owner, title, price)`
- `AssetUpdated(assetId, updater, timestamp)`

### RWATokenFactory

**Purpose**: Creates ERC-404 tokens for real estate assets.

**Key Functions**:
- `createToken(assetId, name, symbol, totalSupply, owner)`
- `getTokenAddress(assetId)` - Get token address for asset
- `getAllTokens()` - Get all created tokens
- `mint(assetId, to, amount)` - Mint additional tokens

**Events**:
- `TokenCreated(assetId, tokenAddress, name, symbol, totalSupply)`
- `TokenMinted(assetId, to, amount)`

### RWAMarketplace

**Purpose**: Handles token buying and selling with fees.

**Key Functions**:
- `buyTokens(assetId, amount)` - Purchase tokens (payable)
- `sellTokens(assetId, amount, minPrice)` - Sell tokens
- `getTokenPrice(assetId)` - Get current token price
- `getMarketplaceFee()` - Get current fee percentage

**Events**:
- `TokensPurchased(buyer, assetId, amount, totalPrice)`
- `TokensSold(seller, assetId, amount, totalReceived)`

### RWAStaking

**Purpose**: Multi-pool staking system with revenue sharing.

**Key Functions**:
- `createPool(name, duration, multiplier)` - Create new staking pool
- `stake(poolId, amount)` - Stake tokens in pool
- `claimRewards(stakeId)` - Claim staking rewards
- `getUserStakes(user)` - Get user's stakes
- `getAllPools()` - Get all available pools

**Events**:
- `PoolCreated(poolId, name, duration, multiplier)`
- `Staked(user, poolId, amount, stakeId)`
- `RewardsClaimed(user, stakeId, amount)`

### RWARevenue

**Purpose**: Distributes revenue from marketplace fees and property dividends.

**Key Functions**:
- `allocateRevenue(poolId, amount, source)` - Allocate revenue to pool
- `distributeRevenue(poolId, amount)` - Distribute revenue to stakers
- `claimRevenue(poolId)` - Claim revenue share
- `getRevenueStats()` - Get revenue statistics

**Events**:
- `RevenueAllocated(poolId, amount, source)`
- `RevenueDistributed(poolId, amount)`
- `RevenueClaimed(user, poolId, amount)`

### RWARewardDistributor

**Purpose**: Manages reward token distribution and fee collection.

**Key Functions**:
- `addRewards(amount, source)` - Add rewards to pool
- `distributeRewards(amount)` - Distribute rewards to stakers
- `collectMarketplaceFees(amount)` - Collect marketplace fees
- `getRewardPoolStats()` - Get reward pool statistics

## 🪝 React Hooks

### Staking Hooks

```typescript
import { useStaking } from './abis/frontend/hooks';

function StakingComponent() {
  const { getUserStakes, getAllPools, stake, claimRewards } = useStaking();

  // Get user's stakes
  const { data: stakes } = getUserStakes(userAddress);

  // Get available pools
  const { data: pools } = getAllPools();

  // Stake tokens
  const { stake: stakeTokens, isLoading } = stake();

  const handleStake = async (poolId: number, amount: string) => {
    await stakeTokens({
      args: [BigInt(poolId), parseEther(amount)],
    });
  };

  return (
    <div>
      <h2>Your Stakes</h2>
      {stakes?.map((stake, index) => (
        <div key={index}>
          Pool {stake.poolId}: {formatEther(stake.amount)} tokens
          <button onClick={() => claimRewards({ args: [stake.stakeId] })}>
            Claim Rewards
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Marketplace Hooks

```typescript
import { useMarketplace } from './abis/frontend/hooks';

function MarketplaceComponent() {
  const { buyTokens, sellTokens } = useMarketplace();

  const { buyTokens: purchaseTokens, isLoading: buying } = buyTokens();
  const { sellTokens: sellUserTokens, isLoading: selling } = sellTokens();

  const handleBuy = async (assetId: number, amount: string, price: string) => {
    await purchaseTokens({
      args: [BigInt(assetId), parseEther(amount)],
      value: parseEther(price),
    });
  };

  return (
    <div>
      <button
        onClick={() => handleBuy(1, '100', '10')}
        disabled={buying}
      >
        Buy 100 Tokens for 10 ETH
      </button>
    </div>
  );
}
```

## 📦 Viem Integration

### Reading Contract Data

```typescript
import { publicClient, getUserStakes, getAllPools } from './abis/frontend/viem';

async function loadStakingData(userAddress: `0x${string}`) {
  const [stakes, pools] = await Promise.all([
    getUserStakes(userAddress),
    getAllPools(),
  ]);

  return { stakes, pools };
}
```

### Writing to Contracts

```typescript
import { createWalletClient, stake } from './abis/frontend/viem';

const walletClient = createWalletClient('0x...privateKey...');

async function stakeTokens(poolId: number, amount: string) {
  const hash = await stake(walletClient, BigInt(poolId), parseEther(amount));
  console.log('Transaction hash:', hash);
}
```

## 🔄 Event Listening

### Wagmi Event Hooks

```typescript
import { useContractEvent } from 'wagmi';

function useStakingEvents() {
  useContractEvent({
    address: CONTRACT_ADDRESSES.sepolia.RWAStaking,
    abi: RWA_STAKING_ABI,
    eventName: 'Staked',
    listener: (event) => {
      console.log('New stake:', event);
    },
  });

  useContractEvent({
    address: CONTRACT_ADDRESSES.sepolia.RWAStaking,
    abi: RWA_STAKING_ABI,
    eventName: 'RewardsClaimed',
    listener: (event) => {
      console.log('Rewards claimed:', event);
    },
  });
}
```

### Viem Event Watching

```typescript
import { watchStakingEvents } from './abis/frontend/viem';

const unwatch = watchStakingEvents((event) => {
  console.log('Staking event:', event);
});

// Stop watching
// unwatch();
```

## 💰 Token Operations

### ERC-20 Token Interactions

```typescript
import { useToken } from './abis/frontend/hooks';

function TokenComponent({ tokenAddress, userAddress }: {
  tokenAddress: `0x${string}`;
  userAddress: `0x${string}`;
}) {
  const { getBalance, getAllowance, approve } = useToken(tokenAddress);

  const { data: balance } = getBalance(userAddress);
  const { data: allowance } = getAllowance(userAddress, stakingContractAddress);
  const { approve: approveTokens } = approve();

  const handleApprove = async (amount: string) => {
    await approveTokens({
      args: [stakingContractAddress, parseEther(amount)],
    });
  };

  return (
    <div>
      <p>Balance: {balance ? formatEther(balance) : '0'} tokens</p>
      <p>Allowance: {allowance ? formatEther(allowance) : '0'} tokens</p>
      <button onClick={() => handleApprove('1000')}>
        Approve 1000 tokens
      </button>
    </div>
  );
}
```

### ERC-404 Token Features

```typescript
// Check if user can convert to NFT (owns 100% of supply)
const canConvert = await canConvertToNFT(tokenAddress, userAddress, totalSupply);

// Convert between fungible and NFT states
if (canConvert) {
  // Use contract write functions for conversion
}
```

## 🛠️ Utility Functions

### Token Amount Formatting

```typescript
import { formatTokenAmount, parseTokenAmount } from './abis/frontend/contracts';

// Format for display
const displayAmount = formatTokenAmount(BigInt('1000000000000000000')); // "1.0"

// Parse from user input
const weiAmount = parseTokenAmount('1.5'); // 1500000000000000000n
```

### Address Validation

```typescript
import { isValidAddress, shortenAddress } from './abis/frontend/contracts';

if (isValidAddress(userInput)) {
  console.log('Valid address:', shortenAddress(userInput));
}
```

## 📊 Pool Information

### Pool Types

1. **Short-term Pool**: 30 days, 10% APY
2. **Medium-term Pool**: 90 days, 25% APY
3. **Long-term Pool**: 180 days, 50% APY
4. **Premium Pool**: 365 days, 100% APY

### Pool Configuration

```typescript
interface PoolConfig {
  poolId: number;
  name: string;
  duration: number; // seconds
  multiplier: number; // basis points (10000 = 100%)
  active: boolean;
  totalStaked: string;
  totalRewards: string;
}
```

## 🔐 Access Control

### Roles and Permissions

- **DEFAULT_ADMIN_ROLE**: Full administrative access
- **POOL_MANAGER_ROLE**: Can create and manage staking pools
- **REWARD_MANAGER_ROLE**: Can distribute rewards
- **TOKEN_CREATOR_ROLE**: Can create new tokens

### Contract Ownership

All contracts use OpenZeppelin's Ownable pattern with role-based access control.

## 🚨 Error Handling

### Common Errors

```typescript
try {
  await stake({ args: [poolId, amount] });
} catch (error) {
  if (error.message.includes('PoolNotActive')) {
    console.error('Selected pool is not active');
  } else if (error.message.includes('InsufficientBalance')) {
    console.error('Insufficient token balance');
  } else {
    console.error('Transaction failed:', error);
  }
}
```

## 📈 Gas Optimization

### Efficient Contract Calls

- Batch multiple operations when possible
- Use multicall for reading multiple values
- Estimate gas before sending transactions
- Monitor gas prices for optimal timing

### Example Gas Estimation

```typescript
import { estimateGas } from './abis/frontend/viem';

const gasEstimate = await estimateGas({
  to: CONTRACT_ADDRESSES.sepolia.RWAStaking,
  data: encodeFunctionData({
    abi: RWA_STAKING_ABI,
    functionName: 'stake',
    args: [poolId, amount],
  }),
});
```

## 🔍 Testing

### Unit Tests

Run contract unit tests:
```bash
bun run test
```

### Integration Tests

Run integration tests:
```bash
bun run test:staking:integration
bun run test:dividend-staking
```

## 📚 Additional Resources

- [Contract API Reference](./CONTRACT_API_REFERENCE.md)
- [Deployment Addresses](../deployed-addresses-proxy.json)
- [Contract ABIs](../abis/)
- [Generated TypeScript Types](../abis/frontend/contracts.ts)

---

**Generated**: 2025-11-30T01:40:05.436Z
**Network**: sepolia
**Version**: 2.0.0
