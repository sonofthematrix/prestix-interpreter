'use client';

import { useEffect } from 'react';

interface ClientThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ClientThemeProvider - Applies dark theme without ThemeProvider's script injection
 * 
 * Removed ThemeProvider from next-themes to prevent hydration mismatches.
 * Since we're forcing dark theme, we just apply the class directly.
 */
export function ClientThemeProvider({ children }: ClientThemeProviderProps) {
  // Apply dark theme class directly to avoid ThemeProvider's script injection
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Return children directly - no ThemeProvider wrapper
  return <>{children}</>;
}
