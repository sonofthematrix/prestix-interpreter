import { create } from 'zustand';

interface PurchaseState {
  transactionHash: `0x${string}` | undefined;
  isProcessing: boolean;
  assetId: string | null;
  tokenAmount: number;
  walletAddress: string | null;
  ethAmount: string | null;
  usdAmount: number | null;
  
  // Actions
  setTransactionHash: (hash: `0x${string}` | undefined) => void;
  setIsProcessing: (processing: boolean) => void;
  setPurchaseData: (data: {
    assetId: string;
    tokenAmount: number;
    walletAddress: string;
    ethAmount: string;
    usdAmount: number;
  }) => void;
  resetPurchase: () => void;
}

export const usePurchaseStore = create<PurchaseState>((set) => ({
  transactionHash: undefined,
  isProcessing: false,
  assetId: null,
  tokenAmount: 0,
  walletAddress: null,
  ethAmount: null,
  usdAmount: null,
  
  setTransactionHash: (hash) => set({ transactionHash: hash }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setPurchaseData: (data) => set({
    assetId: data.assetId,
    tokenAmount: data.tokenAmount,
    walletAddress: data.walletAddress,
    ethAmount: data.ethAmount,
    usdAmount: data.usdAmount,
  }),
  resetPurchase: () => set({
    transactionHash: undefined,
    isProcessing: false,
    assetId: null,
    tokenAmount: 0,
    walletAddress: null,
    ethAmount: null,
    usdAmount: null,
  }),
}));

