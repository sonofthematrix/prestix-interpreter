// ============================================================================
// UI STATE STORES FOR ZENSTACK APPLICATION
// ============================================================================

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { 
  ModalState, 
  ToastState, 
  NavigationState, 
  ThemeState, 
  UserPreferences,
  Notification
} from './types';

// ============================================================================
// MODAL STORE
// ============================================================================

interface ModalStore {
  // State
  modals: Record<string, ModalState>;
  
  // Actions
  openModal: (id: string, type: string, data?: any, onClose?: () => void, onConfirm?: (data: any) => void) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  updateModal: (id: string, updates: Partial<ModalState>) => void;
  
  // Helpers
  isModalOpen: (id: string) => boolean;
  getModal: (id: string) => ModalState | undefined;
}

export const useModalStore = create<ModalStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get: () => ModalStore) => ({
        // Initial state
        modals: {},

        // Actions
        openModal: (id, type, data, onClose, onConfirm) => set((state) => {
          state.modals[id] = {
            isOpen: true,
            type,
            data,
            onClose,
            onConfirm,
          };
        }),

        closeModal: (id) => set((state) => {
          const modal = state.modals[id];
          if (modal) {
            modal.onClose?.();
            delete state.modals[id];
          }
        }),

        closeAllModals: () => set((state) => {
          Object.values(state.modals).forEach(modal => {
            modal.onClose?.();
          });
          state.modals = {};
        }),

        updateModal: (id, updates) => set((state) => {
          if (state.modals[id]) {
            Object.assign(state.modals[id], updates);
          }
        }),

        // Helpers
        isModalOpen: (id) => {
          return get().modals[id]?.isOpen || false;
        },

        getModal: (id) => {
          return get().modals[id];
        },
      }))
    ),
    { name: 'ModalStore' }
  )
) as any;

// ============================================================================
// TOAST STORE
// ============================================================================

interface ToastStore {
  // State
  toasts: ToastState[];
  
  // Actions
  addToast: (toast: Omit<ToastState, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  updateToast: (id: string, updates: Partial<ToastState>) => void;
  
  // Helpers
  showSuccess: (title: string, description?: string, duration?: number) => string;
  showError: (title: string, description?: string, duration?: number) => string;
  showWarning: (title: string, description?: string, duration?: number) => string;
  showInfo: (title: string, description?: string, duration?: number) => string;
}

export const useToastStore = create<ToastStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get: () => ToastStore) => ({
        // Initial state
        toasts: [],

        // Actions
        addToast: (toast) => {
          const id = Math.random().toString(36).substr(2, 9);
          const newToast: ToastState = {
            id,
            duration: 5000,
            ...toast,
          };
          
          set((state) => {
            state.toasts.push(newToast);
          });

          // Auto-remove toast after duration
          if (newToast.duration && newToast.duration > 0) {
            setTimeout(() => {
              get().removeToast(id);
            }, newToast.duration);
          }

          return id;
        },

        removeToast: (id) => set((state) => {
          state.toasts = state.toasts.filter(toast => toast.id !== id);
        }),

        clearToasts: () => set((state) => {
          state.toasts = [];
        }),

        updateToast: (id, updates) => set((state) => {
          const index = state.toasts.findIndex(toast => toast.id === id);
          if (index !== -1) {
            Object.assign(state.toasts[index], updates);
          }
        }),

        // Helpers
        showSuccess: (title, description, duration) => {
          return get().addToast({
            type: 'success',
            title,
            description,
            duration,
          });
        },

        showError: (title, description, duration) => {
          return get().addToast({
            type: 'error',
            title,
            description,
            duration,
          });
        },

        showWarning: (title, description, duration) => {
          return get().addToast({
            type: 'warning',
            title,
            description,
            duration,
          });
        },

        showInfo: (title, description, duration) => {
          return get().addToast({
            type: 'info',
            title,
            description,
            duration,
          });
        },
      }))
    ),
    { name: 'ToastStore' }
  )
) as any;

// ============================================================================
// NAVIGATION STORE
// ============================================================================

interface NavigationStore {
  // State
  navigation: NavigationState;
  
  // Actions
  setCurrentPath: (path: string) => void;
  setBreadcrumbs: (breadcrumbs: Array<{ label: string; path: string }>) => void;
  addBreadcrumb: (breadcrumb: { label: string; path: string }) => void;
  removeBreadcrumb: (index: number) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveMenuItem: (itemId: string) => void;
  
  // Helpers
  goBack: () => void;
  canGoBack: () => boolean;
}

