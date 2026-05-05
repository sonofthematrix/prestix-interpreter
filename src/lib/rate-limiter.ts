/**
 * Rate Limiter for API endpoints
 *
 * Prevents abuse by limiting the number of requests from a single identifier
 * within a time window. Uses in-memory storage with automatic cleanup.
 *
 * Usage:
 * ```typescript
 * const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 5 });
 *
 * if (!limiter.checkLimit(identifier)) {
 *   return res.status(429).json({ error: 'Too many requests' });
 * }
 * ```
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the window
}

interface RateLimitRecord {
  count: number;
  resetAt: number; // Timestamp when the window resets
}

export class RateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;

    // Start cleanup interval to remove expired records (runs every minute)
    this.startCleanup();
  }

  /**
   * Check if the request should be rate limited
   * @param identifier - Unique identifier (e.g., IP address, wallet address)
   * @returns true if request is allowed, false if rate limited
   */
  checkLimit(identifier: string): boolean {
    const now = Date.now();
    const record = this.records.get(identifier);

    // No record exists - allow and create new record
    if (!record) {
      this.records.set(identifier, {
        count: 1,
        resetAt: now + this.config.windowMs,
      });
      return true;
    }

    // Window has expired - reset counter
    if (now >= record.resetAt) {
      this.records.set(identifier, {
        count: 1,
        resetAt: now + this.config.windowMs,
      });
      return true;
    }

    // Within window - check if limit exceeded
    if (record.count >= this.config.maxRequests) {
      return false; // Rate limited
    }

    // Increment counter
    record.count++;
    return true;
  }

  /**
   * Get remaining requests for an identifier
   */
  getRemaining(identifier: string): number {
    const record = this.records.get(identifier);
    if (!record || Date.now() >= record.resetAt) {
      return this.config.maxRequests;
    }
    return Math.max(0, this.config.maxRequests - record.count);
  }

  /**
   * Get time until reset for an identifier (in milliseconds)
   */
  getResetTime(identifier: string): number {
    const record = this.records.get(identifier);
    if (!record) {
      return 0;
    }
    return Math.max(0, record.resetAt - Date.now());
  }

  /**
   * Reset rate limit for a specific identifier
   */
  reset(identifier: string): void {
    this.records.delete(identifier);
  }

  /**
   * Clear all rate limit records
   */
  clearAll(): void {
    this.records.clear();
  }

  /**
   * Start automatic cleanup of expired records
   */
  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];

      // Find expired records
      for (const [key, record] of this.records.entries()) {
        if (now >= record.resetAt) {
          expiredKeys.push(key);
        }
      }

      // Remove expired records
      for (const key of expiredKeys) {
        this.records.delete(key);
      }

      if (expiredKeys.length > 0) {
        console.log(`🧹 [RateLimiter] Cleaned up ${expiredKeys.length} expired records`);
      }
    }, 60000); // 1 minute
  }

  /**
   * Stop the cleanup interval (call when shutting down)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get current statistics
   */
  getStats(): {
    totalRecords: number;
    activeRecords: number;
  } {
    const now = Date.now();
    let activeRecords = 0;

    for (const record of this.records.values()) {
      if (now < record.resetAt) {
        activeRecords++;
      }
    }

    return {
      totalRecords: this.records.size,
      activeRecords,
    };
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  // Signature verification: 5 attempts per minute per IP/wallet
  signatureVerification: new RateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 5,
  }),

  // Nonce generation: 10 requests per minute per IP
  nonceGeneration: new RateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 10,
  }),

  // Session creation: 10 requests per minute per IP
  sessionCreation: new RateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 10,
  }),

  // Generic API: 60 requests per minute per IP
  genericApi: new RateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 60,
  }),
};

/**
 * Helper function to get client identifier from request
 * Uses IP address as primary identifier, falls back to user agent
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers (works with proxies like Vercel, Cloudflare)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list, take the first IP
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to user agent (less reliable but better than nothing)
  const userAgent = request.headers.get('user-agent');
  if (userAgent) {
    // Hash the user agent to avoid storing full strings
    return `ua_${hashString(userAgent)}`;
  }

  // Last resort: use a generic identifier
  return 'unknown';
}

/**
 * Simple string hash function for user agent anonymization
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
