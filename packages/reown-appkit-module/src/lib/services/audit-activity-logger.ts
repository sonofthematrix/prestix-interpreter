/**
 * Audit Activity Logger
 * Comprehensive logging system for user authentication and activity tracking
 */

import { createClient } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';

/**
 * Helper function to check if audit models exist in the database schema
 */
function hasAuditModels(db: any): { hasAuditLog: boolean; hasUserActivity: boolean } {
  return {
    hasAuditLog: typeof db.auditLog !== 'undefined' && typeof db.auditLog.create === 'function',
    hasUserActivity: typeof db.userActivity !== 'undefined' && typeof db.userActivity.create === 'function',
  };
}

export class AuditActivityLogger {
  /**
   * Log a CREATE operation
   */
  static async logCreate(
    model: string,
    recordId: string,
    userId: string,
    record: any,
    metadata?: any
  ): Promise<void> {
    try {
      const systemUser: AuthUser = {
        id: 'system',
        email: 'system@TKNZN.pro',
        name: 'System Admin',
        role: 'ADMIN',
      };
      const db = await createClient(systemUser);
      const { hasAuditLog, hasUserActivity } = hasAuditModels(db);

      if (!hasAuditLog && !hasUserActivity) {
        console.warn(`⚠️ [Audit] Audit models not found in schema. Skipping CREATE log for ${model} ${recordId}`);
        return;
      }

      // Create audit log
      if (hasAuditLog) {
        await db.auditLog.create({
          data: {
            userId,
            action: 'CREATE',
            entityType: model,
            entityId: recordId,
            newData: record as any,
            ipAddress: metadata?.ipAddress || 'system',
            userAgent: metadata?.userAgent || 'system',
          },
        });
      }

      // Create user activity log
      if (hasUserActivity) {
        await db.userActivity.create({
          data: {
            userId,
            action: 'create',
            resource: model,
            resourceId: recordId,
            metadata: JSON.stringify({
              ...metadata,
              record,
              timestamp: new Date().toISOString(),
            }),
          },
        });
      }

      console.log(`✅ [Audit] CREATE: ${model} ${recordId} by user ${userId}`);
    } catch (error) {
      console.error(`❌ [Audit] Failed to log CREATE for ${model} ${recordId}:`, error);
    }
  }

  /**
   * Log an UPDATE operation
   */
  static async logUpdate(
    model: string,
    recordId: string,
    userId: string,
    oldRecord: any,
    newRecord: any,
    metadata?: any
  ): Promise<void> {
    try {
      const systemUser: AuthUser = {
        id: 'system',
        email: 'system@TKNZN.pro',
        name: 'System Admin',
        role: 'ADMIN',
      };
      const db = await createClient(systemUser);
      const { hasAuditLog, hasUserActivity } = hasAuditModels(db);

      if (!hasAuditLog && !hasUserActivity) {
        console.warn(`⚠️ [Audit] Audit models not found in schema. Skipping UPDATE log for ${model} ${recordId}`);
        return;
      }

      // Create audit log
      if (hasAuditLog) {
        await db.auditLog.create({
          data: {
            userId,
            action: 'UPDATE',
            entityType: model,
            entityId: recordId,
            oldData: oldRecord as any,
            newData: newRecord as any,
            ipAddress: metadata?.ipAddress || 'system',
            userAgent: metadata?.userAgent || 'system',
          },
        });
      }

      // Create user activity log
      if (hasUserActivity) {
        await db.userActivity.create({
          data: {
            userId,
            action: 'update',
            resource: model,
            resourceId: recordId,
            metadata: JSON.stringify({
              ...metadata,
              oldRecord,
              newRecord,
              timestamp: new Date().toISOString(),
            }),
          },
        });
      }

      console.log(`✅ [Audit] UPDATE: ${model} ${recordId} by user ${userId}`);
    } catch (error) {
      console.error(`❌ [Audit] Failed to log UPDATE for ${model} ${recordId}:`, error);
    }
  }

  /**
   * Log a DELETE operation
   */
  static async logDelete(
    model: string,
    recordId: string,
    userId: string,
    metadata?: any
  ): Promise<void> {
    try {
      const systemUser: AuthUser = {
        id: 'system',
        email: 'system@TKNZN.pro',
        name: 'System Admin',
        role: 'ADMIN' as const,
      };
      const db = await createClient(systemUser);
      const { hasAuditLog, hasUserActivity } = hasAuditModels(db);

      if (!hasAuditLog && !hasUserActivity) {
        console.warn(`⚠️ [Audit] Audit models not found in schema. Skipping DELETE log for ${model} ${recordId}`);
        return;
      }

      // Create audit log
      if (hasAuditLog) {
        await db.auditLog.create({
          data: {
            userId,
            action: 'DELETE',
            entityType: model,
            entityId: recordId,
            ipAddress: metadata?.ipAddress || 'system',
            userAgent: metadata?.userAgent || 'system',
          },
        });
      }

      // Create user activity log
      if (hasUserActivity) {
        await db.userActivity.create({
          data: {
            userId,
            action: 'delete',
            resource: model,
            resourceId: recordId,
            metadata: JSON.stringify({
              ...metadata,
              timestamp: new Date().toISOString(),
            }),
          },
        });
      }

      console.log(`✅ [Audit] DELETE: ${model} ${recordId} by user ${userId}`);
    } catch (error) {
      console.error(`❌ [Audit] Failed to log DELETE for ${model} ${recordId}:`, error);
    }
  }

