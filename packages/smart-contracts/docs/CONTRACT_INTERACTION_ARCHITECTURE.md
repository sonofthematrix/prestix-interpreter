# Tiger Palace Pro - Contract Interaction Architecture

## Overview

This document describes how all deployed contracts interact with each other in the Tiger Palace Pro ecosystem. The system consists of 9 core contracts deployed on Sepolia testnet, managing Real World Asset (RWA) tokenization, trading, staking, rewards, and membership.

## Contract Addresses (Sepolia)

| Contract | Address | Type |
|----------|---------|------|
| ProxyAdmin | `0x9d55BcFA47e88868B54C811041A942250d7F3DD9` | Upgrade Management |
| RWAAssetRegistry | `0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D` | Upgradeable Proxy |
| RWATokenFactory | `0x2f051A127Ab4B8b0D78aB5758E06a808a8445566` | Upgradeable Proxy |
| RWATokenFactory404 | `0xdC2AE75dC0D14E2f450156bE83c1F71920b6a896` | Direct Contract |
| RWAMarketplace | `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7` | Upgradeable Proxy |
| RWAStaking | `0x622A30E2da7A9F4f5Af7ad76008FBC18F848A1cc` | Upgradeable Proxy |
| RWARewardDistributor | `0x9cF49bB1D64c8D40c693FcAA9d326950b5F29EaB` | Direct Contract |
| RWARevenue | `0x55b23576e535504F6db282159CD082bD97e16989` | Direct Contract |
| MembershipSystem | `0xB43cb5D178D8361307950da607D4A58C78aE8473` | Upgradeable Proxy |

---

## System Architecture Overview

```mermaid
graph TB
    subgraph "Upgrade Management"
        PA[ProxyAdmin<br/>0x9d55BcFA...]
    end
    
    subgraph "Core RWA System"
        AR[RWAAssetRegistry<br/>0xe2d49642...]
        TF[RWATokenFactory<br/>0x2f051A12...]
        TF404[RWATokenFactory404<br/>0xdC2AE75d...]
        MP[RWAMarketplace<br/>0xc9C36952...]
    end
    
    subgraph "Staking & Rewards"
        ST[RWAStaking<br/>0x622A30E2...]
        RD[RWARewardDistributor<br/>0x9cF49bB1...]
        RV[RWARevenue<br/>0x55b23576...]
    end
    
    subgraph "Membership"
        MS[MembershipSystem<br/>0xB43cb5D1...]
    end
    
    subgraph "External Tokens"
        TPT[TigerPalaceToken<br/>ERC20]
        USDC[USDC<br/>ERC20]
        RWA_TOKENS[RWA Tokens<br/>ERC20/ERC404]
    end
    
    PA -->|Manages Upgrades| AR
    PA -->|Manages Upgrades| TF
    PA -->|Manages Upgrades| MP
    PA -->|Manages Upgrades| ST
    PA -->|Manages Upgrades| MS
    
    AR -->|Asset Registration| TF
    AR -->|Asset Validation| MP
    TF -->|Creates Tokens| RWA_TOKENS
    TF404 -->|Creates ERC404 Tokens| RWA_TOKENS
    MP -->|Trades| RWA_TOKENS
    MP -->|Accepts Payments| USDC
    
    ST -->|Stakes| TPT
    ST -->|Claims Rewards| RD
    ST -->|Receives Revenue| RV
    RV -->|Distributes| ST
    RV -->|Receives Funds| RD
    RD -->|Holds Pool| TPT
    
    MS -->|Tracks Investments| MP
    MS -->|Tracks Staking| ST
```

---

## RWA Tokenization Flow

