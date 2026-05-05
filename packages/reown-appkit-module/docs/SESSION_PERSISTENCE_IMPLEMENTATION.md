# Session Persistence Implementation

## Overview

This document describes how wallet session and authentication state is now managed through Zustand stores with persistence, preventing unnecessary re-authentication requests on every page navigation.

## Problem

Previously, users were asked to re-login on every page navigation even after connecting their wallet and signing the SIWE message. This was because:

1. Session state was not persisted across page navigations
2. `WalletSessionGuard` checked NextAuth session on every page load without checking persisted state first
3. No mechanism to skip re-authentication when a valid persisted session exists

## Solution

### 1. Persisted Session Store

**File**: `packages/reown-appkit-module/src/store/appkitSessionStore.ts`

- Uses Zustand with `persist` middleware to store session data in localStorage
- Stores:
  - Wallet address
  - Chain ID
  - Session expiration timestamp
  - Session ID
- Provides validation methods: `isSessionValid()`, `shouldCheckSession()`

### 2. Updated WalletSessionGuard

**File**: `packages/reown-appkit-module/src/components/auth/WalletSessionGuard.tsx`

**Key Changes**:

1. **Checks persisted session first** before checking NextAuth session
   - If persisted session is valid and matches connected wallet, skips re-authentication
   - Only checks NextAuth session if persisted session is missing or expired

2. **Persists session after successful authentication**
   - When authentication succeeds, stores session data in Zustand store
   - Includes expiration timestamp for validation

3. **Validates session expiration**
   - Checks if persisted session is still valid before using it
   - Clears expired sessions automatically

### 3. Updated SessionSync

**File**: `packages/reown-appkit-module/src/components/auth/SessionSync.tsx`

**Key Changes**:

1. **Syncs NextAuth session to persisted store**
   - When NextAuth session is authenticated, persists it to AppKit session store
   - Ensures session state is available across page navigations

2. **Monitors wallet disconnection**
   - Clears persisted session when wallet disconnects
   - Prevents stale session data from persisting

## Flow Diagram

```
User Connects Wallet
    ↓
Sign SIWE Message
    ↓
Authentication Success
    ↓
Session Persisted to Zustand Store (localStorage)
    ↓
Navigate to New Page
    ↓
WalletSessionGuard Checks:
    1. Persisted Session Exists? → Yes
    2. Session Valid? → Yes
    3. Wallet Matches? → Yes
    ↓
Skip Re-authentication ✅
    ↓
Render Page Content
```

## Benefits

1. **No Re-authentication on Navigation**: Once authenticated, users stay authenticated across page navigations
2. **Persistent State**: Session survives page refreshes (stored in localStorage)
3. **Automatic Expiration**: Expired sessions are automatically cleared
4. **Wallet Disconnection Handling**: Session is cleared when wallet disconnects
5. **Performance**: Reduces unnecessary API calls and signature requests

## Technical Details

### Session Store Structure

```typescript
interface AppKitSIWESession {
  address: Address;
  chainId: number;
  expiresAt: string; // ISO string
  sessionId?: string;
  nonce?: string;
}
```

### Persistence Configuration

- **Storage**: localStorage (via Zustand persist middleware)
- **Storage Key**: `appkit-session-store`
- **Partial Persistence**: Only session data is persisted, not loading states

### Session Validation

- Checks expiration timestamp against current time
- Validates wallet address matches connected wallet
- Prevents excessive checks with minimum interval (2 seconds)

## Usage

The session persistence is automatic and requires no changes to existing code. Components using `WalletSessionGuard` will automatically benefit from persisted sessions.

## Related Files

- `packages/reown-appkit-module/src/store/appkitSessionStore.ts` - Session store with persistence
- `packages/reown-appkit-module/src/components/auth/WalletSessionGuard.tsx` - Session guard with persistence check
- `packages/reown-appkit-module/src/components/auth/SessionSync.tsx` - Session synchronization

## Testing

To verify session persistence:

1. Connect wallet and sign SIWE message
2. Navigate between wallet pages (`/wallet`, `/wallet/send`, `/wallet/buy`, etc.)
3. Verify no re-authentication prompts appear
4. Refresh the page
5. Verify session persists (may need to reconnect wallet if NextAuth session expired, but persisted session should prevent re-signing)

## Future Improvements

- Add session refresh mechanism before expiration
- Implement session invalidation on server-side events
- Add session activity tracking for security

