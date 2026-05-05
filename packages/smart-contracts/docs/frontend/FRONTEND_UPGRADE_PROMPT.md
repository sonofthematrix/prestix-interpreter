# KAGE Frontend Upgrade Prompt - Complete DApp Integration Guide

## 📋 Overview

This prompt provides comprehensive instructions for upgrading your KAGE frontend DApp with the latest smart contract deployment on Sepolia. The KAGE ecosystem is a **true decentralized application (DApp)** with no backend - it relies entirely on direct smart contract data access for transparency and to prevent data manipulation.

## 🎯 Latest Deployment Information

### ✅ Sepolia Testnet Deployment (2025-07-27)

**Network Details:**

- **Chain ID**: 11155111 (Sepolia)
- **Deployment Type**: Upgradeable Proxies (TransparentUpgradeableProxy)
- **Total Gas Used**: 11,794,585 gas
- **Deployment Cost**: 0.000058 ETH
- **Node Version**: v22.14.0
- **Solidity Version**: ^0.8.27

**Core Contract Addresses:**

```typescript
export const KAGE_CONTRACTS_SEPOLIA = {
  // Core Token & Infrastructure
  KAGE_TOKEN: "0x21c7941c0aB4b649685417C4aD2b2B28226343Df",
  TREASURY: "0x55bE25f1cd1e34DaE4476DE2D005Da49dAdE707D",

  // 🔗 PROXY ADDRESSES (Use these for frontend integration)
  KAGE_UNIFIED_STAKING: "0xD6E8dC708c66dc99c2aFA3ac01565f71c2f7Ca4f",
  KAGE_REVENUE: "0x0cCe8543872096057E6E72b3E7335f00099210C4",
  REWARD_DISTRIBUTOR: "0xaA5D8A1Af97b424A3A69a21f95Ab86170fCd695b",

  // 📚 IMPLEMENTATION ADDRESSES (for upgrade tracking)
  KAGE_UNIFIED_STAKING_IMPL: "0xa0DebF45a36D594853473fD918D6534B50F923f8",
  KAGE_REVENUE_IMPL: "0x497F89B9D39C133706b9Ce117ff9779ae69C7c20",
  REWARD_DISTRIBUTOR_IMPL: "0xa36B9644A01616b2Ae41EB3dEF2448FC392223Dd",
};
```

**System Configuration:**

- ✅ RewardDistributor funded with 100,000 KAGE tokens
- ✅ 1,000,000 KAGE allowance set for TigerStaking
- ✅ RewardDistributor excluded from fees
- ✅ All cross-contract references properly configured
- ✅ Default pool (ID: 0) created with 100 KAGE min stake, 10% APY

**Verification Status:**

- ✅ All implementation contracts verified on Etherscan
- ⚠️ Proxy contracts verification pending (using TransparentUpgradeableProxy pattern)

---

## 🏗️ Frontend Architecture Requirements

### Core DApp Principles

The KAGE frontend is a **true DApp** that must adhere to these principles:

1. **📡 Direct Contract Access**: All data comes directly from smart contracts
2. **🚫 No Backend Dependencies**: No server-side data aggregation or APIs
3. **🔍 Full Transparency**: All operations and data visible on-chain
4. **⚡ Real-time Updates**: Event-driven UI updates from blockchain events
5. **🛡️ Security First**: User funds always under user control

### Required Frontend Features

#### 🏊 **Multi-Pool Staking Interface**

- Pool selection and information display
- Stake creation with amount validation
- Real-time pool statistics (total staked, staker count, etc.)
- Pool capacity monitoring (cap vs current staked)

#### ⏰ **Tier System Visualization**

- Real-time tier progression display
- Time-based reward multiplier visualization
- Duration countdown to next tier
- Tier benefits and status indicators

#### 💰 **Revenue Distribution Dashboard**

- Pending revenue display per pool
- Revenue claiming interface
- Historical revenue claims tracking
- Revenue allocation event monitoring

#### 🔧 **Administrative Interface** (Owner/Admin Only)

- Pool creation and management
- Revenue allocation interface
- System configuration controls
- Emergency functions (pause/unpause)

#### 📊 **Analytics & Metrics**

- Individual user statistics
- Pool-level analytics
- System-wide metrics
- Performance tracking

---

## 📁 ABI Migration Instructions

### Step 1: Create ABI Directory Structure

Create the following directory structure in your frontend repository:

```
src/
└── abi/
    ├── index.ts                    # Central exports
    ├── addresses.ts                # Contract addresses
    ├── types.ts                    # TypeScript interfaces
    ├── contracts/
    │   ├── TigerStaking.json # Main staking contract ABI
    │   ├── TigerRevenue.json        # Revenue distribution ABI
    │   ├── RewardDistributor.json  # Reward management ABI
    │   └── TIGERPALACE.json        # Token contract ABI
    └── hooks/
        ├── useKageContracts.ts     # Contract instances hook
        ├── useStaking.ts           # Staking operations hook
        ├── useRevenue.ts           # Revenue operations hook
        └── usePoolData.ts          # Pool data hook
```

### Step 2: Copy ABI Files

Copy the following files from this smart contract repository to your frontend:

**From `abis/` directory:**

```bash
# Copy these files to your frontend src/abi/contracts/
cp abis/TIGERPALACE.json src/abi/contracts/
```

**From `typechain-types/` directory:**

