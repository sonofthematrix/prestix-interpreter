/**
 * Wallet Signature Store
 * 
 * Zustand store for managing signature state per wallet address
 * Maps wallet addresses to their signing state and messages
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface WalletSignatureState {
  walletAddress: string | null;
  message: string | null;
  isSigning: boolean;
  isAuthenticating: boolean;
  signature: string | null;
  error: string | null;
  siweMessage: string | null;
  
  // Actions
  setWalletAddress: (address: string | null) => void;
  setMessage: (message: string | null) => void;
  setSiweMessage: (message: string | null) => void;
  setSigning: (signing: boolean) => void;
  setAuthenticating: (authenticating: boolean) => void;
  setSignature: (signature: string | null) => void;
  setError: (error: string | null) => void;
  startSigning: (walletAddress: string, message: string) => void;
  completeSigning: (signature: string) => void;
  failSigning: (error: string) => void;
  reset: () => void;
  resetForWallet: (walletAddress: string) => void;
}

const initialState = {
  walletAddress: null,
  message: null,
  isSigning: false,
  isAuthenticating: false,
  signature: null,
  error: null,
  siweMessage: null,
};

export const useWalletSignatureStore = create<WalletSignatureState>()(
  immer((set) => ({
    ...initialState,
    
    setWalletAddress: (address) => {
      set((state) => {
        state.walletAddress = address;
      });
    },
    
    setMessage: (message) => {
      set((state) => {
        state.message = message;
      });
    },
    
    setSiweMessage: (message) => {
      set((state) => {
        state.siweMessage = message;
      });
    },
    
    setSigning: (signing) => {
      set((state) => {
        state.isSigning = signing;
        if (signing) {
          state.error = null; // Clear error when starting to sign
        }
      });
    },
    
    setAuthenticating: (authenticating) => {
      set((state) => {
        state.isAuthenticating = authenticating;
        if (authenticating) {
          state.error = null; // Clear error when starting authentication
        }
      });
    },
    
    setSignature: (signature) => {
      set((state) => {
        state.signature = signature;
        state.isSigning = false; // Signing is complete when signature is set
      });
    },
    
    setError: (error) => {
      set((state) => {
        state.error = error;
        state.isSigning = false;
        state.isAuthenticating = false;
      });
    },
    
    startSigning: (walletAddress, message) => {
      set((state) => {
        state.walletAddress = walletAddress;
        state.message = message;
        state.isSigning = true;
        state.isAuthenticating = false;
        state.signature = null;
        state.error = null;
      });
    },
    
    completeSigning: (signature) => {
      set((state) => {
        state.signature = signature;
        state.isSigning = false;
        state.error = null;
      });
    },
    
    failSigning: (error) => {
      set((state) => {
        state.error = error;
        state.isSigning = false;
        state.isAuthenticating = false;
        state.signature = null;
      });
    },
    
    reset: () => {
      set((state) => {
        Object.assign(state, initialState);
      });
    },
    
    resetForWallet: (walletAddress) => {
      set((state) => {
        if (state.walletAddress === walletAddress) {
          state.isSigning = false;
          state.isAuthenticating = false;
          state.error = null;
          // Keep walletAddress and message, just reset signing state
        }
      });
    },
  }))
);

