# 🚀 KAGE Ecosystem - Frontend Integration Guide

## 📋 **OVERVIEW**

This guide provides everything needed to integrate the KAGE staking ecosystem into your frontend application. All ABIs are fresh and current, with the latest deployed proxy addresses.

**Generated**: 2025-01-25  
**Network**: Sepolia Testnet  
**Status**: Production Ready

## 🔗 **CONTRACT ADDRESSES**

### **Proxy Addresses (Use These)**
```javascript
const CONTRACT_ADDRESSES = {
  TIGERPALACE: "0x21c7941c0aB4b649685417C4aD2b2B28226343Df",
  Treasury: "0x55bE25f1cd1e34DaE4476DE2D005Da49dAdE707D",
  ProxyAdmin: "0x299090a8caA6d89c29D104BbFB646B95aBFdd16a",
  RewardDistributor: "0x21c6A4bB272eD8ba8889b1BD8af01A4a7eCd6C2C",
  TigerRevenue: "0x08151D81F1bbbFD48B2CD2B729A2EAB0CE1BEAED",
  TigerStaking: "0x3681B95Ae5172D1Ba7A9f8E5092EBB112B027a4E"
};
```

### **Implementation Addresses (For Reference Only)**
```javascript
const IMPLEMENTATION_ADDRESSES = {
  RewardDistributor: "0x69c8C079faaCc04044564F2bd07216C9DFBf6F99",
  TigerRevenue: "0xa19EcEbdAE90eE1C5f72e940A3c6aEA9D3987358",
  TigerStaking: "0xD00Aca49Bb0f3be49d5fa9969E92171c575C68e2"
};
```

## 📁 **ABI FILES**

### **Location**: `abis/frontend/`

| File | Size | Purpose |
|------|------|---------|
| `KageEcosystem-Frontend.json` | 120KB | Complete ecosystem with all contracts |
| `TigerStaking.json` | 37KB | Staking contract ABI |
| `TigerRevenue.json` | 23KB | Revenue distribution ABI |
| `RewardDistributor.json` | 12KB | Reward distributor ABI |
| `TIGERPALACE.json` | 14KB | KAGE token ABI |
| `types.ts` | 2KB | TypeScript definitions |
| `integration-example.ts` | 4KB | Complete integration example |

## 🚀 **QUICK START**

### **1. Install Dependencies**
```bash
npm install ethers@5.7.2
# or
bun run  add ethers@5.7.2
```

### **2. Import ABIs**
```javascript
import TigerStakingABI from './abis/frontend/TigerStaking.json';
import TigerRevenueABI from './abis/frontend/TigerRevenue.json';
import TIGERPALACEABI from './abis/frontend/TIGERPALACE.json';
```

### **3. Initialize Contracts**
```javascript
import { ethers } from 'ethers';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const kageStaking = new ethers.Contract(
  "0x3681B95Ae5172D1Ba7A9f8E5092EBB112B027a4E",
  TigerStakingABI,
  signer
);

const kageRevenue = new ethers.Contract(
  "0x08151D81F1bbbFD48B2CD2B729A2EAB0CE1BEAED",
  TigerRevenueABI,
  signer
);

const kageToken = new ethers.Contract(
  "0x21c7941c0aB4b649685417C4aD2b2B28226343Df",
  TIGERPALACEABI,
  signer
);
```

## 📊 **CORE FUNCTIONS**

### **Staking Operations**

#### **Get Pool Information**
```javascript
async function getPoolInfo(poolId) {
  const poolInfo = await kageStaking.kageGetPoolInfo(poolId);
  return {
    poolId: poolId,
    minStake: ethers.utils.formatEther(poolInfo.minStake),
    apy: poolInfo.apy.toNumber(),
    isActive: poolInfo.isActive,
    penaltyRate: poolInfo.penaltyRate.toNumber(),
    totalStaked: ethers.utils.formatEther(poolInfo.totalStaked),
    stakerCount: poolInfo.stakerCount.toNumber()
  };
}
```

