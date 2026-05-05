# RWA Contract Architecture & ERC-404/ERC-1400 Tokenization Strategy

## Executive Summary

This document outlines the contract architecture for Tiger Palace RWA Marketplace frontend DAPP integration and provides a comprehensive analysis of ERC-404 vs ERC-1400 tokenization standards for RealEstateAsset digitization.

---

## 1. Remaining Test Files Requiring Updates

### High Priority (Critical API Mismatches)

1. **`test/tiger-revenue-error-emergency-tests.spec.ts`**
   - Status: ~30 tests calling non-existent functions
   - Issues: Calls to deprecated `kage*` functions, incorrect emergency functions
   - Required Updates: Align with `RWARevenue` contract API

2. **`test/tiger-staking-error-emergency-tests.spec.ts`**
   - Status: ~40 tests calling non-existent functions
   - Issues: Calls to deprecated functions, incorrect access control patterns
   - Required Updates: Align with `RWAStaking` contract API

3. **`test/simple-error-emergency-tests.spec.ts`**
   - Status: Partial fixes applied, still needs function call updates
   - Issues: Deployment pattern corrections needed
   - Required Updates: Complete function name alignment

### Medium Priority (Business Logic Updates)

4. **`test/failing-test-1-duration-tiers.spec.ts`**
   - Status: Needs tier system removal (RWAStaking uses pools, not tiers)
   - Required Updates: Replace tier logic with pool multiplier logic

5. **`test/failing-test-2-partial-withdrawals.spec.ts`**
   - Status: RWAStaking doesn't support partial withdrawals
   - Required Updates: Rewrite to reflect full claim-only model

6. **`test/failing-test-4-cross-pool.spec.ts`**
   - Status: Cross-pool operations need validation
   - Required Updates: Update pool interaction patterns

### Lower Priority (Enhanced Coverage)

7. **`test/advanced-revenue-allocation.spec.ts`**
8. **`test/comprehensive-revenue-tier-testing.spec.ts`**
9. **`test/enhanced-revenue-allocation.spec.ts`**
10. **`test/ecosystem-integration.spec.ts`**
11. **`test/ecosystem-performance.spec.ts`**
12. **`test/tiger-staking-refactored.spec.ts`**
13. **`test/tiger-unified-staking-enhanced.spec.ts`**

---

## 2. Current Contract Architecture

### Core Contracts

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend DAPP Layer                      │
│  (React/Next.js with Web3 Integration - Reown AppKit)      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Contract Interface Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ RWAToken     │  │ Marketplace  │  │   Staking   │     │
│  │ Interface    │  │  Interface   │  │  Interface  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Core Smart Contracts                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         RWAAssetRegistry                           │    │
│  │  - Asset registration & metadata                   │    │
│  │  - Token price management                          │    │
│  │  - Asset lifecycle (DRAFT → ACTIVE → SOLD)        │    │
│  └────────────────────────────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │         RWATokenFactory                            │    │
│  │  - Creates RWAToken instances per asset            │    │
│  │  - Manages token-to-asset mapping                  │    │
│  │  - Token minting/burning coordination              │    │
│  └────────────────────────────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │         RWAToken (ERC20)                          │    │
│  │  - Fractional ownership representation             │    │
│  │  - Dividend distribution                          │    │
│  │  - Holder management                              │    │
│  └────────────────────────────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │         RWAMarketplace                             │    │
│  │  - Token purchase/sale                             │    │
│  │  - Order management                                │    │
│  │  - Payment processing                              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         RWAStaking Ecosystem                       │    │
│  │  - RWAStaking: Pool-based staking                  │    │
│  │  - RWARevenue: Revenue allocation                  │    │
│  │  - RWARewardDistributor: Reward distribution       │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Current Token Standard: ERC20

**Current Implementation:**
- `RWAToken` extends `ERC20` from OpenZeppelin
- Each RealEstateAsset has one `RWAToken` contract
- Fractional ownership via token balances
- Dividend distribution via custom logic

**Limitations:**
- No native NFT representation
- No semi-fungible token support
- Limited compliance features
- No transfer restrictions

---

## 3. ERC-404 vs ERC-1400 Analysis

### ERC-404: Semi-Fungible Token Standard

**Overview:**
- Hybrid ERC20/ERC721 standard
- Tokens can be fungible (ERC20) or non-fungible (ERC721)
- Dynamic conversion between fungible and NFT states
- Native liquidity for NFTs

**Advantages for RWA:**
✅ **Semi-Fungibility**: Perfect for property tokens that can be fractionalized
✅ **Native NFT Support**: Each property can have an NFT representation
✅ **Liquidity**: Fractional tokens trade like ERC20, full ownership as NFT
✅ **Simplified UX**: Single contract for both fractional and full ownership
✅ **Gas Efficiency**: One contract instead of separate ERC20 + ERC721

**Disadvantages:**
❌ **Experimental**: Not yet finalized standard (draft)
❌ **Compliance**: Limited built-in compliance features
❌ **Regulatory**: May not meet all securities regulations
❌ **Complexity**: Conversion logic adds complexity

