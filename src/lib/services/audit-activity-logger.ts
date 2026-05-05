/**
 * Unified Audit and Activity Logging Service
 * 
 * This service provides centralized logging for:
 * - AuditLog: Security/compliance audit trail (admin-only access)
 * - UserActivity: User behavior tracking (user can see their own)
 * 
 * Key Features:
 * - Non-blocking: Failures don't break main flow
 * - Comprehensive: Captures context, metadata, success/failure
 * - Type-safe: TypeScript interfaces for all log types
 * - ZenStack compatible: Uses db client, not Prisma directly
 */

import { getSystemDb } from './index';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AuditLogData {
  action: string;                  // create, update, delete, login, logout, etc.
  entityType: string;              // User, Investment, RealEstateAsset, etc.
  entityId: string;                // ID of the affected entity
  userId?: string | null;          // User who performed the action (null for system)
  userType?: string | null;        // CUSTOMER, VENDOR, ADMIN, etc.
  ipAddress?: string | null;       
  userAgent?: string | null;       
  sessionId?: string | null;       
  oldData?: any | null;            // Before state (JSON)
  newData?: any | null;            // After state (JSON)
  metadata?: any | null;           // Additional context (JSON)
  success?: boolean;               // Default true
  errorMessage?: string | null;
}

export interface UserActivityData {
  userId: string;
  action: string;                  // login, logout, create_investment, play_game, etc.
  resource?: string | null;        // Investment, GamingSession, Portfolio, etc.
  resourceId?: string | null;      // ID of the specific resource
  metadata?: any | null;           // Additional data (stored as JSON string)
}

export interface AuthenticationLogContext {
  userId: string;
  authMethod: 'email' | 'wallet' | 'oauth';
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  walletAddress?: string;
  ensName?: string;
  chainId?: number;
  networkName?: string;
  isAdmin?: boolean;
  adminMethod?: string;
  errorMessage?: string;
}

// ============================================================================
// AUDIT & ACTIVITY LOGGER CLASS
// ============================================================================

export class AuditActivityLogger {
  /**
   * Create an audit log entry
   * This is for security/compliance - only admins can read
   */
  static async logAudit(data: AuditLogData): Promise<void> {
    try {
      // Use system client (no user context) for audit logs
      const db = getSystemDb();

      // ZenStack create input: Json fields must not be literal null (omit or pass object). Use relation for user (not userId key).
      const payload: Record<string, unknown> = {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        success: data.success !== undefined ? data.success : true,
      };
      if (data.userId != null) (payload as any).user = { connect: { id: data.userId } };
      if (data.userType != null) payload.userType = data.userType;
      if (data.ipAddress != null) payload.ipAddress = data.ipAddress;
      if (data.userAgent != null) payload.userAgent = data.userAgent;
      if (data.sessionId != null) payload.sessionId = data.sessionId;
      if (data.errorMessage != null) payload.errorMessage = data.errorMessage;
      if (data.oldData != null) payload.oldData = JSON.parse(JSON.stringify(data.oldData));
      if (data.newData != null) payload.newData = JSON.parse(JSON.stringify(data.newData));
      if (data.metadata != null) payload.metadata = JSON.parse(JSON.stringify(data.metadata));

      await db.auditLog.create({
        data: payload,
      } as { data: typeof payload });

      console.log(`🔍 Audit log created: ${data.action} on ${data.entityType}#${data.entityId}`);
    } catch (error) {
      console.error('❌ Failed to create audit log:', error);
      // Don't throw - logging failures shouldn't break main flow
    }
  }

