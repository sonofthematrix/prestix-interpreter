import { ZenStackClient } from '@zenstackhq/orm';
import { PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { AuthUser } from './auth';
import { schema } from '@/zenstack/schema';
import { getNormalizedDatabaseUrl } from './database-url';

// Determine SSL configuration based on environment
// Priority: 
// 1. POSTGRES_SSL=false explicitly disables SSL
// 2. POSTGRES_SSL=true explicitly enables SSL
// 3. Auto-detect based on DATABASE_URL (local = no SSL, remote = SSL)

function shouldUseSSL(): boolean {
  // Check explicit environment variable first
  const explicitSSL = process.env.POSTGRES_SSL;
  if (explicitSSL !== undefined) {
    return explicitSSL === 'true';
  }

  // CRITICAL: Use ORIGINAL DATABASE_URL for local detection (not normalized)
  // Normalized URL may have transformations that break pattern matching
  const dbUrl = process.env.DATABASE_URL || '';

  // Local database patterns (no SSL)
  const localPatterns = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'postgres',
    'db',
    '@localhost:',
    '@127.0.0.1:',
    '@0.0.0.0:',
    '@postgres:',
    '@db:',
    '//localhost:',
    '//127.0.0.1:',
    '//0.0.0.0:',
    '//postgres:',
    '//db:',
    'host=localhost',
    'host=127.0.0.1',
    'host=0.0.0.0',
    'host=postgres',
    'host=db',
  ];

  const isLocal = localPatterns.some(pattern => dbUrl.includes(pattern));

  // Debug logging in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DB] SSL Detection: ${isLocal ? 'Local DB (SSL disabled)' : 'Remote DB (SSL enabled)'}`);
    // Log sanitized URL for debugging
    const sanitizedUrl = dbUrl.replace(/:[^:@]*@/, ':***@');
    console.log(`[DB] DATABASE_URL pattern: ${sanitizedUrl}`);
    console.log(`[DB] Matched local patterns: ${localPatterns.filter(p => dbUrl.includes(p)).join(', ') || 'none'}`);
  }

  // Local = no SSL, Remote = use SSL
  return !isLocal;
}

const useSSL = shouldUseSSL();

// Use normalized URL to suppress pg-connection-string SSL warning (sslmode=require -> verify-full)
// Note: We don't extract sslmode here because dotenv may not have loaded yet
const dbUrl = getNormalizedDatabaseUrl(process.env.DATABASE_URL) || '';
const hasSSLMode = dbUrl.includes('sslmode=');
if (process.env.NODE_ENV !== 'production') {
  console.log(`[DB] SSL Config: ${useSSL ? 'Enabled' : 'Disabled'}`);
  console.log(`[DB] Connection string has SSL mode: ${hasSSLMode}`);
}

// Parse sslmode from connection string (e.g. sslmode=require, sslmode=disable)
function getSslModeFromUrl(url: string): string | null {
  // Check for ?sslmode= or &sslmode= in query string
  const queryMatch = url.match(/[?&]sslmode=([^&]+)/i);
  if (queryMatch) {
    return queryMatch[1].toLowerCase();
  }
  
  // Also check for sslmode= at the end without ? or & (some connection strings use this format)
  const directMatch = url.match(/sslmode=([^\s&?]+)/i);
  if (directMatch) {
    return directMatch[1].toLowerCase();
  }
  
  return null;
}

