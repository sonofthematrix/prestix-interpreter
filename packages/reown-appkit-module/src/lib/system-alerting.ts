/**
 * System Alerting Service
 * Comprehensive alerting system for AI model performance and system maintenance
 */

import { AIModelAnalysisService, SystemAlertConfig } from './ai-model-analysis';
import { AlertSeverity, AlertType, AIModelProvider, AIModelStatus, AIModelStatus as MonitoringAIModelStatus } from '../../../../src/lib/monitoring-schema';

// ============================================================================
// ALERTING CONFIGURATION
// ============================================================================

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  alertType: AlertType;
  severity: AlertSeverity;
  condition: (metrics: any) => boolean;
  threshold: number;
  message: string;
  autoResolve: boolean;
  autoResolveAfter?: number; // minutes
  cooldown: number; // minutes between alerts
  enabled: boolean;
  tags: string[];
}

export interface AlertChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'discord' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

export interface AlertEscalationRule {
  id: string;
  name: string;
  conditions: {
    severity: AlertSeverity;
    duration: number; // minutes
    repeatCount: number;
  };
  actions: {
    channels: string[]; // Alert channel IDs
    escalateTo: string[]; // User IDs or roles
    priority: 'low' | 'medium' | 'high' | 'urgent';
  };
}

// ============================================================================
// SYSTEM ALERTING SERVICE
// ============================================================================

export class SystemAlertingService {
  private static instance: SystemAlertingService;
  private alertRules: AlertRule[] = [];
  private alertChannels: AlertChannel[] = [];
  private escalationRules: AlertEscalationRule[] = [];
  private activeAlerts: Map<string, SystemAlertConfig & { createdAt: Date; lastTriggered: Date }> = new Map();
  private analysisService: AIModelAnalysisService;

  private constructor() {
    this.analysisService = AIModelAnalysisService.getInstance();
    this.initializeDefaultRules();
    this.initializeDefaultChannels();
    this.initializeEscalationRules();
  }

  static getInstance(): SystemAlertingService {
    if (!SystemAlertingService.instance) {
      SystemAlertingService.instance = new SystemAlertingService();
    }
    return SystemAlertingService.instance;
  }

  // ============================================================================
  // ALERT MANAGEMENT
  // ============================================================================

  /**
   * Check all alert rules and generate alerts if conditions are met
   */
  async checkAllAlerts(): Promise<SystemAlertConfig[]> {
    const alerts: SystemAlertConfig[] = [];
    const now = new Date();

    // Check AI model performance alerts
    const modelAlerts = await this.analysisService.generateSystemAlerts();
    alerts.push(...modelAlerts);

    // Check custom alert rules
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      const alertKey = `rule_${rule.id}`;
      const lastTriggered = this.activeAlerts.get(alertKey)?.lastTriggered;

      // Check cooldown period
      if (lastTriggered && (now.getTime() - lastTriggered.getTime()) < (rule.cooldown * 60 * 1000)) {
        continue;
      }

      // Evaluate rule condition
      const shouldTrigger = await this.evaluateRuleCondition(rule);
      if (shouldTrigger) {
        alerts.push({
          alertType: rule.alertType,
          severity: rule.severity,
          threshold: rule.threshold,
          message: rule.message,
          autoResolve: rule.autoResolve,
          autoResolveAfter: rule.autoResolveAfter
        });

        // Update last triggered time
        this.activeAlerts.set(alertKey, {
          ...alerts[alerts.length - 1],
          createdAt: now,
          lastTriggered: now
        });
      }
    }

