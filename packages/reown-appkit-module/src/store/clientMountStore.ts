/**
 * Client Mount Store
 * 
 * Tracks client-side mount state to prevent hydration mismatches
 * Replaces useEffect for client-side checks
 */

import { create } from 'zustand';

interface ClientMountState {
  isMounted: boolean;
  initialize: () => void;
}

export const useClientMountStore = create<ClientMountState>()((set) => ({
  isMounted: typeof window !== 'undefined',
  
  initialize: () => {
    if (typeof window !== 'undefined') {
      set({ isMounted: true });
    }
  },
}));

// Auto-initialize on client side
if (typeof window !== 'undefined') {
  useClientMountStore.getState().initialize();
}

