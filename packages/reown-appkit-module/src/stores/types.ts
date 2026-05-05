// ============================================================================
// ZUSTAND STORE TYPES FOR ZENSTACK APPLICATION
// ============================================================================

import { User } from '../../zenstack/models';

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

export interface UserWithRelations extends User {
  id: string
  email?: string | null
  name?: string | null
  role: string
  // Add relations as needed based on actual schema
}



// ============================================================================
// STORE STATE TYPES
// ============================================================================

export interface StoreState {
  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  
  // Error states
  error: string | null;
  
  // Last updated timestamps
  lastUpdated: Record<string, Date>;
  
  // Cache metadata
  cache: {
    [key: string]: {
      data: any;
      timestamp: Date;
      ttl: number; // Time to live in milliseconds
    };
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// FILTER AND SORT TYPES
// ============================================================================

export interface FilterOptions {
  [key: string]: any;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  filters?: FilterOptions;
  sort?: SortOptions;
  search?: string;
}

// ============================================================================
// REAL-TIME EVENT TYPES
// ============================================================================

export interface RealtimeEvent {
  type: 'create' | 'update' | 'delete' | 'upsert';
  model: string;
  id: string | number;
  data?: any;
  timestamp: Date;
}

export interface SubscriptionOptions {
  models: string[];
  filters?: FilterOptions;
  userId?: string;
}

// ============================================================================
// FORM STATE TYPES
// ============================================================================

export interface FormState<T = any> {
  data: T;
  errors: Record<string, string>;
  isDirty: boolean;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface FormFieldState {
  value: any;
  error?: string;
  isDirty: boolean;
  isTouched: boolean;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface ModalState {
  isOpen: boolean;
  type?: string;
  data?: any;
  onClose?: () => void;
  onConfirm?: (data: any) => void;
}

export interface ToastState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NavigationState {
  currentPath: string;
  previousPath?: string;
  breadcrumbs: Array<{
    label: string;
    path: string;
  }>;
  sidebarCollapsed: boolean;
  activeMenuItem?: string;
}

// ============================================================================
// PERMISSION TYPES
// ============================================================================

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  conditions?: Record<string, any>;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  description?: string;
}

export interface UserPermissions {
  userId: string;
  roles: Role[];
  permissions: Permission[];
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

export interface SearchResult<T = any> {
  id: string | number;
  type: string;
  title: string;
  description?: string;
  data: T;
  score: number;
  highlights?: Record<string, string[]>;
}

export interface SearchOptions {
  query: string;
  types?: string[];
  limit?: number;
  offset?: number;
  filters?: FilterOptions;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  userId: string;
  data?: any;
  actions?: Array<{
    label: string;
    action: string;
    data?: any;
  }>;
}

// ============================================================================
// THEME TYPES
// ============================================================================

export interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  fontSize: 'sm' | 'md' | 'lg';
  compactMode: boolean;
  sidebarCollapsed: boolean;
}

// ============================================================================
// PREFERENCE TYPES
// ============================================================================

export interface UserPreferences {
  theme: ThemeState;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'spaces';
    showOnlineStatus: boolean;
  };
  ai: {
    defaultProfile: string;
    autoSave: boolean;
    showSuggestions: boolean;
  };
}
