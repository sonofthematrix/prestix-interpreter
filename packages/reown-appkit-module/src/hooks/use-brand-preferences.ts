"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface BrandPreferences {
  customLogo: string | null;
  customTitle: string | null;
}

// Global cache to prevent multiple API calls across component instances
const preferencesCache = new Map<string, { data: BrandPreferences; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useBrandPreferences() {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState<BrandPreferences>({
    customLogo: null,
    customTitle: null,
  });
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false); // Prevent concurrent requests

  useEffect(() => {
    const loadPreferences = async () => {
      // If already loading, skip
      if (loadingRef.current) {
        return;
      }

      if (!session?.user?.id) {
        // Not logged in - use defaults (Tokenizin)
        setPreferences({ customLogo: null, customTitle: null });
        setLoading(false);
        return;
      }

      const userId = session.user.id;
      const cacheKey = `brand_prefs_${userId}`;

      // Check cache first
      const cached = preferencesCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setPreferences(cached.data);
        setLoading(false);
        return;
      }

      try {
        loadingRef.current = true;
        setLoading(true);
        
        const response = await fetch(`/api/users/${userId}/preferences`);
        
        if (response.ok) {
          const data = await response.json();
          const prefs = {
            customLogo: data.customLogo || null,
            customTitle: data.customTitle || null,
          };
          
          // Update cache
          preferencesCache.set(cacheKey, {
            data: prefs,
            timestamp: Date.now(),
          });
          
          setPreferences(prefs);
        } else {
          // Error fetching preferences, use defaults
          setPreferences({ customLogo: null, customTitle: null });
        }
      } catch (error) {
        console.error('Error loading brand preferences:', error);
        setPreferences({ customLogo: null, customTitle: null });
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    };

    loadPreferences();
  }, [session?.user?.id]);

  return {
    ...preferences,
    loading,
    appTitle: preferences.customTitle || 'Tokenizin',
    logoUrl: preferences.customLogo || null,
  };
}

// Export cache invalidation function for when preferences are updated
export function invalidateBrandPreferencesCache(userId?: string) {
  if (userId) {
    preferencesCache.delete(`brand_prefs_${userId}`);
  } else {
    preferencesCache.clear();
  }
}

