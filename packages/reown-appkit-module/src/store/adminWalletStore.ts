/**
 * Admin Wallet Store
 * 
 * Zustand store for admin wallet capabilities
 * Replaces useAdminWallet hook useState
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Address } from 'viem';

export interface AdminWalletCapabilities {
  isAdmin: boolean;
  canMint: boolean;
  canDeployFactory: boolean;
  canLazyMint: boolean;
  canUsePaymaster: boolean;
}

interface AdminWalletState {
  isLoading: boolean;
  adminStatus: AdminWalletCapabilities;
  
  // Actions
  setLoading: (loading: boolean) => void;
  setAdminStatus: (status: AdminWalletCapabilities) => void;
  reset: () => void;
}

const initialState = {
  isLoading: true,
  adminStatus: {
    isAdmin: false,
    canMint: false,
    canDeployFactory: false,
    canLazyMint: false,
    canUsePaymaster: false,
  },
};

export const useAdminWalletStore = create<AdminWalletState>()(
  immer((set) => ({
    ...initialState,
    
    setLoading: (loading) => {
      set((state) => {
        state.isLoading = loading;
      });
    },
    
    setAdminStatus: (status) => {
      set((state) => {
        state.adminStatus = status;
      });
    },
    
    reset: () => {
      set((state) => {
        Object.assign(state, initialState);
      });
    },
  }))
);

