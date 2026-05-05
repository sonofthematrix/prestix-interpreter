/**
 * Smart Account Store
 * 
 * Zustand store for Smart Account detection and capabilities
 * Replaces useSmartAccount hook useState
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Address } from 'viem';

export interface SmartAccountCapabilities {
  supportsSendCalls: boolean;
  supportsPaymaster: boolean;
}

interface SmartAccountState {
  capabilities: SmartAccountCapabilities;
  isLoading: boolean;
  accountType: 'eoa' | 'social' | 'smart';
  
  // Actions
  setCapabilities: (capabilities: SmartAccountCapabilities) => void;
  setLoading: (loading: boolean) => void;
  setAccountType: (type: 'eoa' | 'social' | 'smart') => void;
  reset: () => void;
}

const initialState = {
  capabilities: {
    supportsSendCalls: false,
    supportsPaymaster: false,
  },
  isLoading: true,
  accountType: 'eoa' as const,
};

export const useSmartAccountStore = create<SmartAccountState>()(
  immer((set) => ({
    ...initialState,
    
    setCapabilities: (capabilities) => {
      set((state) => {
        state.capabilities = capabilities;
      });
    },
    
    setLoading: (loading) => {
      set((state) => {
        state.isLoading = loading;
      });
    },
    
    setAccountType: (type) => {
      set((state) => {
        state.accountType = type;
      });
    },
    
    reset: () => {
      set((state) => {
        Object.assign(state, initialState);
      });
    },
  }))
);

