# Store Export Analysis for Marketplace & Gaming Features

## Overview

This document analyzes all Zustand stores in the `reown-appkit-module` package and determines which stores should be exported for use by the Tiger RWA Marketplace and gaming features.

## Store Inventory

### Currently Exported ✅
- `auth-store` - Authentication and authorization
- `sidebar-store` - Sidebar navigation state

### Not Exported (Analysis Required) ❌

#### `/src/store/` Directory
1. **tokenizinWalletStore** - Core wallet data management
2. **uiStore** - UI state for wallet pages and dialogs
3. **appkitStore** - AppKit instance and theme management
4. **appkitSessionStore** - SIWE session state management
5. **walletSignatureStore** - Signature operation state
6. **smartAccountStore** - Smart account capabilities
7. **adminWalletStore** - Admin wallet capabilities
8. **signingStore** - Simple signing state (may merge with walletSignatureStore)
9. **clientMountStore** - Client mount tracking (INTERNAL)
10. **contextStore** - Context provider state (INTERNAL)

#### `/src/stores/` Directory
1. **wagmi-provider-store** - Wagmi provider readiness state
2. **wallet-store** - Wallet connection and authentication state

## Export Recommendations

### ✅ SHOULD EXPORT (Marketplace & Gaming Critical)

#### 1. **tokenizinWalletStore** (`/src/store/tokenizinWalletStore.ts`)
**Purpose**: Centralized wallet data management (balances, tokens, properties, transactions)
**Usage**: Core wallet features, balance displays, token lists, transaction history
**Priority**: 🔴 CRITICAL
**Export As**: `useTigerWalletStore`, `useTigerWalletData`, `useTokenizinWalletBalances`, etc.

#### 2. **wallet-store** (`/src/stores/wallet-store.ts`)
**Purpose**: Wallet connection state, authentication, wallet info from API
**Usage**: Wallet connection UI, authentication flows, wallet info display
**Priority**: 🔴 CRITICAL
**Export As**: `useWalletStore`

#### 3. **wagmi-provider-store** (`/src/stores/wagmi-provider-store.ts`)
**Purpose**: Wagmi provider readiness, dialog state, retry logic
**Usage**: Wallet connection dialogs, provider initialization
**Priority**: 🟡 HIGH
**Export As**: `useWagmiProviderStore`

#### 4. **uiStore** (`/src/store/uiStore.ts`)
**Purpose**: UI state for wallet pages, dialogs, tabs, action buttons
**Usage**: Wallet page navigation, dialog management, tab switching
**Priority**: 🟡 HIGH
**Export As**: `useUIStore`, `useWalletPageUI`, `useTigerWalletUI`, `useFundWalletDialog`, etc.

#### 5. **appkitStore** (`/src/store/appkitStore.ts`)
**Purpose**: AppKit instance, theme mode, wagmi config
**Usage**: AppKit integration, theme management
**Priority**: 🟡 HIGH
**Export As**: `useAppKitStore`

#### 6. **appkitSessionStore** (`/src/store/appkitSessionStore.ts`)
**Purpose**: SIWE session management, session validation, signature tracking
**Usage**: Authentication flows, session persistence, preventing duplicate signatures
**Priority**: 🟡 HIGH
**Export As**: `useAppKitSessionStore`

#### 7. **walletSignatureStore** (`/src/store/walletSignatureStore.ts`)
**Purpose**: Signature state per wallet address, signing operations
**Usage**: Signature flows, message signing, authentication
**Priority**: 🟡 HIGH
**Export As**: `useWalletSignatureStore`

#### 8. **smartAccountStore** (`/src/store/smartAccountStore.ts`)
**Purpose**: Smart account detection and capabilities (SendCalls, Paymaster)
**Usage**: Account abstraction features, gasless transactions
**Priority**: 🟢 MEDIUM
**Export As**: `useSmartAccountStore`

#### 9. **adminWalletStore** (`/src/store/adminWalletStore.ts`)
**Purpose**: Admin wallet capabilities (mint, deploy, lazy mint, paymaster)
**Usage**: Admin features, marketplace management
**Priority**: 🟢 MEDIUM
**Export As**: `useAdminWalletStore`

### ⚠️ CONDITIONAL EXPORT

#### 10. **signingStore** (`/src/store/signingStore.ts`)
**Purpose**: Simple signing state (isSigning boolean)
**Usage**: Basic signing operations
**Priority**: 🟢 LOW
**Recommendation**: Consider merging with `walletSignatureStore` or keep as simple utility
**Export As**: `useSigningStore` (if kept separate)

### ❌ INTERNAL ONLY (Do Not Export)

#### 11. **clientMountStore** (`/src/store/clientMountStore.ts`)
**Purpose**: Client-side mount tracking to prevent hydration mismatches
**Usage**: Internal implementation detail
**Reason**: Not needed by marketplace consumers, internal SSR handling

#### 12. **contextStore** (`/src/store/contextStore.ts`)
**Purpose**: Context provider state (wagmi config, mounted state)
**Usage**: Internal implementation detail
**Reason**: Not needed by marketplace consumers, internal provider setup

## Export Strategy

### Option 1: Direct Exports (Recommended)
Export stores directly from `/src/stores/index.ts`:
```typescript
// Wallet stores
export * from '../store/tokenizinWalletStore';
export * from './wallet-store';
export * from './wagmi-provider-store';

// UI stores
export * from '../store/uiStore';
export * from '../store/appkitStore';
export * from '../store/appkitSessionStore';

// Signature stores
export * from '../store/walletSignatureStore';
export * from '../store/signingStore'; // Optional

// Account stores
export * from '../store/smartAccountStore';
export * from '../store/adminWalletStore';
```

### Option 2: Namespaced Exports
Group stores by category:
```typescript
// Wallet
export { useTigerWalletStore, useTigerWalletData } from '../store/tokenizinWalletStore';
export { useWalletStore } from './wallet-store';

// UI
export { useUIStore, useWalletPageUI } from '../store/uiStore';

// etc.
```

## Implementation Plan

1. ✅ Analyze all stores
2. ⏳ Update `/src/stores/index.ts` with recommended exports
3. ⏳ Create type exports for store interfaces
4. ⏳ Update documentation
5. ⏳ Test exports in marketplace integration

## Usage Examples

### Marketplace Wallet Integration
```typescript
import { 
  useTigerWalletStore,
  useWalletStore,
  useUIStore,
  useAppKitStore 
} from '@TKNZN/reown-appkit-module/stores';

function MarketplaceWallet() {
  const walletData = useTigerWalletStore();
  const walletInfo = useWalletStore();
  const ui = useUIStore();
  
  // Use stores...
}
```

### Gaming Features Integration
```typescript
import { 
  useSmartAccountStore,
  useAdminWalletStore,
  useWalletSignatureStore 
} from '@TKNZN/reown-appkit-module/stores';

function GamingFeature() {
  const smartAccount = useSmartAccountStore();
  const admin = useAdminWalletStore();
  
  // Use stores...
}
```

## Notes

- All stores use Zustand with immer middleware for immutable updates
- Some stores use persistence middleware (appkitSessionStore)
- Stores are designed to be used independently or together
- TypeScript types are fully exported for all stores
- Stores follow React hooks naming convention (`use*Store`)

