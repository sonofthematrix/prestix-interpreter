// ============================================================================
// ENUM MANAGEMENT STORE
// ============================================================================
// Provides cached access to all enums used throughout the application
// Separates public enums (accessible to all users) from admin-only enums

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { ApiResponse } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface EnumDefinition {
  name: string;
  values: Record<string, string>;
  labels: Record<string, string>;
  category: 'public' | 'admin';
  description?: string;
}

export interface EnumStoreState {
  // State
  enums: Record<string, EnumDefinition>;
  publicEnums: Record<string, EnumDefinition>;
  adminEnums: Record<string, EnumDefinition>;
  
  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Cache metadata
  lastFetchTime: Date | null;
  cacheExpiry: number; // milliseconds
  
  // Actions
  fetchEnums: (includeAdmin?: boolean) => Promise<void>;
  refreshEnums: (includeAdmin?: boolean) => Promise<void>;
  getEnum: (enumName: string) => EnumDefinition | undefined;
  getEnumValues: (enumName: string) => string[];
  getEnumLabels: (enumName: string) => Record<string, string>;
  getEnumValueLabel: (enumName: string, value: string) => string;
  
  // Utilities
  clearCache: () => void;
  setError: (error: string | null) => void;
  isCacheValid: () => boolean;
}

// ============================================================================
// ADMIN-ONLY ENUMS
// ============================================================================
// These enums contain sensitive system configuration or security parameters
// Only accessible to admin users

const ADMIN_ONLY_ENUMS = [
  'UserRole',
  'UserStatus',
  'AuthorizationType',
  'AdminCapability',
  'DocumentVerificationStatus',
  'NotificationStatus', // Privacy-related
  'PaymentStatusType', // Security-related
  'OnboardingStatus',
  'DependencyStatus',
  'PropertyOnboardingStatus',
] as const;

const isAdminEnum = (enumName: string): boolean => {
  return ADMIN_ONLY_ENUMS.includes(enumName as any);
};

// ============================================================================
// ENUM STORE
// ============================================================================

export const useEnumStore = create<EnumStoreState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state
          enums: {},
          publicEnums: {},
          adminEnums: {},
          isLoading: false,
          isInitialized: false,
          error: null,
          lastFetchTime: null,
          cacheExpiry: 5 * 60 * 1000, // 5 minutes default cache

          // Actions
          fetchEnums: async (includeAdmin = false) => {
            const { isInitialized, isCacheValid } = get();
            
            // Skip if already initialized and cache is valid
            if (isInitialized && isCacheValid()) {
              return;
            }

            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            try {
              const response = await fetch(
                `/api/enums?includeAdmin=${includeAdmin}`,
                {
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (!response.ok) {
                throw new Error(`Failed to fetch enums: ${response.status}`);
              }

              const result: ApiResponse<{
                enums: Record<string, EnumDefinition>;
                publicEnums: Record<string, EnumDefinition>;
                adminEnums?: Record<string, EnumDefinition>;
              }> = await response.json();

              if (result.success && result.data) {
                const { enums, publicEnums, adminEnums } = result.data;

                set((state) => {
                  state.enums = enums;
                  state.publicEnums = publicEnums;
                  if (adminEnums) {
                    state.adminEnums = adminEnums;
                  }
                  state.isInitialized = true;
                  state.isLoading = false;
                  state.lastFetchTime = new Date();
                  state.error = null;
                });
              } else {
                throw new Error(result.error || 'Failed to fetch enums');
              }
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Failed to fetch enums';
                state.isLoading = false;
              });
            }
          },

          refreshEnums: async (includeAdmin = false) => {
            set((state) => {
              state.isInitialized = false;
              state.lastFetchTime = null;
            });
            await get().fetchEnums(includeAdmin);
          },

          // Get enum by name
          getEnum: (enumName: string) => {
            const { enums, publicEnums, adminEnums } = get();
            return enums[enumName] || publicEnums[enumName] || adminEnums[enumName];
          },

          // Get enum values as array
          getEnumValues: (enumName: string) => {
            const enumDef = get().getEnum(enumName);
            if (!enumDef) return [];
            return Object.values(enumDef.values);
          },

          // Get enum labels
          getEnumLabels: (enumName: string) => {
            const enumDef = get().getEnum(enumName);
            if (!enumDef) return {};
            return enumDef.labels;
          },

          // Get label for specific enum value
          getEnumValueLabel: (enumName: string, value: string) => {
            const enumDef = get().getEnum(enumName);
            if (!enumDef) return value;
            return enumDef.labels[value] || value;
          },

          // Utilities
          clearCache: () => {
            set((state) => {
              state.enums = {};
              state.publicEnums = {};
              state.adminEnums = {};
              state.isInitialized = false;
              state.lastFetchTime = null;
            });
          },

          setError: (error: string | null) => {
            set((state) => {
              state.error = error;
            });
          },

          isCacheValid: () => {
            const { lastFetchTime, cacheExpiry } = get();
            if (!lastFetchTime) return false;
            const now = new Date();
            return now.getTime() - lastFetchTime.getTime() < cacheExpiry;
          },
        }))
      ),
      {
        name: 'enum-store',
        partialize: (state) => ({
          enums: state.enums,
          publicEnums: state.publicEnums,
          adminEnums: state.adminEnums,
          isInitialized: state.isInitialized,
          lastFetchTime: state.lastFetchTime,
        }),
      }
    ),
    { name: 'EnumStore' }
  )
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get enum values as array (from store)
 */
export function getEnumValues(enumName: string): string[] {
  return useEnumStore.getState().getEnumValues(enumName);
}

/**
 * Get enum label (converts SNAKE_CASE to Title Case)
 * Falls back to store if available, otherwise uses direct conversion
 */
export function getEnumLabel(value: string, enumName?: string): string {
  if (enumName) {
    const label = useEnumStore.getState().getEnumValueLabel(enumName, value);
    if (label !== value) return label;
  }
  
  // Fallback to direct conversion
  return value
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Check if a value is valid for a given enum
 */
export function isValidEnumValue(
  enumName: string,
  value: string
): boolean {
  const values = useEnumStore.getState().getEnumValues(enumName);
  return values.includes(value);
}

/**
 * Get all available enum names
 */
export function getAvailableEnumNames(includeAdmin = false): string[] {
  const { publicEnums, adminEnums } = useEnumStore.getState();
  const names = Object.keys(publicEnums);
  if (includeAdmin) {
    return [...names, ...Object.keys(adminEnums)];
  }
  return names;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to access enum store
 */
export const useEnums = () => {
  const store = useEnumStore();
  
  return {
    enums: store.enums,
    publicEnums: store.publicEnums,
    adminEnums: store.adminEnums,
    isLoading: store.isLoading,
    error: store.error,
    isInitialized: store.isInitialized,
    fetchEnums: store.fetchEnums,
    refreshEnums: store.refreshEnums,
    getEnum: store.getEnum,
    getEnumValues: store.getEnumValues,
    getEnumLabels: store.getEnumLabels,
    getEnumValueLabel: store.getEnumValueLabel,
    clearCache: store.clearCache,
  };
};

/**
 * Hook to access specific enum
 */
export const useEnum = (enumName: string) => {
  const store = useEnumStore();
  const enumDef = store.getEnum(enumName);
  
  return {
    enum: enumDef,
    values: enumDef ? Object.values(enumDef.values) : [],
    labels: enumDef ? enumDef.labels : {},
    isLoading: store.isLoading,
    getLabel: (value: string) => store.getEnumValueLabel(enumName, value),
  };
};