```bash
# Extract ABI from TypeChain factories and copy to frontend
# These contain the complete ABI definitions
src/abi/contracts/TigerStaking.json    # From typechain-types/factories/contracts/TigerStaking__factory.ts
src/abi/contracts/TigerRevenue.json           # From typechain-types/factories/contracts/TigerRevenue__factory.ts
src/abi/contracts/RewardDistributor.json     # From typechain-types/factories/contracts/RewardDistributor__factory.ts
```

### Step 3: Address Configuration File

Create `src/abi/addresses.ts`:

```typescript
// KAGE Contract Addresses - Updated 2025-07-27
export interface NetworkAddresses {
  KAGE_TOKEN: string;
  TREASURY: string;
  KAGE_UNIFIED_STAKING: string;
  KAGE_REVENUE: string;
  REWARD_DISTRIBUTOR: string;
}

export const NETWORK_ADDRESSES: Record<number, NetworkAddresses> = {
  // Sepolia Testnet
  11155111: {
    KAGE_TOKEN: "0x21c7941c0aB4b649685417C4aD2b2B28226343Df",
    TREASURY: "0x55bE25f1cd1e34DaE4476DE2D005Da49dAdE707D",
    KAGE_UNIFIED_STAKING: "0xD6E8dC708c66dc99c2aFA3ac01565f71c2f7Ca4f",
    KAGE_REVENUE: "0x0cCe8543872096057E6E72b3E7335f00099210C4",
    REWARD_DISTRIBUTOR: "0xaA5D8A1Af97b424A3A69a21f95Ab86170fCd695b",
  },

  // Mainnet (to be updated when deployed)
  1: {
    KAGE_TOKEN: "",
    TREASURY: "",
    KAGE_UNIFIED_STAKING: "",
    KAGE_REVENUE: "",
    REWARD_DISTRIBUTOR: "",
  },
};

export const BLOCK_EXPLORERS: Record<number, string> = {
  11155111: "https://sepolia.etherscan.io",
  1: "https://etherscan.io",
};

export function getContractAddresses(chainId: number): NetworkAddresses {
  const addresses = NETWORK_ADDRESSES[chainId];
  if (!addresses) {
    throw new Error(`Unsupported network: ${chainId}`);
  }
  return addresses;
}
```

### Step 4: TypeScript Interface Definitions

Create `src/abi/types.ts`:

```typescript
import { BigNumber } from "ethers";

// Pool Information Structure
export interface PoolInfo {
  cap: BigNumber; // Pool capacity (0 = unlimited)
  minStaked: BigNumber; // Minimum stake amount
  totalStaked: BigNumber; // Total amount staked in pool
  startJoinTime: BigNumber; // Pool start time
  endJoinTime: BigNumber; // Pool end time
  apy: BigNumber; // Annual percentage yield (basis points)
  isActive: boolean; // Pool active status
  pRate: BigNumber; // Penalty rate (basis points)
}

// Individual Stake Information
export interface StakeInfo {
  user: string; // Staker address
  poolId: BigNumber; // Pool identifier
  amount: BigNumber; // Staked amount
  stakeTime: BigNumber; // Stake creation timestamp
  lastClaimTime: BigNumber; // Last reward claim time
  claimed: BigNumber; // Total claimed rewards
  penaltyAmount: BigNumber; // Penalty amount if withdrawn early
}

// Tier Information
export interface TierInfo {
  duration: number; // Stake duration in seconds
  multBP: number; // Tier multiplier in basis points
  tierName: string; // Tier name (Bronze, Silver, Gold, Platinum)
  isPenalty: boolean; // Whether in penalty period
}

// User Statistics
export interface UserStats {
  totalStaked: BigNumber; // Total amount staked across all pools
  totalRewards: BigNumber; // Total rewards earned
  totalClaimed: BigNumber; // Total rewards claimed
  activeStakes: number; // Number of active stakes
  pendingRevenue: BigNumber; // Pending revenue to claim
}

// Pool Statistics
export interface PoolStats {
  totalStakers: number; // Number of unique stakers
  totalStaked: BigNumber; // Total amount staked
  averageStake: BigNumber; // Average stake amount
  totalRewardsDistributed: BigNumber; // Total rewards distributed
  utilizationRate: number; // Pool utilization percentage
}

// Revenue Allocation Event
export interface RevenueAllocation {
  poolIds: number[]; // Pool IDs receiving revenue
  amounts: BigNumber[]; // Revenue amounts per pool
  timestamp: number; // Allocation timestamp
  txHash: string; // Transaction hash
}

// Contract Events
export interface StakingEvents {
  IndividualStakeCreated: {
    user: string;
    poolId: number;
    globalStakeId: BigNumber;
    localIndex: number;
    amount: BigNumber;
    timestamp: number;
  };

  IndividualStakeWithdrawn: {
    user: string;
    poolId: number;
    globalStakeId: BigNumber;
    localIndex: number;
    amount: BigNumber;
    remaining: BigNumber;
    rewards: BigNumber;
    fullyClosed: boolean;
  };

  RevenueAllocated: {
    poolIds: number[];
    amounts: BigNumber[];
    timestamp: number;
  };

  RevenueClaimed: {
    user: string;
    poolId: number;
    amount: BigNumber;
    timestamp: number;
  };
}

// Error Types
export interface KageError {
  code: string;
  message: string;
  details?: any;
}
```

