'use client'

import { useEffect } from 'react';
import { useAppKitStore } from '../store/appkitStore';
import { useClientMountStore } from '../store/clientMountStore';

/**
 * Component that syncs AppKit hooks with Zustand store
 * This allows us to use AppKit hooks in a component while exposing state via Zustand
 * Only renders on client side to prevent SSR issues
 * 
 * ✅ CORRECT: Uses useEffect to call store actions, preventing state updates during render
 */
export function AppKitStoreSync() {
  const isMounted = useClientMountStore((state) => state.isMounted);
  const syncAppKit = useAppKitStore((state) => state.syncAppKit);
  const isInitialized = useAppKitStore((state) => state.isInitialized);

  // ✅ CORRECT: Call store action in useEffect to prevent state updates during render
  // Store action has guards to prevent duplicate initialization
  useEffect(() => {
    if (isMounted && !isInitialized) {
      syncAppKit();
    }
  }, [isMounted, isInitialized, syncAppKit]);

  // Don't render anything - this is just a sync component
  return null;
}