  /**
   * Create a user activity entry
   * This is for user behavior tracking - users can see their own
   */
  static async logActivity(data: UserActivityData): Promise<void> {
    try {
      // Use system client (no user context) for activity logs
      const db = getSystemDb();
      
      await db.userActivity.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource || null,
          resourceId: data.resourceId || null,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        },
      });

      console.log(`📊 User activity logged: ${data.action} by user ${data.userId}`);
    } catch (error) {
      console.error('❌ Failed to log user activity:', error);
      // Don't throw - logging failures shouldn't break main flow
    }
  }

  /**
   * Log both audit and activity for a single event
   * Use this for operations that need both compliance and behavior tracking
   */
  static async logBoth(auditData: AuditLogData, activityData: UserActivityData): Promise<void> {
    await Promise.all([
      this.logAudit(auditData),
      this.logActivity(activityData),
    ]);
  }

  // ========================================================================
  // AUTHENTICATION-SPECIFIC HELPERS
  // ========================================================================

  /**
   * Log user login (both audit and activity)
   */
  static async logLogin(context: AuthenticationLogContext): Promise<void> {
    const { 
      userId, 
      authMethod, 
      success, 
      ipAddress, 
      userAgent, 
      sessionId,
      walletAddress,
      ensName,
      chainId,
      networkName,
      isAdmin,
      adminMethod,
      errorMessage 
    } = context;

    // Audit log - security/compliance
    await this.logAudit({
      action: 'login',
      entityType: 'User',
      entityId: userId,
      userId: userId,
      userType: isAdmin ? 'ADMIN' : 'CUSTOMER',
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      sessionId: sessionId || null,
      metadata: {
        authMethod,
        walletAddress: walletAddress || null,
        ensName: ensName || null,
        chainId: chainId || null,
        networkName: networkName || null,
        isAdmin: isAdmin || false,
        adminMethod: adminMethod || null,
      },
      success,
      errorMessage: errorMessage || null,
    });

    // User activity - behavior tracking
    if (success) {
      await this.logActivity({
        userId,
        action: 'login',
        resource: 'Authentication',
        resourceId: sessionId || undefined,
        metadata: {
          authMethod,
          walletAddress: walletAddress || null,
          chainId: chainId || null,
          networkName: networkName || null,
        },
      });
    }
  }

  /**
   * Log user logout (both audit and activity)
   */
  static async logLogout(
    userId: string,
    sessionId?: string,
    sessionDuration?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logBoth(
      {
        action: 'logout',
        entityType: 'User',
        entityId: userId,
        userId: userId,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        sessionId: sessionId || null,
        metadata: { sessionDuration: sessionDuration || null },
        success: true,
      },
      {
        userId,
        action: 'logout',
        resource: 'Authentication',
        resourceId: sessionId,
        metadata: {
          sessionDuration: sessionDuration || null,
        },
      }
    );
  }

  /**
   * Log user registration (both audit and activity)
   */
  static async logRegistration(
    userId: string,
    authMethod: string,
    email: string,
    walletAddress?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logBoth(
      {
        action: 'create',
        entityType: 'User',
        entityId: userId,
        userId: userId,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        newData: { email, authMethod, walletAddress: walletAddress || null },
        metadata: { registrationMethod: authMethod },
        success: true,
      },
      {
        userId,
        action: 'registration',
        resource: 'User',
        resourceId: userId,
        metadata: {
          authMethod,
          email,
          walletAddress: walletAddress || null,
        },
      }
    );
  }

  // ========================================================================
  // ENTITY OPERATION HELPERS
  // ========================================================================

  /**
   * Log entity creation
   */
  static async logCreate(
    entityType: string,
    entityId: string,
    userId: string,
    newData: any,
    metadata?: any
  ): Promise<void> {
    await this.logBoth(
      {
        action: 'create',
        entityType,
        entityId,
        userId,
        newData,
        metadata,
        success: true,
      },
      {
        userId,
        action: `create_${entityType.toLowerCase()}`,
        resource: entityType,
        resourceId: entityId,
        metadata,
      }
    );
  }

  /**
   * Log entity update
   */
  static async logUpdate(
    entityType: string,
    entityId: string,
    userId: string,
    oldData: any,
    newData: any,
    metadata?: any
  ): Promise<void> {
    await this.logBoth(
      {
        action: 'update',
        entityType,
        entityId,
        userId,
        oldData,
        newData,
        metadata,
        success: true,
      },
      {
        userId,
        action: `update_${entityType.toLowerCase()}`,
        resource: entityType,
        resourceId: entityId,
        metadata,
      }
    );
  }

  /**
   * Log entity deletion
   */
  static async logDelete(
    entityType: string,
    entityId: string,
    userId: string,
    oldData: any,
    metadata?: any
  ): Promise<void> {
    await this.logBoth(
      {
        action: 'delete',
        entityType,
        entityId,
        userId,
        oldData,
        metadata,
        success: true,
      },
      {
        userId,
        action: `delete_${entityType.toLowerCase()}`,
        resource: entityType,
        resourceId: entityId,
        metadata,
      }
    );
  }

  // ========================================================================
  // BUSINESS-SPECIFIC HELPERS
  // ========================================================================

  /**
   * Log investment creation
   */
  static async logInvestmentCreated(
    userId: string,
    investmentId: string,
    amount: number,
    tokenAmount: number,
    assetId: string,
    assetTitle: string
  ): Promise<void> {
    await this.logCreate('Investment', investmentId, userId, {
      amount,
      tokenAmount,
      assetId,
      assetTitle,
    }, {
      businessEvent: 'investment_created',
      amount,
      tokenAmount,
    });
  }

  /**
   * Log gaming session
   */
  static async logGamingSession(
    userId: string,
    action: string,
    gameId?: string,
    amount?: number,
    sessionId?: string,
    metadata?: any
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: `gaming_${action}`,
      resource: 'GamingSession',
      resourceId: sessionId,
      metadata: {
        action,
        gameId,
        amount,
        ...metadata,
      },
    });
  }

  /**
   * Log deposit
   */
  static async logDeposit(
    userId: string,
    depositId: string,
    amount: number,
    method: string,
    status: string
  ): Promise<void> {
    await this.logCreate('Deposit', depositId, userId, {
      amount,
      method,
      status,
    }, {
      businessEvent: 'deposit_created',
      amount,
      method,
    });
  }

  /**
   * Log withdrawal
   */
  static async logWithdrawal(
    userId: string,
    withdrawalId: string,
    amount: number,
    method: string,
    status: string
  ): Promise<void> {
    await this.logCreate('Withdrawal', withdrawalId, userId, {
      amount,
      method,
      status,
    }, {
      businessEvent: 'withdrawal_created',
      amount,
      method,
    });
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const logAudit = AuditActivityLogger.logAudit.bind(AuditActivityLogger);
export const logActivity = AuditActivityLogger.logActivity.bind(AuditActivityLogger);
export const logLogin = AuditActivityLogger.logLogin.bind(AuditActivityLogger);
export const logLogout = AuditActivityLogger.logLogout.bind(AuditActivityLogger);
export const logRegistration = AuditActivityLogger.logRegistration.bind(AuditActivityLogger);

