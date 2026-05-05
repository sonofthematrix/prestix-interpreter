/**
 * Client-side stub for database client
 * 
 * This file replaces @/lib/db in client bundles to prevent pg/kysely from being bundled.
 * The actual db.ts file uses Node.js modules that don't exist in browsers.
 */

import type { AuthUser } from './auth';

/**
 * Stub createClient function for client-side
 * Throws an error if called (should never happen - use API routes instead)
 */
export async function createClient(user?: AuthUser | null) {
  throw new Error(
    'Database client cannot be used in browser. ' +
    'Use API routes (/app/api/**) for database operations instead.'
  );
}

/**
 * Stub disconnect function
 */
export async function disconnect(): Promise<void> {
  // No-op for client
}

/**
 * Stub health check
 */
export async function healthCheck(): Promise<boolean> {
  return false;
}

/**
 * Stub getDb function
 */
export async function getDb() {
  throw new Error('getDb cannot be used in browser. Use API routes instead.');
}