#### **Get User Staking Data**
```javascript
async function getUserStakingData(userAddress, poolId) {
  const userData = await kageStaking.kageGetUserStakingData(poolId, userAddress);
  return {
    totalStaked: ethers.utils.formatEther(userData.totalStaked),
    activeStakeCount: userData.activeStakeCount.toNumber(),
    totalStakeCount: userData.totalStakeCount.toNumber(),
    lastStakeTime: new Date(userData.lastStakeTime.toNumber() * 1000),
    tier: userData.tier
  };
}
```

#### **Stake Tokens**
```javascript
async function stake(poolId, amount) {
  const amountWei = ethers.utils.parseEther(amount);
  
  // First approve the staking contract
  const approveTx = await kageToken.approve(
    "0x3681B95Ae5172D1Ba7A9f8E5092EBB112B027a4E",
    amountWei
  );
  await approveTx.wait();
  
  // Then stake
  const stakeTx = await kageStaking.kageStake(poolId, amountWei);
  const receipt = await stakeTx.wait();
  
  return {
    success: true,
    transactionHash: receipt.transactionHash,
    gasUsed: receipt.gasUsed.toString()
  };
}
```

#### **Withdraw Tokens**
```javascript
async function withdraw(poolId, amount) {
  const amountWei = ethers.utils.parseEther(amount);
  const tx = await kageStaking.kageWithdraw(poolId, amountWei);
  const receipt = await tx.wait();
  
  return {
    success: true,
    transactionHash: receipt.transactionHash,
    gasUsed: receipt.gasUsed.toString()
  };
}
```

### **Revenue Operations**

#### **Get User Rewards**
```javascript
async function getUserRewards(userAddress) {
  const rewards = await kageRevenue.kageGetUserRewards(userAddress);
  return ethers.utils.formatEther(rewards);
}
```

#### **Claim Rewards**
```javascript
async function claimRewards() {
  const tx = await kageRevenue.kageClaimRewards();
  const receipt = await tx.wait();
  
  return {
    success: true,
    transactionHash: receipt.transactionHash,
    gasUsed: receipt.gasUsed.toString()
  };
}
```

#### **Get Pending Revenue**
```javascript
async function getPendingRevenue(poolId, userAddress) {
  const pending = await kageRevenue.kageGetPendingRevenue(poolId, userAddress);
  return ethers.utils.formatEther(pending);
}
```

### **Token Operations**

#### **Get Token Balance**
```javascript
async function getTokenBalance(userAddress) {
  const balance = await kageToken.balanceOf(userAddress);
  return ethers.utils.formatEther(balance);
}
```

#### **Get Allowance**
```javascript
async function getAllowance(owner, spender) {
  const allowance = await kageToken.allowance(owner, spender);
  return ethers.utils.formatEther(allowance);
}
```

## 🎯 **COMPLETE INTEGRATION EXAMPLE**

### **React Hook Example**
```javascript
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export function useKageEcosystem() {
  const [contracts, setContracts] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initialize() {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        
        const kageStaking = new ethers.Contract(
          "0x3681B95Ae5172D1Ba7A9f8E5092EBB112B027a4E",
          TigerStakingABI,
          signer
        );
        
        const kageRevenue = new ethers.Contract(
          "0x08151D81F1bbbFD48B2CD2B729A2EAB0CE1BEAED",
          TigerRevenueABI,
          signer
        );
        
        setContracts({ kageStaking, kageRevenue });
        setUserAddress(address);
      }
      setLoading(false);
    }
    
    initialize();
  }, []);

  const stake = async (poolId, amount) => {
    if (!contracts) return;
    // Implementation here
  };

  const claimRewards = async () => {
    if (!contracts) return;
    // Implementation here
  };

  return { contracts, userAddress, loading, stake, claimRewards };
}
```