```mermaid
sequenceDiagram
    participant Admin
    participant AR as RWAAssetRegistry
    participant TF as RWATokenFactory
    participant TF404 as RWATokenFactory404
    participant Token as RWA Token
    participant MP as RWAMarketplace
    
    Admin->>AR: registerAsset(owner, title, type, price, tokens)
    AR-->>Admin: assetId
    
    Note over Admin,TF: Option 1: Standard ERC20 Token
    Admin->>TF: createToken(assetId, name, symbol, supply, owner)
    TF->>Token: Deploy RWAToken contract
    Token-->>TF: tokenAddress
    TF-->>Admin: tokenAddress
    
    Note over Admin,TF404: Option 2: ERC404 Token (NFT + ERC20)
    Admin->>TF404: createToken404(assetId, name, symbol, supply, owner, URI)
    TF404->>Token: Deploy RWAToken404 contract
    Token-->>TF404: tokenAddress
    TF404-->>Admin: tokenAddress
    
    Note over Admin,MP: Token Trading
    Admin->>MP: purchaseTokens(assetId, amount)
    MP->>AR: getAsset(assetId)
    AR-->>MP: Asset details
    MP->>Token: transferFrom(factory, buyer, amount)
    Token-->>MP: Success
    MP->>AR: updateSoldTokens(assetId, amount)
```

---

## Marketplace Trading Flow

```mermaid
graph LR
    subgraph "Marketplace Operations"
        MP[RWAMarketplace]
        AR[RWAAssetRegistry]
        TF[RWATokenFactory]
        TF404[RWATokenFactory404]
    end
    
    subgraph "Payment Methods"
        ETH[ETH]
        USDC[USDC Token]
    end
    
    subgraph "Token Types"
        ERC20[RWA ERC20 Tokens]
        ERC404[RWA ERC404 Tokens]
    end
    
    Buyer[Buyer] -->|1. purchaseTokens| MP
    MP -->|2. validateAsset| AR
    AR -->|3. assetInfo| MP
    MP -->|4. getTokenAddress| TF
    MP -->|4. getTokenAddress| TF404
    TF -->|5. tokenAddress| MP
    TF404 -->|5. tokenAddress| MP
    MP -->|6. transferTokens| ERC20
    MP -->|6. transferTokens| ERC404
    Buyer -->|7. payETH| ETH
    Buyer -->|7. payUSDC| USDC
    MP -->|8. collectFee| FeeRecipient
    MP -->|9. updateRegistry| AR
    
    style MP fill:#ff6b6b
    style AR fill:#4ecdc4
    style TF fill:#45b7d1
    style TF404 fill:#96ceb4
```

---

## Staking & Rewards Ecosystem

```mermaid
graph TB
    subgraph "Token Flow"
        TPT[TigerPalaceToken<br/>ERC20]
    end
    
    subgraph "Staking System"
        ST[RWAStaking<br/>Multi-Pool Staking]
        P1[Pool 1: 1 Month]
        P2[Pool 2: 3 Months]
        P3[Pool 3: 6 Months]
        P4[Pool 4: 12 Months]
    end
    
    subgraph "Reward Distribution"
        RD[RWARewardDistributor<br/>Reward Pool Manager]
        RV[RWARevenue<br/>Revenue Allocator]
    end
    
    subgraph "Revenue Sources"
        DIVIDENDS[Property Dividends]
        FEES[Marketplace Fees]
    end
    
    User[User] -->|1. Stake TPT| ST
    ST -->|2. Lock Tokens| P1
    ST -->|2. Lock Tokens| P2
    ST -->|2. Lock Tokens| P3
    ST -->|2. Lock Tokens| P4
    
    DIVIDENDS -->|3. Send Revenue| RV
    FEES -->|3. Send Revenue| RV
    RV -->|4. Allocate to Pools| ST
    ST -->|5. Calculate Rewards| User
    
    RD -->|6. Distribute Rewards| ST
    ST -->|7. Claim Rewards| User
    User -->|8. Receive TPT| TPT
    
    RD -->|9. Hold Pool| TPT
    RV -->|10. Request Funds| RD
    
    style ST fill:#ff6b6b
    style RD fill:#4ecdc4
    style RV fill:#45b7d1
    style TPT fill:#96ceb4
```

---

## Revenue Distribution Flow

