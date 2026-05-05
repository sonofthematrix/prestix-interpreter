// ============================================================================
// TEST CASE STATISTICS STORE
// ============================================================================

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// TYPES
// ============================================================================

export interface TestStats {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  inProgress: number;
  passRate: number;
}

export interface TestStatistics {
  overall: TestStats;
  individual: TestStats;
  bundled: TestStats;
  lastUpdated: string;
}

export interface TestCaseStatisticsState {
  // State
  statistics: TestStatistics | null;
  isLoading: boolean;
  error: string | null;
  lastFetchTime: Date | null;

  // Actions
  fetchStatistics: () => Promise<void>;
  refreshStatistics: () => Promise<void>;
  clearStatistics: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Helper to check if data has changed
  hasDataChanged: (newStats: TestStatistics | null) => boolean;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useTestCaseStatisticsStore = create<TestCaseStatisticsState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial State
        statistics: null,
        isLoading: false,
        error: null,
        lastFetchTime: null,

        // Actions
        fetchStatistics: async () => {
          const { statistics, hasDataChanged } = get();
          
          // Don't fetch if already loading
          if (get().isLoading) {
            return;
          }

          set({ isLoading: true, error: null });

          try {
            const response = await fetch('/api/test-cases/statistics', {
              credentials: 'include'
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.data) {
              const newStats = data.data as TestStatistics;
              
              // Only update if data has actually changed
              if (!statistics || hasDataChanged(newStats)) {
                set({ 
                  statistics: newStats,
                  lastFetchTime: new Date(),
                  isLoading: false 
                });
              } else {
                // Data hasn't changed, just update timestamp
                set({ 
                  isLoading: false,
                  lastFetchTime: new Date()
                });
              }
            } else {
              set({ 
                error: 'Failed to fetch statistics',
                isLoading: false 
              });
            }
          } catch (error) {
            console.error('Failed to fetch test statistics:', error);
            set({ 
              error: error instanceof Error ? error.message : 'Unknown error',
              isLoading: false 
            });
          }
        },

        refreshStatistics: async () => {
          // Force refresh by clearing cache and fetching
          await get().fetchStatistics();
        },

        clearStatistics: () => {
          set({ 
            statistics: null,
            error: null,
            lastFetchTime: null 
          });
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading });
        },

        setError: (error: string | null) => {
          set({ error });
        },

        // Helper to check if data has changed
        hasDataChanged: (newStats: TestStatistics | null) => {
          const currentStats = get().statistics;
          
          if (!currentStats || !newStats) {
            return currentStats !== newStats;
          }

          // Compare critical fields
          return (
            currentStats.overall.total !== newStats.overall.total ||
            currentStats.overall.passed !== newStats.overall.passed ||
            currentStats.overall.failed !== newStats.overall.failed ||
            currentStats.overall.pending !== newStats.overall.pending ||
            currentStats.individual.total !== newStats.individual.total ||
            currentStats.individual.passed !== newStats.individual.passed ||
            currentStats.individual.failed !== newStats.individual.failed ||
            currentStats.bundled.total !== newStats.bundled.total ||
            currentStats.bundled.passed !== newStats.bundled.passed ||
            currentStats.bundled.failed !== newStats.bundled.failed
          );
        },
      }))
    ),
    { name: 'TestCaseStatisticsStore' }
  )
);