### Step 5: Contract Hooks

Create `src/abi/hooks/useKageContracts.ts`:

```typescript
import { useMemo } from "react";
import { ethers } from "ethers";
import { useWeb3React } from "@web3-react/core";
import { getContractAddresses } from "../addresses";

// Import ABIs
import TigerStakingABI from "../contracts/TigerStaking.json";
import TigerRevenueABI from "../contracts/TigerRevenue.json";
import RewardDistributorABI from "../contracts/RewardDistributor.json";
import TIGERPALACEABI from "../contracts/TIGERPALACE.json";

export function useKageContracts() {
  const { library, account, chainId } = useWeb3React();

  const contracts = useMemo(() => {
    if (!library || !chainId) return null;

    const addresses = getContractAddresses(chainId);
    const signer = account ? library.getSigner(account) : library;

    return {
      kageToken: new ethers.Contract(
        addresses.KAGE_TOKEN,
        TIGERPALACEABI,
        signer,
      ),
      kageStaking: new ethers.Contract(
        addresses.KAGE_UNIFIED_STAKING,
        TigerStakingABI,
        signer,
      ),
      kageRevenue: new ethers.Contract(
        addresses.KAGE_REVENUE,
        TigerRevenueABI,
        signer,
      ),
      rewardDistributor: new ethers.Contract(
        addresses.REWARD_DISTRIBUTOR,
        RewardDistributorABI,
        signer,
      ),
      addresses,
    };
  }, [library, account, chainId]);

  return contracts;
}
```

Create `src/abi/hooks/useStaking.ts`:

```typescript
import { useState, useCallback } from "react";
import { BigNumber, ethers } from "ethers";
import { useKageContracts } from "./useKageContracts";
import { PoolInfo, StakeInfo, TierInfo } from "../types";

export function useStaking() {
  const contracts = useKageContracts();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create stake
  const createStake = useCallback(
    async (poolId: number, amount: string) => {
      if (!contracts) throw new Error("Contracts not available");

      setLoading(true);
      setError(null);

      try {
        const amountWei = ethers.utils.parseEther(amount);

        // Check allowance and approve if needed
        const allowance = await contracts.kageToken.allowance(
          await contracts.kageToken.signer.getAddress(),
          contracts.addresses.KAGE_UNIFIED_STAKING,
        );

        if (allowance.lt(amountWei)) {
          const approveTx = await contracts.kageToken.approve(
            contracts.addresses.KAGE_UNIFIED_STAKING,
            amountWei,
          );
          await approveTx.wait();
        }

        // Create stake
        const tx = await contracts.kageStaking.stake(
          poolId,
          amountWei,
        );
        const receipt = await tx.wait();

        return receipt;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [contracts],
  );

  // Withdraw stake
  const withdrawStake = useCallback(
    async (poolId: number, stakeIndex: number, amount?: string) => {
      if (!contracts) throw new Error("Contracts not available");

      setLoading(true);
      setError(null);

      try {
        const withdrawAmount = amount ? ethers.utils.parseEther(amount) : 0;
        const tx = await contracts.kageStaking.userWithdraw(
          poolId,
          stakeIndex,
          withdrawAmount,
        );
        const receipt = await tx.wait();

        return receipt;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [contracts],
  );

  // Get pool info
  const getPoolInfo = useCallback(
    async (poolId: number): Promise<PoolInfo | null> => {
      if (!contracts) return null;

      try {
        return await contracts.kageStaking.kagePoolInfo(poolId);
      } catch (err) {
        console.error("Error fetching pool info:", err);
        return null;
      }
    },
    [contracts],
  );

  // Get user stakes
  const getUserStakes = useCallback(
    async (userAddress: string, poolId: number) => {
      if (!contracts) return null;

      try {
        const [stakes, globalIds, totalStaked, activeStakes] =
          await contracts.kageStaking.kageGetUserStakesInPool(
            userAddress,
            poolId,
          );

        return {
          stakes,
          globalIds,
          totalStaked,
          activeStakes: activeStakes.toNumber(),
        };
      } catch (err) {
        console.error("Error fetching user stakes:", err);
        return null;
      }
    },
    [contracts],
  );

  // Get stake info with tier details
  const getStakeInfo = useCallback(
    async (userAddress: string, poolId: number, stakeIndex: number) => {
      if (!contracts) return null;

      try {
        const [stake, globalStakeId, currentRewards, tierInfo] =
          await contracts.kageStaking.kageGetIndividualStakeInfo(
            userAddress,
            poolId,
            stakeIndex,
          );

        return {
          stake,
          globalStakeId,
          currentRewards,
          tierInfo,
        };
      } catch (err) {
        console.error("Error fetching stake info:", err);
        return null;
      }
    },
    [contracts],
  );

  return {
    createStake,
    withdrawStake,
    getPoolInfo,
    getUserStakes,
    getStakeInfo,
    loading,
    error,
  };
}
```

Create `src/abi/hooks/useRevenue.ts`:

