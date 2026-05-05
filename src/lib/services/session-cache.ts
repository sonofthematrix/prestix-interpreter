/**
 * Session Cache Manager with Event-Based Invalidation
 *
 * Provides a centralized cache for SIWE sessions with automatic invalidation
 * based on events (signOut, network change, etc.) rather than just time-based expiry.
 *
 * Benefits:
 * - Immediate cache invalidation on auth state changes
 * - Prevents stale session data during rapid operations
 * - Type-safe event system
 * - Better performance with targeted invalidation
 */

import type { SIWESession } from '@reown/appkit-siwe';

interface CacheEntry {
  session: SIWESession;
  expiresAt: number;
  walletAddress: string;
}

type CacheEventType =
  | 'signOut'
  | 'networkChange'
  | 'walletDisconnect'
  | 'sessionExpired'
  | 'manualInvalidate';

interface CacheEvent {
  type: CacheEventType;
  walletAddress?: string;
  chainId?: number;
  timestamp: number;
}

type CacheEventListener = (event: CacheEvent) => void;

export class SessionCache {
  private cache: Map<string, CacheEntry> = new Map();
  private listeners: Set<CacheEventListener> = new Set();
  private readonly DEFAULT_TTL = 5000; // 5 seconds

  /**
   * Get session from cache
   */
  get(walletAddress: string): SIWESession | null {
    const key = this.getCacheKey(walletAddress);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      this.emitEvent({
        type: 'sessionExpired',
        walletAddress,
        timestamp: Date.now(),
      });
      return null;
    }

    return entry.session;
  }

  /**
   * Set session in cache
   */
  set(
    walletAddress: string,
    session: SIWESession,
    ttl: number = this.DEFAULT_TTL
  ): void {
    const key = this.getCacheKey(walletAddress);
    const expiresAt = Date.now() + ttl;

    this.cache.set(key, {
      session,
      expiresAt,
      walletAddress: walletAddress.toLowerCase(),
    });

    console.log(
      `💾 [SessionCache] Cached session for ${walletAddress.substring(0, 10)}... (TTL: ${ttl}ms)`
    );
  }

  /**
   * Invalidate session for specific wallet
   */
  invalidate(walletAddress: string, reason: CacheEventType = 'manualInvalidate'): void {
    const key = this.getCacheKey(walletAddress);
    const deleted = this.cache.delete(key);

    if (deleted) {
      console.log(
        `🧹 [SessionCache] Invalidated session for ${walletAddress.substring(0, 10)}... (reason: ${reason})`
      );

      this.emitEvent({
        type: reason,
        walletAddress,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Invalidate all sessions
   */
  invalidateAll(reason: CacheEventType = 'manualInvalidate'): void {
    const count = this.cache.size;
    this.cache.clear();

    if (count > 0) {
      console.log(`🧹 [SessionCache] Invalidated all ${count} sessions (reason: ${reason})`);

      this.emitEvent({
        type: reason,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Invalidate sessions for a specific network
   */
  invalidateByNetwork(chainId: number, reason: CacheEventType = 'networkChange'): void {
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.session.chainId === chainId) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.cache.delete(key);
    }

    if (toDelete.length > 0) {
      console.log(
        `🧹 [SessionCache] Invalidated ${toDelete.length} sessions for chain ${chainId} (reason: ${reason})`
      );

      this.emitEvent({
        type: reason,
        chainId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.cache.delete(key);
    }

    if (toDelete.length > 0) {
      console.log(`🧹 [SessionCache] Cleaned up ${toDelete.length} expired entries`);
    }

    return toDelete.length;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    total: number;
    expired: number;
    active: number;
  } {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const entry of this.cache.values()) {
      if (now >= entry.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      expired,
      active,
    };
  }

  /**
   * Subscribe to cache events
   */
  subscribe(listener: CacheEventListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit cache event to all listeners
   */
  private emitEvent(event: CacheEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('❌ [SessionCache] Error in event listener:', error);
      }
    }
  }

  /**
   * Get cache key for wallet address (normalized)
   */
  private getCacheKey(walletAddress: string): string {
    return `session_${walletAddress.toLowerCase()}`;
  }

  /**
   * Start automatic cleanup interval
   */
  startAutoCleanup(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }
}

// Export singleton instance
export const sessionCache = new SessionCache();

// Browser-side integration: Listen to AppKit events and invalidate cache
if (typeof window !== 'undefined') {
  // Listen for sign out events
  window.addEventListener('appkit-signout', () => {
    sessionCache.invalidateAll('signOut');
  });

  // Listen for network change events
  window.addEventListener('appkit-network-change', ((event: CustomEvent) => {
    const chainId = event.detail?.chainId;
    if (chainId) {
      sessionCache.invalidateByNetwork(chainId, 'networkChange');
    }
  }) as EventListener);

  // Listen for wallet disconnect events
  window.addEventListener('appkit-disconnect', ((event: CustomEvent) => {
    const walletAddress = event.detail?.address;
    if (walletAddress) {
      sessionCache.invalidate(walletAddress, 'walletDisconnect');
    }
  }) as EventListener);

  // Start automatic cleanup
  sessionCache.startAutoCleanup(60000); // Clean up every minute
}
