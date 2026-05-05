/**
 * Services index file
 * 
 * Exports common service utilities and database helpers
 */

import { createClient } from '@/lib/db';
import { getSystemUser } from '@/lib/utils/system-user';
import type { AuthUser } from '@/lib/auth';

/**
 * Get a database client with system user context
 * Use this for operations that need elevated permissions (e.g., audit logging)
 * 
 * @returns ZenStack client with system user context
 */
export function getSystemDb() {
  // System user for elevated permissions
  const systemUser: AuthUser = {
    id: 'xronr0y2ule1my2abd0wfulc', // Fallback system user ID
    email: 'system@prestix.vip',
    name: 'System Admin',
    role: 'PLATFORM_ADMIN',
  };

  return createClient(systemUser);
}
