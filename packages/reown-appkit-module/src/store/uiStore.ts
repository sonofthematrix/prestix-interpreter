/**
 * UI State Store
 * 
 * Centralized Zustand store for UI state management
 * Replaces useState for tabs, dialogs, and other UI state
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useMemo } from 'react';

interface UIState {
  // Wallet page state
  walletPage: {
    activeTab: 'tokens' | 'defi' | 'nfts' | 'activity';
    fundDialogOpen: boolean;
    sendDialogOpen: boolean;
    swapDialogOpen: boolean;
    receiveDialogOpen: boolean;
    rwaDialogOpen: boolean;
    rewardsDialogOpen: boolean;
    gameFiDialogOpen: boolean;
  };
  
  // TigerRWAWallet state
  tigerWallet: {
    activeTab: 'overview' | 'tokens' | 'properties' | 'history' | 'tier' | 'rewards' | 'gaming' | 'valuation';
    isInitializing: boolean;
    fundDialogOpen: boolean;
    sendDialogOpen: boolean;
    swapDialogOpen: boolean;
  };
  
  // Dialog states
  dialogs: {
    fundWallet: {
      amount: string;
      isProcessing: boolean;
      activeMethod: 'card' | 'crypto' | 'qr';
    };
    send: {
      recipient: string;
      amount: string;
      selectedToken: string;
      isProcessing: boolean;
    };
    swap: {
      fromToken: string;
      toToken: string;
      amount: string;
      isProcessing: boolean;
    };
  };
  
  // Action buttons state
  actionButtons: {
    activeButton: string | null;
  };
  
  // Token list state
  tokenList: {
    isRefreshing: boolean;
  };
  
  // Actions
  setWalletPageTab: (tab: 'tokens' | 'defi' | 'nfts' | 'activity') => void;
  setWalletPageDialog: (dialog: string, open: boolean) => void;
  
  setTigerWalletTab: (tab: 'overview' | 'tokens' | 'properties' | 'history' | 'tier' | 'rewards' | 'gaming' | 'valuation') => void;
  setTigerWalletInitializing: (initializing: boolean) => void;
  setTigerWalletDialog: (dialog: string, open: boolean) => void;
  
  setFundWalletAmount: (amount: string) => void;
  setFundWalletProcessing: (processing: boolean) => void;
  setFundWalletMethod: (method: 'card' | 'crypto' | 'qr') => void;
  
  setSendRecipient: (recipient: string) => void;
  setSendAmount: (amount: string) => void;
  setSendToken: (token: string) => void;
  setSendProcessing: (processing: boolean) => void;
  
  setSwapFromToken: (token: string) => void;
  setSwapToToken: (token: string) => void;
  setSwapAmount: (amount: string) => void;
  setSwapProcessing: (processing: boolean) => void;
  
  setActiveButton: (button: string | null) => void;
  setTokenListRefreshing: (refreshing: boolean) => void;
  
  reset: () => void;
}

const initialState = {
  walletPage: {
    activeTab: 'tokens' as const,
    fundDialogOpen: false,
    sendDialogOpen: false,
    swapDialogOpen: false,
    receiveDialogOpen: false,
    rwaDialogOpen: false,
    rewardsDialogOpen: false,
    gameFiDialogOpen: false,
  },
  tigerWallet: {
    activeTab: 'overview' as const,
    isInitializing: true,
    fundDialogOpen: false,
    sendDialogOpen: false,
    swapDialogOpen: false,
  },
  dialogs: {
    fundWallet: {
      amount: '',
      isProcessing: false,
      activeMethod: 'card' as const,
    },
    send: {
      recipient: '',
      amount: '',
      selectedToken: 'ETH',
      isProcessing: false,
    },
    swap: {
      fromToken: 'ETH',
      toToken: 'USDC',
      amount: '',
      isProcessing: false,
    },
  },
  actionButtons: {
    activeButton: null,
  },
  tokenList: {
    isRefreshing: false,
  },
};

export const useUIStore = create<UIState>()(
  immer((set, get) => ({
    ...initialState,
    
    // Wallet page actions
    setWalletPageTab: (tab) => {
      set((state) => {
        state.walletPage.activeTab = tab;
      });
    },
    
    setWalletPageDialog: (dialog, open) => {
      set((state) => {
        if (dialog === 'fund') state.walletPage.fundDialogOpen = open;
        else if (dialog === 'send') state.walletPage.sendDialogOpen = open;
        else if (dialog === 'swap') state.walletPage.swapDialogOpen = open;
        else if (dialog === 'receive') state.walletPage.receiveDialogOpen = open;
        else if (dialog === 'rwa') state.walletPage.rwaDialogOpen = open;
        else if (dialog === 'rewards') state.walletPage.rewardsDialogOpen = open;
        else if (dialog === 'gameFi') state.walletPage.gameFiDialogOpen = open;
      });
    },
    
    // Tiger wallet actions
    setTigerWalletTab: (tab) => {
      set((state) => {
        state.tigerWallet.activeTab = tab;
      });
    },
    
    setTigerWalletInitializing: (initializing) => {
      set((state) => {
        state.tigerWallet.isInitializing = initializing;
      });
    },
    
    setTigerWalletDialog: (dialog, open) => {
      set((state) => {
        if (dialog === 'fund') state.tigerWallet.fundDialogOpen = open;
        else if (dialog === 'send') state.tigerWallet.sendDialogOpen = open;
        else if (dialog === 'swap') state.tigerWallet.swapDialogOpen = open;
      });
    },
    
    // Fund wallet dialog actions
    setFundWalletAmount: (amount) => {
      set((state) => {
        state.dialogs.fundWallet.amount = amount;
      });
    },
    
    setFundWalletProcessing: (processing) => {
      set((state) => {
        state.dialogs.fundWallet.isProcessing = processing;
      });
    },
    
    setFundWalletMethod: (method) => {
      set((state) => {
        state.dialogs.fundWallet.activeMethod = method;
      });
    },
    
    // Send dialog actions
    setSendRecipient: (recipient) => {
      set((state) => {
        state.dialogs.send.recipient = recipient;
      });
    },
    
    setSendAmount: (amount) => {
      set((state) => {
        state.dialogs.send.amount = amount;
      });
    },
    
    setSendToken: (token) => {
      set((state) => {
        state.dialogs.send.selectedToken = token;
      });
    },
    
    setSendProcessing: (processing) => {
      set((state) => {
        state.dialogs.send.isProcessing = processing;
      });
    },
    
    // Swap dialog actions
    setSwapFromToken: (token) => {
      set((state) => {
        state.dialogs.swap.fromToken = token;
      });
    },
    
    setSwapToToken: (token) => {
      set((state) => {
        state.dialogs.swap.toToken = token;
      });
    },
    
    setSwapAmount: (amount) => {
      set((state) => {
        state.dialogs.swap.amount = amount;
      });
    },
    
    setSwapProcessing: (processing) => {
      set((state) => {
        state.dialogs.swap.isProcessing = processing;
      });
    },
    
    // Action buttons
    setActiveButton: (button) => {
      set((state) => {
        state.actionButtons.activeButton = button;
      });
    },
    
    // Token list
    setTokenListRefreshing: (refreshing) => {
      set((state) => {
        state.tokenList.isRefreshing = refreshing;
      });
    },
    
    // Reset
    reset: () => {
      set((state) => {
        Object.assign(state, initialState);
      });
    },
  }))
);

// Convenience selectors
// ✅ CRITICAL: Use individual selectors + useMemo to prevent infinite loops
// When returning objects from selectors, we need to use individual selectors and memoize
export const useWalletPageUI = () => {
  const activeTab = useUIStore((state) => state.walletPage.activeTab);
  const setActiveTab = useUIStore((state) => state.setWalletPageTab);
  const dialogs = useUIStore((state) => state.walletPage);
  const setDialog = useUIStore((state) => state.setWalletPageDialog);
  
  return useMemo(() => ({
    activeTab,
    setActiveTab,
    dialogs,
    setDialog,
  }), [activeTab, setActiveTab, dialogs, setDialog]);
};

export const useTigerWalletUI = () => {
  const activeTab = useUIStore((state) => state.tigerWallet.activeTab);
  const setActiveTab = useUIStore((state) => state.setTigerWalletTab);
  const isInitializing = useUIStore((state) => state.tigerWallet.isInitializing);
  const setInitializing = useUIStore((state) => state.setTigerWalletInitializing);
  const dialogs = useUIStore((state) => state.tigerWallet);
  const setDialog = useUIStore((state) => state.setTigerWalletDialog);
  
  return useMemo(() => ({
    activeTab,
    setActiveTab,
    isInitializing,
    setInitializing,
    dialogs,
    setDialog,
  }), [activeTab, setActiveTab, isInitializing, setInitializing, dialogs, setDialog]);
};

export const useFundWalletDialog = () => {
  const amount = useUIStore((state) => state.dialogs.fundWallet.amount);
  const isProcessing = useUIStore((state) => state.dialogs.fundWallet.isProcessing);
  const activeMethod = useUIStore((state) => state.dialogs.fundWallet.activeMethod);
  const setAmount = useUIStore((state) => state.setFundWalletAmount);
  const setProcessing = useUIStore((state) => state.setFundWalletProcessing);
  const setMethod = useUIStore((state) => state.setFundWalletMethod);
  
  return useMemo(() => ({
    amount,
    isProcessing,
    activeMethod,
    setAmount,
    setProcessing,
    setMethod,
  }), [amount, isProcessing, activeMethod, setAmount, setProcessing, setMethod]);
};

export const useSendDialog = () => {
  const recipient = useUIStore((state) => state.dialogs.send.recipient);
  const amount = useUIStore((state) => state.dialogs.send.amount);
  const selectedToken = useUIStore((state) => state.dialogs.send.selectedToken);
  const isProcessing = useUIStore((state) => state.dialogs.send.isProcessing);
  const setRecipient = useUIStore((state) => state.setSendRecipient);
  const setAmount = useUIStore((state) => state.setSendAmount);
  const setToken = useUIStore((state) => state.setSendToken);
  const setProcessing = useUIStore((state) => state.setSendProcessing);
  
  return useMemo(() => ({
    recipient,
    amount,
    selectedToken,
    isProcessing,
    setRecipient,
    setAmount,
    setToken,
    setProcessing,
  }), [recipient, amount, selectedToken, isProcessing, setRecipient, setAmount, setToken, setProcessing]);
};

export const useSwapDialog = () => {
  const fromToken = useUIStore((state) => state.dialogs.swap.fromToken);
  const toToken = useUIStore((state) => state.dialogs.swap.toToken);
  const amount = useUIStore((state) => state.dialogs.swap.amount);
  const isProcessing = useUIStore((state) => state.dialogs.swap.isProcessing);
  const setFromToken = useUIStore((state) => state.setSwapFromToken);
  const setToToken = useUIStore((state) => state.setSwapToToken);
  const setAmount = useUIStore((state) => state.setSwapAmount);
  const setProcessing = useUIStore((state) => state.setSwapProcessing);
  
  return useMemo(() => ({
    fromToken,
    toToken,
    amount,
    isProcessing,
    setFromToken,
    setToToken,
    setAmount,
    setProcessing,
  }), [fromToken, toToken, amount, isProcessing, setFromToken, setToToken, setAmount, setProcessing]);
};

export const useActionButtons = () => {
  const activeButton = useUIStore((state) => state.actionButtons.activeButton);
  const setActiveButton = useUIStore((state) => state.setActiveButton);
  
  return useMemo(() => ({
    activeButton,
    setActiveButton,
  }), [activeButton, setActiveButton]);
};

export const useTokenList = () => {
  const isRefreshing = useUIStore((state) => state.tokenList.isRefreshing);
  const setRefreshing = useUIStore((state) => state.setTokenListRefreshing);
  
  return useMemo(() => ({
    isRefreshing,
    setRefreshing,
  }), [isRefreshing, setRefreshing]);
};

