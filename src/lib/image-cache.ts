/**
 * Image Caching Service
 * Provides optimized image loading with caching and lazy loading
 */

import { useProfileStore } from '../store/profile-store'; 
import { useEffect, useState, useCallback } from 'react';

const DEFAULT_IMAGE_TTL = 1000 * 60 * 30; // 30 minutes
const DEFAULT_PLACEHOLDER = '/images/property-placeholder.png';

/**
 * Validate and normalize image URL
 */
function validateImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') {
    console.warn('[Image Cache] Invalid URL:', url);
    return null;
  }

  const trimmedUrl = url.trim();
  
  // Reject invalid patterns
  if (trimmedUrl.startsWith('blob:') || trimmedUrl.startsWith('data:')) {
    return trimmedUrl; // These are fine as-is
  }

  // Allow absolute http/https and root-relative; reject anything else (e.g., wallet addresses)
  const isHttp = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://');
  const isRootRelative = trimmedUrl.startsWith('/');
  if (!isHttp && !isRootRelative) {
    console.warn('[Image Cache] Invalid URL format (non-http/non-relative):', url);
    return null;
  }

  return trimmedUrl;
}

/**
 * Check if URL is from a known blob storage service
 */
function isFromBlobStorage(url: string): boolean {
  const blobDomains = [
    'public.blob.vercel-storage.com',
    'blob.vercel-storage.com',
    'cdn.jsdelivr.net',
    'cloudinary.com',
    'images.unsplash.com',
  ];
  return blobDomains.some(domain => url.includes(domain));
}

/**
 * Get proxy URL for blob storage (server-side fetch)
 * Always use proxy for Vercel Blob Storage to avoid CORS issues
 */
function getProxyUrl(url: string): string {
  // Always use proxy for blob storage URLs to avoid CORS issues
  if (isFromBlobStorage(url)) {
    const encodedUrl = encodeURIComponent(url);
    return `/api/image-proxy?url=${encodedUrl}`;
  }
  return url;
}

/**
 * Fetch with timeout and error handling
 * Optimized for Vercel Blob Storage and external image services
 */
