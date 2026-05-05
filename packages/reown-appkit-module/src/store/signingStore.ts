/**
 * Signing Store
 * 
 * Zustand store for signature operations
 * Replaces useState in AppKitSignButton
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface SigningState {
  isSigning: boolean;
  
  // Actions
  setSigning: (signing: boolean) => void;
  reset: () => void;
}

const initialState = {
  isSigning: false,
};

export const useSigningStore = create<SigningState>()(
  immer((set) => ({
    ...initialState,
    
    setSigning: (signing) => {
      set((state) => {
        state.isSigning = signing;
      });
    },
    
    reset: () => {
      set((state) => {
        Object.assign(state, initialState);
      });
    },
  }))
);

