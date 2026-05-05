// ============================================================================
// DATABASE ANALYTICS STORE
// ============================================================================

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// TYPES
// ============================================================================

export interface DatabaseStats {
  totalRecords: number;
  totalTables: number;
  databaseSize: string;
  lastBackup: string;
  connectionStatus: string;
  uptime: string;
  activeConnections: number;
  maxConnections: number;
  timestamp?: string;
}

export interface TableStats {
  name: string;
  records: number;
  size: string;
  growth: string;
}

export interface SystemHealth {
  cpu: number;
  memory: number;
  disk: number;
  connections: number;
}

export interface BackupRecord {
  id: number;
  type: string;
  size: string;
  status: string;
  createdAt: string;
}

export interface DatabaseData {
  success: boolean;
  databaseStats: DatabaseStats;
  tableStats: TableStats[];
  systemHealth: SystemHealth;
  recentBackups: BackupRecord[];
  detailedCounts: Record<string, number>;
}

export interface DatabaseAnalyticsState {
  // State
  databaseStats: DatabaseStats | null;
  tableStats: TableStats[];
  systemHealth: SystemHealth | null;
  recentBackups: BackupRecord[];
  detailedCounts: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  lastFetchTime: Date | null;

  // Computed values
  totalTablesCount: number;
  totalRecordsCount: number;
  isDataFresh: boolean;

  // Actions
  fetchDatabaseStats: () => Promise<void>;
  refreshStats: () => Promise<void>;
  clearStats: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Selectors
  getTableByName: (name: string) => TableStats | undefined;
  getTotalRecordsForTable: (name: string) => number;
  getSystemHealthPercentage: (metric: keyof SystemHealth) => number;
  getBackupById: (id: number) => BackupRecord | undefined;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useDatabaseAnalyticsStore = create<DatabaseAnalyticsState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial State
        databaseStats: null,
        tableStats: [],
        systemHealth: null,
        recentBackups: [],
        detailedCounts: {},
        isLoading: false,
        error: null,
        lastFetchTime: null,

        // Computed values
        get totalTablesCount(): number {
          return get().tableStats.length;
        },

        get totalRecordsCount(): number {
          return get().databaseStats?.totalRecords || 0;
        },

        get isDataFresh(): boolean {
          const lastFetch = get().lastFetchTime;
          if (!lastFetch) return false;

          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          return lastFetch > fiveMinutesAgo;
        },

        // Actions
        fetchDatabaseStats: async () => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const response = await fetch('/api/admin/database/stats', {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`Failed to fetch database stats: ${response.status}`);
            }

            const data: DatabaseData = await response.json();

            if (data.success) {
              set((state) => {
                state.databaseStats = data.databaseStats;
                state.tableStats = data.tableStats;
                state.systemHealth = data.systemHealth;
                state.recentBackups = data.recentBackups;
                state.detailedCounts = data.detailedCounts;
                state.lastFetchTime = new Date();
                state.isLoading = false;
                state.error = null;
              });
            } else {
              throw new Error('API returned success=false');
            }
          } catch (error) {
            console.error('Error fetching database statistics:', error);
            set((state) => {
              state.isLoading = false;
              state.error = error instanceof Error ? error.message : 'Failed to fetch database statistics';
            });
          }
        },

        refreshStats: async () => {
          await get().fetchDatabaseStats();
        },

        clearStats: () => {
          set((state) => {
            state.databaseStats = null;
            state.tableStats = [];
            state.systemHealth = null;
            state.recentBackups = [];
            state.detailedCounts = {};
            state.lastFetchTime = null;
            state.error = null;
          });
        },

        setLoading: (loading: boolean) => {
          set((state) => {
            state.isLoading = loading;
          });
        },

        setError: (error: string | null) => {
          set((state) => {
            state.error = error;
          });
        },

        // Selectors
        getTableByName: (name: string) => {
          return get().tableStats.find(table => table.name === name);
        },

        getTotalRecordsForTable: (name: string) => {
          const table = get().getTableByName(name);
          return table?.records || 0;
        },

        getSystemHealthPercentage: (metric: keyof SystemHealth) => {
          const health = get().systemHealth;
          return health?.[metric] || 0;
        },

        getBackupById: (id: number) => {
          return get().recentBackups.find(backup => backup.id === id);
        },
      }))
    ),
    {
      name: 'database-analytics-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================================================
// HOOKS AND SELECTORS
// ============================================================================

// Main hook
export const useDatabaseAnalytics = () => useDatabaseAnalyticsStore();

// Specific state selectors
export const useDatabaseStats = () =>
  useDatabaseAnalyticsStore((state) => state.databaseStats);

export const useTableStats = () =>
  useDatabaseAnalyticsStore((state) => state.tableStats);

export const useSystemHealth = () =>
  useDatabaseAnalyticsStore((state) => state.systemHealth);

export const useDatabaseLoading = () =>
  useDatabaseAnalyticsStore((state) => state.isLoading);

export const useDatabaseError = () =>
  useDatabaseAnalyticsStore((state) => state.error);

export const useLastFetchTime = () =>
  useDatabaseAnalyticsStore((state) => state.lastFetchTime);

// Computed selectors
export const useTotalTablesCount = () =>
  useDatabaseAnalyticsStore((state) => state.totalTablesCount);

export const useTotalRecordsCount = () =>
  useDatabaseAnalyticsStore((state) => state.totalRecordsCount);

export const useIsDataFresh = () =>
  useDatabaseAnalyticsStore((state) => state.isDataFresh);

// Action selectors
export const useFetchDatabaseStats = () =>
  useDatabaseAnalyticsStore((state) => state.fetchDatabaseStats);

export const useRefreshStats = () =>
  useDatabaseAnalyticsStore((state) => state.refreshStats);

export const useClearStats = () =>
  useDatabaseAnalyticsStore((state) => state.clearStats);

// Utility selectors
export const useGetTableByName = () =>
  useDatabaseAnalyticsStore((state) => state.getTableByName);

export const useGetTotalRecordsForTable = () =>
  useDatabaseAnalyticsStore((state) => state.getTotalRecordsForTable);

export const useGetSystemHealthPercentage = () =>
  useDatabaseAnalyticsStore((state) => state.getSystemHealthPercentage);

export const useGetBackupById = () =>
  useDatabaseAnalyticsStore((state) => state.getBackupById);

// ============================================================================
// UTILITIES
// ============================================================================

// Format database size for display
export const formatDatabaseSize = (size: string): string => {
  return size;
};

// Format record count for display
export const formatRecordCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

// Get health status color
export const getHealthStatusColor = (percentage: number): string => {
  if (percentage >= 90) return 'text-red-600 dark:text-red-400';
  if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
};

// Get backup status color
export const getBackupStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'success':
      return 'text-green-600 dark:text-green-400';
    case 'failed':
      return 'text-red-600 dark:text-red-400';
    case 'running':
      return 'text-blue-600 dark:text-blue-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default useDatabaseAnalyticsStore;