```mermaid
sequenceDiagram
    participant Property as Property Owner
    participant MP as RWAMarketplace
    participant RV as RWARevenue
    participant RD as RWARewardDistributor
    participant ST as RWAStaking
    participant User as Staker
    
    Note over Property,User: Revenue Source 1: Marketplace Fees
    Buyer->>MP: Purchase tokens (2.5% fee)
    MP->>RV: collectMarketplaceFees(amount)
    RV->>RD: requestFunds(amount)
    RD->>RV: transfer(amount)
    RV->>RV: allocateRevenue(poolId, amount, "marketplace")
    
    Note over Property,User: Revenue Source 2: Property Dividends
    Property->>RV: distributePropertyDividends(amount)
    RV->>RD: requestFunds(amount)
    RD->>RV: transfer(amount)
    RV->>RV: allocateRevenue(poolId, amount, "dividends")
    
    Note over Property,User: Distribution to Stakers
    RV->>ST: distributeRevenue(poolId, amount)
    ST->>ST: Calculate pro-rata distribution
    User->>ST: claimRewards(stakeId)
    ST->>User: transfer(rewards)
```

---

## Membership System Integration

```mermaid
graph TB
    subgraph "Membership Tiers"
        MS[MembershipSystem]
        BRONZE[Bronze Tier]
        SILVER[Silver Tier]
        GOLD[Gold Tier]
        DIAMOND[Diamond Tier]
    end
    
    subgraph "Investment Tracking"
        MP[RWAMarketplace]
        ST[RWAStaking]
    end
    
    subgraph "Benefits"
        FEE_DISCOUNT[Fee Discounts]
        REWARD_BOOST[Reward Multipliers]
        ACCESS[Exclusive Access]
    end
    
    User[User] -->|1. Register| MS
    MS -->|2. Assign| BRONZE
    
    User -->|3. Purchase Tokens| MP
    MP -->|4. Track Investment| MS
    MS -->|5. Check Tier| MP
    
    User -->|6. Stake Tokens| ST
    ST -->|7. Track Investment| MS
    MS -->|8. Apply Multiplier| ST
    
    MS -->|9. Grant Benefits| FEE_DISCOUNT
    MS -->|9. Grant Benefits| REWARD_BOOST
    MS -->|9. Grant Benefits| ACCESS
    
    MS -->|10. Auto-Upgrade| SILVER
    MS -->|10. Auto-Upgrade| GOLD
    MS -->|10. Auto-Upgrade| DIAMOND
    
    style MS fill:#ff6b6b
    style BRONZE fill:#cd7f32
    style SILVER fill:#c0c0c0
    style GOLD fill:#ffd700
    style DIAMOND fill:#b9f2ff
```

---

## Upgradeable Proxy Architecture

```mermaid
graph TB
    subgraph "Proxy Pattern"
        PA[ProxyAdmin<br/>Owner: Deployer]
        PROXY1[TransparentUpgradeableProxy<br/>RWAAssetRegistry]
        PROXY2[TransparentUpgradeableProxy<br/>RWATokenFactory]
        PROXY3[TransparentUpgradeableProxy<br/>RWAMarketplace]
        PROXY4[TransparentUpgradeableProxy<br/>RWAStaking]
        PROXY5[TransparentUpgradeableProxy<br/>MembershipSystem]
    end
    
    subgraph "Implementation Contracts"
        IMPL1[RWAAssetRegistryUpgradeable<br/>Implementation]
        IMPL2[RWATokenFactoryUpgradeable<br/>Implementation]
        IMPL3[RWAMarketplaceUpgradeable<br/>Implementation]
        IMPL4[RWAStakingUpgradeable<br/>Implementation]
        IMPL5[MembershipSystemUpgradeable<br/>Implementation]
    end
    
    PA -->|Manages| PROXY1
    PA -->|Manages| PROXY2
    PA -->|Manages| PROXY3
    PA -->|Manages| PROXY4
    PA -->|Manages| PROXY5
    
    PROXY1 -->|Delegates Calls| IMPL1
    PROXY2 -->|Delegates Calls| IMPL2
    PROXY3 -->|Delegates Calls| IMPL3
    PROXY4 -->|Delegates Calls| IMPL4
    PROXY5 -->|Delegates Calls| IMPL5
    
    PA -->|upgrade| PROXY1
    PA -->|upgrade| PROXY2
    PA -->|upgrade| PROXY3
    PA -->|upgrade| PROXY4
    PA -->|upgrade| PROXY5
    
    style PA fill:#ff6b6b
    style PROXY1 fill:#4ecdc4
    style PROXY2 fill:#4ecdc4
    style PROXY3 fill:#4ecdc4
    style PROXY4 fill:#4ecdc4
    style PROXY5 fill:#4ecdc4
```