**Use Case Fit:**
- ✅ **Best for**: Properties where fractional ownership is common
- ✅ **Best for**: Marketplace where users can own fractions or full property
- ✅ **Best for**: Simplified token management

### ERC-1400: Security Token Standard

**Overview:**
- Standard for security tokens (regulated assets)
- Built-in compliance and transfer restrictions
- Document management for regulatory compliance
- Granular permission system

**Advantages for RWA:**
✅ **Regulatory Compliance**: Built-in compliance features
✅ **Transfer Restrictions**: Can enforce KYC/AML requirements
✅ **Document Management**: Links legal documents to tokens
✅ **Mature Standard**: Well-established, audited implementations
✅ **Investor Protection**: Granular control over transfers

**Disadvantages:**
❌ **Complexity**: More complex than ERC20/ERC404
❌ **Gas Costs**: Higher gas costs due to compliance checks
❌ **Overhead**: May be overkill for non-regulated properties
❌ **Limited Liquidity**: Transfer restrictions reduce liquidity

**Use Case Fit:**
- ✅ **Best for**: Regulated securities (if properties are securities)
- ✅ **Best for**: High-value properties requiring compliance
- ✅ **Best for**: Institutional investors requiring regulatory compliance

---

## 4. Recommendation: Hybrid Approach

### Phase 1: ERC-404 Implementation (Immediate)

**Rationale:**
- Better UX for marketplace
- Native NFT support for full property ownership
- Simplified contract architecture
- Aligns with Tiger Palace's marketplace model

**Implementation Strategy:**

```solidity
// Enhanced RWAToken with ERC-404 support
contract RWAToken404 is ERC20, ERC721 {
    // ERC-404: Semi-fungible token
    // - Fractional ownership: ERC20 tokens
    // - Full ownership: ERC721 NFT (1:1 with property)
    
    // Property metadata
    uint256 public assetId;
    RealEstateAsset public property;
    
    // ERC-404 conversion logic
    function convertToNFT(uint256 amount) external {
        // Convert ERC20 tokens to NFT
        // Requires: amount == totalSupply (full ownership)
    }
    
    function convertToFungible(uint256 tokenId) external {
        // Convert NFT back to ERC20 tokens
        // Requires: NFT owner
    }
}
```

### Phase 2: ERC-1400 Compliance Layer (Future)

**Rationale:**
- Add compliance for regulated properties
- Support institutional investors
- Meet securities regulations if required

**Implementation Strategy:**

```solidity
// Compliance wrapper for ERC-404 tokens
contract RWATokenCompliant is ERC1400 {
    RWAToken404 public baseToken;
    
    // Add compliance checks
    function canTransfer(address from, address to, uint256 amount) 
        external view returns (bool, bytes1) {
        // KYC/AML checks
        // Transfer restrictions
        // Regulatory compliance
    }
}
```

---

## 5. Frontend DAPP Integration Architecture

### Contract Interface Layer

```typescript
// lib/contracts/rwa-contracts.ts

export interface RWAContractInterfaces {
  // Asset Registry
  assetRegistry: {
    registerAsset: (params: RegisterAssetParams) => Promise<TransactionReceipt>;
    getAsset: (assetId: number) => Promise<RealEstateAsset>;
    updateAssetPrice: (assetId: number, newPrice: bigint) => Promise<TransactionReceipt>;
  };
  
  // Token Operations
  token: {
    balanceOf: (address: string, assetId: number) => Promise<bigint>;
    transfer: (assetId: number, to: string, amount: bigint) => Promise<TransactionReceipt>;
    approve: (assetId: number, spender: string, amount: bigint) => Promise<TransactionReceipt>;
    // ERC-404 specific
    convertToNFT: (assetId: number) => Promise<TransactionReceipt>;
    convertToFungible: (assetId: number, tokenId: number) => Promise<TransactionReceipt>;
    getNFTMetadata: (assetId: number) => Promise<NFTMetadata>;
  };
  
  // Marketplace
  marketplace: {
    buyTokens: (assetId: number, amount: bigint, paymentToken: string) => Promise<TransactionReceipt>;
    sellTokens: (assetId: number, amount: bigint, minPrice: bigint) => Promise<TransactionReceipt>;
    createOrder: (order: OrderParams) => Promise<TransactionReceipt>;
    cancelOrder: (orderId: number) => Promise<TransactionReceipt>;
  };
  
  // Staking
  staking: {
    stake: (poolId: number, amount: bigint) => Promise<TransactionReceipt>;
    claimRewards: (stakeId: number) => Promise<TransactionReceipt>;
    getUserStakes: (address: string) => Promise<UserStake[]>;
    getPoolInfo: (poolId: number) => Promise<PoolInfo>;
  };
}
```

### Wallet Integration (Reown AppKit)

