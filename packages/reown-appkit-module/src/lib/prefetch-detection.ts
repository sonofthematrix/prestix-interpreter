/**
 * Prefetch Detection Utility
 * 
 * Detects Next.js RSC prefetch requests to prevent 500 errors during prefetch
 * when authentication checks fail due to missing request context.
 */

import { headers } from 'next/headers';

/**
 * Detects if the current request is a Next.js prefetch request
 * 
 * During prefetch, Next.js renders pages server-side without full request context,
 * which can cause authentication checks to fail and trigger redirects that result in 500 errors.
 * 
 * @returns true if this is a prefetch request, false otherwise
 */
export async function isPrefetchRequest(): Promise<boolean> {
  try {
    const headersList = await headers();
    const purpose = headersList.get('purpose') || headersList.get('x-purpose');
    return purpose === 'prefetch' || purpose === 'prefetch-render';
  } catch (error) {
    // If accessing headers fails (common during RSC prefetch), treat as prefetch
    // This is safer than throwing errors which would cause 500 responses
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isPrefetchError = 
      errorMessage.includes('headers') || 
      errorMessage.includes('cookies') || 
      errorMessage.includes('request') ||
      errorMessage.includes('NEXT_REDIRECT') ||
      errorMessage.includes('dynamic') ||
      errorMessage.includes('context');
    
    // During RSC prefetch, headers() often fails, so treat as prefetch
    // This prevents 500 errors from breaking the page
    if (isPrefetchError) {
      return true;
    }
    
    // For any other error accessing headers, assume it's a prefetch to be safe
    // This prevents 500 errors from breaking the page during edge cases
    console.warn('⚠️ [isPrefetchRequest] Unexpected error accessing headers, treating as prefetch:', {
      error: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });
    return true;
  }
}

