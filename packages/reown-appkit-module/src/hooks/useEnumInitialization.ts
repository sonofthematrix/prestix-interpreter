'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useEnumStore } from '@/stores/enum-store';
import { useEffect } from 'react';

/**
 * Hook to initialize enums on app start
 * Automatically fetches enums based on user role
 */
export function useEnumInitialization() {
  const { fetchEnums, isInitialized } = useEnumStore();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // Only fetch if not already initialized
    if (!isInitialized) {
      // Check if user is admin to determine if admin enums should be included
      const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
      fetchEnums(isAdmin);
    }
  }, [isInitialized, fetchEnums, isAuthenticated, user?.role]);
}

/**
 * Component to initialize enums
 * Add this to your root layout or app provider
 */
export function EnumInitializer() {
  useEnumInitialization();
  return null;
}

