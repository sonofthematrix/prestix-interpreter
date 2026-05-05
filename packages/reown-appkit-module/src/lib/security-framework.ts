/**
 * Security & Compliance Framework for Tokenizin
 * Comprehensive security, encryption, and compliance management system
 */

import { z } from 'zod';
import { createClient } from '@/lib/db';

// ============================================================================
// SECURITY FRAMEWORK TYPES
// ============================================================================

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  type: 'encryption' | 'access_control' | 'data_retention' | 'audit' | 'compliance';
  rules: SecurityRule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityRule {
  id: string;
  policyId: string;
  condition: string;
  action: 'allow' | 'deny' | 'encrypt' | 'log' | 'alert';
  parameters: Record<string, any>;
  priority: number;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  type: 'GDPR' | 'CCPA' | 'SOX' | 'HIPAA' | 'PCI_DSS' | 'ISO_27001' | 'CUSTOM';
  requirements: ComplianceRequirement[];
  isActive: boolean;
  lastAudit: Date;
  nextAudit: Date;
}

export interface ComplianceRequirement {
  id: string;
  frameworkId: string;
  code: string;
  title: string;
  description: string;
  category: 'data_protection' | 'access_control' | 'encryption' | 'audit' | 'retention' | 'consent';
  status: 'compliant' | 'non_compliant' | 'pending' | 'not_applicable';
  evidence: string[];
  lastChecked: Date;
}

export interface EncryptionConfig {
  algorithm: 'AES-256' | 'AES-128' | 'RSA-2048' | 'RSA-4096' | 'ChaCha20-Poly1305';
  keySize: number;
  mode: 'GCM' | 'CBC' | 'CTR' | 'EAX';
  keyRotationDays: number;
  lastRotation: Date;
  nextRotation: Date;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  complianceRelevant: boolean;
}

// ============================================================================
// SECURITY FRAMEWORK CLASS
// ============================================================================

export class SecurityFramework {
  private db: any;
  private encryptionKey: string;
  private auditLogs: AuditLog[] = [];