export const useNavigationStore = create<NavigationStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get: () => NavigationStore) => ({
          // Initial state
          navigation: {
            currentPath: '/',
            breadcrumbs: [],
            sidebarCollapsed: false,
          },

          // Actions
          setCurrentPath: (path) => set((state) => {
            state.navigation.previousPath = state.navigation.currentPath;
            state.navigation.currentPath = path;
          }),

          setBreadcrumbs: (breadcrumbs) => set((state) => {
            state.navigation.breadcrumbs = breadcrumbs;
          }),

          addBreadcrumb: (breadcrumb) => set((state) => {
            state.navigation.breadcrumbs.push(breadcrumb);
          }),

          removeBreadcrumb: (index) => set((state) => {
            state.navigation.breadcrumbs.splice(index, 1);
          }),

          toggleSidebar: () => set((state) => {
            state.navigation.sidebarCollapsed = !state.navigation.sidebarCollapsed;
          }),

          setSidebarCollapsed: (collapsed) => set((state) => {
            state.navigation.sidebarCollapsed = collapsed;
          }),

          setActiveMenuItem: (itemId) => set((state) => {
            state.navigation.activeMenuItem = itemId;
          }),

          // Helpers
          goBack: () => set((state) => {
            if (state.navigation.previousPath) {
              const currentPath = state.navigation.currentPath;
              state.navigation.currentPath = state.navigation.previousPath;
              state.navigation.previousPath = currentPath;
            }
          }),

          canGoBack: () => {
            return !!get().navigation.previousPath;
          },
        }))
      ),
      {
        name: 'navigation-store',
        partialize: (state) => ({
          navigation: {
            sidebarCollapsed: state.navigation.sidebarCollapsed,
            activeMenuItem: state.navigation.activeMenuItem,
          },
        }),
      }
    ),
    { name: 'NavigationStore' }
  )
) as any;

// ============================================================================
// THEME STORE
// ============================================================================

interface ThemeStore {
  // State
  theme: ThemeState;
  
  // Actions
  setTheme: (theme: Partial<ThemeState>) => void;
  setMode: (mode: 'light' | 'dark' | 'system') => void;
  setPrimaryColor: (color: string) => void;
  setFontSize: (size: 'sm' | 'md' | 'lg') => void;
  setCompactMode: (compact: boolean) => void;
  toggleMode: () => void;
  
  // Helpers
  isDark: () => boolean;
  getEffectiveMode: () => 'light' | 'dark';
}

export const useThemeStore = create<ThemeStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get: () => ThemeStore) => ({
          // Initial state
          theme: {
            mode: 'dark' as 'light' | 'dark' | 'system',
            primaryColor: '#3b82f6',
            fontSize: 'md',
            compactMode: false,
            sidebarCollapsed: false,
          } as ThemeState,

          // Actions
          setTheme: (theme) => set((state) => {
            Object.assign(state.theme, theme);
          }),

          setMode: (mode) => set((state) => {
            state.theme.mode = mode;
          }),

          setPrimaryColor: (color) => set((state) => {
            state.theme.primaryColor = color;
          }),

          setFontSize: (size) => set((state) => {
            state.theme.fontSize = size;
          }),

          setCompactMode: (compact) => set((state) => {
            state.theme.compactMode = compact;
          }),

          toggleMode: () => set((state) => {
            if (state.theme.mode === 'light') {
              state.theme.mode = 'dark';
            } else if (state.theme.mode === 'dark') {
              state.theme.mode = 'system';
            } else {
              state.theme.mode = 'light';
            }
          }),

          // Helpers
          isDark: () => {
            const { mode } = get().theme;
            if (mode === 'dark') return true;
            if (mode === 'light') return false;
            // System mode - check system preference
            if (typeof window !== 'undefined' && window.matchMedia) {
              try {
                return window.matchMedia('(prefers-color-scheme: dark)').matches;
              } catch (error) {
                // Fallback if matchMedia fails
                return false;
              }
            }
            // Default to false (light mode) during SSR
            return false;
          },

          getEffectiveMode: () => {
            const { mode } = get().theme;
            if (mode === 'system') {
              // Check if we're in a browser environment
              if (typeof window !== 'undefined' && window.matchMedia) {
                try {
                  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                } catch (error) {
                  // Fallback if matchMedia fails
                  return 'light';
                }
              }
              // Default to 'light' during SSR
              return 'light';
            }
            return mode;
          },
        }))
      ),
      {
        name: 'theme-store',
        partialize: (state) => ({
          theme: {
            mode: state.theme.mode,
            primaryColor: state.theme.primaryColor,
            fontSize: state.theme.fontSize,
            compactMode: state.theme.compactMode,
            sidebarCollapsed: state.theme.sidebarCollapsed,
          },
        }),
      }
    ),
    { name: 'ThemeStore' }
  )
) as any;

// ============================================================================
// PREFERENCES STORE
// ============================================================================

interface PreferencesStore {
  // State
  preferences: UserPreferences;
  
  // Actions
  setPreferences: (preferences: Partial<UserPreferences>) => void;
  setTheme: (theme: Partial<ThemeState>) => void;
  setNotifications: (notifications: Partial<UserPreferences['notifications']>) => void;
  setPrivacy: (privacy: Partial<UserPreferences['privacy']>) => void;
  setAI: (ai: Partial<UserPreferences['ai']>) => void;
  
  // Helpers
  resetPreferences: () => void;
  exportPreferences: () => string;
  importPreferences: (data: string) => boolean;
}

