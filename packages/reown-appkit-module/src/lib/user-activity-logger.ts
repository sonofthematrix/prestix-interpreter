/**
 * User Activity Logger
 * Comprehensive logging system for user interactions, business flow analysis, and efficiency monitoring
 */

import { z } from 'zod';
import { mcpLogger } from './mcp-logger';

// ============================================================================
// USER ACTIVITY TYPES
// ============================================================================

export enum ActivityType {
  USER_INTERACTION = 'user_interaction',
  BUSINESS_FLOW = 'business_flow',
  SYSTEM_OPERATION = 'system_operation',
  AI_INTERACTION = 'ai_interaction',
  ERROR_EVENT = 'error_event',
  PERFORMANCE_METRIC = 'performance_metric',
  SECURITY_EVENT = 'security_event',
}

export enum UserRole {
  ADMIN = 'admin',
  AGENT = 'agent',
  USER = 'user',
  SYSTEM = 'system',
}

export interface UserActivity {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  role: UserRole;
  activityType: ActivityType;
  category: string;
  action: string;
  description: string;
  metadata: Record<string, any>;
  duration?: number;
  success: boolean;
  errorMessage?: string;
  businessValue?: number; // Quantitative business impact
  efficiencyScore?: number; // 0-100 scale
  tags: string[];
}

export interface BusinessFlow {
  id: string;
  name: string;
  description: string;
  steps: UserActivity[];
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  success: boolean;
  businessValue: number;
  efficiencyScore: number;
  bottlenecks: string[];
  optimizationSuggestions: string[];
}

export interface EfficiencyMetrics {
  averageTaskDuration: number;
  taskCompletionRate: number;
  errorRate: number;
  userSatisfactionScore: number;
  businessValueGenerated: number;
  automationPotential: number; // Percentage of tasks that could be automated
}

// ============================================================================
// USER ACTIVITY LOGGER CLASS
// ============================================================================

export class UserActivityLogger {
  private static instance: UserActivityLogger;
  private activities: UserActivity[] = [];
  private businessFlows: BusinessFlow[] = [];
  private maxActivities = 10000;
  private maxFlows = 1000;
  private sessionFlows: Map<string, BusinessFlow> = new Map();

  private constructor() {}

  static getInstance(): UserActivityLogger {
    if (!UserActivityLogger.instance) {
      UserActivityLogger.instance = new UserActivityLogger();
    }
    return UserActivityLogger.instance;
  }