async function fetchWithTimeout(
  url: string,
  timeout: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const isBlob = isFromBlobStorage(url);
    
    // Always use proxy for blob storage URLs to avoid CORS issues
    // This works in both development and production
    const fetchUrl = isBlob ? getProxyUrl(url) : url;
    
    const fetchOptions: RequestInit = {
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
      },
    };

    // For Vercel Blob Storage through proxy, use same-origin
    if (isBlob) {
      fetchOptions.mode = 'same-origin'; // Proxy is same-origin
      fetchOptions.credentials = 'include'; // Include cookies for auth if needed
    }

    console.log(`[Image Cache] Fetching from ${fetchUrl === url ? 'direct' : 'proxy'}: ${url}`);
    
    const response = await fetch(fetchUrl, fetchOptions);

    // Handle redirects for blob storage
    if (response.redirected && response.ok) {
      return response;
    }

    if (!response.ok) {
      // Special handling for blob storage 403/401 errors
      if (isBlob && (response.status === 403 || response.status === 401)) {
        console.warn(`[Image Cache] Blob storage access denied (${response.status}) for: ${url}`);
        console.warn(`[Image Cache] This usually means the blob is expired, deleted, or access was revoked`);
        throw new Error(`Access denied: ${response.statusText} - Blob may be expired or deleted`);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    // Provide more specific error messages
    if (error instanceof TypeError) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Failed to fetch - Check CORS settings or network connectivity');
      } else if (error.message.includes('aborted')) {
        throw new Error('Request timeout: Image took too long to load');
      }
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check if URL is a local static asset (should be served directly by Next.js)
 */
function isLocalStaticAsset(url: string): boolean {
  // Local static assets start with / and are served directly by Next.js
  // No need to cache these - they're already optimized by Next.js
  return url.startsWith('/') && 
         !url.startsWith('/api/') && 
         !url.startsWith('/_next/');
}

/**
 * Fetch and cache an image with fallback
 */
export async function fetchAndCacheImage(
  url: string,
  ttl: number = DEFAULT_IMAGE_TTL
): Promise<string | null> {
  // Validate URL
  const validatedUrl = validateImageUrl(url);
  if (!validatedUrl) {
    console.warn('[Image Cache] Skipping invalid URL:', url);
    return DEFAULT_PLACEHOLDER;
  }

  // For local static assets, return them directly without caching
  // Next.js handles these efficiently and they don't need blob URLs
  if (isLocalStaticAsset(validatedUrl)) {
    return validatedUrl;
  }

  const store = useProfileStore.getState();
  
  // Check cache first
  const cached = store.getCachedImage(validatedUrl);
  if (cached?.objectUrl) {
    console.log(`[Image Cache Hit] ${validatedUrl}`);
    return cached.objectUrl;
  }
  
  console.log(`[Image Cache Miss] ${validatedUrl} - Fetching...`);
  
  try {
    const response = await fetchWithTimeout(validatedUrl, 10000);
    const blob = await response.blob();

    // Validate blob
    if (!blob || blob.size === 0) {
      throw new Error('Empty blob received');
    }

    // Cache the image (this creates the blob URL internally)
    store.cacheImage(validatedUrl, blob, ttl);
    
    // Get the cached image to return its objectUrl (don't create a new one!)
    const newlyCached = store.getCachedImage(validatedUrl);
    if (!newlyCached?.objectUrl) {
      throw new Error('Failed to create cached image URL');
    }
    
    console.log(`[Image Cache Success] ${validatedUrl}`);
    return newlyCached.objectUrl;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Image Cache Error] Failed to fetch ${validatedUrl}:`, errorMsg);
    
    // Log specific error types for debugging
    if (error instanceof TypeError && errorMsg.includes('Failed to fetch')) {
      console.warn('[Image Cache] Network error - CORS blocked or network unavailable');
    } else if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[Image Cache] Request timeout');
    }
    
    // Return placeholder instead of null for better UX
    return DEFAULT_PLACEHOLDER;
  }
}

/**
 * Hook for cached image loading with error recovery
 */
export function useCachedImage(url: string | null | undefined, ttl?: number) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!url) {
      setImageUrl(DEFAULT_PLACEHOLDER);
      setLoading(false);
      return;
    }
    
    let cancelled = false;
    
    const loadImage = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Validate URL first
        const validatedUrl = validateImageUrl(url);
        if (!validatedUrl) {
          if (!cancelled) {
            setImageUrl(DEFAULT_PLACEHOLDER);
            setError('Invalid image URL');
            setLoading(false);
          }
          return;
        }

        // Use getState() to avoid dependency on store object
        const store = useProfileStore.getState();
        
        // Check cache first
        const cached = store.getCachedImage(validatedUrl);
        if (cached?.objectUrl) {
          if (!cancelled) {
            setImageUrl(cached.objectUrl);
            setLoading(false);
          }
          return;
        }
        
        // Fetch and cache with fallback
        const objectUrl = await fetchAndCacheImage(validatedUrl, ttl);
        if (!cancelled) {
          setImageUrl(objectUrl || DEFAULT_PLACEHOLDER);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load image';
          console.error('[Image Cache Hook Error]', errorMessage);
          setError(errorMessage);
          setImageUrl(DEFAULT_PLACEHOLDER);
          setLoading(false);
        }
      }
    };
    
    loadImage();
    
    // Cleanup function to prevent state updates if component unmounts
    return () => {
      cancelled = true;
    };
  }, [url, ttl]); // Removed 'store' from dependencies - we use getState() instead
  
  return { imageUrl, loading, error };
}

/**
 * Hook for preloading images (for smooth navigation)
 */
export function usePreloadImages() {
  return useCallback(async (urls: string[]) => {
    const validUrls = urls.filter((url) => validateImageUrl(url) !== null);
    const promises = validUrls.map((url) => fetchAndCacheImage(url));
    await Promise.allSettled(promises);
  }, []);
}

/**
 * Preload images in the background
 */
export async function preloadImages(urls: string[]): Promise<void> {
  const validUrls = urls.filter((url) => validateImageUrl(url) !== null);
  const promises = validUrls.map((url) => fetchAndCacheImage(url));
  await Promise.allSettled(promises);
}

/**
 * Clear image cache for specific URL
 */
export function clearImageCache(url?: string): void {
  const store = useProfileStore.getState();
  if (url) {
    const cached = store.getCachedImage(url);
    if (cached?.objectUrl) {
      URL.revokeObjectURL(cached.objectUrl);
    }
    // Remove from cache
    store.imageCache.delete(url);
  } else {
    store.clearImageCache();
  }
}

/**
 * Get image from cache (synchronous)
 */
export function getCachedImageSync(url: string): string | null {
  const store = useProfileStore.getState();
  const validatedUrl = validateImageUrl(url);
  if (!validatedUrl) {
    return DEFAULT_PLACEHOLDER;
  }
  const cached = store.getCachedImage(validatedUrl);
  return cached?.objectUrl || null;
}

