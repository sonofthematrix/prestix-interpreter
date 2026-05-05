import { create } from 'zustand';

interface AppKitState {
  // AppKit instance
  appKit: any | null;
  appKitOpen: (() => void) | null;
  
  // Theme state
  themeMode: 'light' | 'dark';
  themeVariables: any | null;
  
  // Config state
  wagmiConfig: any | null;
  
  // Loading state
  isInitialized: boolean;
  isLoading: boolean;
  
  // Actions
  initializeAppKit: () => Promise<void>;
  syncAppKit: () => Promise<void>;
  setAppKit: (appKit: any) => void;
  setTheme: (mode: 'light' | 'dark', variables?: any) => void;
  setWagmiConfig: (config: any) => void;
  reset: () => void;
}

export const useAppKitStore = create<AppKitState>()((set, get) => ({
    // Initial state
    appKit: null,
    appKitOpen: null,
    themeMode: 'dark',
    themeVariables: null,
    wagmiConfig: null,
    isInitialized: false,
    isLoading: false,
    
    // Initialize AppKit hooks on client side
    initializeAppKit: async () => {
      if (typeof window === 'undefined') {
        return; // Skip during SSR
      }
      
      if (get().isInitialized) {
        return; // Already initialized
      }
      
      set({ isLoading: true });
      
      try {
        // Dynamically import AppKit hooks
        const { useAppKit, useAppKitTheme } = await import('@reown/appkit/react');
        
        // Get AppKit instance and theme
        // Note: We can't call hooks directly here, so we'll need to do this in a component
        // For now, we'll set up a way for components to register themselves
        set({ isLoading: false, isInitialized: true });
      } catch (error) {
        console.error('Failed to initialize AppKit:', error);
        set({ isLoading: false });
      }
    },
    
    // Set AppKit instance (called from component after hooks are available)
    setAppKit: (appKit) => {
      set({
        appKit,
        appKitOpen: appKit?.open || null,
      });
    },
    
    // Set theme
    setTheme: (mode, variables) => {
      set({
        themeMode: mode,
        themeVariables: variables || null,
      });
    },
    
    // Set Wagmi config
    setWagmiConfig: (config) => {
      set({ wagmiConfig: config });
    },
    
    // Sync AppKit hooks to store (called from AppKitStoreSync component)
    syncAppKit: async () => {
      if (typeof window === 'undefined') {
        return; // Skip during SSR
      }
      
      if (get().isInitialized) {
        return; // Already synced
      }
      
      set({ isLoading: true });
      
      try {
        // Dynamically import AppKit hooks
        await import('@reown/appkit/react').then((mod) => {
          try {
            // Access AppKit through window or context if available
            const appKitInstance = (window as any).__appkit__;
            if (appKitInstance) {
              get().setAppKit(appKitInstance);
            }
          } catch (error) {
            console.error('Failed to sync AppKit:', error);
          }
        }).catch((error) => {
          console.error('Failed to import AppKit hooks:', error);
        });

        // Sync Wagmi config to store
        try {
          const { getWagmiConfig } = require('../config');
          const config = getWagmiConfig();
          get().setWagmiConfig(config);
        } catch (error) {
          console.error('Failed to get Wagmi config:', error);
        }
        
        set({ isLoading: false, isInitialized: true });
      } catch (error) {
        console.error('Failed to sync AppKit:', error);
        set({ isLoading: false });
      }
    },
    
    // Reset store
    reset: () => {
      set({
        appKit: null,
        appKitOpen: null,
        themeMode: 'dark',
        themeVariables: null,
        wagmiConfig: null,
        isInitialized: false,
        isLoading: false,
      });
    },
  })
);

