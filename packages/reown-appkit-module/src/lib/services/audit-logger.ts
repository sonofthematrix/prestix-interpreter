/**
 * Audit Logger Service
 *
 * Comprehensive logging system for blockchain operations
 * Tracks all admin actions for compliance and traceability
 *
 * @author Tokenizin
 */

import { createClient } from '@/lib/db';

export interface AuditLogEntry {
  id?: string;
  timestamp: Date;
  adminUser: string;
  operation: string;
  contractAddress?: string;
  transactionHash?: string;
  params: Record<string, any>;
  result: 'SUCCESS' | 'FAILED' | 'PENDING';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface AuditTrailFilters {
  operation?: string;
  adminUser?: string;
  startDate?: Date;
  endDate?: Date;
  result?: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export class AuditLogger {
  private logs: Map<string, AuditLogEntry> = new Map();

  /**
   * Log the start of an operation
   */
  async logOperationStart(params: {
    adminUser: string;
    operation: string;
    params: Record<string, any>;
    contractAddress?: string;
  }): Promise<string> {
    const id = this.generateId();

    const entry: AuditLogEntry = {
      id,
      timestamp: new Date(),
      adminUser: params.adminUser,
      operation: params.operation,
      contractAddress: params.contractAddress,
      params: params.params,
      result: 'PENDING',
    };

    this.logs.set(id, entry);

    // Also store in database for persistence
    try {
      const db = await createClient({ id: params.adminUser } as any);
      await db.auditLog.create({
        data: {
          adminUser: params.adminUser,
          operation: params.operation,
          contractAddress: params.contractAddress,
          params: params.params,
          result: 'PENDING',
        },
      });
    } catch (error) {
      console.error('Failed to store audit log in database:', error);
    }

    return id;
  }

  /**
   * Log successful operation completion
   */
  async logOperationSuccess(
    operationId: string,
    result: {
      transactionHash?: string;
      receipt?: any;
      [key: string]: any;
    }
  ): Promise<void> {
    const entry = this.logs.get(operationId);
    if (!entry) {
      console.error(`Audit log entry not found: ${operationId}`);
      return;
    }

    entry.result = 'SUCCESS';
    entry.transactionHash = result.transactionHash;
    entry.metadata = result;

    this.logs.set(operationId, entry);

    // Update database
    try {
      const db = await createClient({ id: entry.adminUser } as any);
      await db.auditLog.updateMany({
        where: { id: operationId },
        data: {
          result: 'SUCCESS',
          transactionHash: result.transactionHash,
        },
      });
    } catch (error) {
      console.error('Failed to update audit log in database:', error);
    }
  }

  /**
   * Log operation failure
   */
  async logOperationFailure(operationId: string, errorMessage: string): Promise<void> {
    const entry = this.logs.get(operationId);
    if (!entry) {
      console.error(`Audit log entry not found: ${operationId}`);
      return;
    }

    entry.result = 'FAILED';
    entry.errorMessage = errorMessage;

    this.logs.set(operationId, entry);

    // Update database
    try {
      const db = await createClient({ id: entry.adminUser } as any);
      await db.auditLog.updateMany({
        where: { id: operationId },
        data: {
          result: 'FAILED',
          errorMessage,
        },
      });
    } catch (error) {
      console.error('Failed to update audit log in database:', error);
    }
  }

  /**
   * Get audit trail with filters
   */
  async getAuditTrail(filters: AuditTrailFilters): Promise<AuditLogEntry[]> {
    let results = Array.from(this.logs.values());

    // Apply filters
    if (filters.operation) {
      results = results.filter(entry => entry.operation === filters.operation);
    }

    if (filters.adminUser) {
      results = results.filter(entry => entry.adminUser === filters.adminUser);
    }

    if (filters.result) {
      results = results.filter(entry => entry.result === filters.result);
    }

    if (filters.startDate) {
      results = results.filter(entry => entry.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      results = results.filter(entry => entry.timestamp <= filters.endDate!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return results;
  }

  /**
   * Get operation statistics
   */
  async getOperationStats(timeRange: { start: Date; end: Date }): Promise<{
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    pendingOperations: number;
    operationsByType: Record<string, number>;
    operationsByAdmin: Record<string, number>;
  }> {
    const entries = await this.getAuditTrail({
      startDate: timeRange.start,
      endDate: timeRange.end,
    });

    const stats = {
      totalOperations: entries.length,
      successfulOperations: entries.filter(e => e.result === 'SUCCESS').length,
      failedOperations: entries.filter(e => e.result === 'FAILED').length,
      pendingOperations: entries.filter(e => e.result === 'PENDING').length,
      operationsByType: {} as Record<string, number>,
      operationsByAdmin: {} as Record<string, number>,
    };

    entries.forEach(entry => {
      // Count by operation type
      stats.operationsByType[entry.operation] = (stats.operationsByType[entry.operation] || 0) + 1;

      // Count by admin
      stats.operationsByAdmin[entry.adminUser] = (stats.operationsByAdmin[entry.adminUser] || 0) + 1;
    });

    return stats;
  }

  /**
   * Export audit log to JSON
   */
  async exportAuditLog(filters: AuditTrailFilters): Promise<string> {
    const entries = await this.getAuditTrail(filters);
    return JSON.stringify(entries, null, 2);
  }

  /**
   * Clear old logs (retention policy)
   */
  async clearOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let removedCount = 0;

    for (const [id, entry] of this.logs.entries()) {
      if (entry.timestamp < cutoffDate) {
        this.logs.delete(id);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Generate unique ID for audit log entries
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Log security event
   */
  async logSecurityEvent(params: {
    adminUser: string;
    eventType: 'UNAUTHORIZED_ACCESS' | 'SUSPICIOUS_ACTIVITY' | 'COMPLIANCE_VIOLATION';
    description: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const id = this.generateId();

    const entry: AuditLogEntry = {
      id,
      timestamp: new Date(),
      adminUser: params.adminUser,
      operation: `SECURITY_${params.eventType}`,
      params: {
        description: params.description,
        ...params.metadata,
      },
      result: 'SUCCESS',
    };

    this.logs.set(id, entry);

    // Store in database
    try {
      const db = await createClient({ id: params.adminUser } as any);
      await db.auditLog.create({
        data: {
          adminUser: params.adminUser,
          operation: `SECURITY_${params.eventType}`,
          params: {
            description: params.description,
            ...params.metadata,
          },
          result: 'SUCCESS',
        },
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}