```typescript
import { useState, useCallback } from "react";
import { BigNumber } from "ethers";
import { useKageContracts } from "./useKageContracts";

export function useRevenue() {
  const contracts = useKageContracts();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get pending revenue
  const getPendingRevenue = useCallback(
    async (poolId: number, userAddress: string): Promise<BigNumber | null> => {
      if (!contracts) return null;

      try {
        return await contracts.kageRevenue.kageGetPendingRevenue(
          poolId,
          userAddress,
        );
      } catch (err) {
        console.error("Error fetching pending revenue:", err);
        return null;
      }
    },
    [contracts],
  );

  // Claim revenue
  const claimRevenue = useCallback(
    async (poolId: number) => {
      if (!contracts) throw new Error("Contracts not available");

      setLoading(true);
      setError(null);

      try {
        const tx = await contracts.kageRevenue.kageClaimRevenue(poolId);
        const receipt = await tx.wait();

        return receipt;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [contracts],
  );

  // Allocate revenue (admin only)
  const allocateRevenue = useCallback(
    async (poolIds: number[], amounts: string[]) => {
      if (!contracts) throw new Error("Contracts not available");

      setLoading(true);
      setError(null);

      try {
        const amountsWei = amounts.map(amount =>
          ethers.utils.parseEther(amount),
        );
        const tx = await contracts.kageRevenue.kageAllocateRevenue(
          poolIds,
          amountsWei,
        );
        const receipt = await tx.wait();

        return receipt;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [contracts],
  );

  return {
    getPendingRevenue,
    claimRevenue,
    allocateRevenue,
    loading,
    error,
  };
}
```

---

## 🎨 UI/UX Implementation Guide

### Dashboard Layout Requirements

#### 🏠 **Main Dashboard**

```typescript
interface DashboardData {
  userStats: {
    totalStaked: string;
    totalRewards: string;
    activeStakes: number;
    pendingRevenue: string;
  };
  poolStats: PoolStats[];
  recentTransactions: Transaction[];
}
```

**Required Components:**

- Portfolio overview card
- Active stakes summary
- Pool selection interface
- Recent activity feed
- Revenue claims section

#### 🏊 **Pool Management Interface**

```typescript
interface PoolManagementProps {
  pools: PoolInfo[];
  userStakes: UserStakeData[];
  onStakeCreate: (poolId: number, amount: string) => void;
  onStakeWithdraw: (
    poolId: number,
    stakeIndex: number,
    amount?: string,
  ) => void;
}
```

**Required Features:**

- Pool selection with filters
- Stake amount input with validation
- APY and tier information display
- Pool capacity indicator
- Real-time pool statistics

#### ⏰ **Tier Progression Display**

```typescript
interface TierProgressProps {
  stakeInfo: StakeInfo;
  tierInfo: TierInfo;
  currentTime: number;
}
```

**Visual Elements:**

- Progress bar showing tier advancement
- Time countdown to next tier
- Multiplier display
- Benefits breakdown
- Historical tier progression

#### 💰 **Revenue Dashboard**

```typescript
interface RevenueDashboardProps {
  pendingRevenue: { [poolId: number]: BigNumber };
  revenueHistory: RevenueAllocation[];
  onClaimRevenue: (poolId: number) => void;
}
```

**Components:**

- Pending revenue per pool
- Claim buttons with validation
- Revenue history table
- Revenue analytics charts

#### 🔧 **Admin Interface** (Owner/Admin Only)

```typescript
interface AdminInterfaceProps {
  isOwner: boolean;
  pools: PoolInfo[];
  onCreatePool: (config: PoolConfig) => void;
  onAllocateRevenue: (poolIds: number[], amounts: string[]) => void;
  onEmergencyAction: (action: string) => void;
}
```

**Admin Features:**

- Pool creation form
- Revenue allocation interface
- System configuration
- Emergency controls (pause/unpause)
- User management tools

### Event Handling & Real-time Updates

#### 📡 **Blockchain Event Listeners**

```typescript
// Set up event listeners for real-time updates
useEffect(() => {
  if (!contracts) return;

  // Staking events
  const handleStakeCreated = (user: string, poolId: number, ...args: any[]) => {
    if (user.toLowerCase() === account?.toLowerCase()) {
      // Update user stakes
      refreshUserData();
    }
    // Update pool statistics
    refreshPoolData(poolId);
  };

  const handleStakeWithdrawn = (
    user: string,
    poolId: number,
    ...args: any[]
  ) => {
    if (user.toLowerCase() === account?.toLowerCase()) {
      refreshUserData();
    }
    refreshPoolData(poolId);
  };

  // Revenue events
  const handleRevenueAllocated = (poolIds: number[], amounts: BigNumber[]) => {
    poolIds.forEach(poolId => refreshPoolRevenue(poolId));
  };

  const handleRevenueClaimed = (user: string, poolId: number) => {
    if (user.toLowerCase() === account?.toLowerCase()) {
      refreshUserRevenue();
    }
  };

  // Register listeners
  contracts.kageStaking.on("IndividualStakeCreated", handleStakeCreated);
  contracts.kageStaking.on("IndividualStakeWithdrawn", handleStakeWithdrawn);
  contracts.kageRevenue.on("RevenueAllocated", handleRevenueAllocated);
  contracts.kageRevenue.on("RevenueClaimed", handleRevenueClaimed);

  return () => {
    // Cleanup listeners
    contracts.kageStaking.removeAllListeners();
    contracts.kageRevenue.removeAllListeners();
  };
}, [contracts, account]);
```

### Error Handling & User Feedback

#### 🚨 **Comprehensive Error Handling**

