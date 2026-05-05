/**
 * Wallet UI State Store
 * 
 * Centralized Zustand store for wallet UI state management
 * Replaces useState for tabs, dialogs, and other UI state
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useMemo } from 'react';

interface WalletUIState {
  // Wallet page state
  activeTab: 'tokens' | 'defi' | 'nfts' | 'activity';
  fundDialogOpen: boolean;
  sendDialogOpen: boolean;
  swapDialogOpen: boolean;
  receiveDialogOpen: boolean;
  rwaDialogOpen: boolean;
  rewardsDialogOpen: boolean;
  gameFiDialogOpen: boolean;
  
  // Actions
  setActiveTab: (tab: 'tokens' | 'defi' | 'nfts' | 'activity') => void;
  setDialog: (dialog: string, open: boolean) => void;
  reset: () => void;
}

const initialState = {
  activeTab: 'tokens' as const,
  fundDialogOpen: false,
  sendDialogOpen: false,
  swapDialogOpen: false,
  receiveDialogOpen: false,
  rwaDialogOpen: false,
  rewardsDialogOpen: false,
  gameFiDialogOpen: false,
};

export const useWalletUIStore = create<WalletUIState>()(
  immer((set, get) => ({
    ...initialState,
    
    setActiveTab: (tab) => {
      set((state) => {
        state.activeTab = tab;
      });
    },
    
    setDialog: (dialog, open) => {
      set((state) => {
        if (dialog === 'fund') state.fundDialogOpen = open;
        else if (dialog === 'send') state.sendDialogOpen = open;
        else if (dialog === 'swap') state.swapDialogOpen = open;
        else if (dialog === 'receive') state.receiveDialogOpen = open;
        else if (dialog === 'rwa') state.rwaDialogOpen = open;
        else if (dialog === 'rewards') state.rewardsDialogOpen = open;
        else if (dialog === 'gameFi') state.gameFiDialogOpen = open;
      });
    },
    
    reset: () => {
      set((state) => {
        Object.assign(state, initialState);
      });
    },
  }))
);

// Convenience selector
export const useWalletPageUI = () => {
  const activeTab = useWalletUIStore((state) => state.activeTab);
  const setActiveTab = useWalletUIStore((state) => state.setActiveTab);
  const dialogs = useWalletUIStore((state) => ({
    fundDialogOpen: state.fundDialogOpen,
    sendDialogOpen: state.sendDialogOpen,
    swapDialogOpen: state.swapDialogOpen,
    receiveDialogOpen: state.receiveDialogOpen,
    rwaDialogOpen: state.rwaDialogOpen,
    rewardsDialogOpen: state.rewardsDialogOpen,
    gameFiDialogOpen: state.gameFiDialogOpen,
  }));
  const setDialog = useWalletUIStore((state) => state.setDialog);
  
  return useMemo(() => ({
    activeTab,
    setActiveTab,
    dialogs,
    setDialog,
  }), [activeTab, setActiveTab, dialogs, setDialog]);
};

