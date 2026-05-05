/**
 * Profile Data Hooks - SWR-based data fetching with caching
 * Provides optimized data fetching for all profile sections
 */

// @ts-ignore - swr is optional dependency, may not be available in all environments
import useSWR, { SWRConfiguration } from 'swr';
import { useSession } from 'next-auth/react';
import { useProfileStore } from '@/stores/profile-store';
import { useCallback, useEffect } from 'react';

// Default SWR configuration
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000, // 5 seconds
  errorRetryCount: 3,
  errorRetryInterval: 1000,
};

// Fetcher with Zustand cache integration
const createFetcher = (userId: string, cacheKey: string) => {
  return async (url: string) => {
    const store = useProfileStore.getState();
    
    // Check Zustand cache first
    const cached = store.getCachedData(cacheKey);
    if (cached) {
      console.log(`[Cache Hit] ${cacheKey}`);
      return cached.data;
    }
    
    console.log(`[Cache Miss] ${cacheKey} - Fetching from API`);
    store.setLoading(cacheKey, true);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the data
      store.cacheData(cacheKey, data, '1.0', 1000 * 60 * 5); // 5 minutes TTL
      
      return data;
    } finally {
      store.setLoading(cacheKey, false);
    }
  };
};

// Generic profile data hook
export function useProfileData<T = any>(
  endpoint: string,
  cacheKey: string,
  config?: SWRConfiguration
) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  
  const url = userId ? `/api/users/${userId}/${endpoint}` : null;
  
  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    url,
    userId ? createFetcher(userId, cacheKey) : null,
    {
      ...defaultConfig,
      ...config,
    }
  );
  
  return {
    data,
    error,
    isLoading: isLoading || !data,
    isValidating,
    mutate,
    refetch: () => mutate(),
  };
}

// Specific hooks for each section

export function useProfileOrders(page = 1, pageSize = 10, filters?: Record<string, string>) {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    ...filters,
  });
  
  return useProfileData(
    `orders?${params.toString()}`,
    `orders-${page}-${pageSize}-${JSON.stringify(filters)}`,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );
}

export function useProfileInvestments(page = 1, pageSize = 10, filters?: Record<string, string>) {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    ...filters,
  });
  
  return useProfileData(
    `investments?${params.toString()}`,
    `investments-${page}-${pageSize}-${JSON.stringify(filters)}`,
    {
      refreshInterval: 60000, // Refresh every minute
    }
  );
}

export function useProfileWallet(page = 1, pageSize = 10, view = 'transactions') {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    view,
  });
  
  return useProfileData(
    `wallet?${params.toString()}`,
    `wallet-${view}-${page}-${pageSize}`,
    {
      refreshInterval: 15000, // Refresh every 15 seconds
    }
  );
}

export function useProfileSubscriptions(page = 1, pageSize = 10, filters?: Record<string, string>) {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    ...filters,
  });
  
  return useProfileData(
    `subscriptions?${params.toString()}`,
    `subscriptions-${page}-${pageSize}-${JSON.stringify(filters)}`,
    {
      refreshInterval: 60000, // Refresh every minute
    }
  );
}

export function useProfileGaming(page = 1, pageSize = 10, view = 'sessions', filters?: Record<string, string>) {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    view,
    ...filters,
  });
  
  return useProfileData(
    `gaming?${params.toString()}`,
    `gaming-${view}-${page}-${pageSize}-${JSON.stringify(filters)}`,
    {
      refreshInterval: 20000, // Refresh every 20 seconds
    }
  );
}

export function useProfileNotifications(page = 1, pageSize = 20, filters?: Record<string, string>) {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...filters,
  });
  
  return useProfileData(
    `notifications?${params.toString()}`,
    `notifications-${page}-${pageSize}-${JSON.stringify(filters)}`,
    {
      refreshInterval: 10000, // Refresh every 10 seconds for notifications
    }
  );
}

export function useProfileActivity(page = 1, pageSize = 20, filters?: Record<string, string>) {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    sortBy: 'timestamp',
    sortOrder: 'desc',
    ...filters,
  });
  
  return useProfileData(
    `activity?${params.toString()}`,
    `activity-${page}-${pageSize}-${JSON.stringify(filters)}`,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );
}

export function useProfileOverview() {
  return useProfileData(
    'profile-data',
    'profile-overview',
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true, // Revalidate when user returns to tab
    }
  );
}

// Cache invalidation helper
export function useInvalidateProfileCache() {
  const store = useProfileStore();
  
  return useCallback((cacheKey?: string) => {
    if (cacheKey) {
      store.invalidateCache(cacheKey);
    } else {
      store.clearDataCache();
    }
  }, [store]);
}

// Preload data hook (for tab switching optimization)
export function usePreloadProfileData() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  
  return useCallback(async (endpoint: string, cacheKey: string) => {
    if (!userId) return;
    
    const store = useProfileStore.getState();
    const cached = store.getCachedData(cacheKey);
    
    // Only preload if not cached
    if (!cached) {
      try {
        const response = await fetch(`/api/users/${userId}/${endpoint}`);
        if (response.ok) {
          const data = await response.json();
          store.cacheData(cacheKey, data, '1.0', 1000 * 60 * 5);
        }
      } catch (error) {
        console.error(`Preload failed for ${cacheKey}:`, error);
      }
    }
  }, [userId]);
}