  /**
   * Log a LOGIN event
   */
  static async logLogin(userId: string, metadata?: any): Promise<void> {
    try {
      const systemUser: AuthUser = {
        id: 'system',
        email: 'system@TKNZN.pro',
        name: 'System Admin',
        role: 'ADMIN',
      };
      const db = await createClient(systemUser);
      const { hasAuditLog, hasUserActivity } = hasAuditModels(db);

      if (!hasAuditLog && !hasUserActivity) {
        console.warn(`⚠️ [Audit] Audit models not found in schema. Skipping LOGIN log for user ${userId}`);
        console.log(`✅ [Audit] LOGIN: user ${userId} via ${metadata?.authMethod || 'unknown'} (logged to console only)`);
        return;
      }

      // Create audit log
      if (hasAuditLog) {
        await db.auditLog.create({
          data: {
            userId,
            action: 'LOGIN',
            entityType: 'User',
            entityId: userId,
            newData: {
              authMethod: metadata?.authMethod || 'unknown',
              provider: metadata?.provider || 'unknown',
              walletAddress: metadata?.walletAddress || null,
              walletProvider: metadata?.walletProvider || null,
              signatureProvided: metadata?.signatureProvided || false,
              ipAddress: metadata?.ipAddress || 'unknown',
              userAgent: metadata?.userAgent || 'unknown',
              timestamp: new Date().toISOString(),
            } as any,
            ipAddress: metadata?.ipAddress || 'unknown',
            userAgent: metadata?.userAgent || 'unknown',
          },
        });
      }

      // Create user activity log
      if (hasUserActivity) {
        await db.userActivity.create({
          data: {
            userId,
            action: 'login',
            resource: 'Session',
            resourceId: metadata?.sessionId || `session-${Date.now()}`,
            metadata: JSON.stringify({
              authMethod: metadata?.authMethod || 'unknown',
              provider: metadata?.provider || 'unknown',
              walletAddress: metadata?.walletAddress || null,
              walletProvider: metadata?.walletProvider || null,
              signatureProvided: metadata?.signatureProvided || false,
              ipAddress: metadata?.ipAddress || 'unknown',
              userAgent: metadata?.userAgent || 'unknown',
              timestamp: new Date().toISOString(),
            }),
          },
        });
      }

      // Update user's last login timestamp
      try {
        await db.user.update({
          where: { id: userId },
          data: {
            lastLoginAt: new Date(),
            // Note: lastWalletSignIn field removed - not in User schema
          },
        });
      } catch (error) {
        console.warn(`⚠️ [Audit] Failed to update user last login:`, error);
      }

      console.log(`✅ [Audit] LOGIN: user ${userId} via ${metadata?.authMethod || 'unknown'}`);
    } catch (error) {
      console.error(`❌ [Audit] Failed to log LOGIN for user ${userId}:`, error);
    }
  }

  /**
   * Log a LOGOUT event
   */
  static async logLogout(
    userId: string,
    sessionId?: string,
    sessionDuration?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const systemUser: AuthUser = {
        id: 'system',
        email: 'system@TKNZN.pro',
        name: 'System Admin',
        role: 'ADMIN',
      };
      const db = await createClient(systemUser);
      const { hasAuditLog, hasUserActivity } = hasAuditModels(db);

      if (!hasAuditLog && !hasUserActivity) {
        console.warn(`⚠️ [Audit] Audit models not found in schema. Skipping LOGOUT log for user ${userId}`);
        console.log(`✅ [Audit] LOGOUT: user ${userId}, session ${sessionId}, duration ${sessionDuration}ms (logged to console only)`);
        return;
      }

      // Create audit log
      if (hasAuditLog) {
        await db.auditLog.create({
          data: {
            userId,
            action: 'LOGOUT',
            entityType: 'Session',
            entityId: sessionId || `session-${Date.now()}`,
            newData: {
              sessionDuration,
              timestamp: new Date().toISOString(),
            } as any,
            ipAddress: ipAddress || 'unknown',
            userAgent: userAgent || 'unknown',
          },
        });
      }

      // Create user activity log
      if (hasUserActivity) {
        await db.userActivity.create({
          data: {
            userId,
            action: 'logout',
            resource: 'Session',
            resourceId: sessionId || `session-${Date.now()}`,
            metadata: JSON.stringify({
              sessionDuration,
              ipAddress: ipAddress || 'unknown',
              userAgent: userAgent || 'unknown',
              timestamp: new Date().toISOString(),
            }),
          },
        });
      }

      console.log(`✅ [Audit] LOGOUT: user ${userId}, session ${sessionId}, duration ${sessionDuration}ms`);
    } catch (error) {
      console.error(`❌ [Audit] Failed to log LOGOUT for user ${userId}:`, error);
    }
  }

  /**
   * Log a generic activity
   */
  static async logActivity(activity: any): Promise<void> {
    try {
      const systemUser: AuthUser = {
        id: 'system',
        email: 'system@TKNZN.pro',
        name: 'System Admin',
        role: 'ADMIN',
      };
      const db = await createClient(systemUser);
      const { hasUserActivity } = hasAuditModels(db);

      if (!hasUserActivity) {
        console.warn(`⚠️ [Audit] UserActivity model not found in schema. Skipping ACTIVITY log for user ${activity.userId}`);
        console.log(`✅ [Audit] ACTIVITY: ${activity.action} by user ${activity.userId} (logged to console only)`);
        return;
      }

      // Create user activity log
      await db.userActivity.create({
        data: {
          userId: activity.userId,
          action: activity.action,
          resource: activity.resource || 'Unknown',
          resourceId: activity.resourceId || 'unknown',
          metadata: JSON.stringify({
            ...activity.metadata,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      console.log(`✅ [Audit] ACTIVITY: ${activity.action} by user ${activity.userId}`);
    } catch (error) {
      console.error(`❌ [Audit] Failed to log ACTIVITY:`, error);
    }
  }
}
