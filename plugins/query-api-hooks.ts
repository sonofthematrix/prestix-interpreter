import { createClient } from '../src/lib/db';

/**
 * Query API Hooks Plugin
 * Provides hooks for intercepting database queries with before/after callbacks
 * and argument modification capabilities
 */

export interface QueryHookContext {
  model: string;
  operation: string;
  args: any;
  proceed: (args?: any) => Promise<any>;
  userId?: string; // From session/auth context
  userRole?: string;
  timestamp: number;
}

export interface QueryHooks {
  onQuery?: (context: QueryHookContext) => Promise<any>;
  onMutation?: (context: QueryHookContext) => Promise<any>;
}

export interface ApiPluginConfig {
  id: string;
  onQuery?: (context: QueryHookContext) => Promise<any>;
  onMutation?: (context: QueryHookContext) => Promise<any>;
}

/**
 * Enhanced database client with query interception
 */
export class ApiEnhancedZenStackClient {
  private plugins: ApiPluginConfig[] = [];

  constructor(private client: ReturnType<typeof createClient>) {}

  /**
   * Add a plugin to intercept operations
   */
  $use(plugin: ApiPluginConfig) {
    this.plugins.push(plugin);
    return this.createEnhancedClient();
  }

  private createEnhancedClient() {
    const enhanced = { ...this.client } as any;

    // Enhance all model operations
    const models = ['user', 'product', 'order', 'review', 'blogPost', 'category', 'vendorProfile', 'aIInteraction'];

    models.forEach(model => {
      if (enhanced[model]) {
        const modelClient = enhanced[model];

        // Enhance all operations (find, create, update, delete, etc.)
        const operations = ['findUnique', 'findMany', 'findFirst', 'create', 'update', 'delete', 'upsert', 'createMany', 'updateMany', 'deleteMany'];

        operations.forEach(operation => {
          if (modelClient[operation]) {
            const originalMethod = modelClient[operation].bind(modelClient);

            modelClient[operation] = async (args: any) => {
              const context: QueryHookContext = {
                model,
                operation,
                args,
                proceed: originalMethod,
                userid: 'xronr0y2ule1my2abd0wfulc', // In real app, get from auth context
                userRole: 'admin',
                timestamp: Date.now()
              };

              // Run query hooks
              for (const plugin of this.plugins) {
                if (plugin.onQuery) {
                  return await plugin.onQuery(context);
                }
              }

              // If no hooks intercepted, proceed with original method
              return await originalMethod(args);
            };
          }
        });
      }
    });

    return enhanced;
  }
}

// Create enhanced client instance
export const apiEnhancedDb = new ApiEnhancedZenStackClient(createClient());

/**
 * Performance Monitoring Plugin - Logs query performance
 */
export const performanceMonitorPlugin: ApiPluginConfig = {
  id: 'performance-monitor',
  onQuery: async ({ model, operation, args, proceed }) => {
    const start = Date.now();
    try {
      const result = await proceed(args);
      const duration = Date.now() - start;

      console.log(`[PERFORMANCE] ${model}.${operation} took ${duration}ms`);

      // Log slow queries (>100ms)
      if (duration > 100) {
        console.warn(`[SLOW QUERY] ${model}.${operation} took ${duration}ms:`, args);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`[PERFORMANCE] ${model}.${operation} failed after ${duration}ms:`, error);
      throw error;
    }
  }
};

/**
 * Access Control Plugin - Enforces row-level security
 */
export const accessControlPlugin: ApiPluginConfig = {
  id: 'access-control',
  onQuery: async ({ model, operation, args, userId, userRole, proceed }) => {
    // Modify query args based on user permissions
    let modifiedArgs = { ...args };

    // Example: Users can only see their own orders
    if (model === 'order' && operation.startsWith('find')) {
      if (userRole !== 'admin') {
        modifiedArgs.where = {
          ...modifiedArgs.where,
          userId: userId // Only show user's own orders
        };
      }
    }

    // Example: Vendors can only see their own products
    if (model === 'product' && operation.startsWith('find')) {
      if (userRole === 'vendor') {
        modifiedArgs.where = {
          ...modifiedArgs.where,
          vendorId: userId
        };
      }
    }

    // Example: Hide sensitive fields for non-admin users
    if (model === 'user' && operation.startsWith('find') && userRole !== 'admin') {
      modifiedArgs.select = {
        ...modifiedArgs.select,
        password: false,
        emailVerified: false,
        // Include other public fields
        id: true,
        name: true,
        email: true,
        profileImageUrl: true
      };
    }

    console.log(`[ACCESS CONTROL] ${model}.${operation} - User: ${userId} (${userRole})`);
    return await proceed(modifiedArgs);
  }
};

/**
 * Data Transformation Plugin - Modifies query results
 */
export const dataTransformationPlugin: ApiPluginConfig = {
  id: 'data-transformation',
  onQuery: async ({ model, operation, args, proceed }) => {
    const result = await proceed(args);

    // Transform data after retrieval
    if (operation.startsWith('find') && result) {
      if (Array.isArray(result)) {
        // Transform array results
        return result.map(item => transformEntity(model, item));
      } else {
        // Transform single result
        return transformEntity(model, result);
      }
    }

    return result;
  }
};

