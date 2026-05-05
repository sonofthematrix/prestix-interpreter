/**
 * Profile Store - Zustand State Management
 * Centralized state management for profile data with caching
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ProfileUser {
  id: string;
  name: string | null;
  email: string | null;
  profileImageUrl: string | null;
  role: string;
  status: string;
  // ... other user fields
}

interface CachedImage {
  url: string;
  blob?: Blob;
  objectUrl?: string;
  timestamp: number;
  expiresAt: number;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
}

interface ProfileState {
  // User data
  user: ProfileUser | null;
  userVersion: string;
  
  // Image cache
  imageCache: Map<string, CachedImage>;
  
  // Data cache by endpoint
  dataCache: Map<string, CachedData<any>>;
  
  // Loading states
  loading: Map<string, boolean>;
  
  // Actions
  setUser: (user: ProfileUser, version?: string) => void;
  clearUser: () => void;
  
  // Image cache actions
  cacheImage: (url: string, blob: Blob, ttl?: number) => void;
  getCachedImage: (url: string) => CachedImage | null;
  clearImageCache: () => void;
  cleanExpiredImages: () => void;
  
  // Data cache actions
  cacheData: <T>(key: string, data: T, version: string, ttl?: number) => void;
  getCachedData: <T>(key: string) => CachedData<T> | null;
  invalidateCache: (key?: string) => void;
  clearDataCache: () => void;
  cleanExpiredData: () => void;
  
  // Loading state actions
  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key: string) => boolean;
  
  // Clear all
  clearAll: () => void;
}

const DEFAULT_IMAGE_TTL = 1000 * 60 * 30; // 30 minutes
const DEFAULT_DATA_TTL = 1000 * 60 * 5; // 5 minutes

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      userVersion: '1.0',
      imageCache: new Map(),
      dataCache: new Map(),
      loading: new Map(),
      
      // User actions
      setUser: (user, version = '1.0') => 
        set({ user, userVersion: version }),
      
      clearUser: () => 
        set({ user: null, userVersion: '1.0' }),
      
      // Image cache actions
      cacheImage: (url, blob, ttl = DEFAULT_IMAGE_TTL) => {
        const now = Date.now();
        const objectUrl = URL.createObjectURL(blob);
        const cached: CachedImage = {
          url,
          blob,
          objectUrl,
          timestamp: now,
          expiresAt: now + ttl,
        };
        
        set((state) => {
          const newCache = new Map(state.imageCache);
          // Revoke old object URL if exists
          const old = newCache.get(url);
          if (old?.objectUrl) {
            URL.revokeObjectURL(old.objectUrl);
          }
          newCache.set(url, cached);
          return { imageCache: newCache };
        });
      },
      
      getCachedImage: (url) => {
        const cached = get().imageCache.get(url);
        if (!cached) return null;
        
        // Check if expired
        if (Date.now() > cached.expiresAt) {
          // Clean up expired image
          if (cached.objectUrl) {
            URL.revokeObjectURL(cached.objectUrl);
          }
          set((state) => {
            const newCache = new Map(state.imageCache);
            newCache.delete(url);
            return { imageCache: newCache };
          });
          return null;
        }
        
        return cached;
      },
      
      clearImageCache: () => {
        const cache = get().imageCache;
        // Revoke all object URLs
        cache.forEach((cached) => {
          if (cached.objectUrl) {
            URL.revokeObjectURL(cached.objectUrl);
          }
        });
        set({ imageCache: new Map() });
      },
      
      cleanExpiredImages: () => {
        const now = Date.now();
        set((state) => {
          const newCache = new Map(state.imageCache);
          newCache.forEach((cached, url) => {
            if (now > cached.expiresAt) {
              if (cached.objectUrl) {
                URL.revokeObjectURL(cached.objectUrl);
              }
              newCache.delete(url);
            }
          });
          return { imageCache: newCache };
        });
      },
      
      // Data cache actions
      cacheData: <T,>(key: string, data: T, version: string, ttl = DEFAULT_DATA_TTL) => {
        const now = Date.now();
        const cached: CachedData<T> = {
          data,
          timestamp: now,
          expiresAt: now + ttl,
          version,
        };
        
        set((state) => {
          const newCache = new Map(state.dataCache);
          newCache.set(key, cached);
          return { dataCache: newCache };
        });
      },
      
      getCachedData: <T,>(key: string): CachedData<T> | null => {
        const cached = get().dataCache.get(key);
        if (!cached) return null;
        
        // Check if expired
        if (Date.now() > cached.expiresAt) {
          set((state) => {
            const newCache = new Map(state.dataCache);
            newCache.delete(key);
            return { dataCache: newCache };
          });
          return null;
        }
        
        return cached as CachedData<T>;
      },
      
      invalidateCache: (key?: string) => {
        if (key) {
          set((state) => {
            const newCache = new Map(state.dataCache);
            newCache.delete(key);
            return { dataCache: newCache };
          });
        } else {
          set({ dataCache: new Map() });
        }
      },
      
      clearDataCache: () => 
        set({ dataCache: new Map() }),
      
      cleanExpiredData: () => {
        const now = Date.now();
        set((state) => {
          const newCache = new Map(state.dataCache);
          newCache.forEach((cached, key) => {
            if (now > cached.expiresAt) {
              newCache.delete(key);
            }
          });
          return { dataCache: newCache };
        });
      },
      
      // Loading state actions
      setLoading: (key, loading) => 
        set((state) => {
          const newLoading = new Map(state.loading);
          newLoading.set(key, loading);
          return { loading: newLoading };
        }),
      
      isLoading: (key) => 
        get().loading.get(key) || false,
      
      // Clear all
      clearAll: () => {
        // Revoke all object URLs
        const cache = get().imageCache;
        cache.forEach((cached) => {
          if (cached.objectUrl) {
            URL.revokeObjectURL(cached.objectUrl);
          }
        });
        
        set({
          user: null,
          userVersion: '1.0',
          imageCache: new Map(),
          dataCache: new Map(),
          loading: new Map(),
        });
      },
    }),
    {
      name: 'profile-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist user data, not caches
      partialize: (state) => ({
        user: state.user,
        userVersion: state.userVersion,
      }),
    }
  )
);

// Cleanup expired cache on mount
if (typeof window !== 'undefined') {
  const store = useProfileStore.getState();
  store.cleanExpiredImages();
  store.cleanExpiredData();
  
  // Set up periodic cleanup (every 5 minutes)
  setInterval(() => {
    const store = useProfileStore.getState();
    store.cleanExpiredImages();
    store.cleanExpiredData();
  }, 1000 * 60 * 5);
}