```typescript
interface ErrorHandlerProps {
  error: KageError | null;
  onRetry?: () => void;
  onDismiss: () => void;
}

const ErrorHandler: React.FC<ErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss,
}) => {
  if (!error) return null;

  const getErrorMessage = (error: KageError) => {
    switch (error.code) {
      case "INSUFFICIENT_BALANCE":
        return "Insufficient KAGE balance for this operation";
      case "ALLOWANCE_INSUFFICIENT":
        return "Please approve KAGE spending first";
      case "POOL_CAPACITY_EXCEEDED":
        return "Pool capacity would be exceeded";
      case "MIN_STAKE_NOT_MET":
        return "Stake amount below pool minimum";
      case "PENALTY_PERIOD_ACTIVE":
        return "Early withdrawal penalty applies";
      default:
        return error.message || "An unexpected error occurred";
    }
  };

  return (
    <div className="error-handler">
      <p>{getErrorMessage(error)}</p>
      {onRetry && <button onClick={onRetry}>Retry</button>}
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  );
};
```

#### ✅ **Transaction Status Management**

```typescript
interface TransactionStatus {
  status: "idle" | "pending" | "confirming" | "success" | "error";
  txHash?: string;
  error?: string;
}

const useTransactionStatus = () => {
  const [status, setStatus] = useState<TransactionStatus>({ status: "idle" });

  const executeTransaction = async (txFunction: () => Promise<any>) => {
    setStatus({ status: "pending" });

    try {
      const tx = await txFunction();
      setStatus({ status: "confirming", txHash: tx.hash });

      const receipt = await tx.wait();
      setStatus({ status: "success", txHash: receipt.transactionHash });

      return receipt;
    } catch (error: any) {
      setStatus({ status: "error", error: error.message });
      throw error;
    }
  };

  return { status, executeTransaction };
};
```

---

## 📊 Analytics & Monitoring Implementation

### Required Analytics Features

#### 📈 **Portfolio Analytics**

- Total portfolio value over time
- Stake performance by pool
- Reward accumulation charts
- Tier progression history
- ROI calculations

#### 🏊 **Pool Analytics**

- Pool utilization metrics
- Average stake duration
- Revenue distribution efficiency
- Staker engagement metrics
- Pool performance comparison

#### 💰 **Revenue Analytics**

- Revenue distribution history
- Claim patterns and timing
- Revenue per stake analysis
- Yield optimization insights

#### ⚡ **Performance Monitoring**

- Transaction success rates
- Gas usage optimization
- Contract interaction metrics
- User engagement tracking

### Data Sources & Queries

#### 🔍 **On-chain Data Queries**

```typescript
// Portfolio data aggregation
const getPortfolioData = async (userAddress: string) => {
  const totalPools = await contracts.kageStaking.kageTotalPools();
  const userData = {
    totalStaked: BigNumber.from(0),
    totalRewards: BigNumber.from(0),
    activeStakes: 0,
    stakesInPools: [],
  };

  for (let poolId = 0; poolId < totalPools.toNumber(); poolId++) {
    const stakes = await contracts.kageStaking.kageGetUserStakesInPool(
      userAddress,
      poolId,
    );
    if (stakes.activeStakes.gt(0)) {
      userData.stakesInPools.push({
        poolId,
        ...stakes,
      });
      userData.totalStaked = userData.totalStaked.add(stakes.totalStaked);
      userData.activeStakes += stakes.activeStakes.toNumber();
    }
  }

  return userData;
};

// Pool analytics aggregation
const getPoolAnalytics = async (poolId: number) => {
  const poolInfo = await contracts.kageStaking.kagePoolInfo(poolId);
  const stakerCount = await contracts.kageStaking.kageGetPoolStakers(poolId);
  const totalStaked = await contracts.kageStaking.kageTotalStaked(poolId);

  return {
    poolInfo,
    stakerCount: stakerCount.toNumber(),
    totalStaked,
    utilizationRate: poolInfo.cap.gt(0)
      ? totalStaked.mul(100).div(poolInfo.cap).toNumber()
      : 0,
    averageStake: stakerCount.gt(0)
      ? totalStaked.div(stakerCount)
      : BigNumber.from(0),
  };
};
```

### Event History & Caching

#### 📚 **Historical Data Management**

```typescript
// Event history collection
const collectEventHistory = async (fromBlock: number = 0) => {
  const filter = {
    fromBlock,
    toBlock: "latest",
  };

  // Collect all staking events
  const stakeEvents = await contracts.kageStaking.queryFilter(
    contracts.kageStaking.filters.IndividualStakeCreated(),
    filter.fromBlock,
    filter.toBlock,
  );

  const withdrawEvents = await contracts.kageStaking.queryFilter(
    contracts.kageStaking.filters.IndividualStakeWithdrawn(),
    filter.fromBlock,
    filter.toBlock,
  );

  // Collect revenue events
  const revenueEvents = await contracts.kageRevenue.queryFilter(
    contracts.kageRevenue.filters.RevenueAllocated(),
    filter.fromBlock,
    filter.toBlock,
  );

  const claimEvents = await contracts.kageRevenue.queryFilter(
    contracts.kageRevenue.filters.RevenueClaimed(),
    filter.fromBlock,
    filter.toBlock,
  );

  return {
    stakes: stakeEvents,
    withdrawals: withdrawEvents,
    revenueAllocations: revenueEvents,
    claims: claimEvents,
  };
};

// Local storage caching
const cacheEventData = (events: any[], cacheKey: string) => {
  localStorage.setItem(
    cacheKey,
    JSON.stringify({
      data: events,
      timestamp: Date.now(),
      lastBlock: events[events.length - 1]?.blockNumber || 0,
    }),
  );
};

const getCachedEventData = (
  cacheKey: string,
  maxAge: number = 5 * 60 * 1000,
) => {
  const cached = localStorage.getItem(cacheKey);
  if (!cached) return null;

  const { data, timestamp, lastBlock } = JSON.parse(cached);

  if (Date.now() - timestamp > maxAge) {
    return null; // Cache expired
  }

  return { data, lastBlock };
};
```