    return alerts;
  }

  /**
   * Send alerts through configured channels
   */
  async sendAlerts(alerts: SystemAlertConfig[]): Promise<void> {
    for (const alert of alerts) {
      await this.sendAlertToChannels(alert);
      await this.applyEscalationRules(alert);
    }
  }

  /**
   * Auto-resolve alerts based on conditions
   */
  async autoResolveAlerts(): Promise<string[]> {
    const resolvedAlertIds: string[] = [];
    const now = new Date();

    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.autoResolve && alert.autoResolveAfter) {
        const age = (now.getTime() - alert.createdAt.getTime()) / (1000 * 60); // age in minutes
        if (age >= alert.autoResolveAfter) {
          this.activeAlerts.delete(alertId);
          resolvedAlertIds.push(alertId);
        }
      }
    }

    return resolvedAlertIds;
  }

  // ============================================================================
  // ALERT RULE MANAGEMENT
  // ============================================================================

  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.alertRules.push({ ...rule, id });
    return id;
  }

  updateAlertRule(id: string, updates: Partial<AlertRule>): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === id);
    if (index === -1) return false;

    this.alertRules[index] = { ...this.alertRules[index], ...updates };
    return true;
  }

  removeAlertRule(id: string): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === id);
    if (index === -1) return false;

    this.alertRules.splice(index, 1);
    return true;
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  // ============================================================================
  // ALERT CHANNEL MANAGEMENT
  // ============================================================================

  addAlertChannel(channel: Omit<AlertChannel, 'id'>): string {
    const id = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.alertChannels.push({ ...channel, id });
    return id;
  }

  updateAlertChannel(id: string, updates: Partial<AlertChannel>): boolean {
    const index = this.alertChannels.findIndex(channel => channel.id === id);
    if (index === -1) return false;

    this.alertChannels[index] = { ...this.alertChannels[index], ...updates };
    return true;
  }

  removeAlertChannel(id: string): boolean {
    const index = this.alertChannels.findIndex(channel => channel.id === id);
    if (index === -1) return false;

    this.alertChannels.splice(index, 1);
    return true;
  }

  getAlertChannels(): AlertChannel[] {
    return [...this.alertChannels];
  }

  // ============================================================================
  // ESCALATION RULE MANAGEMENT
  // ============================================================================

  addEscalationRule(rule: Omit<AlertEscalationRule, 'id'>): string {
    const id = `escalation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.escalationRules.push({ ...rule, id });
    return id;
  }

  getEscalationRules(): AlertEscalationRule[] {
    return [...this.escalationRules];
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async evaluateRuleCondition(rule: AlertRule): Promise<boolean> {
    try {
      switch (rule.alertType) {
        case AlertType.PERFORMANCE:
          return await this.checkModelPerformanceRule(rule);
        case AlertType.COST:
          return await this.checkCostRule(rule);
        case AlertType.ERROR_RATE:
          return await this.checkErrorRateRule(rule);
        case AlertType.QUALITY:
          return await this.checkQualityRule(rule);
        case AlertType.AVAILABILITY:
          return await this.checkAvailabilityRule(rule);
        case AlertType.SYSTEM:
          return await this.checkSystemRule(rule);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error evaluating alert rule ${rule.id}:`, error);
      return false;
    }
  }

  private async checkModelPerformanceRule(rule: AlertRule): Promise<boolean> {
    const models = await this.analysisService.getAllModelsAnalysis();
    const avgHealthScore = models.reduce((sum, model) => sum + model.healthScore, 0) / models.length;
    return avgHealthScore < rule.threshold;
  }

  private async checkCostRule(rule: AlertRule): Promise<boolean> {
    const models = await this.analysisService.getAllModelsAnalysis();
    const totalCost = models.reduce((sum, model) => sum + model.totalCost, 0);
    return totalCost > rule.threshold;
  }

  private async checkErrorRateRule(rule: AlertRule): Promise<boolean> {
    const models = await this.analysisService.getAllModelsAnalysis();
    const avgErrorRate = models.reduce((sum, model) => sum + model.errorRate, 0) / models.length;
    return avgErrorRate > rule.threshold;
  }

  private async checkQualityRule(rule: AlertRule): Promise<boolean> {
    const models = await this.analysisService.getAllModelsAnalysis();
    const avgResponseTime = models.reduce((sum, model) => sum + model.averageResponseTime, 0) / models.length;
    return avgResponseTime > rule.threshold;
  }

  private async checkAvailabilityRule(rule: AlertRule): Promise<boolean> {
    const models = await this.analysisService.getAllModelsAnalysis();
    const unavailableModels = models.filter(model => model.status !== MonitoringAIModelStatus.ACTIVE).length;
    const availabilityRate = ((models.length - unavailableModels) / models.length) * 100;
    return availabilityRate < rule.threshold;
  }

  private async checkSystemRule(rule: AlertRule): Promise<boolean> {
    // This would integrate with security monitoring systems
    // For now, return false (no security alerts)
    return false;
  }

  private async sendAlertToChannels(alert: SystemAlertConfig): Promise<void> {
    const enabledChannels = this.alertChannels.filter(channel => channel.enabled);

    for (const channel of enabledChannels) {
      try {
        await this.sendAlertToChannel(alert, channel);
      } catch (error) {
        console.error(`Failed to send alert to channel ${channel.id}:`, error);
      }
    }
  }

  private async sendAlertToChannel(alert: SystemAlertConfig, channel: AlertChannel): Promise<void> {
    const alertData = {
      severity: alert.severity,
      type: alert.alertType,
      message: alert.message,
      threshold: alert.threshold,
      modelId: alert.modelId,
      timestamp: new Date().toISOString()
    };

    switch (channel.type) {
      case 'email':
        await this.sendEmailAlert(channel, alertData);
        break;
      case 'slack':
        await this.sendSlackAlert(channel, alertData);
        break;
      case 'discord':
        await this.sendDiscordAlert(channel, alertData);
        break;
      case 'webhook':
        await this.sendWebhookAlert(channel, alertData);
        break;
      case 'sms':
        await this.sendSMSAlert(channel, alertData);
        break;
    }
  }

  private async applyEscalationRules(alert: SystemAlertConfig): Promise<void> {
    for (const rule of this.escalationRules) {
      if (this.shouldEscalateAlert(alert, rule)) {
        await this.executeEscalationActions(alert, rule);
      }
    }
  }

  private shouldEscalateAlert(alert: SystemAlertConfig, rule: AlertEscalationRule): boolean {
    return alert.severity === rule.conditions.severity;
  }

  private async executeEscalationActions(alert: SystemAlertConfig, rule: AlertEscalationRule): Promise<void> {
    // Send to additional channels
    for (const channelId of rule.actions.channels) {
      const channel = this.alertChannels.find(c => c.id === channelId);
      if (channel) {
        await this.sendAlertToChannel(alert, channel);
      }
    }

    // Log escalation
    console.log(`Alert escalated: ${alert.message} (Severity: ${alert.severity})`);
  }

  // ============================================================================
  // NOTIFICATION METHODS (Mock implementations)
  // ============================================================================

  private async sendEmailAlert(channel: AlertChannel, alertData: any): Promise<void> {
    console.log(`📧 Email alert sent to ${channel.config.email}:`, alertData);
    // Implementation would integrate with email service (SendGrid, AWS SES, etc.)
  }

  private async sendSlackAlert(channel: AlertChannel, alertData: any): Promise<void> {
    console.log(`💬 Slack alert sent to ${channel.config.channel}:`, alertData);
    // Implementation would integrate with Slack API
  }

  private async sendDiscordAlert(channel: AlertChannel, alertData: any): Promise<void> {
    console.log(`🎮 Discord alert sent to ${channel.config.webhookUrl}:`, alertData);
    // Implementation would integrate with Discord webhooks
  }

  private async sendWebhookAlert(channel: AlertChannel, alertData: any): Promise<void> {
    console.log(`🔗 Webhook alert sent to ${channel.config.url}:`, alertData);
    // Implementation would make HTTP request to webhook URL
  }

  private async sendSMSAlert(channel: AlertChannel, alertData: any): Promise<void> {
    console.log(`📱 SMS alert sent to ${channel.config.phoneNumber}:`, alertData);
    // Implementation would integrate with SMS service (Twilio, AWS SNS, etc.)
  }

  // ============================================================================
  // DEFAULT CONFIGURATIONS
  // ============================================================================

  private initializeDefaultRules(): void {
    this.alertRules = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate Alert',
        description: 'Triggers when average error rate across models exceeds 5%',
        alertType: AlertType.ERROR_RATE,
        severity: AlertSeverity.MEDIUM,
        condition: () => true, // Handled in evaluateRuleCondition
        threshold: 5,
        message: 'High error rate detected across AI models',
        autoResolve: false,
        cooldown: 30,
        enabled: true,
        tags: ['performance', 'reliability']
      },
      {
        id: 'low_quality',
        name: 'Slow Response Time Alert',
        description: 'Triggers when average response time exceeds 5 seconds',
        alertType: AlertType.QUALITY,
        severity: AlertSeverity.MEDIUM,
        condition: () => true,
        threshold: 5000,
        message: 'Slow response times detected across AI models',
        autoResolve: false,
        cooldown: 15,
        enabled: true,
        tags: ['performance', 'latency']
      },
      {
        id: 'high_cost',
        name: 'Cost Spike Alert',
        description: 'Triggers when daily costs exceed budget threshold',
        alertType: AlertType.COST,
        severity: AlertSeverity.HIGH,
        condition: () => true,
        threshold: 100,
        message: 'Daily AI costs have exceeded budget threshold',
        autoResolve: false,
        cooldown: 60,
        enabled: true,
        tags: ['cost', 'budget']
      },
      {
        id: 'model_unavailable',
        name: 'Model Unavailable Alert',
        description: 'Triggers when model availability drops below 95%',
        alertType: AlertType.AVAILABILITY,
        severity: AlertSeverity.HIGH,
        condition: () => true,
        threshold: 95,
        message: 'Critical AI model availability issue detected',
        autoResolve: true,
        autoResolveAfter: 30,
        cooldown: 5,
        enabled: true,
        tags: ['availability', 'critical']
      }
    ];
  }

  private initializeDefaultChannels(): void {
    this.alertChannels = [
      {
        id: 'admin_email',
        name: 'Admin Email',
        type: 'email',
        config: {
          email: process.env.ADMIN_EMAIL || 'admin@tigerpalacepro.com'
        },
        enabled: true
      },
      {
        id: 'devops_slack',
        name: 'DevOps Slack',
        type: 'slack',
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: '#devops-alerts'
        },
        enabled: !!process.env.SLACK_WEBHOOK_URL
      }
    ];
  }

  private initializeEscalationRules(): void {
    this.escalationRules = [
      {
        id: 'critical_escalation',
        name: 'Critical Alert Escalation',
        conditions: {
          severity: AlertSeverity.HIGH,
          duration: 5,
          repeatCount: 1
        },
        actions: {
          channels: ['admin_email', 'devops_slack'],
          escalateTo: ['admin', 'devops'],
          priority: 'urgent'
        }
      },
      {
        id: 'warning_escalation',
        name: 'Warning Alert Escalation',
        conditions: {
          severity: AlertSeverity.MEDIUM,
          duration: 30,
          repeatCount: 3
        },
        actions: {
          channels: ['devops_slack'],
          escalateTo: ['devops'],
          priority: 'medium'
        }
      }
    ];
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const systemAlerting = SystemAlertingService.getInstance();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getAlertSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case AlertSeverity.LOW:
      return '#3B82F6'; // Blue
    case AlertSeverity.MEDIUM:
      return '#F59E0B'; // Yellow
    case AlertSeverity.HIGH:
      return '#EF4444'; // Red
    case AlertSeverity.HIGH:
      return '#DC2626'; // Dark Red
    default:
      return '#6B7280'; // Gray
  }
}

export function getAlertSeverityLabel(severity: AlertSeverity): string {
  switch (severity) {
    case AlertSeverity.LOW:
      return 'Info';
    case AlertSeverity.MEDIUM:
      return 'Warning';
    case AlertSeverity.HIGH:
      return 'High';
    case AlertSeverity.CRITICAL:
      return 'Critical';
    default:
      return 'Unknown';
  }
}

export function getAlertTypeLabel(type: AlertType): string {
  switch (type) {
    case AlertType.PERFORMANCE:
      return 'Model Performance';
    case AlertType.COST:
      return 'Cost';
    case AlertType.ERROR_RATE:
      return 'Error Rate';
    case AlertType.QUALITY:
      return 'Quality';
    case AlertType.AVAILABILITY:
      return 'Availability';
    case AlertType.SYSTEM:
      return 'System';
    default:
      return 'Unknown';
  }
}