---

## Role-Based Access Control

```mermaid
graph TB
    subgraph "RWAAssetRegistry Roles"
        AR[RWAAssetRegistry]
        AR_ADMIN[DEFAULT_ADMIN_ROLE]
        AR_ASSET[ASSET_MANAGER_ROLE]
        AR_MARKET[MARKETPLACE_ROLE]
    end
    
    subgraph "RWATokenFactory Roles"
        TF[RWATokenFactory]
        TF_ADMIN[DEFAULT_ADMIN_ROLE]
        TF_CREATOR[TOKEN_CREATOR_ROLE]
    end
    
    subgraph "RWAMarketplace Roles"
        MP[RWAMarketplace]
        MP_ADMIN[DEFAULT_ADMIN_ROLE]
        MP_MARKET[MARKETPLACE_ADMIN_ROLE]
        MP_FEE[FEE_MANAGER_ROLE]
    end
    
    subgraph "RWAStaking Roles"
        ST[RWAStaking]
        ST_ADMIN[DEFAULT_ADMIN_ROLE]
        ST_POOL[POOL_MANAGER_ROLE]
        ST_REWARD[REWARD_MANAGER_ROLE]
    end
    
    subgraph "RWARevenue Roles"
        RV[RWARevenue]
        RV_ADMIN[DEFAULT_ADMIN_ROLE]
        RV_REVENUE[REVENUE_MANAGER_ROLE]
        RV_DIST[DISTRIBUTOR_ROLE]
    end
    
    subgraph "RWARewardDistributor Roles"
        RD[RWARewardDistributor]
        RD_ADMIN[DEFAULT_ADMIN_ROLE]
        RD_REWARD[REWARD_MANAGER_ROLE]
        RD_COLLECT[REVENUE_COLLECTOR_ROLE]
    end
    
    subgraph "MembershipSystem Roles"
        MS[MembershipSystem]
        MS_ADMIN[DEFAULT_ADMIN_ROLE]
        MS_MEMBER[MEMBERSHIP_MANAGER_ROLE]
        MS_BENEFIT[BENEFIT_MANAGER_ROLE]
    end
    
    AR_ADMIN -->|Grants| AR_ASSET
    AR_ADMIN -->|Grants| AR_MARKET
    MP -->|Has| AR_MARKET
    
    TF_ADMIN -->|Grants| TF_CREATOR
    MP -->|Has| TF_CREATOR
    
    MP_ADMIN -->|Grants| MP_MARKET
    MP_ADMIN -->|Grants| MP_FEE
    
    ST_ADMIN -->|Grants| ST_POOL
    ST_ADMIN -->|Grants| ST_REWARD
    
    RV_ADMIN -->|Grants| RV_REVENUE
    RV_ADMIN -->|Grants| RV_DIST
    
    RD_ADMIN -->|Grants| RD_REWARD
    RD_ADMIN -->|Grants| RD_COLLECT
    
    MS_ADMIN -->|Grants| MS_MEMBER
    MS_ADMIN -->|Grants| MS_BENEFIT
```

---

## Complete Interaction Matrix

