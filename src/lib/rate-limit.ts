/**
 * Simple in-memory rate limiter for API routes.
 * Per-IP token bucket. Not suitable for multi-process deployments;
 * use @upstash/ratelimit or similar for production Vercel.
 */

type Bucket = {
  tokens: number;
  lastRefill: number;
};

const buckets = new Map<string, Bucket>();

/** Default: 30 requests per 60-second window per IP */
export function checkRateLimit(
  ip: string,
  maxRequests = 30,
  windowMs = 60000,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let bucket = buckets.get(ip);

  if (!bucket) {
    bucket = { tokens: maxRequests, lastRefill: now };
    buckets.set(ip, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  const refill = Math.floor((elapsed / windowMs) * maxRequests);
  if (refill > 0) {
    bucket.tokens = Math.min(maxRequests, bucket.tokens + refill);
    bucket.lastRefill = now;
  }

  const allowed = bucket.tokens > 0;
  if (allowed) {
    bucket.tokens--;
  }

  // Periodic cleanup of stale entries (every ~1000 checks)
  if (Math.random() < 0.001) {
    const cutoff = now - windowMs * 2;
    for (const [key, b] of buckets) {
      if (b.lastRefill < cutoff) {
        buckets.delete(key);
      }
    }
  }

  const resetAt = bucket.lastRefill + windowMs;
  return { allowed, remaining: bucket.tokens, resetAt };
}

/** Extract client IP from Next.js request headers */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
