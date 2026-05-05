/**
 * AppKit Controllers React Shim
 * 
 * Provides React-related exports for @reown/appkit-controllers/react
 * These are React hooks that wrap the controllers
 */

// Re-export hooks from @reown/appkit/react if available, otherwise provide no-ops
let useAppKitAccountOriginal: any;
let useAppKitWalletsOriginal: any;
let useAppKitProviderOriginal: any;

try {
  const appkitReact = require('@reown/appkit/react');
  useAppKitAccountOriginal = appkitReact.useAppKitAccount;
  useAppKitWalletsOriginal = appkitReact.useAppKitWallets;
  useAppKitProviderOriginal = appkitReact.useAppKitProvider;
} catch {
  // Fallback if not available
  useAppKitAccountOriginal = () => ({ address: null, isConnected: false });
  useAppKitWalletsOriginal = () => [];
  useAppKitProviderOriginal = () => ({ open: () => {}, close: () => {} });
}

export const useAppKitAccount = useAppKitAccountOriginal;
export const useAppKitWallets = useAppKitWalletsOriginal;
export const useAppKitProvider = useAppKitProviderOriginal;

export const useAppKitNetworkCore = () => {
  return {
    network: null,
    setNetwork: () => {},
  } as any;
};

export default {
  useAppKitAccount,
  useAppKitWallets,
  useAppKitProvider,
  useAppKitNetworkCore,
};