function transformEntity(model: string, entity: any) {
  if (!entity) return entity;

  const transformed = { ...entity };

  // Add computed fields
  if (model === 'user') {
    transformed.displayName = entity.name || entity.email?.split('@')[0] || 'Anonymous';
    transformed.isVerified = !!entity.emailVerified;
  }

  if (model === 'product') {
    transformed.isInStock = entity.inventory > 0;
    transformed.discountedPrice = entity.price * 0.9; // 10% discount example
  }

  if (model === 'order') {
    transformed.statusColor = getStatusColor(entity.status);
    transformed.canCancel = ['PENDING', 'CONFIRMED'].includes(entity.status);
  }

  return transformed;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'PENDING': 'yellow',
    'CONFIRMED': 'blue',
    'SHIPPED': 'purple',
    'DELIVERED': 'green',
    'CANCELLED': 'red'
  };
  return colors[status] || 'gray';
}

/**
 * Caching Plugin - Caches frequent queries
 */
export const cachingPlugin: ApiPluginConfig = {
  id: 'caching',
  onQuery: async ({ model, operation, args, proceed }) => {
    // Simple in-memory cache (in production, use Redis)
    const cacheKey = `${model}:${operation}:${JSON.stringify(args)}`;

    // Only cache read operations
    if (operation.startsWith('find')) {
      const cached = getCache(cacheKey);
      if (cached) {
        console.log(`[CACHE] Hit for ${cacheKey}`);
        return cached;
      }
    }

    const result = await proceed(args);

    // Cache read results for 5 minutes
    if (operation.startsWith('find') && result) {
      setCache(cacheKey, result, 5 * 60 * 1000);
      console.log(`[CACHE] Set for ${cacheKey}`);
    }

    return result;
  }
};

// Simple in-memory cache implementation
const cache = new Map<string, { data: any; expires: number }>();

function getCache(key: string): any | null {
  const item = cache.get(key);
  if (!item) return null;

  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }

  return item.data;
}

function setCache(key: string, data: any, ttlMs: number): void {
  cache.set(key, {
    data,
    expires: Date.now() + ttlMs
  });
}

/**
 * API Logging Plugin - Logs API usage
 */
export const apiLoggingPlugin: ApiPluginConfig = {
  id: 'api-logging',
  onQuery: async ({ model, operation, args, userId, proceed }) => {
    const startTime = Date.now();
    try {
      const result = await proceed(args);

      // Log successful API calls
      console.log(`[API LOG] ${new Date().toISOString()} - User: ${userId} - ${model}.${operation} - Success - ${Date.now() - startTime}ms`);

      // Store API usage metrics (in real app, send to analytics service)
      await createClient().aIInteraction.create({
        data: {
          type: 'API_CALL',
          input: `${model}.${operation}`,
          output: 'success',
          cost: 0,
          tokensUsed: 0,
          duration: Date.now() - startTime,
          userId: userId || 'system',
          metadata: {
            model,
            operation,
            args: JSON.stringify(args).substring(0, 500) // Truncate for storage
          }
        }
      });

      return result;
    } catch (error) {
      // Log failed API calls
      console.error(`[API LOG] ${new Date().toISOString()} - User: ${userId} - ${model}.${operation} - Error: ${error} - ${Date.now() - startTime}ms`);

      throw error;
    }
  }
};

/**
 * Rate Limiting Plugin - Basic rate limiting
 */
export const rateLimitPlugin: ApiPluginConfig = {
  id: 'rate-limit',
  onQuery: async ({ model, operation, userId, proceed }) => {
    // Simple in-memory rate limiting (in production, use Redis)
    const key = `ratelimit:${userId || 'anonymous'}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 100; // 100 requests per minute

    const userRequests = getCache(`${key}:requests`) || [];
    const windowStart = now - windowMs;

    // Filter requests within current window
    const validRequests = userRequests.filter((timestamp: number) => timestamp > windowStart);

    if (validRequests.length >= maxRequests) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Add current request
    validRequests.push(now);
    setCache(`${key}:requests`, validRequests, windowMs);

    console.log(`[RATE LIMIT] ${userId || 'anonymous'}: ${validRequests.length}/${maxRequests} requests in window`);

    return await proceed();
  }
};

/**
 * Search Enhancement Plugin - Improves search functionality
 */
export const searchEnhancementPlugin: ApiPluginConfig = {
  id: 'search-enhancement',
  onQuery: async ({ model, operation, args, proceed }) => {
    if (operation === 'findMany' && args.where) {
      const enhancedArgs = { ...args };

      // Enhance search for products
      if (model === 'product' && args.where.name?.contains) {
        enhancedArgs.where.OR = [
          { name: { contains: args.where.name.contains, mode: 'insensitive' } },
          { description: { contains: args.where.name.contains, mode: 'insensitive' } },
          { tags: { hasSome: [args.where.name.contains] } },
          { category: { name: { contains: args.where.name.contains, mode: 'insensitive' } } }
        ];
        delete enhancedArgs.where.name;
      }

      // Enhance search for users
      if (model === 'user' && args.where.name?.contains) {
        enhancedArgs.where.OR = [
          { name: { contains: args.where.name.contains, mode: 'insensitive' } },
          { email: { contains: args.where.name.contains, mode: 'insensitive' } }
        ];
        delete enhancedArgs.where.name;
      }

      return await proceed(enhancedArgs);
    }

    return await proceed(args);
  }
};

// Export enhanced database client with plugins
export const dbWithApiPlugins = apiEnhancedDb
  .$use(performanceMonitorPlugin);