---

## 🔐 Security Implementation Guide

### Frontend Security Requirements

#### 🛡️ **Contract Interaction Security**

```typescript
// Safe contract interaction wrapper
const safeContractCall = async <T>(
  contractCall: () => Promise<T>,
  fallbackValue: T,
  retries: number = 3,
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await contractCall();
    } catch (error: any) {
      console.warn(`Contract call attempt ${i + 1} failed:`, error);

      if (i === retries - 1) {
        // Log error for monitoring
        console.error("Contract call failed after retries:", error);
        return fallbackValue;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }

  return fallbackValue;
};

// Input validation
const validateStakeAmount = (
  amount: string,
  poolInfo: PoolInfo,
): string | null => {
  try {
    const amountWei = ethers.utils.parseEther(amount);

    if (amountWei.lte(0)) {
      return "Amount must be greater than 0";
    }

    if (amountWei.lt(poolInfo.minStaked)) {
      return `Minimum stake is ${ethers.utils.formatEther(
        poolInfo.minStaked,
      )} KAGE`;
    }

    if (poolInfo.cap.gt(0)) {
      const remainingCapacity = poolInfo.cap.sub(poolInfo.totalStaked);
      if (amountWei.gt(remainingCapacity)) {
        return `Pool capacity exceeded. Maximum available: ${ethers.utils.formatEther(
          remainingCapacity,
        )} KAGE`;
      }
    }

    return null; // Valid
  } catch (error) {
    return "Invalid amount format";
  }
};
```

#### 🔒 **User Authorization & Permissions**

```typescript
// Permission checking
const usePermissions = () => {
  const { account } = useWeb3React();
  const contracts = useKageContracts();
  const [permissions, setPermissions] = useState({
    isOwner: false,
    isAdmin: false,
    canAllocateRevenue: false,
  });

  useEffect(() => {
    const checkPermissions = async () => {
      if (!contracts || !account) return;

      try {
        // Check if user is owner
        const owner = await contracts.kageStaking.owner();
        const isOwner = owner.toLowerCase() === account.toLowerCase();

        setPermissions({
          isOwner,
          isAdmin: isOwner, // Add more admin roles as needed
          canAllocateRevenue: isOwner,
        });
      } catch (error) {
        console.error("Error checking permissions:", error);
      }
    };

    checkPermissions();
  }, [contracts, account]);

  return permissions;
};

// Protected component wrapper
const ProtectedComponent: React.FC<{
  requiredPermission: keyof typeof permissions;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ requiredPermission, fallback, children }) => {
  const permissions = usePermissions();

  if (!permissions[requiredPermission]) {
    return fallback || <div>Access denied</div>;
  }

  return <>{children}</>;
};
```

### Slippage & Transaction Protection

#### ⚡ **Gas Optimization**

```typescript
// Dynamic gas estimation
const estimateGasWithBuffer = async (
  contractFunction: () => Promise<any>,
  bufferPercent: number = 20,
) => {
  try {
    const estimated = await contractFunction.estimateGas();
    const buffer = estimated.mul(bufferPercent).div(100);
    return estimated.add(buffer);
  } catch (error) {
    console.warn("Gas estimation failed, using fallback:", error);
    return BigNumber.from("300000"); // Fallback gas limit
  }
};

// Transaction deadline
const getTransactionDeadline = (minutes: number = 20): number => {
  return Math.floor(Date.now() / 1000) + minutes * 60;
};
```

#### 🛑 **Circuit Breaker Pattern**

```typescript
// Circuit breaker for contract interactions
class ContractCircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private readonly maxFailures: number = 5;
  private readonly resetTimeMs: number = 60000; // 1 minute

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error("Circuit breaker is open. Please try again later.");
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.failures >= this.maxFailures) {
      if (Date.now() - this.lastFailureTime > this.resetTimeMs) {
        this.reset();
        return false;
      }
      return true;
    }
    return false;
  }

  private onSuccess(): void {
    this.failures = 0;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  private reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
  }
}
```

---

## 📱 Mobile Responsiveness & Accessibility

### Mobile-First Design Requirements

#### 📱 **Responsive Breakpoints**

```scss
// Mobile-first responsive design
$breakpoints: (
  mobile: 320px,
  tablet: 768px,
  desktop: 1024px,
  large: 1440px,
);

// Component example
.dashboard-container {
  display: grid;
  gap: 1rem;
  padding: 1rem;

  // Mobile (default)
  grid-template-columns: 1fr;

  // Tablet and up
  @media (min-width: #{map-get($breakpoints, tablet)}) {
    grid-template-columns: 1fr 2fr;
    gap: 2rem;
    padding: 2rem;
  }

  // Desktop and up
  @media (min-width: #{map-get($breakpoints, desktop)}) {
    grid-template-columns: 1fr 2fr 1fr;
    gap: 3rem;
  }
}
```

