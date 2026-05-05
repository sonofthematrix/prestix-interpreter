/**
 * Database URL normalization utilities
 * 
 * Normalizes PostgreSQL connection strings to suppress SSL warnings from pg-connection-string.
 * Converts sslmode=require|prefer|verify-ca to sslmode=verify-full to match pg v9+ expectations.
 */

/**
 * Normalize database URL by converting SSL modes to verify-full
 * This suppresses the pg-connection-string warning about SSL mode aliases
 * 
 * @param url - Database connection URL (can be undefined/null)
 * @returns Normalized URL with sslmode=verify-full, or original URL if no SSL mode present
 */
export function getNormalizedDatabaseUrl(url: string | undefined | null): string | null {
  if (!url) {
    return null;
  }

  // Check for sslmode parameter
  const sslModePattern = /([?&])sslmode=([^&]+)/i;
  const match = url.match(sslModePattern);

  if (!match) {
    // No sslmode parameter - return as-is
    return url;
  }

  const sslMode = match[2].toLowerCase();

  // Convert aliases to verify-full (pg v9+ standard)
  if (sslMode === 'require' || sslMode === 'prefer' || sslMode === 'verify-ca') {
    return url.replace(sslModePattern, `$1sslmode=verify-full`);
  }

  // Already verify-full or verify-full, or disable - return as-is
  return url;
}

/**
 * Normalize DATABASE_URL environment variable
 * Call this at application startup to normalize the env var
 */
export function normalizeDatabaseUrlEnv(): void {
  if (process.env.DATABASE_URL) {
    const normalized = getNormalizedDatabaseUrl(process.env.DATABASE_URL);
    if (normalized && normalized !== process.env.DATABASE_URL) {
      process.env.DATABASE_URL = normalized;
      if (process.env.NODE_ENV !== 'production') {
        console.log('[database-url] Normalized DATABASE_URL SSL mode to verify-full');
      }
    }
  }
}