| From Contract | To Contract | Interaction Type | Purpose |
|--------------|-------------|----------------|---------|
| **RWAMarketplace** | RWAAssetRegistry | Read | Validate asset exists and get asset details |
| **RWAMarketplace** | RWATokenFactory | Read | Get token address for asset |
| **RWAMarketplace** | RWATokenFactory404 | Read | Get ERC404 token address for asset |
| **RWAMarketplace** | RWA Tokens | Write | Transfer tokens to buyers |
| **RWAMarketplace** | RWAAssetRegistry | Write | Update sold tokens count |
| **RWAMarketplace** | RWARevenue | Write | Send marketplace fees |
| **RWATokenFactory** | RWA Tokens | Write | Create, mint, burn tokens |
| **RWATokenFactory404** | RWA Tokens (404) | Write | Create, mint, burn ERC404 tokens |
| **RWAStaking** | TigerPalaceToken | Read/Write | Stake and unstake tokens |
| **RWAStaking** | RWARevenue | Read | Get revenue allocation data |
| **RWAStaking** | RWARewardDistributor | Read/Write | Request and receive rewards |
| **RWARevenue** | RWAStaking | Write | Distribute revenue to stakers |
| **RWARevenue** | RWARewardDistributor | Read/Write | Request funds for distribution |
| **RWARevenue** | TigerPalaceToken | Read/Write | Transfer tokens to staking contract |
| **RWARewardDistributor** | TigerPalaceToken | Read/Write | Hold and distribute reward pool |
| **RWARewardDistributor** | RWAStaking | Write | Distribute rewards |
| **RWARewardDistributor** | RWARevenue | Write | Provide funds for revenue distribution |
| **MembershipSystem** | RWAMarketplace | Read | Track user investments |
| **MembershipSystem** | RWAStaking | Read | Track user staking activity |
| **ProxyAdmin** | All Proxies | Write | Upgrade implementation contracts |

---

## Key Interaction Patterns

### 1. Asset Tokenization Pattern
```
Admin → RWAAssetRegistry.registerAsset()
     → RWATokenFactory.createToken() OR RWATokenFactory404.createToken404()
     → RWA Token Contract Deployed
     → Token Address Stored in Factory
```

### 2. Token Purchase Pattern
```
Buyer → RWAMarketplace.purchaseTokens()
     → RWAAssetRegistry.getAsset() [READ]
     → RWATokenFactory.getTokenAddress() [READ]
     → RWA Token.transferFrom() [WRITE]
     → RWAAssetRegistry.updateSoldTokens() [WRITE]
     → RWARevenue.collectMarketplaceFees() [WRITE]
```

### 3. Staking Pattern
```
User → RWAStaking.stake()
     → TigerPalaceToken.transferFrom() [WRITE]
     → Stake Record Created
     → Rewards Calculated Based on Pool Duration
```

### 4. Reward Claim Pattern
```
User → RWAStaking.claimRewards()
     → RWAStaking.calculateRewards()
     → RWARewardDistributor.distributeRewards() [WRITE]
     → TigerPalaceToken.transfer() [WRITE]
```

### 5. Revenue Distribution Pattern
```
Revenue Source → RWARevenue.allocateRevenue()
              → RWARevenue.distributeRevenue()
              → RWAStaking.distributeRevenue()
              → Pro-rata Distribution to Stakers
```

### 6. Membership Upgrade Pattern
```
User Activity → MembershipSystem.updateInvestment()
            → MembershipSystem.checkTierRequirements()
            → MembershipSystem.upgradeMembership()
            → Benefits Applied to Marketplace/Staking
```

---

## Security Considerations

### Access Control
- All contracts use OpenZeppelin's `AccessControl` for role-based permissions
- Critical functions are protected by role checks
- Marketplace has `MARKETPLACE_ROLE` on Registry to update token counts
- Factory has `TOKEN_CREATOR_ROLE` to create tokens

### Upgrade Safety
- ProxyAdmin controls all upgrades
- Implementation contracts are separate from proxies
- Storage layout must be preserved during upgrades
- Upgrade functions are protected by admin role

### Reentrancy Protection
- All contracts use `ReentrancyGuard` for critical functions
- Marketplace, Staking, Revenue, and RewardDistributor are protected
- Checks-Effects-Interactions pattern followed

### Pausability
- All contracts implement `Pausable` for emergency stops
- Admin can pause contracts in case of vulnerabilities
- Critical operations check `whenNotPaused` modifier

---

## Contract Dependencies

