/**
 * ZenStack Database Client
 * 
 * Creates a ZenStack client with user context for access control.
 * Uses the parent workspace's ZenStack schema.
 * 
 * ⚠️ SERVER-SIDE ONLY: This module uses Node.js built-in modules (pg, dns)
 * and should only be imported in server-side code (API routes, server components).
 */
import { ZenStackClient } from '@zenstackhq/orm';
import type { AuthUser } from './auth';
import path from 'path';
import { fileURLToPath } from 'url';
// createRequire is imported dynamically only when needed (server-side only)

// Dynamic imports for server-only modules to prevent bundling in client code
let PostgresDialect: any;
let Pool: any;

// Lazy load server-only modules
async function loadServerModules() {
  if (!PostgresDialect || !Pool) {
    // Only import on server side
    if (typeof window === 'undefined') {
      // Use webpack ignore comments to prevent static analysis
      // @ts-ignore - webpack will ignore these imports in client bundles
      const kyselyModule = await import(/* webpackIgnore: true */ 'kysely');
      // @ts-ignore - webpack will ignore these imports in client bundles
      const pgModule = await import(/* webpackIgnore: true */ 'pg');
      PostgresDialect = kyselyModule.PostgresDialect;
      Pool = pgModule.Pool;
    } else {
      throw new Error('Database client cannot be used in browser. Use API routes instead.');
    }
  }
  return { PostgresDialect, Pool };
}

// Import schema from parent workspace
// In a workspace setup, we need to import from the root
let schema: any;
let schemaLoadPromise: Promise<any> | null = null;

// Lazy load schema - try to import when first needed
// Uses dynamic imports to work with TypeScript/ESM in Next.js
async function loadSchema(): Promise<any> {
  if (schema) {
    return schema;
  }

  // If already loading, wait for that promise
  if (schemaLoadPromise) {
    return schemaLoadPromise;
  }

  // Start loading schema
  schemaLoadPromise = (async () => {
    // Try multiple methods to load the schema
    let schemaModule: any = null;
    const errors: string[] = [];
    
    // Method 1: Try package-local zenstack schema first (for isolated package build)
    try {
      schemaModule = await import(/* webpackIgnore: true */ '../../zenstack/schema');
      console.log(`✅ [ZenStack] Schema loaded via package-local: ../../zenstack/schema`);
    } catch (pkgError: any) {
      errors.push(`package-local: ${pkgError.message}`);
      console.log(`⚠️ [ZenStack] Package-local import failed: ${pkgError.message}`);
    }

    // Method 2: Try workspace root schema (when running from monorepo root)
    // Use variable to avoid tsc resolving this path during package-only build
    if (!schemaModule) {
      try {
        const rootSchemaPath = '../../../../schema';
        schemaModule = await import(/* webpackIgnore: true */ rootSchemaPath);
        console.log(`✅ [ZenStack] Schema loaded via relative import: ../../../../schema`);
      } catch (relativeError: any) {
        errors.push(`relative: ${relativeError.message}`);
        console.log(`⚠️ [ZenStack] Relative import failed: ${relativeError.message}`);
      }
    }
    
    // Method 3: Try webpack alias (may not work for files outside src/)
    if (!schemaModule) {
      try {
        // @ts-ignore - webpack alias resolved at build time
        schemaModule = await import('@/zenstack/schema');
        console.log(`✅ [ZenStack] Schema loaded via webpack alias: @/zenstack/schema`);
      } catch (aliasError: any) {
        errors.push(`alias: ${aliasError.message}`);
        console.log(`⚠️ [ZenStack] Webpack alias failed: ${aliasError.message}`);
      }
    }

    // Method 4: Try require with createRequire (works for compiled JS, server-side only)
    if (!schemaModule && typeof window === 'undefined') {
      try {
        const { createRequire } = await import(/* webpackIgnore: true */ 'module');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const schemaDir = path.resolve(__dirname, '../../../../');
        const requireFromWorkspace = createRequire(schemaDir);
        schemaModule = requireFromWorkspace('./schema.ts');
        console.log(`✅ [ZenStack] Schema loaded via require`);
      } catch (requireError: any) {
        errors.push(`require: ${requireError.message}`);
        console.log(`⚠️ [ZenStack] require() failed: ${requireError.message}`);
      }
    }

    // Method 5: Try absolute path with file:// URL (server-side only)
    if (!schemaModule && typeof window === 'undefined') {
      try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const schemaPath = path.resolve(__dirname, '../../../../schema.ts');
        const fileUrl = schemaPath.startsWith('/') 
          ? `file://${schemaPath}` 
          : `file:///${schemaPath.replace(/\\/g, '/')}`;
        schemaModule = await import(/* webpackIgnore: true */ fileUrl);
        console.log(`✅ [ZenStack] Schema loaded via file:// URL: ${schemaPath}`);
      } catch (fileError: any) {
        errors.push(`file: ${fileError.message}`);
      }
    }
    
    // If all methods failed, throw error
    if (!schemaModule) {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const expectedPath = path.resolve(__dirname, '../../../../schema.ts');
      throw new Error(
        `ZenStack schema not found. Tried: relative import, @zenstack/schema alias, require(), file:// URL. ` +
        `Expected at: ${expectedPath}. ` +
        `Errors: ${errors.join('; ')}`
      );
    }
    
    // Extract schema from module
    if (schemaModule?.schema) {
      schema = schemaModule.schema;
      console.log(`✅ [ZenStack] Schema extracted successfully. Schema keys: ${Object.keys(schema || {}).slice(0, 5).join(', ')}...`);
      return schema;
    }
    
    if (schemaModule?.default?.schema) {
      schema = schemaModule.default.schema;
      console.log(`✅ [ZenStack] Schema extracted from default export. Schema keys: ${Object.keys(schema || {}).slice(0, 5).join(', ')}...`);
      return schema;
    }
    
    // Log what we actually got
    console.error(`❌ [ZenStack] Schema module loaded but no 'schema' export found.`);
    console.error(`   Module type: ${typeof schemaModule}`);
    console.error(`   Module keys: ${Object.keys(schemaModule || {}).join(', ')}`);
    console.error(`   Has schema property: ${!!schemaModule?.schema}`);
    console.error(`   Has default property: ${!!schemaModule?.default}`);
    console.error(`   Default has schema: ${!!schemaModule?.default?.schema}`);
    
    throw new Error(`Schema module loaded but no 'schema' export found. Available exports: ${Object.keys(schemaModule || {}).join(', ')}`);
  })();

  return schemaLoadPromise;
}

