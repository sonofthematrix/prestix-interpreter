/**
 * Context Window Monitor
 * Monitors context window usage and provides optimization recommendations
 */

import { z } from 'zod';

// ============================================================================
// CONTEXT MONITORING TYPES
// ============================================================================

export interface ContextMetrics {
  currentTokens: number;
  maxTokens: number;
  utilizationPercentage: number;
  estimatedCost: number;
  modelType: string;
  timestamp: Date;
  sessionId: string;
}

export interface ContextOptimization {
  id: string;
  type: 'compression' | 'summarization' | 'archival' | 'cleanup';
  description: string;
  estimatedSavings: number;
  impact: 'low' | 'medium' | 'high';
  implementation: string;
}

export interface ContextWindowConfig {
  modelType: string;
  maxTokens: number;
  warningThreshold: number; // percentage
  criticalThreshold: number; // percentage
  autoOptimization: boolean;
  costPerToken: number;
}

// ============================================================================
// CONTEXT MONITOR CLASS
// ============================================================================

export class ContextMonitor {
  private static instance: ContextMonitor;
  private metrics: ContextMetrics[] = [];
  private config: ContextWindowConfig;
  private currentSessionId: string;

  private constructor() {
    this.currentSessionId = `session-${Date.now()}`;
    this.config = {
      modelType: 'gpt-4',
      maxTokens: 128000, // GPT-4 context window
      warningThreshold: 70,
      criticalThreshold: 90,
      autoOptimization: true,
      costPerToken: 0.00003 // $0.03 per 1K tokens
    };
  }

  static getInstance(): ContextMonitor {
    if (!ContextMonitor.instance) {
      ContextMonitor.instance = new ContextMonitor();
    }
    return ContextMonitor.instance;
  }

  /**
   * Update context metrics
   */
  updateMetrics(currentTokens: number, modelType?: string): ContextMetrics {
    const metrics: ContextMetrics = {
      currentTokens,
      maxTokens: this.config.maxTokens,
      utilizationPercentage: (currentTokens / this.config.maxTokens) * 100,
      estimatedCost: currentTokens * this.config.costPerToken,
      modelType: modelType || this.config.modelType,
      timestamp: new Date(),
      sessionId: this.currentSessionId
    };

    this.metrics.push(metrics);
    this.checkThresholds(metrics);

    return metrics;
  }

  /**
   * Get current context status
   */
  getStatus(): {
    current: ContextMetrics | null;
    history: ContextMetrics[];
    recommendations: ContextOptimization[];
    isWarning: boolean;
    isCritical: boolean;
  } {
    const current = this.metrics[this.metrics.length - 1] || null;
    const isWarning = current ? current.utilizationPercentage >= this.config.warningThreshold : false;
    const isCritical = current ? current.utilizationPercentage >= this.config.criticalThreshold : false;
    
    return {
      current,
      history: this.metrics,
      recommendations: this.getOptimizationRecommendations(current),
      isWarning,
      isCritical
    };
  }

  /**
   * Get optimization recommendations
   */
  private getOptimizationRecommendations(current: ContextMetrics | null): ContextOptimization[] {
    if (!current) return [];

    const recommendations: ContextOptimization[] = [];

    if (current.utilizationPercentage >= 80) {
      recommendations.push({
        id: 'compress-history',
        type: 'compression',
        description: 'Compress conversation history to reduce token usage',
        estimatedSavings: current.currentTokens * 0.3,
        impact: 'medium',
        implementation: 'Use conversation summarization to reduce history size'
      });
    }

    if (current.utilizationPercentage >= 90) {
      recommendations.push({
        id: 'archive-old-context',
        type: 'archival',
        description: 'Archive old context and keep only recent conversation',
        estimatedSavings: current.currentTokens * 0.5,
        impact: 'high',
        implementation: 'Move older context to external storage and reference when needed'
      });
    }

    if (current.utilizationPercentage >= 95) {
      recommendations.push({
        id: 'emergency-cleanup',
        type: 'cleanup',
        description: 'Emergency context cleanup - remove non-essential information',
        estimatedSavings: current.currentTokens * 0.4,
        impact: 'high',
        implementation: 'Remove verbose explanations and keep only essential data'
      });
    }

    return recommendations;
  }

  /**
   * Check thresholds and trigger alerts
   */
  private checkThresholds(metrics: ContextMetrics): void {
    if (metrics.utilizationPercentage >= this.config.criticalThreshold) {
      console.warn('🚨 CRITICAL: Context window utilization at', metrics.utilizationPercentage.toFixed(1) + '%');
      this.triggerCriticalAlert(metrics);
    } else if (metrics.utilizationPercentage >= this.config.warningThreshold) {
      console.warn('⚠️ WARNING: Context window utilization at', metrics.utilizationPercentage.toFixed(1) + '%');
      this.triggerWarningAlert(metrics);
    }
  }

  /**
   * Trigger critical alert
   */
  private triggerCriticalAlert(metrics: ContextMetrics): void {
    // In a real implementation, this would send alerts to monitoring systems
    console.error('Context window critical threshold reached:', {
      tokens: metrics.currentTokens,
      maxTokens: metrics.maxTokens,
      utilization: metrics.utilizationPercentage,
      estimatedCost: metrics.estimatedCost
    });
  }

  /**
   * Trigger warning alert
   */
  private triggerWarningAlert(metrics: ContextMetrics): void {
    console.warn('Context window warning threshold reached:', {
      tokens: metrics.currentTokens,
      maxTokens: metrics.maxTokens,
      utilization: metrics.utilizationPercentage,
      estimatedCost: metrics.estimatedCost
    });
  }

  /**
   * Estimate cost for given token count
   */
  estimateCost(tokens: number, modelType?: string): number {
    const costPerToken = this.getCostPerToken(modelType || this.config.modelType);
    return tokens * costPerToken;
  }

  /**
   * Get cost per token for different models
   */
  private getCostPerToken(modelType: string): number {
    const costs: Record<string, number> = {
      'gpt-4': 0.00003,
      'gpt-4-turbo': 0.00001,
      'gpt-3.5-turbo': 0.000002,
      'claude-3-opus': 0.000015,
      'claude-3-sonnet': 0.000003,
      'claude-3-haiku': 0.00000025
    };
    return costs[modelType] || this.config.costPerToken;
  }

  /**
   * Reset session
   */
  resetSession(): void {
    this.currentSessionId = `session-${Date.now()}`;
    this.metrics = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ContextWindowConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get context analytics
   */
  getAnalytics(): {
    totalTokens: number;
    averageUtilization: number;
    peakUtilization: number;
    totalCost: number;
    sessionDuration: number;
  } {
    if (this.metrics.length === 0) {
      return {
        totalTokens: 0,
        averageUtilization: 0,
        peakUtilization: 0,
        totalCost: 0,
        sessionDuration: 0
      };
    }

    const totalTokens = this.metrics.reduce((sum, m) => sum + m.currentTokens, 0);
    const averageUtilization = this.metrics.reduce((sum, m) => sum + m.utilizationPercentage, 0) / this.metrics.length;
    const peakUtilization = Math.max(...this.metrics.map(m => m.utilizationPercentage));
    const totalCost = this.metrics.reduce((sum, m) => sum + m.estimatedCost, 0);
    const sessionDuration = this.metrics.length > 1 ? 
      this.metrics[this.metrics.length - 1].timestamp.getTime() - this.metrics[0].timestamp.getTime() : 0;

    return {
      totalTokens,
      averageUtilization,
      peakUtilization,
      totalCost,
      sessionDuration
    };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const contextMonitor = ContextMonitor.getInstance();
