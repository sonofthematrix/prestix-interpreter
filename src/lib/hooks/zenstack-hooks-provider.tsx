'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuerySettingsProvider, type FetchFn } from '@zenstackhq/tanstack-query/react';
import { ReactNode, useMemo } from 'react';

/**
 * ZenStack Hooks Provider
 * 
 * Provides TanStack Query client and ZenStack query settings for all components.
 * This enables CRUD hooks with automatic access policy enforcement.
 * 
 * Usage:
 * ```tsx
 * import { useClientQueries } from '@zenstackhq/tanstack-query/react';
 * import { schema } from '@/zenstack/schema-lite';
 * 
 * const client = useClientQueries(schema);
 * const { data: users } = client.user.useFindMany();
 * ```
 */
export function ZenStackHooksProvider({ children }: { children: ReactNode }) {
  // Create a stable QueryClient instance
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
    []
  );

  // Custom fetch function that includes authentication headers
  const customFetch: FetchFn = useMemo(
    () => async (url, options) => {
      // Add any custom headers here (e.g., auth tokens)
      const headers = {
        ...options?.headers,
        'Content-Type': 'application/json',
      };

      return fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies for session-based auth
      });
    },
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <QuerySettingsProvider
        value={{
          endpoint: '/api/model', // ZenStack RPC API endpoint
          fetch: customFetch,
          logging: process.env.NODE_ENV === 'development',
        }}
      >
        {children}
      </QuerySettingsProvider>
    </QueryClientProvider>
  );
}