### **Vue.js Composition API Example**
```javascript
import { ref, onMounted } from 'vue';
import { ethers } from 'ethers';

export function useKageEcosystem() {
  const contracts = ref(null);
  const userAddress = ref(null);
  const loading = ref(true);

  onMounted(async () => {
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      
      // Initialize contracts...
      
      contracts.value = { kageStaking, kageRevenue };
      userAddress.value = address;
    }
    loading.value = false;
  });

  return { contracts, userAddress, loading };
}
```

## 🔧 **ADVANCED FEATURES**

### **Event Listening**
```javascript
// Listen for staking events
kageStaking.on("StakeDeposited", (user, poolId, amount, event) => {
  console.log(`User ${user} staked ${ethers.utils.formatEther(amount)} in pool ${poolId}`);
});

// Listen for reward claims
kageRevenue.on("RewardsClaimed", (user, amount, event) => {
  console.log(`User ${user} claimed ${ethers.utils.formatEther(amount)} rewards`);
});
```

### **Batch Operations**
```javascript
// Get multiple pool infos
async function getAllPoolInfos() {
  const poolCount = await kageStaking.kageGetPoolCount();
  const pools = [];
  
  for (let i = 0; i < poolCount; i++) {
    const poolInfo = await getPoolInfo(i);
    pools.push(poolInfo);
  }
  
  return pools;
}
```

### **Error Handling**
```javascript
async function safeStake(poolId, amount) {
  try {
    const result = await stake(poolId, amount);
    return { success: true, data: result };
  } catch (error) {
    console.error('Staking failed:', error);
    return { 
      success: false, 
      error: error.message,
      code: error.code 
    };
  }
}
```

## 📱 **MOBILE INTEGRATION**

### **React Native with ethers**
```javascript
import { ethers } from 'ethers';
import { WalletConnectProvider } from '@walletconnect/react-native-dapp';

// Initialize with WalletConnect
const provider = new WalletConnectProvider({
  rpc: {
    11155111: "https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
  }
});

await provider.enable();
const ethersProvider = new ethers.providers.Web3Provider(provider);
```

## 🔒 **SECURITY CONSIDERATIONS**

### **Address Validation**
```javascript
function isValidAddress(address) {
  return ethers.utils.isAddress(address);
}

function validateContractAddress(address, expectedContract) {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid ${expectedContract} address`);
  }
}
```

### **Transaction Confirmation**
```javascript
async function waitForConfirmation(tx, confirmations = 1) {
  const receipt = await tx.wait(confirmations);
  return receipt;
}
```

## 📊 **PERFORMANCE OPTIMIZATION**

### **Caching Contract Calls**
```javascript
const cache = new Map();

async function getCachedPoolInfo(poolId) {
  const cacheKey = `pool_${poolId}`;
  
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < 30000) { // 30 seconds
      return cached.data;
    }
  }
  
  const data = await getPoolInfo(poolId);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

## 🧪 **TESTING**

### **Unit Tests**
```javascript
import { ethers } from 'ethers';
import { expect } from 'chai';

describe('KAGE Integration', () => {
  it('should get pool info', async () => {
    const poolInfo = await getPoolInfo(0);
    expect(poolInfo).to.have.property('apy');
    expect(poolInfo).to.have.property('isActive');
  });
});
```

## 📚 **RESOURCES**

- **ABI Files**: `abis/frontend/`
- **Integration Example**: `abis/frontend/integration-example.ts`
- **TypeScript Types**: `abis/frontend/types.ts`
- **Deployment Info**: `deployed-addresses-proxy.json`

## 🆘 **SUPPORT**

For integration issues:
1. Check the integration example
2. Verify contract addresses
3. Ensure correct network (Sepolia)
4. Test with small amounts first

---

**Last Updated**: 2025-01-25  
**Version**: 1.0  
**Status**: Production Ready
