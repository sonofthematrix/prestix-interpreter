/**
 * useApiData Hook
 * Reusable hook for fetching API data with loading, error, and empty state handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

export interface UseApiDataOptions {
  /**
   * Enable/disable the query
   */
  enabled?: boolean;
  
  /**
   * Refetch interval in milliseconds
   */
  refetchInterval?: number;
  
  /**
   * Initial data to use before fetching
   */
  initialData?: any;
  
  /**
   * Callback when data is fetched successfully
   */
  onSuccess?: (data: any) => void;
  
  /**
   * Callback when an error occurs
   */
  onError?: (error: Error) => void;
  
  /**
   * Retry failed requests
   */
  retry?: number;
  
  /**
   * Retry delay in milliseconds
   */
  retryDelay?: number;
}

export interface UseApiDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  refetch: () => Promise<void>;
  mutate: (newData: T | null) => void;
}

export function useApiData<T = any>(
  url: string | null,
  options: UseApiDataOptions = {}
): UseApiDataResult<T> {
  const {
    enabled = true,
    refetchInterval,
    initialData = null,
    onSuccess,
    onError,
    retry = 0,
    retryDelay = 1000,
  } = options;

  const { data: session } = useSession();
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const isMountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout>();

  const fetchData = useCallback(async () => {
    if (!url || !enabled || !session) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Ignore JSON parse errors
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Handle both direct data and wrapped responses
      const fetchedData = result.data !== undefined ? result.data : result;

      if (isMountedRef.current) {
        setData(fetchedData);
        setError(null);
        setRetryCount(0);
        onSuccess?.(fetchedData);
      }
    } catch (err) {
      console.error(`Error fetching ${url}:`, err);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      
      if (isMountedRef.current) {
        // Retry if configured
        if (retryCount < retry) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, retryDelay);
        } else {
          setError(errorMessage);
          onError?.(err instanceof Error ? err : new Error(errorMessage));
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [url, enabled, session, retry, retryCount, retryDelay, onSuccess, onError]);

  // Initial fetch and refetch on dependencies
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Retry effect
  useEffect(() => {
    if (retryCount > 0 && retryCount <= retry) {
      fetchData();
    }
  }, [retryCount, retry, fetchData]);

  // Refetch interval
  useEffect(() => {
    if (refetchInterval && enabled && !error) {
      intervalRef.current = setInterval(fetchData, refetchInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refetchInterval, enabled, error, fetchData]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const mutate = useCallback((newData: T | null) => {
    setData(newData);
  }, []);

  const isEmpty = data === null || 
                  (Array.isArray(data) && data.length === 0) ||
                  (typeof data === 'object' && Object.keys(data).length === 0);

  return {
    data,
    loading,
    error,
    isEmpty,
    refetch: fetchData,
    mutate,
  };
}

/**
 * Paginated API data hook
 */
export interface UsePaginatedApiDataOptions extends UseApiDataOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface UsePaginatedApiDataResult<T> extends UseApiDataResult<PaginatedResult<T>> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function usePaginatedApiData<T = any>(
  baseUrl: string | null,
  options: UsePaginatedApiDataOptions = {}
): UsePaginatedApiDataResult<T> {
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    filters = {},
    ...restOptions
  } = options;

  // Build URL with query parameters
  const url = baseUrl ? (() => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      sortBy,
      sortOrder,
      ...Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>),
    });
    return `${baseUrl}?${params.toString()}`;
  })() : null;

  const result = useApiData<PaginatedResult<T>>(url, restOptions);

  const items = result.data?.data || [];
  const pagination = result.data?.pagination || {
    page: 1,
    pageSize: 0,
    total: 0,
    totalPages: 0,
  };

  return {
    ...result,
    items,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    totalPages: pagination.totalPages,
    hasNextPage: pagination.page < pagination.totalPages,
    hasPreviousPage: pagination.page > 1,
  };
}