### Direct Dependencies
- **RWAMarketplace** depends on:
  - `RWAAssetRegistry` (immutable)
  - `RWATokenFactory` (immutable)
  - `RWARevenue` (for fee collection)

- **RWAStaking** depends on:
  - `TigerPalaceToken` (immutable)
  - `RWARevenue` (immutable)
  - `RWARewardDistributor` (immutable)

- **RWARevenue** depends on:
  - `TigerPalaceToken` (immutable)
  - `RWARewardDistributor` (immutable)
  - `RWAStaking` (set via initialize)

- **RWARewardDistributor** depends on:
  - `TigerPalaceToken` (immutable)
  - `RWAStaking` (set via initialize)
  - `RWARevenue` (set via initialize)

### Circular Dependencies (Resolved)
- **RWAStaking** ↔ **RWARevenue**: Both reference each other, initialized separately
- **RWARevenue** ↔ **RWARewardDistributor**: Both reference each other, initialized separately

---

## Deployment Order

1. **ProxyAdmin** - Deployed first (no dependencies)
2. **RWAAssetRegistry** - Deployed as upgradeable proxy
3. **RWATokenFactory** - Deployed as upgradeable proxy
4. **RWATokenFactory404** - Deployed as direct contract (non-upgradeable)
5. **RWAMarketplace** - Deployed as upgradeable proxy (depends on Registry + Factory)
6. **RWARewardDistributor** - Deployed as direct contract (depends on TigerPalaceToken)
7. **RWARevenue** - Deployed as direct contract (depends on TigerPalaceToken + Distributor)
8. **RWAStaking** - Deployed as upgradeable proxy (depends on Token + Revenue + Distributor)
9. **MembershipSystem** - Deployed as upgradeable proxy (no dependencies)

### Post-Deployment Wiring
- Grant `MARKETPLACE_ROLE` to Marketplace on Registry
- Grant `TOKEN_CREATOR_ROLE` to Marketplace on Factory
- Initialize RWARevenue with RWAStaking address
- Initialize RWARewardDistributor with Staking + Revenue addresses
- Initialize RWAStaking with Revenue + Distributor addresses

---

## Etherscan Links

- [ProxyAdmin](https://sepolia.etherscan.io/address/0x9d55BcFA47e88868B54C811041A942250d7F3DD9)
- [RWAAssetRegistry](https://sepolia.etherscan.io/address/0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D)
- [RWATokenFactory](https://sepolia.etherscan.io/address/0x2f051A127Ab4B8b0D78aB5758E06a808a8445566)
- [RWATokenFactory404](https://sepolia.etherscan.io/address/0xdC2AE75dC0D14E2f450156bE83c1F71920b6a896)
- [RWAMarketplace](https://sepolia.etherscan.io/address/0xc9C369525DFf385935dfDC6aC2F678C26998D0d7)
- [RWAStaking](https://sepolia.etherscan.io/address/0x622A30E2da7A9F4f5Af7ad76008FBC18F848A1cc)
- [RWARewardDistributor](https://sepolia.etherscan.io/address/0x9cF49bB1D64c8D40c693FcAA9d326950b5F29EaB)
- [RWARevenue](https://sepolia.etherscan.io/address/0x55b23576e535504F6db282159CD082bD97e16989)
- [MembershipSystem](https://sepolia.etherscan.io/address/0xB43cb5D178D8361307950da607D4A58C78aE8473)

---

## Summary

The Tiger Palace Pro contract ecosystem is designed as a modular, upgradeable system for Real World Asset tokenization and trading. Key features:

- **Modularity**: Each contract has a specific purpose and can be upgraded independently
- **Security**: Role-based access control, reentrancy protection, and pausability
- **Flexibility**: Support for both ERC20 and ERC404 token standards
- **Integration**: Contracts work together seamlessly for tokenization, trading, staking, and rewards
- **Upgradeability**: Core contracts use proxy pattern for future improvements
- **Membership**: Tiered membership system with investment-based upgrades

All contracts are deployed and verified on Sepolia testnet, ready for integration with the frontend application.

