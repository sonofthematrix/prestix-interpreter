/**
 * System User Configuration
 *
 * This module provides the system user ID for administrative operations.
 * The system user must exist in the database (created via scripts/setup-system-user.ts).
 *
 * IMPORTANT: Run `bun run setup:system-user` before using system operations.
 *
 * Resilience: Retries on connection errors and falls back to 'system' ID when
 * DB lookup fails (e.g. "Connection terminated unexpectedly" under load).
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { createPoolConfig } from '@/lib/db';

// System user email (must match scripts/setup-system-user.ts)
export const SYSTEM_USER_EMAIL = 'support@tokenizin.com';

// Fallback ID when DB lookup fails (matches setup-system-user.ts)
const FALLBACK_SYSTEM_USER_ID = 'system';

// System user ID (will be fetched from database or use fallback)
let cachedSystemUserId: string | null = null;

// Create a direct database pool for system user lookup (bypasses ZenStack access control)
let _systemUserPool: Pool | null = null;
function getSystemUserPool(): Pool {
  if (!_systemUserPool) {
    _systemUserPool = new Pool(createPoolConfig());
  }
  return _systemUserPool;
}

function isConnectionError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const causeMsg =
    error instanceof Error && (error as any).cause instanceof Error
      ? (error as any).cause.message
      : '';
  const fullMsg = `${msg} ${causeMsg}`;
  return (
    fullMsg.includes('Connection terminated') ||
    fullMsg.includes('ECONNRESET') ||
    fullMsg.includes('ETIMEDOUT') ||
    fullMsg.includes('Connection refused') ||
    fullMsg.includes('connection')
  );
}

/**
 * Get the system user ID from the database
 * Uses prisma (direct client) to bypass ZenStack access policies for lookup
 * Caches the result for performance.
 * Retries on connection errors; falls back to 'system' when DB unavailable.
 */
export async function getSystemUserId(): Promise<string> {
  if (cachedSystemUserId) {
    return cachedSystemUserId;
  }

  const maxRetries = 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Use raw SQL to bypass ZenStack access control
      const pool = getSystemUserPool();
      const client = await pool.connect();
      
      try {
        // First try to find by email
        const emailResult = await client.query(
          'SELECT id FROM users WHERE email = $1 LIMIT 1',
          [SYSTEM_USER_EMAIL]
        );

        if (emailResult.rows.length > 0) {
          cachedSystemUserId = emailResult.rows[0].id;
          return emailResult.rows[0].id;
        }

        // Then try to find by ID
        const idResult = await client.query(
          'SELECT id FROM users WHERE id = $1 LIMIT 1',
          [FALLBACK_SYSTEM_USER_ID]
        );

        if (idResult.rows.length > 0) {
          cachedSystemUserId = idResult.rows[0].id;
          return idResult.rows[0].id;
        }

        throw new Error(
          'System user not found. Please run: bun run setup:system-user'
        );
      } finally {
        client.release();
      }
    } catch (error) {
      lastError = error;

      if (isConnectionError(error) && attempt < maxRetries) {
        const delay = 100 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (isConnectionError(error)) {
        console.warn(
          '[system-user] DB lookup failed after retries, using fallback id:',
          error instanceof Error ? error.message : error
        );
        cachedSystemUserId = FALLBACK_SYSTEM_USER_ID;
        return FALLBACK_SYSTEM_USER_ID;
      }

      console.error('Failed to get system user ID:', error);
      throw error;
    }
  }

  throw lastError;
}

/**
 * Get system user object for createClient()
 * Use this in getSystemDb() helpers
 */
export async function getSystemUser() {
  const id = await getSystemUserId();
  return {
    id,
    role: 'ADMIN' as const,
    email: SYSTEM_USER_EMAIL,
    name: 'System Admin',
  };
}

/**
 * Synchronous version - uses cached ID or fallback
 * Use this when you can't use async (e.g., in helper functions)
 *
 * WARNING: This will use 'system' as fallback. Make sure system user exists!
 */
export function getSystemUserSync() {
  return {
    id: cachedSystemUserId || FALLBACK_SYSTEM_USER_ID,
    role: 'ADMIN' as const,
    email: SYSTEM_USER_EMAIL,
    name: 'System Admin',
  };
}

/**
 * Initialize system user ID cache
 * Call this at application startup
 */
export async function initializeSystemUser() {
  try {
    await getSystemUserId();
    console.log(`✅ System user initialized: ${cachedSystemUserId}`);
  } catch (error) {
    console.warn('⚠️  System user not found. Some operations may fail.');
    console.warn('   Run: bun run setup:system-user');
  }
}