#### ♿ **Accessibility Implementation**

```typescript
// Accessibility hook
const useAccessibility = () => {
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check user preferences
    const prefersHighContrast = window.matchMedia(
      "(prefers-contrast: high)",
    ).matches;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    setHighContrast(prefersHighContrast);
    setReducedMotion(prefersReducedMotion);
  }, []);

  return { highContrast, reducedMotion };
};

// Accessible button component
const AccessibleButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  "aria-label"?: string;
}> = ({ onClick, disabled, loading, children, "aria-label": ariaLabel }) => {
  const { reducedMotion } = useAccessibility();

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
      className={`
        accessible-button 
        ${loading ? "loading" : ""} 
        ${reducedMotion ? "reduced-motion" : ""}
      `}
    >
      {loading ? (
        <span className="loading-indicator" aria-hidden="true" />
      ) : null}
      <span className={loading ? "sr-only" : ""}>{children}</span>
    </button>
  );
};
```

---

## 🧪 Testing Strategy

### Frontend Testing Requirements

#### 🔬 **Unit Testing**

```typescript
// Hook testing example
import { renderHook, act } from "@testing-library/react-hooks";
import { useStaking } from "../hooks/useStaking";

describe("useStaking", () => {
  beforeEach(() => {
    // Mock Web3React and contracts
    jest.mock("@web3-react/core");
    jest.mock("../hooks/useKageContracts");
  });

  it("should create stake successfully", async () => {
    const { result } = renderHook(() => useStaking());

    await act(async () => {
      const receipt = await result.current.createStake(0, "100");
      expect(receipt).toBeDefined();
      expect(result.current.loading).toBe(false);
    });
  });

  it("should handle insufficient allowance", async () => {
    // Mock insufficient allowance scenario
    const { result } = renderHook(() => useStaking());

    await act(async () => {
      try {
        await result.current.createStake(0, "100");
      } catch (error) {
        expect(error.message).toContain("allowance");
      }
    });
  });
});
```

#### 🔄 **Integration Testing**

```typescript
// Component integration testing
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StakingDashboard } from "../components/StakingDashboard";

describe("StakingDashboard Integration", () => {
  it("should complete full staking flow", async () => {
    render(<StakingDashboard />);

    // Select pool
    fireEvent.click(screen.getByTestId("pool-selector-0"));

    // Enter amount
    fireEvent.change(screen.getByLabelText("Stake Amount"), {
      target: { value: "100" },
    });

    // Submit stake
    fireEvent.click(screen.getByRole("button", { name: "Create Stake" }));

    // Wait for transaction
    await waitFor(() => {
      expect(screen.getByText("Transaction submitted")).toBeInTheDocument();
    });

    // Verify stake appears in UI
    await waitFor(() => {
      expect(screen.getByText("100 KAGE staked")).toBeInTheDocument();
    });
  });
});
```

#### 📊 **End-to-End Testing**

```typescript
// E2E testing with Cypress
describe("KAGE DApp E2E", () => {
  beforeEach(() => {
    // Connect to testnet
    cy.visit("/");
    cy.connectWallet("testnet");
  });

  it("should complete full user journey", () => {
    // Connect wallet
    cy.get('[data-testid="connect-wallet"]').click();
    cy.get('[data-testid="metamask-option"]').click();

    // Navigate to staking
    cy.get('[data-testid="staking-tab"]').click();

    // Create stake
    cy.get('[data-testid="pool-0"]').click();
    cy.get('[data-testid="stake-amount"]').type("100");
    cy.get('[data-testid="create-stake"]').click();

    // Confirm transaction
    cy.get('[data-testid="confirm-transaction"]').click();

    // Verify stake created
    cy.contains("Stake created successfully").should("be.visible");
    cy.get('[data-testid="user-stakes"]').should("contain", "100 KAGE");
  });
});
```

---

## 🚀 Deployment & Performance

### Production Deployment Checklist

#### ✅ **Pre-deployment Validation**

- [ ] All ABIs updated with latest contract deployment
- [ ] Contract addresses updated for target network
- [ ] Error handling implemented for all contract interactions
- [ ] Event listeners properly configured
- [ ] Mobile responsiveness tested across devices
- [ ] Accessibility compliance verified
- [ ] Security audit completed
- [ ] Performance optimization implemented

#### 🔧 **Build Configuration**

```json
{
  "scripts": {
    "build:production": "NODE_ENV=production npm run build",
    "build:staging": "NODE_ENV=staging npm run build",
    "test:e2e": "cypress run",
    "test:unit": "jest",
    "analyze": "npm run build && npx webpack-bundle-analyzer build/static/js/*.js",
    "lighthouse": "lighthouse http://localhost:3000 --view"
  },

  "eslintConfig": {
    "extends": ["react-app", "@typescript-eslint/recommended"],
    "rules": {
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": "error"
    }
  }
}
```

#### ⚡ **Performance Optimization**