// Function to create pool config with proper SSL settings (exported for prisma.ts)
export function createPoolConfig() {
  // Extract sslmode from current DATABASE_URL at runtime (after dotenv loaded)
  const rawDbUrl = process.env.DATABASE_URL || '';
  const effectiveSslMode = (() => {
    const match = rawDbUrl.match(/sslmode=([^&\s]+)/i);
    return match ? match[1].toLowerCase() : null;
  })();
  
  const sslModeFromUrl = getSslModeFromUrl(dbUrl);

  // Get fresh normalized URL for this connection
  const currentDbUrl = getNormalizedDatabaseUrl(rawDbUrl) || rawDbUrl;
  
  // Strip sslmode from URL - we handle SSL via config to avoid conflicts
  let cleanUrl = currentDbUrl.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '').replace(/&$/, '');

  const config: any = {
    connectionString: cleanUrl,
    // Connection pool settings to reduce "Connection terminated unexpectedly" under load
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  // SSL decision: explicit sslmode in URL overrides auto-detect
  // sslmode=disable -> never use SSL (e.g. local PostgreSQL)
  // sslmode=require/prefer -> use SSL (e.g. Neon, Supabase)
  // no sslmode -> use auto-detect (local vs remote)
  // Local host + sslmode=require -> disable SSL (local PostgreSQL doesn't support SSL)
  const localPatterns = ['localhost', '127.0.0.1', '0.0.0.0', '@localhost:', '@127.0.0.1:', '//localhost:', '//127.0.0.1:'];
  const isLocalHost = localPatterns.some((p) => dbUrl.includes(p));

  let shouldUseSSLConfig: boolean;
  if (effectiveSslMode === 'disable') {
    shouldUseSSLConfig = false;
  } else if (isLocalHost) {
    // Local PostgreSQL typically doesn't support SSL - disable even if URL has sslmode=require
    shouldUseSSLConfig = false;
  } else if (effectiveSslMode === 'require' || effectiveSslMode === 'prefer' || effectiveSslMode === 'verify-full' || effectiveSslMode === 'verify-ca') {
    shouldUseSSLConfig = true;
  } else {
    // For remote databases without explicit sslmode, enable SSL
    // This catches Neon URLs that don't have ?sslmode= parameter
    shouldUseSSLConfig = useSSL;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DB] shouldUseSSLConfig: ${shouldUseSSLConfig}`);
  }

  if (shouldUseSSLConfig) {
    config.ssl = {
      rejectUnauthorized: false, // Allow self-signed certificates for cloud DBs
      // Note: Some cloud providers (like Neon) require explicit require: true
    };
  } else {
    // Explicitly disable SSL for local connections
    config.ssl = false;
  }

  return config;
}

// Create a new pool instance
function createPool() {
  return new Pool(createPoolConfig());
}

// Create base ZenStack client with PostgreSQL dialect (singleton)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let baseClient: any = null;

function getBaseClient() {
  if (!baseClient) {
    baseClient = new ZenStackClient(schema, {
      dialect: new PostgresDialect({
        pool: createPool(),
      }),
    });
  }
  return baseClient;
}

/**
 * Create ZenStack client with optional user context for access control.
 * Synchronous - use directly: const db = createClient(user);
 * Pass user for @@allow/@@deny rules; pass null for unauthenticated access.
 */
export const createClient = (user?: AuthUser | null) => {
  const client = getBaseClient();
  return client.$setAuth((user ?? undefined) as Record<string, unknown> | undefined);
};

// Export a singleton instance for production use
let dbInstance: any = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = createClient();
  }
  return dbInstance;
}

// Helper functions for common operations
export class TigerPalaceDB {
  private db: any;

  constructor(database?: any) {
    this.db = database;
  }

  // Initialize with database instance
  async initialize() {
    if (!this.db) {
      this.db = createClient();
    }
    return this;
  }

  // User operations
  async getUserWithPreferences(userId: string) {
    return await this.db.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        addresses: true,
        vendorProfile: true
      }
    });
  }

  // Theme operations
  async updateUserTheme(userId: string, themeData: any) {
    return await this.db.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        ...themeData
      },
      update: themeData
    });
  }

  // Product operations with computed fields
  async getProductsWithRatings(categoryId?: string) {
    const query = this.db.product.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: {
        category: true,
        vendor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        reviews: {
          select: {
            rating: true
          }
        }
      }
    });

    return query;
  }

  // AI interaction tracking
  async trackAIInteraction(userId: string, interaction: any) {
    return await this.db.aiInteraction.create({
      data: {
        userId,
        ...interaction
      }
    });
  }

  // Analytics
  async trackEvent(eventData: any) {
    return await this.db.analyticsEvent.create({
      data: eventData
    });
  }

  // Marketplace operations
  async getMarketplaceStats() {
    const [totalProducts, totalVendors, totalOrders, totalRevenue] = await Promise.all([
      this.db.product.count(),
      this.db.vendorProfile.count(),
      this.db.order.count(),
      this.db.order.aggregate({
        _sum: {
          totalAmount: true
        }
      })
    ]);

    return {
      totalProducts,
      totalVendors,
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0
    };
  }
}

// Export the database instance (will be initialized async)
export { dbInstance as db };

// Create and export a default database instance
let defaultDbInstance: any = null;
export const getDefaultDb = () => {
  if (!defaultDbInstance) {
    defaultDbInstance = createClient();
  }
  return defaultDbInstance;
};