```typescript
// lib/hooks/useRWAContracts.ts

import { useAccount, useConnect, useDisconnect } from '@reown/appkit/react';
import { useContractRead, useContractWrite } from 'wagmi';

export function useRWAContracts() {
  const { address, isConnected } = useAccount();
  
  // Asset Registry hooks
  const { data: asset } = useContractRead({
    address: ASSET_REGISTRY_ADDRESS,
    abi: ASSET_REGISTRY_ABI,
    functionName: 'getAsset',
    args: [assetId],
  });
  
  // Token balance hook
  const { data: balance } = useContractRead({
    address: tokenAddress,
    abi: RWA_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
  });
  
  // Buy tokens hook
  const { write: buyTokens } = useContractWrite({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'buyTokens',
  });
  
  return {
    asset,
    balance,
    buyTokens,
    // ... other hooks
  };
}
```

### Database Schema Alignment

```typescript
// schema.zmodel alignment with contracts

model RealEstateAsset {
  // On-chain data
  assetId          Int?      @unique // From RWAAssetRegistry
  tokenAddress    String?   // RWAToken contract address
  nftTokenId      Int?      // ERC-404 NFT token ID (if converted)
  
  // Tokenization status
  tokenizationStatus TokenizationStatus @default(NOT_TOKENIZED)
  totalTokens      Int      // Total tokens minted
  soldTokens       Int      @default(0)
  availableTokens  Int      // Calculated: totalTokens - soldTokens
  
  // Contract state
  contractAddress  String?  // RWAToken contract address
  isOnChain        Boolean  @default(false)
  lastSyncedAt     DateTime?
  
  // ERC-404 specific
  isNFT            Boolean  @default(false) // Converted to NFT?
  nftOwner         String?  // Current NFT owner address
  
  // Relations
  investments      Investment[]
  tokenHoldings    TokenHolder[]
}

enum TokenizationStatus {
  NOT_TOKENIZED
  PENDING_TOKENIZATION
  TOKENIZED
  NFT_CONVERTED
  BURNED
}
```

---

## 6. Implementation Roadmap

### Phase 1: ERC-404 Integration (Weeks 1-4)

**Week 1-2: Contract Development**
- [ ] Implement ERC-404 standard in `RWAToken404.sol`
- [ ] Add conversion logic (fungible ↔ NFT)
- [ ] Update `RWATokenFactory` to deploy ERC-404 tokens
- [ ] Write comprehensive tests

**Week 3: Frontend Integration**
- [ ] Update contract interfaces
- [ ] Add ERC-404 hooks to `useRWAContracts`
- [ ] Implement NFT conversion UI
- [ ] Update marketplace to support ERC-404

**Week 4: Testing & Deployment**
- [ ] End-to-end testing
- [ ] Gas optimization
- [ ] Deploy to testnet
- [ ] Frontend integration testing

### Phase 2: Database Sync (Weeks 5-6)

- [ ] Event listeners for contract events
- [ ] Database sync service
- [ ] Real-time updates via WebSocket
- [ ] Reconciliation service

### Phase 3: Compliance Layer (Future)

- [ ] ERC-1400 wrapper implementation
- [ ] KYC/AML integration
- [ ] Transfer restriction logic
- [ ] Regulatory reporting

---

## 7. Key Contract Functions for Frontend

### Essential Functions

```solidity
// RWAAssetRegistry
function registerAsset(...) external returns (uint256 assetId);
function getAsset(uint256 assetId) external view returns (AssetDetails);
function updateAssetPrice(uint256 assetId, uint256 newPrice) external;

// RWAToken404 (ERC-404)
function balanceOf(address account) external view returns (uint256);
function transfer(address to, uint256 amount) external returns (bool);
function convertToNFT() external returns (uint256 tokenId);
function convertToFungible(uint256 tokenId) external;
function ownerOf(uint256 tokenId) external view returns (address);
function tokenURI(uint256 tokenId) external view returns (string);

// RWAMarketplace
function buyTokens(uint256 assetId, uint256 amount) external payable;
function sellTokens(uint256 assetId, uint256 amount, uint256 minPrice) external;
function getOrderBook(uint256 assetId) external view returns (Order[] memory);

// RWAStaking
function stake(uint256 poolId, uint256 amount) external;
function claimRewards(uint256 stakeId) external;
function getUserStakes(address user) external view returns (UserStake[] memory);
```

---

## 8. Next Steps

1. **Review & Approve**: Review this architecture document
2. **ERC-404 Implementation**: Begin Phase 1 implementation
3. **Test Updates**: Continue fixing remaining test files
4. **Frontend Integration**: Update frontend hooks and components
5. **Database Sync**: Implement event listeners and sync service

---

## 9. References

- [ERC-404 Draft Specification](https://eips.ethereum.org/EIPS/eip-404)
- [ERC-1400 Security Token Standard](https://eips.ethereum.org/EIPS/eip-1400)
- [Reown AppKit Documentation](https://docs.reown.com/appkit)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Author**: Tiger Palace Development Team