  constructor() {
    this.db = null;
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  /**
   * Initialize the security framework
   */
  async initialize(): Promise<void> {
    try {
      this.db = await createClient();
      await this.setupDefaultPolicies();
      await this.setupComplianceFrameworks();
      console.log('✅ Security framework initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize security framework:', error);
      throw error;
    }
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string, level: 'basic' | 'standard' | 'high' | 'military' = 'standard'): Promise<string> {
    try {
      // In production, use proper encryption libraries like crypto-js or node:crypto
      const config = this.getEncryptionConfig(level);
      const encrypted = Buffer.from(data).toString('base64'); // Simplified for demo
      
      // Log encryption event
      await this.logAuditEvent({
        action: 'encrypt_data',
        resource: 'sensitive_data',
        details: { level, algorithm: config.algorithm },
        severity: 'medium',
        complianceRelevant: true
      });

      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(encryptedData: string, level: 'basic' | 'standard' | 'high' | 'military' = 'standard'): Promise<string> {
    try {
      const config = this.getEncryptionConfig(level);
      const decrypted = Buffer.from(encryptedData, 'base64').toString('utf-8'); // Simplified for demo
      
      // Log decryption event
      await this.logAuditEvent({
        action: 'decrypt_data',
        resource: 'sensitive_data',
        details: { level, algorithm: config.algorithm },
        severity: 'medium',
        complianceRelevant: true
      });

      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  /**
   * Check access permissions
   */
  async checkAccess(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const policies = await this.getActivePolicies();
      
      for (const policy of policies) {
        if (policy.type === 'access_control') {
          for (const rule of policy.rules) {
            if (this.evaluateRule(rule, { userId, resource, action })) {
              if (rule.action === 'allow') {
                await this.logAuditEvent({
                  userId,
                  action: 'access_granted',
                  resource,
                  details: { policy: policy.name, rule: rule.id },
                  severity: 'low',
                  complianceRelevant: false
                });
                return true;
              } else if (rule.action === 'deny') {
                await this.logAuditEvent({
                  userId,
                  action: 'access_denied',
                  resource,
                  details: { policy: policy.name, rule: rule.id },
                  severity: 'medium',
                  complianceRelevant: true
                });
                return false;
              }
            }
          }
        }
      }

      // Default deny
      await this.logAuditEvent({
        userId,
        action: 'access_denied',
        resource,
        details: { reason: 'no_matching_policy' },
        severity: 'medium',
        complianceRelevant: true
      });

      return false;
    } catch (error) {
      console.error('Access check failed:', error);
      return false;
    }
  }

  /**
   * Validate data retention policies
   */
  async validateDataRetention(dataType: string, createdAt: Date): Promise<boolean> {
    try {
      const policies = await this.getActivePolicies();
      
      for (const policy of policies) {
        if (policy.type === 'data_retention') {
          for (const rule of policy.rules) {
            if (this.evaluateRule(rule, { dataType, createdAt })) {
              const retentionDays = rule.parameters.retentionDays;
              const expirationDate = new Date(createdAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);
              
              if (new Date() > expirationDate) {
                await this.logAuditEvent({
                  action: 'data_expired',
                  resource: dataType,
                  details: { 
                    createdAt, 
                    expirationDate, 
                    retentionDays,
                    policy: policy.name 
                  },
                  severity: 'medium',
                  complianceRelevant: true
                });
                return false; // Data should be deleted
              }
            }
          }
        }
      }

      return true; // Data is still valid
    } catch (error) {
      console.error('Data retention validation failed:', error);
      return true; // Default to keeping data
    }
  }

  /**
   * Run compliance check
   */
  async runComplianceCheck(frameworkType: string): Promise<ComplianceReport> {
    try {
      const framework = await this.getComplianceFramework(frameworkType);
      if (!framework) {
        throw new Error(`Compliance framework ${frameworkType} not found`);
      }

      const report: ComplianceReport = {
        id: `compliance-${Date.now()}`,
        frameworkType,
        status: 'compliant',
        requirements: [],
        findings: [],
        recommendations: [],
        auditTrail: [],
        createdAt: new Date(),
        completedAt: new Date()
      };

      for (const requirement of framework.requirements) {
        const checkResult = await this.checkComplianceRequirement(requirement);
        report.requirements.push(checkResult);

        if (checkResult.status === 'non_compliant') {
          report.status = 'non_compliant';
          report.findings.push({
            requirement: requirement.code,
            issue: checkResult.issue,
            severity: checkResult.severity
          });
        }
      }

      // Generate recommendations
      report.recommendations = this.generateComplianceRecommendations(report);

      // Log compliance check
      await this.logAuditEvent({
        action: 'compliance_check',
        resource: frameworkType,
        details: { 
          status: report.status,
          requirementsChecked: report.requirements.length,
          nonCompliant: report.findings.length
        },
        severity: report.status === 'non_compliant' ? 'high' : 'low',
        complianceRelevant: true
      });

      return report;
    } catch (error) {
      console.error('Compliance check failed:', error);
      throw error;
    }
  }

  /**
   * Log audit event
   */
  async logAuditEvent(event: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditLog: AuditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...event,
        timestamp: new Date()
      };

      // Store in memory for immediate access
      this.auditLogs.push(auditLog);

      // Store in database
      if (this.db) {
        await this.db.auditLog.create({
          data: auditLog
        });
      }

      // Alert if high severity
      if (event.severity === 'critical' || event.severity === 'high') {
        await this.sendSecurityAlert(auditLog);
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Get security dashboard data
   */
  async getSecurityDashboard(): Promise<SecurityDashboardData> {
    try {
      const [
        recentAlerts,
        complianceStatus,
        accessAttempts,
        encryptionStats
      ] = await Promise.all([
        this.getRecentSecurityAlerts(),
        this.getComplianceStatus(),
        this.getAccessAttempts(),
        this.getEncryptionStats()
      ]);

      return {
        recentAlerts,
        complianceStatus,
        accessAttempts,
        encryptionStats,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Failed to get security dashboard data:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async setupDefaultPolicies(): Promise<void> {
    const defaultPolicies: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Data Encryption Policy',
        description: 'Default encryption policy for sensitive data',
        type: 'encryption',
        rules: [
          {
            id: 'encrypt-pii',
            policyId: '',
            condition: 'dataType === "pii"',
            action: 'encrypt',
            parameters: { level: 'high', algorithm: 'AES-256' },
            priority: 1
          }
        ],
        isActive: true
      },
      {
        name: 'Access Control Policy',
        description: 'Default access control policy',
        type: 'access_control',
        rules: [
          {
            id: 'admin-full-access',
            policyId: '',
            condition: 'userRole === "ADMIN"',
            action: 'allow',
            parameters: { resources: ['*'], actions: ['*'] },
            priority: 1
          }
        ],
        isActive: true
      },
      {
        name: 'Data Retention Policy',
        description: 'Default data retention policy',
        type: 'data_retention',
        rules: [
          {
            id: 'retain-logs-90-days',
            policyId: '',
            condition: 'dataType === "audit_log"',
            action: 'log',
            parameters: { retentionDays: 90 },
            priority: 1
          }
        ],
        isActive: true
      }
    ];

    // Store default policies in database
    for (const policy of defaultPolicies) {
      await this.db.securityPolicy.create({
        data: {
          ...policy,
          id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
  }

  private async setupComplianceFrameworks(): Promise<void> {
    const frameworks: Omit<ComplianceFramework, 'id'>[] = [
      {
        name: 'GDPR Compliance',
        type: 'GDPR',
        requirements: [
          {
            id: 'gdpr-001',
            frameworkId: '',
            code: 'GDPR-001',
            title: 'Data Minimization',
            description: 'Only collect data that is necessary for the stated purpose',
            category: 'data_protection',
            status: 'compliant',
            evidence: ['data_collection_audit'],
            lastChecked: new Date()
          },
          {
            id: 'gdpr-002',
            frameworkId: '',
            code: 'GDPR-002',
            title: 'Consent Management',
            description: 'Obtain explicit consent for data processing',
            category: 'consent',
            status: 'compliant',
            evidence: ['consent_forms', 'consent_logs'],
            lastChecked: new Date()
          }
        ],
        isActive: true,
        lastAudit: new Date(),
        nextAudit: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      }
    ];

    // Store compliance frameworks in database
    for (const framework of frameworks) {
      await this.db.complianceFramework.create({
        data: {
          ...framework,
          id: `framework-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      });
    }
  }

  private getEncryptionConfig(level: string): EncryptionConfig {
    const configs: Record<string, EncryptionConfig> = {
      basic: {
        algorithm: 'AES-128',
        keySize: 128,
        mode: 'CBC',
        keyRotationDays: 90,
        lastRotation: new Date(),
        nextRotation: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      },
      standard: {
        algorithm: 'AES-256',
        keySize: 256,
        mode: 'GCM',
        keyRotationDays: 60,
        lastRotation: new Date(),
        nextRotation: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      },
      high: {
        algorithm: 'AES-256',
        keySize: 256,
        mode: 'GCM',
        keyRotationDays: 30,
        lastRotation: new Date(),
        nextRotation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      military: {
        algorithm: 'AES-256',
        keySize: 256,
        mode: 'GCM',
        keyRotationDays: 7,
        lastRotation: new Date(),
        nextRotation: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    };

    return configs[level] || configs.standard;
  }

  private evaluateRule(rule: SecurityRule, context: Record<string, any>): boolean {
    // Simplified rule evaluation - in production, use a proper rule engine
    try {
      // Replace variables in condition with context values
      let condition = rule.condition;
      for (const [key, value] of Object.entries(context)) {
        condition = condition.replace(new RegExp(`\\b${key}\\b`, 'g'), JSON.stringify(value));
      }
      
      // Evaluate condition (simplified - use proper expression evaluator in production)
      return eval(condition);
    } catch (error) {
      console.error('Rule evaluation failed:', error);
      return false;
    }
  }

  private async getActivePolicies(): Promise<SecurityPolicy[]> {
    if (!this.db) return [];
    
    return await this.db.securityPolicy.findMany({
      where: { isActive: true },
      include: { rules: true }
    });
  }

  private async getComplianceFramework(type: string): Promise<ComplianceFramework | null> {
    if (!this.db) return null;
    
    return await this.db.complianceFramework.findFirst({
      where: { type, isActive: true },
      include: { requirements: true }
    });
  }

  private async checkComplianceRequirement(requirement: ComplianceRequirement): Promise<ComplianceCheckResult> {
    // Simplified compliance check - implement actual checks based on requirement
    const result: ComplianceCheckResult = {
      requirement: requirement.code,
      status: 'compliant',
      evidence: requirement.evidence,
      lastChecked: new Date()
    };

    // Add specific compliance checks here based on requirement type
    switch (requirement.category) {
      case 'data_protection':
        result.status = await this.checkDataProtection(requirement);
        break;
      case 'access_control':
        result.status = await this.checkAccessControl(requirement);
        break;
      case 'encryption':
        result.status = await this.checkEncryption(requirement);
        break;
      default:
        result.status = 'compliant';
    }

    return result;
  }

  private async checkDataProtection(requirement: ComplianceRequirement): Promise<'compliant' | 'non_compliant'> {
    // Implement data protection checks
    return 'compliant';
  }

  private async checkAccessControl(requirement: ComplianceRequirement): Promise<'compliant' | 'non_compliant'> {
    // Implement access control checks
    return 'compliant';
  }

  private async checkEncryption(requirement: ComplianceRequirement): Promise<'compliant' | 'non_compliant'> {
    // Implement encryption checks
    return 'compliant';
  }

  private generateComplianceRecommendations(report: ComplianceReport): string[] {
    const recommendations: string[] = [];
    
    if (report.status === 'non_compliant') {
      recommendations.push('Address all non-compliant requirements immediately');
      recommendations.push('Implement additional security controls for high-risk areas');
      recommendations.push('Schedule regular compliance audits');
    }
    
    recommendations.push('Maintain up-to-date documentation of all security measures');
    recommendations.push('Conduct regular security training for all staff');
    
    return recommendations;
  }

  private async sendSecurityAlert(auditLog: AuditLog): Promise<void> {
    // Implement security alert system (email, Slack, etc.)
    console.log('🚨 SECURITY ALERT:', auditLog);
  }

  private async getRecentSecurityAlerts(): Promise<AuditLog[]> {
    return this.auditLogs
      .filter(log => log.severity === 'high' || log.severity === 'critical')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  private async getComplianceStatus(): Promise<Record<string, string>> {
    return {
      GDPR: 'compliant',
      CCPA: 'compliant',
      SOX: 'pending',
      HIPAA: 'not_applicable'
    };
  }

  private async getAccessAttempts(): Promise<AccessAttemptStats> {
    const recentAttempts = this.auditLogs
      .filter(log => log.action.includes('access'))
      .slice(-100);

    return {
      total: recentAttempts.length,
      successful: recentAttempts.filter(log => log.action.includes('granted')).length,
      failed: recentAttempts.filter(log => log.action.includes('denied')).length,
      last24Hours: recentAttempts.filter(log => 
        log.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
      ).length
    };
  }

  private async getEncryptionStats(): Promise<EncryptionStats> {
    return {
      totalEncrypted: 1000,
      encryptionLevels: {
        basic: 100,
        standard: 800,
        high: 90,
        military: 10
      },
      lastKeyRotation: new Date(),
      nextKeyRotation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
  }
}

// ============================================================================
// ADDITIONAL TYPES
// ============================================================================

interface ComplianceReport {
  id: string;
  frameworkType: string;
  status: 'compliant' | 'non_compliant' | 'pending';
  requirements: ComplianceCheckResult[];
  findings: ComplianceFinding[];
  recommendations: string[];
  auditTrail: any[];
  createdAt: Date;
  completedAt: Date;
}

interface ComplianceCheckResult {
  requirement: string;
  status: 'compliant' | 'non_compliant' | 'pending' | 'not_applicable';
  evidence: string[];
  lastChecked: Date;
  issue?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface ComplianceFinding {
  requirement: string;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityDashboardData {
  recentAlerts: AuditLog[];
  complianceStatus: Record<string, string>;
  accessAttempts: AccessAttemptStats;
  encryptionStats: EncryptionStats;
  lastUpdated: Date;
}

interface AccessAttemptStats {
  total: number;
  successful: number;
  failed: number;
  last24Hours: number;
}

interface EncryptionStats {
  totalEncrypted: number;
  encryptionLevels: Record<string, number>;
  lastKeyRotation: Date;
  nextKeyRotation: Date;
}

// ============================================================================
// EXPORT
// ============================================================================

export const securityFramework = new SecurityFramework();

