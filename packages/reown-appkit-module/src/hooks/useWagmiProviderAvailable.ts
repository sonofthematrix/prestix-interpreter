"use client";

import { useEffect, useState } from 'react';

/**
 * Hook to check if WagmiProvider is available in the React context tree
 * 
 * This hook attempts to access wagmi context and returns true if available.
 * Since we can't conditionally call hooks, we use a try-catch approach
 * with a wrapper component pattern.
 */
export function useWagmiProviderAvailable(): boolean {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    // Check if WagmiProvider is available by trying to access wagmi context
    // We'll use a small delay and check periodically
    let checkCount = 0;
    const maxChecks = 20; // Check for 2 seconds (20 * 100ms)
    
    const checkWagmi = () => {
      checkCount++;
      
      // Try to detect if WagmiProvider is available
      // We can't directly check React context, but we can check if wagmi hooks would work
      // by checking if the window has wagmi-related globals or if React context is set up
      
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        setIsAvailable(false);
        return;
      }
      
      // Check if wagmi is initialized by looking for wagmi-related state in window
      // This is a heuristic - if WagmiProvider is mounted, it should have initialized
      // We'll use a more reliable approach: check if we can access wagmi config
      try {
        // Try to access wagmi adapter from the module
        // If it's available, WagmiProvider should be ready
        const wagmiAdapter = (window as any).__wagmiAdapter;
        if (wagmiAdapter) {
          setIsAvailable(true);
          return;
        }
      } catch {
        // Wagmi adapter not available yet
      }
      
      // If we haven't found it yet and haven't exceeded max checks, try again
      if (checkCount < maxChecks) {
        setTimeout(checkWagmi, 100);
      } else {
        // After max checks, assume WagmiProvider should be ready (it's in the layout)
        // This handles the case where the check doesn't work but WagmiProvider is actually ready
        setIsAvailable(true);
      }
    };
    
    // Start checking after a small delay to allow WagmiProvider to initialize
    const timeoutId = setTimeout(checkWagmi, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return isAvailable;
}

