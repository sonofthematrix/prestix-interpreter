/**
 * Auth-specific audit logging for login/logout using the AuditLog schema.
 * Uses exact schema fields: actorId, actorRole, action, targetType, targetId, changes, ipAddress, userAgent, metadata.
 */

import { getSystemDb } from './index';

export interface LoginAuditContext {
  userId: string;
  authMethod: string;
  walletAddress?: string;
  chainId?: number;
  networkName?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  isNewUser?: boolean;
  /** Full SIWE message (stored in metadata for audit trail) */
  siweMessage?: string;
}

export interface LogoutAuditContext {
  userId: string;
  sessionId?: string;
  sessionDurationMs?: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log a successful login to AuditLog. Non-blocking; failures are logged but do not throw.
 */
export async function logLoginAudit(context: LoginAuditContext): Promise<void> {
  try {
    const db = getSystemDb();
    const metadata: Record<string, unknown> = {
      authMethod: context.authMethod,
      walletAddress: context.walletAddress ?? null,
      chainId: context.chainId ?? null,
      networkName: context.networkName ?? null,
      sessionId: context.sessionId ?? null,
      isNewUser: context.isNewUser ?? false,
    };
    if (context.siweMessage) {
      metadata.siweMessage = context.siweMessage;
    }
    await db.auditLog.create({
      data: {
        actorId: context.userId,
        actorRole: 'MEMBER',
        action: 'LOGIN',
        targetType: 'User',
        targetId: context.userId,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        metadata,
      } as any,
    });
  } catch (error) {
    console.error('❌ [AuthAudit] Failed to log login:', error);
  }
}

/**
 * Log a logout to AuditLog. Non-blocking.
 */
export async function logLogoutAudit(context: LogoutAuditContext): Promise<void> {
  try {
    const db = getSystemDb();
    await db.auditLog.create({
      data: {
        actorId: context.userId,
        actorRole: 'MEMBER',
        action: 'LOGOUT',
        targetType: 'User',
        targetId: context.userId,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        metadata: {
          sessionId: context.sessionId ?? null,
          sessionDurationMs: context.sessionDurationMs ?? null,
        },
      } as any,
    });
  } catch (error) {
    console.error('❌ [AuthAudit] Failed to log logout:', error);
  }
}