  /**
   * Log user activity
   */
  logActivity(activity: Omit<UserActivity, 'id' | 'timestamp'>): UserActivity {
    const userActivity: UserActivity = {
      ...activity,
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.activities.push(userActivity);

    // Maintain size limit
    if (this.activities.length > this.maxActivities) {
      this.activities = this.activities.slice(-this.maxActivities);
    }

    // Log to MCP logger for integration
    mcpLogger.info('USER_ACTIVITY', userActivity.description, {
      userId: userActivity.userId,
      activityType: userActivity.activityType,
      category: userActivity.category,
      success: userActivity.success,
      duration: userActivity.duration,
      businessValue: userActivity.businessValue,
    }, userActivity.action, userActivity.duration);

    // Update business flows
    this.updateBusinessFlows(userActivity);

    return userActivity;
  }

  /**
   * Start a business flow
   */
  startBusinessFlow(
    sessionId: string,
    name: string,
    description: string,
    userId?: string,
    initialActivity?: Partial<UserActivity>
  ): BusinessFlow {
    const flow: BusinessFlow = {
      id: `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      steps: [],
      startTime: new Date(),
      success: false,
      businessValue: 0,
      efficiencyScore: 0,
      bottlenecks: [],
      optimizationSuggestions: [],
    };

    this.businessFlows.push(flow);
    this.sessionFlows.set(sessionId, flow);

    // Log initial activity if provided
    if (initialActivity) {
      const activity = this.logActivity({
        ...initialActivity,
        sessionId,
        userId,
        role: initialActivity.role || UserRole.SYSTEM,
        activityType: ActivityType.BUSINESS_FLOW,
        category: 'flow_start',
        action: 'start_flow',
        description: `Started business flow: ${name}`,
        success: true,
        tags: ['flow_start', name.toLowerCase().replace(/\s+/g, '_')],
        metadata: initialActivity.metadata || {},

      });
      flow.steps.push(activity);
    }

    return flow;
  }

  /**
   * End a business flow
   */
  endBusinessFlow(sessionId: string, success: boolean = true, finalActivity?: Partial<UserActivity>): BusinessFlow | null {
    const flow = this.sessionFlows.get(sessionId);
    if (!flow) return null;

    flow.endTime = new Date();
    flow.totalDuration = flow.endTime.getTime() - flow.startTime.getTime();
    flow.success = success;

    // Calculate metrics
    flow.businessValue = flow.steps.reduce((sum, step) => sum + (step.businessValue || 0), 0);
    flow.efficiencyScore = this.calculateEfficiencyScore(flow);
    flow.bottlenecks = this.identifyBottlenecks(flow);
    flow.optimizationSuggestions = this.generateOptimizationSuggestions(flow);

    // Log final activity if provided
    if (finalActivity) {
      const activity = this.logActivity({
        ...finalActivity,
        sessionId,
        role: finalActivity.role || UserRole.SYSTEM,
        activityType: ActivityType.BUSINESS_FLOW,
        category: 'flow_end',
        action: 'end_flow',
        description: `Completed business flow: ${flow.name} (${success ? 'success' : 'failed'})`,
        success,
        duration: flow.totalDuration,
        businessValue: flow.businessValue,
        efficiencyScore: flow.efficiencyScore,
        tags: ['flow_end', flow.name.toLowerCase().replace(/\s+/g, '_'), success ? 'success' : 'failed'],
        metadata: finalActivity.metadata || {},
      });
      flow.steps.push(activity);
    }

    this.sessionFlows.delete(sessionId);
    return flow;
  }

  /**
   * Get activities for analysis
   */
  getActivities(options: {
    userId?: string;
    sessionId?: string;
    activityType?: ActivityType;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    tags?: string[];
  } = {}): UserActivity[] {
    let filtered = this.activities;

    if (options.userId) {
      filtered = filtered.filter(a => a.userId === options.userId);
    }
    if (options.sessionId) {
      filtered = filtered.filter(a => a.sessionId === options.sessionId);
    }
    if (options.activityType) {
      filtered = filtered.filter(a => a.activityType === options.activityType);
    }
    if (options.category) {
      filtered = filtered.filter(a => a.category === options.category);
    }
    if (options.startDate) {
      filtered = filtered.filter(a => a.timestamp >= options.startDate!);
    }
    if (options.endDate) {
      filtered = filtered.filter(a => a.timestamp <= options.endDate!);
    }
    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter(a => options.tags!.some(tag => a.tags.includes(tag)));
    }

    if (options.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Get business flows for analysis
   */
  getBusinessFlows(options: {
    userId?: string;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): BusinessFlow[] {
    let filtered = this.businessFlows;

    if (options.userId) {
      filtered = filtered.filter(f => f.steps.some(s => s.userId === options.userId));
    }
    if (options.success !== undefined) {
      filtered = filtered.filter(f => f.success === options.success);
    }
    if (options.startDate) {
      filtered = filtered.filter(f => f.startTime >= options.startDate!);
    }
    if (options.endDate) {
      filtered = filtered.filter(f => f.endTime && f.endTime <= options.endDate!);
    }

    if (options.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Get efficiency metrics
   */
  getEfficiencyMetrics(timeRange?: { start: Date; end: Date }): EfficiencyMetrics {
    const activities = timeRange
      ? this.activities.filter(a => a.timestamp >= timeRange.start && a.timestamp <= timeRange.end)
      : this.activities;

    const completedTasks = activities.filter(a => a.success && a.activityType === ActivityType.USER_INTERACTION);
    const totalTasks = activities.filter(a => a.activityType === ActivityType.USER_INTERACTION);

    const taskDurations = completedTasks
      .map(a => a.duration || 0)
      .filter(d => d > 0);

    const averageTaskDuration = taskDurations.length > 0
      ? taskDurations.reduce((sum, d) => sum + d, 0) / taskDurations.length
      : 0;

    const taskCompletionRate = totalTasks.length > 0
      ? (completedTasks.length / totalTasks.length) * 100
      : 0;

    const errorActivities = activities.filter(a => !a.success);
    const errorRate = activities.length > 0
      ? (errorActivities.length / activities.length) * 100
      : 0;

    const businessValueGenerated = activities.reduce((sum, a) => sum + (a.businessValue || 0), 0);

    // Calculate automation potential based on repetitive tasks
    const taskPatterns = this.analyzeTaskPatterns(activities);
    const automationPotential = Math.min(taskPatterns.repetitiveTasksPercentage, 80);

    return {
      averageTaskDuration,
      taskCompletionRate,
      errorRate,
      userSatisfactionScore: this.calculateUserSatisfaction(activities),
      businessValueGenerated,
      automationPotential,
    };
  }

  /**
   * Export activities to log file
   */
  exportActivitiesToLog(options: {
    startDate?: Date;
    endDate?: Date;
    format?: 'json' | 'csv' | 'text';
    includeMetadata?: boolean;
  } = {}): string {
    const activities = this.getActivities({
      startDate: options.startDate,
      endDate: options.endDate,
    });

    switch (options.format) {
      case 'json':
        return JSON.stringify(activities, null, 2);

      case 'csv':
        const headers = ['timestamp', 'userId', 'role', 'activityType', 'category', 'action', 'description', 'success', 'duration', 'businessValue', 'efficiencyScore', 'tags'];
        const csvData = activities.map(activity => [
          activity.timestamp.toISOString(),
          activity.userId || '',
          activity.role,
          activity.activityType,
          activity.category,
          activity.action,
          activity.description,
          activity.success.toString(),
          activity.duration?.toString() || '',
          activity.businessValue?.toString() || '',
          activity.efficiencyScore?.toString() || '',
          activity.tags.join(';'),
        ]);

        return [headers, ...csvData].map(row => row.join(',')).join('\n');

      case 'text':
      default:
        return activities.map(activity =>
          `[${activity.timestamp.toISOString()}] [${activity.role}] [${activity.activityType}] ${activity.description} (${activity.success ? 'SUCCESS' : 'FAILED'})`
        ).join('\n');
    }
  }

  /**
   * Get investigation report for security/incident analysis
   */
  getInvestigationReport(options: {
    userId?: string;
    sessionId?: string;
    activityType?: ActivityType;
    startDate: Date;
    endDate: Date;
    includeBusinessFlows?: boolean;
  }): {
    activities: UserActivity[];
    businessFlows: BusinessFlow[];
    summary: {
      totalActivities: number;
      successRate: number;
      errorActivities: UserActivity[];
      suspiciousActivities: UserActivity[];
      businessValueGenerated: number;
      efficiencyScore: number;
    };
  } {
    const activities = this.getActivities(options);
    const businessFlows = options.includeBusinessFlows
      ? this.getBusinessFlows({ ...options, startDate: options.startDate, endDate: options.endDate })
      : [];

    const successRate = activities.length > 0
      ? (activities.filter(a => a.success).length / activities.length) * 100
      : 0;

    const errorActivities = activities.filter(a => !a.success);
    const suspiciousActivities = this.identifySuspiciousActivities(activities);
    const businessValueGenerated = activities.reduce((sum, a) => sum + (a.businessValue || 0), 0);

    const efficiencyMetrics = this.getEfficiencyMetrics({ start: options.startDate, end: options.endDate });

    return {
      activities,
      businessFlows,
      summary: {
        totalActivities: activities.length,
        successRate,
        errorActivities,
        suspiciousActivities,
        businessValueGenerated,
        efficiencyScore: efficiencyMetrics.userSatisfactionScore,
      },
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private updateBusinessFlows(activity: UserActivity): void {
    const flow = this.sessionFlows.get(activity.sessionId);
    if (flow) {
      flow.steps.push(activity);
    }
  }

  private calculateEfficiencyScore(flow: BusinessFlow): number {
    if (flow.steps.length === 0) return 0;

    const avgDuration = flow.totalDuration! / flow.steps.length;
    const successRate = flow.steps.filter(s => s.success).length / flow.steps.length;
    const errorPenalty = (1 - successRate) * 30; // 30% penalty for errors

    // Base score from duration (faster = higher score)
    const durationScore = Math.max(0, 100 - (avgDuration / 1000)); // Assume < 100s is good

    return Math.max(0, Math.min(100, durationScore - errorPenalty));
  }

  private identifyBottlenecks(flow: BusinessFlow): string[] {
    const bottlenecks: string[] = [];

    // Find steps that took longer than average
    const durations = flow.steps.map(s => s.duration || 0).filter(d => d > 0);
    if (durations.length > 0) {
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const slowSteps = flow.steps.filter(s => (s.duration || 0) > avgDuration * 1.5);
      slowSteps.forEach(step => {
        bottlenecks.push(`${step.action}: ${step.duration}ms (avg: ${avgDuration.toFixed(0)}ms)`);
      });
    }

    // Find failed steps
    const failedSteps = flow.steps.filter(s => !s.success);
    failedSteps.forEach(step => {
      bottlenecks.push(`Failed: ${step.action} - ${step.errorMessage || 'Unknown error'}`);
    });

    return bottlenecks;
  }

  private generateOptimizationSuggestions(flow: BusinessFlow): string[] {
    const suggestions: string[] = [];

    if (flow.bottlenecks.length > 3) {
      suggestions.push('Consider breaking down this flow into smaller, more manageable steps');
    }

    if (flow.totalDuration! > 300000) { // 5 minutes
      suggestions.push('Flow duration is too long - consider automation or parallel processing');
    }

    const errorRate = flow.steps.filter(s => !s.success).length / flow.steps.length;
    if (errorRate > 0.2) {
      suggestions.push('High error rate detected - review error handling and validation');
    }

    const repetitiveSteps = flow.steps.filter((step, index, arr) =>
      arr.findIndex(s => s.action === step.action) !== index
    );
    if (repetitiveSteps.length > flow.steps.length * 0.3) {
      suggestions.push('High repetition detected - consider creating reusable components');
    }

    return suggestions;
  }

  private analyzeTaskPatterns(activities: UserActivity[]): { repetitiveTasksPercentage: number; patterns: string[] } {
    const taskCounts = activities.reduce((acc, activity) => {
      acc[activity.action] = (acc[activity.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalTasks = activities.length;
    const repetitiveTasks = Object.values(taskCounts).filter(count => count > 1).reduce((sum, count) => sum + count, 0);

    return {
      repetitiveTasksPercentage: totalTasks > 0 ? (repetitiveTasks / totalTasks) * 100 : 0,
      patterns: Object.entries(taskCounts)
        .filter(([_, count]) => count > 1)
        .map(([action, count]) => `${action}: ${count} times`),
    };
  }

  private calculateUserSatisfaction(activities: UserActivity[]): number {
    if (activities.length === 0) return 0;

    const successRate = activities.filter(a => a.success).length / activities.length;
    const avgEfficiency = activities
      .map(a => a.efficiencyScore || 50)
      .reduce((sum, score) => sum + score, 0) / activities.length;

    return (successRate * 40) + (avgEfficiency * 0.6); // Weighted average
  }

  private identifySuspiciousActivities(activities: UserActivity[]): UserActivity[] {
    return activities.filter(activity => {
      // Suspicious patterns
      const isSuspicious =
        activity.activityType === ActivityType.SECURITY_EVENT ||
        !activity.success && activity.errorMessage?.includes('unauthorized') ||
        activity.metadata?.suspicious === true ||
        activity.tags.includes('security') ||
        activity.tags.includes('anomaly');

      return isSuspicious;
    });
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const userActivityLogger = UserActivityLogger.getInstance();

// Convenience functions
export const logUserActivity = (activity: Omit<UserActivity, 'id' | 'timestamp'>) =>
  userActivityLogger.logActivity(activity);

export const startBusinessFlow = (
  sessionId: string,
  name: string,
  description: string,
  userId?: string,
  initialActivity?: Partial<UserActivity>
) => userActivityLogger.startBusinessFlow(sessionId, name, description, userId, initialActivity);

export const endBusinessFlow = (sessionId: string, success?: boolean, finalActivity?: Partial<UserActivity>) =>
  userActivityLogger.endBusinessFlow(sessionId, success, finalActivity);
