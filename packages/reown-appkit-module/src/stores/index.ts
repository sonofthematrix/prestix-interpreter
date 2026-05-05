// ============================================================================
// STORE EXPORTS FOR MARKETPLACE & GAMING FEATURES
// ============================================================================

// Existing exports
export * from './auth-store';
export * from '../utils/sidebar-store';

// ============================================================================
// WALLET STORES (Critical for Marketplace)
// ============================================================================

// Core wallet data management
export * from '../store/tokenizinWalletStore';

// Wallet connection and authentication state
export * from './wallet-store';

// Wagmi provider readiness state
export * from './wagmi-provider-store';

// ============================================================================
// UI STORES (High Priority for Marketplace)
// ============================================================================

// UI state for wallet pages, dialogs, tabs
export * from '../store/uiStore';

// AppKit instance and theme management
export * from '../store/appkitStore';

// ============================================================================
// SESSION & SIGNATURE STORES (High Priority for Authentication)
// ============================================================================

// SIWE session state management
export * from '../store/appkitSessionStore';

// Signature operation state per wallet
export * from '../store/walletSignatureStore';

// Simple signing state (optional, may merge with walletSignatureStore)
export * from '../store/signingStore';

// ============================================================================
// ACCOUNT STORES (Medium Priority for Advanced Features)
// ============================================================================

// Smart account capabilities (SendCalls, Paymaster)
export * from '../store/smartAccountStore';

// Admin wallet capabilities
export * from '../store/adminWalletStore';

// ============================================================================
// INTERNAL STORES (Not Exported - Internal Implementation Only)
// ============================================================================
// clientMountStore - Internal SSR handling
// contextStore - Internal provider setup
