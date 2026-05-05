import { create } from 'zustand';
import type { Config } from 'wagmi';

interface WagmiProviderState {
  // Dialog state
  isDialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  
  // Provider readiness state
  mounted: boolean;
  wagmiVerified: boolean;
  canRenderWallet: boolean;
  retryCount: number;
  wagmiReady: boolean;
  
  // Actions
  setWagmiReady: (ready: boolean) => void;
  initialize: () => void;
  verifyProvider: (config: Config) => void;
  checkRetryConditions: () => void;
}

export const useWagmiProviderStore = create<WagmiProviderState>((set, get) => ({
  // Dialog state
  isDialogOpen: false,
  setDialogOpen: (open) => set({ isDialogOpen: open }),
  
  // Provider readiness state - initialized to false
  mounted: false,
  wagmiVerified: false,
  canRenderWallet: false,
  retryCount: 0,
  wagmiReady: false,
  
  // Actions
  setWagmiReady: (ready: boolean) => {
    set({ wagmiReady: ready });
    // If wagmiReady becomes true and not mounted, trigger initialization
    if (ready && !get().mounted) {
      get().initialize();
    }
  },
  
  initialize: () => {
    const state = get();
    if (!state.mounted) {
      console.log('🐅 [wagmi-provider-store] Initializing provider...');
      set({ mounted: true, retryCount: 0 });
      
      // After initialization, check retry conditions
      setTimeout(() => {
        get().checkRetryConditions();
      }, 100);
    }
  },
  
  verifyProvider: (config: Config) => {
    const state = get();
    if (config && !state.wagmiVerified) {
      console.log('🐅 [wagmi-provider-store] Verifying provider...');
      set({ wagmiVerified: true });
      
      // After verification, enable wallet rendering after a short delay
      setTimeout(() => {
        set({ canRenderWallet: true });
      }, 200);
    }
  },
  
  checkRetryConditions: () => {
    const state = get();
    const maxRetries = 5;
    
    if (!state.wagmiVerified && state.retryCount < maxRetries) {
      const newRetryCount = state.retryCount + 1;
      console.log(`🐅 [wagmi-provider-store] Checking retry conditions (attempt ${newRetryCount}/${maxRetries})...`);
      set({ retryCount: newRetryCount });
      
      // If mounted but not verified, try to verify again
      if (state.mounted) {
        // This will be handled by WagmiProviderVerifier component
        // which calls verifyProvider when config becomes available
      }
    } else if (state.retryCount >= maxRetries) {
      console.warn('🐅 [wagmi-provider-store] Max retries reached - provider verification failed');
    }
  },
}));