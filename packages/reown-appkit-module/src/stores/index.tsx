// ============================================================================
// ZUSTAND STORES INDEX - ZENSTACK APPLICATION
// ============================================================================

// Export all types
export * from './types';

// Export core stores
export { useUserStore } from './core-stores';


// Export blog store
export { useBlogError, useBlogFilters, useBlogLoading, useBlogPagination, useBlogPosts, useBlogStore, useCurrentBlogPost } from './blog-store';

// Export documentation store
export {
  useCurrentDocumentation, useDocumentation, useDocumentationActions, useDocumentationError,
  useDocumentationFilters, useDocumentationLoading, useDocumentationPagination, useDocumentationStats, useDocumentationStore, useFilteredDocumentation
} from './documentation-store';

// Export database analytics store
export {
  formatRecordCount, getBackupStatusColor, getHealthStatusColor, useClearStats, useDatabaseAnalytics, useDatabaseAnalyticsStore, useDatabaseError, useDatabaseLoading, useDatabaseStats, useFetchDatabaseStats, useGetBackupById, useGetSystemHealthPercentage, useGetTableByName,
  useGetTotalRecordsForTable, useIsDataFresh, useLastFetchTime, useRefreshStats, useSystemHealth, useTableStats, useTotalRecordsCount, useTotalTablesCount
} from './database-analytics-store';

// Export test case statistics store
export {
  useTestCaseStatisticsStore
} from './test-case-statistics-store';

// Export UI stores
export { useLoadingStore, useModalStore, useNavigationStore, useNotificationStore, usePreferencesStore, useThemeStore, useToastStore } from './ui-stores';

// Export voice config store
// export type { LMNTVoiceConfig } from '@/components/docs/LMNTVoiceConfigDialog';
export { useVoiceConfigStore } from './voice-config-store';

// Export auth store
export {
  initializeSessionManagement, useAuth, useAuthStore, usePermissions,
  useSession
} from './auth-store';

// Export enum store
export {
  getAvailableEnumNames, getEnumLabel, getEnumValues, isValidEnumValue, useEnum, useEnums, useEnumStore
} from './enum-store';

// Export realtime store
export {
  initializeRealtime, useRealtime, useRealtimeEventHandler, useRealtimeStore, useRealtimeSubscription, useSpaceRealtime,
  useTodoRealtime, useUserRealtime
} from './realtime-store';

// ============================================================================
// STORE INTEGRATION UTILITIES
// ============================================================================

import { useUserStore } from './core-stores';

import React, { useEffect, useState } from 'react';
import { initializeSessionManagement, useAuthStore } from './auth-store';
import { useEnumStore } from './enum-store';
import { initializeRealtime, useRealtimeStore } from './realtime-store';
import { useLoadingStore, useModalStore, useNavigationStore, useNotificationStore, usePreferencesStore, useThemeStore, useToastStore } from './ui-stores';

// ============================================================================
// STORE INITIALIZATION
// ============================================================================

export const initializeStores = async () => {
  try {
    // Initialize session management
    initializeSessionManagement();
    
    // Initialize realtime connection
    await initializeRealtime();
    
    // Load initial data if authenticated
    const authStore = useAuthStore.getState();
    const enumStore = useEnumStore.getState();
    
    // Initialize enums (public only, admin enums loaded on demand)
    if (!enumStore.isInitialized) {
      await enumStore.fetchEnums(false);
    }
    
    if (authStore.isAuthenticated && authStore.user) {
      await loadInitialData();
      
      // Load admin enums if user is admin
      const userPermissions = (authStore.user as any)?.permissions || [];
      const isAdmin = userPermissions.includes('ADMIN') || userPermissions.includes('MODERATOR');
      if (isAdmin && (!enumStore.adminEnums || Object.keys(enumStore.adminEnums).length === 0)) {
        await enumStore.fetchEnums(true);
      }
    }
    
    console.log('Stores initialized successfully');
  } catch (error) {
    console.error('Failed to initialize stores:', error);
  }
};

const loadInitialData = async () => {
  const loadingStore = useLoadingStore.getState();
  const toastStore = useToastStore.getState();
  
  try {
    loadingStore.setGlobalLoading(true);
    
    // Load user's spaces
    // const spaceStore = useSpaceStore.getState();
    // await spaceStore.fetchSpaces();
    
    // Load current space data if available
    // if (spaceStore.currentSpace) {
    //   const todoStore = useTodoStore.getState();
    //   await todoStore.fetchLists(spaceStore.currentSpace.id);
    // }
    
    loadingStore.setGlobalLoading(false);
  } catch (error) {
    loadingStore.setGlobalLoading(false);
    toastStore.showError('Failed to load initial data', error instanceof Error ? error.message : 'Unknown error');
  }
};

// ============================================================================
// STORE SYNC UTILITIES
// ============================================================================