const defaultPreferences: UserPreferences = {
  theme: {
    mode: 'system',
    primaryColor: '#3b82f6',
    fontSize: 'md',
    compactMode: false,
    sidebarCollapsed: false,
  },
  notifications: {
    email: true,
    push: true,
    inApp: true,
  },
  privacy: {
    profileVisibility: 'spaces',
    showOnlineStatus: true,
  },
  ai: {
    defaultProfile: 'developer',
    autoSave: true,
    showSuggestions: true,
  },
};

export const usePreferencesStore = create<PreferencesStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get: () => PreferencesStore) => ({
          // Initial state
          preferences: defaultPreferences,

          // Actions
          setPreferences: (preferences) => set((state) => {
            Object.assign(state.preferences, preferences);
          }),

          setTheme: (theme) => set((state) => {
            Object.assign(state.preferences.theme, theme);
          }),

          setNotifications: (notifications) => set((state) => {
            Object.assign(state.preferences.notifications, notifications);
          }),

          setPrivacy: (privacy) => set((state) => {
            Object.assign(state.preferences.privacy, privacy);
          }),

          setAI: (ai) => set((state) => {
            Object.assign(state.preferences.ai, ai);
          }),

          // Helpers
          resetPreferences: () => set((state) => {
            state.preferences = { ...defaultPreferences };
          }),

          exportPreferences: () => {
            return JSON.stringify(get().preferences, null, 2);
          },

          importPreferences: (data) => {
            try {
              const preferences = JSON.parse(data);
              set((state) => {
                state.preferences = { ...defaultPreferences, ...preferences };
              });
              return true;
            } catch (error) {
              console.error('Failed to import preferences:', error);
              return false;
            }
          },
        }))
      ),
      {
        name: 'preferences-store',
        partialize: (state) => state.preferences,
      }
    ),
    { name: 'PreferencesStore' }
  )
) as any;

// ============================================================================
// NOTIFICATION STORE
// ============================================================================

interface NotificationStore {
  // State
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Helpers
  getUnreadNotifications: () => Notification[];
  getNotificationsByType: (type: Notification['type']) => Notification[];
}

export const useNotificationStore = create<NotificationStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get: () => NotificationStore) => ({
        // Initial state
        notifications: [],
        unreadCount: 0,

        // Actions
        setNotifications: (notifications) => set((state) => {
          state.notifications = notifications;
          state.unreadCount = notifications.filter(n => !n.read).length;
        }),

        addNotification: (notification) => set((state) => {
          const newNotification: Notification = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
            read: false,
            ...notification,
          };
          state.notifications.unshift(newNotification);
          state.unreadCount++;
        }),

        markAsRead: (id) => set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification && !notification.read) {
            notification.read = true;
            state.unreadCount--;
          }
        }),

        markAllAsRead: () => set((state) => {
          state.notifications.forEach(notification => {
            notification.read = true;
          });
          state.unreadCount = 0;
        }),

        removeNotification: (id) => set((state) => {
          const index = state.notifications.findIndex(n => n.id === id);
          if (index !== -1) {
            const notification = state.notifications[index];
            if (!notification.read) {
              state.unreadCount--;
            }
            state.notifications.splice(index, 1);
          }
        }),

        clearNotifications: () => set((state) => {
          state.notifications = [];
          state.unreadCount = 0;
        }),

        // Helpers
        getUnreadNotifications: () => {
          return get().notifications.filter(n => !n.read);
        },

        getNotificationsByType: (type) => {
          return get().notifications.filter(n => n.type === type);
        },
      }))
    ),
    { name: 'NotificationStore' }
  )
) as any;

// ============================================================================
// LOADING STORE
// ============================================================================

interface LoadingStore {
  // State
  loadingStates: Record<string, boolean>;
  globalLoading: boolean;
  
  // Actions
  setLoading: (key: string, loading: boolean) => void;
  setGlobalLoading: (loading: boolean) => void;
  clearLoading: (key: string) => void;
  clearAllLoading: () => void;
  
  // Helpers
  isLoading: (key: string) => boolean;
  isAnyLoading: () => boolean;
  getLoadingKeys: () => string[];
}

export const useLoadingStore = create<LoadingStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get: () => LoadingStore) => ({
        // Initial state
        loadingStates: {},
        globalLoading: false,

        // Actions
        setLoading: (key, loading) => set((state) => {
          if (loading) {
            state.loadingStates[key] = true;
          } else {
            delete state.loadingStates[key];
          }
        }),

        setGlobalLoading: (loading) => set((state) => {
          state.globalLoading = loading;
        }),

        clearLoading: (key) => set((state) => {
          delete state.loadingStates[key];
        }),

        clearAllLoading: () => set((state) => {
          state.loadingStates = {};
          state.globalLoading = false;
        }),

        // Helpers
        isLoading: (key) => {
          return get().loadingStates[key] || false;
        },

        isAnyLoading: () => {
          return get().globalLoading || Object.keys(get().loadingStates).length > 0;
        },

        getLoadingKeys: () => {
          return Object.keys(get().loadingStates);
        },
      }))
    ),
    { name: 'LoadingStore' }
  )
) as any;