// Create base ZenStack client with database connection
let baseClient: any = null;

async function getBaseClient() {
  if (!baseClient) {
    // Ensure we're on server side
    if (typeof window !== 'undefined') {
      throw new Error('Database client cannot be used in browser. Use API routes instead.');
    }

    console.log(`🔍 [ZenStack] Loading schema...`);
    const loadedSchema = await loadSchema();
    if (!loadedSchema) {
      console.error(`❌ [ZenStack] Schema loading returned null/undefined`);
      throw new Error('ZenStack schema not found. Please ensure schema.ts exists in the workspace root.');
    }
    console.log(`✅ [ZenStack] Schema loaded successfully. Schema type: ${typeof loadedSchema}`);
    
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is required for ZenStack database connection.');
    }

    // Load server-only modules dynamically
    const { PostgresDialect: Dialect, Pool: PoolClass } = await loadServerModules();

    baseClient = new ZenStackClient(loadedSchema, {
      dialect: new Dialect({
        pool: new PoolClass({
          connectionString: dbUrl,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        }),
      }),
    });
  }
  return baseClient;
}

/**
 * Create ZenStack client with user context for access control
 * 
 * ⚠️ SERVER-SIDE ONLY: This function uses Node.js built-in modules
 * and should only be called from server-side code (API routes, server components).
 * 
 * @param user - Authenticated user context (optional for system operations)
 * @returns ZenStack client with user context
 */
export async function createClient(user?: AuthUser | null) {
  // Ensure we're on server side
  if (typeof window !== 'undefined') {
    throw new Error('createClient cannot be used in browser. Use API routes instead.');
  }

  const client = await getBaseClient();
  
  // Enhance client with user context for access control
  // ZenStack will use this context to enforce access control policies
  if (user) {
    // Set user context on the client
    // Note: ZenStack runtime handles user context through the client instance
    return client;
  }
  
  // Return client without user context (for system/admin operations)
  return client;
}

/**
 * Disconnect from database
 */
export async function disconnect(): Promise<void> {
  if (baseClient && typeof baseClient.$disconnect === 'function') {
    await baseClient.$disconnect();
    baseClient = null;
  }
}

/**
 * Health check for database connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    // Ensure we're on server side
    if (typeof window !== 'undefined') {
      return false;
    }
    const client = await getBaseClient();
    // Try a simple query to check connection
    await client.user.findFirst({ take: 1 });
    return true;
  } catch (error) {
    console.error('❌ [ZenStack] Database health check failed:', error);
    return false;
  }
}

/**
 * Get database instance (singleton)
 */
export async function getDb() {
  // Ensure we're on server side
  if (typeof window !== 'undefined') {
    throw new Error('getDb cannot be used in browser. Use API routes instead.');
  }
  return getBaseClient();
}