export const syncStores = () => {
  // Sync user data across stores
  const authStore = useAuthStore.getState();
  const userStore = useUserStore.getState();
  
  if (authStore.user && authStore.user !== userStore.currentUser) {
    userStore.setCurrentUser(authStore.user);
  }
  
};

// ============================================================================
// STORE RESET UTILITIES
// ============================================================================

export const resetAllStores = () => {
  // Reset core stores
  useUserStore.getState().setCurrentUser(null);
  
  // Reset auth store
  useAuthStore.getState().logout();
  
  // Reset UI stores
  useModalStore.getState().closeAllModals();
  useToastStore.getState().clearToasts();
  useNotificationStore.getState().clearNotifications();
  useLoadingStore.getState().clearAllLoading();
  
  // Reset realtime
  useRealtimeStore.getState().disconnect();
  
  console.log('All stores reset');
};

// ============================================================================
// STORE PERSISTENCE UTILITIES
// ============================================================================

export const exportStoreData = () => {
  const data = {
    user: useUserStore.getState().currentUser,
    // spaces: useSpaceStore.getState().spaces,
    // currentSpace: useSpaceStore.getState().currentSpace,
    theme: useThemeStore.getState().theme,
    preferences: usePreferencesStore.getState().preferences,
    navigation: useNavigationStore.getState().navigation,
  };
  
  return JSON.stringify(data, null, 2);
};

export const importStoreData = (data: string) => {
  try {
    const parsed = JSON.parse(data);
    
    if (parsed.user) {
      useUserStore.getState().setCurrentUser(parsed.user);
    }
    
    if (parsed.spaces) {
      // useSpaceStore.getState().setSpaces(Object.values(parsed.spaces));
    }
    
    if (parsed.currentSpace) {
      // useSpaceStore.getState().setCurrentSpace(parsed.currentSpace);
    }
    
    if (parsed.theme) {
      useThemeStore.getState().setTheme(parsed.theme);
    }
    
    if (parsed.preferences) {
      usePreferencesStore.getState().setPreferences(parsed.preferences);
    }
    
    if (parsed.navigation) {
      useNavigationStore.getState().setBreadcrumbs(parsed.navigation.breadcrumbs || []);
      useNavigationStore.getState().setSidebarCollapsed(parsed.navigation.sidebarCollapsed || false);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to import store data:', error);
    return false;
  }
};

// ============================================================================
// STORE MONITORING
// ============================================================================

export const enableStoreMonitoring = () => {
  if (process.env.NODE_ENV === 'development') {
    // Monitor store changes
    useUserStore.subscribe(
      (state) => {
        const user = state.currentUser;
        console.log('User changed:', user ? `User ID: ${(user as any).id || 'unknown'}` : 'No user');
      }
    );
    
    // useSpaceStore.subscribe(
      // (state) => state.currentSpace,  
      (space: any) => {
        console.log('Current space changed:', space?.name);
      }
    // );
    
    useAuthStore.subscribe(
      (state) => {
        console.log('Authentication state changed:', state.isAuthenticated);
      }
    );
    
    useRealtimeStore.subscribe(
      (state) => {
        console.log('Realtime connection changed:', state.isConnected);
      }
    );
  }
};

// ============================================================================
// STORE HOOKS
// ============================================================================

export const useStoreSync = () => {
  useEffect(() => {
    const interval = setInterval(syncStores, 1000);
    return () => clearInterval(interval);
  }, []);
};

export const useStoreInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    initializeStores().then(() => {
      setIsInitialized(true);
    });
  }, []);
  
  return isInitialized;
};

// ============================================================================
// STORE PROVIDER COMPONENT
// ============================================================================

interface StoreProviderProps {
  children: React.ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const isInitialized = useStoreInitialization();
  
  useEffect(() => {
    enableStoreMonitoring();
  }, []);
  
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

// ============================================================================
// STORE UTILITIES
// ============================================================================

export const getStoreState = () => {
  return {
    user: useUserStore.getState(),
    auth: useAuthStore.getState(),
    realtime: useRealtimeStore.getState(),
    modal: useModalStore.getState(),
    toast: useToastStore.getState(),
    navigation: useNavigationStore.getState(),
    theme: useThemeStore.getState(),
    preferences: usePreferencesStore.getState(),
    notification: useNotificationStore.getState(),
    loading: useLoadingStore.getState(),
  };
};

export const getStoreStats = () => {
  const state = getStoreState();
  
  return {
    users: Object.keys(state.user.users).length,
    isAuthenticated: state.auth.isAuthenticated,
    isConnected: state.realtime.isConnected,
    activeModals: Object.keys(state.modal.modals).length,
    activeToasts: state.toast.toasts.length,
    notifications: state.notification.notifications.length,
    unreadNotifications: state.notification.unreadCount,
    loadingStates: Object.keys(state.loading.loadingStates).length,
  };
};