```typescript
// Code splitting for better performance
const StakingDashboard = lazy(() => import("./components/StakingDashboard"));
const RevenueDashboard = lazy(() => import("./components/RevenueDashboard"));
const AdminPanel = lazy(() => import("./components/AdminPanel"));

// Service worker for offline functionality
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(registration => {
        console.log("SW registered: ", registration);
      })
      .catch(registrationError => {
        console.log("SW registration failed: ", registrationError);
      });
  });
}

// Web3 connection optimization
const optimizedProvider = useMemo(() => {
  return new ethers.providers.JsonRpcProvider(rpcUrl, {
    name: networkName,
    chainId: chainId,
    ensAddress: ensRegistryAddress,
    // Connection pooling and caching
    pollingInterval: 15000, // 15 seconds
    timeout: 30000, // 30 seconds
  });
}, [rpcUrl, networkName, chainId]);
```

### Monitoring & Analytics

#### 📊 **Performance Monitoring**

```typescript
// Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from "web-vitals";

const sendToAnalytics = (metric: any) => {
  // Send to your analytics service
  console.log("Web Vital:", metric);
};

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);

// Custom performance tracking
const trackContractInteraction = (operation: string, duration: number) => {
  // Track contract interaction performance
  analytics.track("Contract Interaction", {
    operation,
    duration,
    network: chainId,
    timestamp: Date.now(),
  });
};
```

#### 🔍 **Error Monitoring**

```typescript
// Error boundary with reporting
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    console.error("React Error Boundary:", error, errorInfo);

    // Report to error tracking service
    errorReporting.captureException(error, {
      extra: errorInfo,
      tags: {
        component: "React",
        location: window.location.pathname,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong.</h2>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 📚 Documentation & Support

### User Documentation Requirements

#### 📖 **User Guide Sections**

1. **Getting Started**

   - Wallet connection
   - Network setup
   - Initial token approval

2. **Staking Guide**

   - Pool selection
   - Stake creation
   - Tier progression
   - Withdrawal process

3. **Revenue Guide**

   - Revenue distribution
   - Claiming process
   - Revenue history

4. **Troubleshooting**
   - Common errors
   - Transaction failures
   - Network issues

#### 🎥 **Interactive Tutorials**

```typescript
// Tutorial component
const InteractiveTutorial: React.FC<{
  steps: TutorialStep[];
  onComplete: () => void;
}> = ({ steps, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-content">
        <h3>{steps[currentStep].title}</h3>
        <p>{steps[currentStep].description}</p>

        {steps[currentStep].interactive && (
          <div className="interactive-element">
            {steps[currentStep].component}
          </div>
        )}

        <div className="tutorial-controls">
          <button onClick={handleNext}>
            {currentStep < steps.length - 1 ? "Next" : "Complete"}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Developer Documentation

#### 🛠️ **API Reference**

- Hook documentation with examples
- Component prop interfaces
- Error handling patterns
- Performance optimization guides

#### 🔧 **Configuration Guide**

- Environment setup
- Network configuration
- Contract integration
- Testing procedures

---

## 🎯 Success Criteria & Validation

### Functional Requirements Checklist

#### ✅ **Core Functionality**

- [ ] Wallet connection and network detection
- [ ] Pool browsing and selection
- [ ] Stake creation with validation
- [ ] Real-time tier progression display
- [ ] Withdrawal with penalty calculation
- [ ] Revenue claiming interface
- [ ] Administrative functions (if applicable)

#### ✅ **User Experience**

- [ ] Responsive design across all devices
- [ ] Intuitive navigation and UI flow
- [ ] Clear error messages and feedback
- [ ] Loading states and transaction progress
- [ ] Accessibility compliance (WCAG 2.1)
- [ ] Performance optimization (LCP < 3s)

#### ✅ **Security & Reliability**

- [ ] Input validation and sanitization
- [ ] Secure contract interactions
- [ ] Error boundary implementation
- [ ] Transaction failure handling
- [ ] Circuit breaker patterns
- [ ] Rate limiting and spam protection

#### ✅ **Analytics & Monitoring**

- [ ] User interaction tracking
- [ ] Performance monitoring
- [ ] Error logging and alerting
- [ ] Contract interaction analytics
- [ ] Business metrics dashboard

### Testing Validation

#### 🧪 **Test Coverage Requirements**

- [ ] Unit tests: >80% coverage
- [ ] Integration tests: All critical paths
- [ ] E2E tests: Complete user journeys
- [ ] Cross-browser compatibility
- [ ] Mobile device testing
- [ ] Accessibility testing

#### 🚀 **Performance Benchmarks**

- [ ] First Contentful Paint: <2s
- [ ] Largest Contentful Paint: <3s
- [ ] Time to Interactive: <4s
- [ ] Cumulative Layout Shift: <0.1
- [ ] Bundle size: <500KB gzipped

---

## 📞 Support & Maintenance

### Ongoing Support Requirements

#### 🔄 **Regular Updates**

- Contract ABI updates on new deployments
- Network additions (mainnet, other testnets)
- UI/UX improvements based on user feedback
- Security patches and dependency updates

#### 📊 **Monitoring & Alerts**

- Contract interaction success rates
- User engagement metrics
- Error rates and types
- Performance degradation alerts

#### 🆘 **Emergency Procedures**

- Contract pause/emergency state handling
- Network outage fallbacks
- User fund safety protocols
- Communication channels for incidents

---

This comprehensive upgrade prompt provides everything needed to transform your frontend into a fully-functional KAGE staking DApp. The implementation follows DApp best practices with direct blockchain interaction, real-time updates, and complete transparency.

Remember to test thoroughly on Sepolia testnet before any mainnet deployment, and ensure all security measures are properly implemented throughout the development process.
