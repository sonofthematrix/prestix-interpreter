/**
 * Context Store
 * 
 * Zustand store for context provider state
 * Replaces useState in context/index.tsx
 * 
 * Note: Using standard Zustand (not immer) because wagmi Config types are readonly
 */

import { create } from 'zustand';
import type { Config } from 'wagmi';
import type { cookieToInitialState } from 'wagmi';

interface ContextState {
  mounted: boolean;
  wagmiConfig: Config | null;
  initialState: ReturnType<typeof cookieToInitialState> | undefined;
  
  // Actions
  setMounted: (mounted: boolean) => void;
  setWagmiConfig: (config: Config | null) => void;
  setInitialState: (initialState: ReturnType<typeof cookieToInitialState> | undefined) => void;
  reset: () => void;
}

const initialState = {
  mounted: typeof window !== 'undefined',
  wagmiConfig: null,
  initialState: undefined,
};

export const useContextStore = create<ContextState>()((set) => ({
  ...initialState,
  
  setMounted: (mounted) => {
    set({ mounted });
  },
  
  setWagmiConfig: (config) => {
    set({ wagmiConfig: config });
  },
  
  setInitialState: (initialState) => {
    set({ initialState });
  },
  
  reset: () => {
    set(initialState);
  },
}));

// Auto-initialize mounted state on client
if (typeof window !== 'undefined') {
  useContextStore.getState().setMounted(true);
}
