/**
 * ZenStack Client for Seeding Scripts
 *
 * IMPORTANT: This should ONLY be used in:
 * - Seeding scripts
 * - CLI tools
 * - System user lookup (getSystemUserId)
 *
 * NEVER use in:
 * - API routes (use createClient from lib/db.ts)
 * - Server actions
 * - React server components
 *
 * For runtime operations, use createClient() from lib/db.ts
 * which provides ZenStack's access control.
 *
 * Uses same pool config as db.ts to avoid "Connection terminated unexpectedly"
 * when both are used concurrently (e.g. navigation API + system user lookup).
 */

import { ZenStackClient } from '@zenstackhq/orm';
import { PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { schema } from '@/zenstack/schema';
import { createPoolConfig } from '@/lib/db';

// Lazy pool creation - only create when first accessed
// This allows dotenv to load before pool config is generated
let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool(createPoolConfig());
  }
  return _pool;
}

// Lazy client creation
let _db: any = null;
function getDb() {
  if (!_db) {
    _db = new ZenStackClient(schema, {
      dialect: new PostgresDialect({ pool: getPool() }),
    });
  }
  return _db;
}

// Export as getter that returns lazy-initialized client
export const db = new Proxy({} as any, {
  get(target, prop) {
    return getDb()[prop];
  }
});

// Export as 'prisma' for backward compatibility with existing seed scripts
export const prisma = db;
