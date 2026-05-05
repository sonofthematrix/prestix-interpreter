/**
 * AI Model Analysis and Monitoring Service
 * Comprehensive analysis of AI models integrated into the chatbot and AI Builder
 */

import { type modelID, MODEL_INFO, ModelInfo, getModelInfo } from '../../../../src/ai/providers';
import { AIModelProvider, AIModelStatus, AlertSeverity, AlertType } from '../../../../src/lib/monitoring-schema';
import { getAlertTypeLabel } from './system-alerting';

// ============================================================================
// AI MODEL ANALYSIS TYPES
// ============================================================================

export interface ModelPerformanceMetrics {
  modelId: modelID;
  provider: AIModelProvider;
  status: AIModelStatus;

  // Performance Metrics
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;

  // Usage Statistics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;

  // Token Economics
  totalTokensUsed: number;
  promptTokensUsed: number;
  completionTokensUsed: number;
  averageTokensPerRequest: number;

  // Cost Analysis
  totalCost: number;
  costPerToken: number;
  costPerRequest: number;

  // Quality Metrics
  userSatisfaction?: number; // 0-5 scale
  responseQuality?: number;  // 0-10 scale
  contextRelevance?: number; // 0-10 scale

  // Health Score (0-100)
  healthScore: number;
}

export interface ModelComparisonResult {
  modelA: modelID;
  modelB: modelID;
  winner: 'A' | 'B' | 'tie';

  // Comparative Scores (0-100)
  performanceScore: number;
  costEfficiency: number;
  qualityScore: number;
  speedScore: number;

  // Detailed Comparisons
  avgResponseTimeA: number;
  avgResponseTimeB: number;
  costPerRequestA: number;
  costPerRequestB: number;
  errorRateA: number;
  errorRateB: number;

  // Insights and Recommendations
  insights: string[];
  recommendations: string[];
}

export interface SystemAlertConfig {
  modelId?: modelID;
  alertType: AlertType;
  severity: AlertSeverity;
  threshold: number;
  message: string;
  autoResolve: boolean;
  autoResolveAfter?: number; // minutes
}

// ============================================================================
// CURRENT MODEL CONFIGURATIONS
// ============================================================================

export const SUPPORTED_MODELS : Record<modelID, ModelInfo> = {
  'meta-llama/Llama-3.3-70B-Instruct-Turbo': {
    id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    provider: AIModelProvider.DEEPINFRA,  
    name: 'Llama 3.3 70B',
    description: 'High-performance Llama model with excellent reasoning capabilities',
    capabilities: ['Code Generation', 'Reasoning', 'Analysis', 'Documentation'],
    maxTokens: 4096,
    cost: 'medium'
  },
  'moonshotai/Kimi-K2-Instruct': {
    id: 'moonshotai/Kimi-K2-Instruct',
    provider: AIModelProvider.DEEPINFRA,
    name: 'Kimi K2',
    description: 'Advanced instruction-following model with strong coding abilities',
    capabilities: ['Code Generation', 'Instruction Following', 'Analysis', 'Problem Solving'],
    maxTokens: 4096,
    cost: 'medium'
  },
  'gpt-4o': {
    id: 'gpt-4o',
    provider: AIModelProvider.OPENAI,
    name: 'GPT-4o',
    description: 'Latest GPT-4 model with vision capabilities and advanced reasoning',
    capabilities: ['Code Generation', 'Vision', 'Reasoning', 'Analysis', 'Creative Writing'],
    maxTokens: 128000,
    cost: 'high'
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: AIModelProvider.OPENAI,
    name: 'GPT-4o Mini',
    description: 'Cost-effective GPT-4 variant with good performance',
    capabilities: ['Code Generation', 'Analysis', 'Documentation', 'Quick Responses'],
    maxTokens: 128000,
    cost: 'low'
  },
  'gpt-5-nano': {
    id: 'gpt-5-nano',
    provider: AIModelProvider.OPENAI,
    name: 'GPT-5 Nano',
    description: 'Ultra-efficient GPT-5 variant optimized for speed and cost',
    capabilities: ['Code Generation', 'Quick Responses', 'Analysis', 'Documentation'],
    maxTokens: 128000,
    cost: 'low'
  },
  'claude-3-7-sonnet-20250219': {
    id: 'claude-3-7-sonnet-20250219',
    provider: AIModelProvider.ANTHROPIC,
    name: 'Claude 3.7 Sonnet',
    description: 'Advanced reasoning model with strong coding abilities',
    capabilities: ['Code Generation', 'Advanced Reasoning', 'Analysis', 'Problem Solving', 'Complex Logic'],
    maxTokens: 200000,
    cost: 'high'
  },
  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    provider: AIModelProvider.ANTHROPIC,
    name: 'Claude 3.5 Sonnet',
    description: 'Advanced reasoning model with strong coding abilities',
    capabilities: ['Code Generation', 'Reasoning', 'Analysis', 'Documentation', 'Creative Solutions'],
    maxTokens: 200000,
    cost: 'medium'
  },
  'grok-beta': {
    id: 'grok-beta',
    provider: AIModelProvider.GROQ,
    name: 'Grok Beta',
    description: 'General-purpose AI model with real-time knowledge',
    capabilities: ['General AI', 'Real-time Knowledge', 'Reasoning', 'Analysis', 'Conversational'],
    maxTokens: 128000,
    cost: 'medium'
  },
  'grok-code-faster-1': {
    id: 'grok-code-faster-1',
    provider: AIModelProvider.GROQ,
    name: 'Grok Code Faster 1',
    description: 'Specialized coding model optimized for fast code generation and debugging',
    capabilities: ['Code Generation', 'Fast Processing', 'Debugging', 'Code Analysis', 'Quick Fixes'],
    maxTokens: 128000, 
    cost: 'low'
  }
};

// ============================================================================
// MODEL ANALYSIS SERVICE
// ============================================================================

export class AIModelAnalysisService {
  private static instance: AIModelAnalysisService;

  private constructor() {}

  static getInstance(): AIModelAnalysisService {
    if (!AIModelAnalysisService.instance) {
      AIModelAnalysisService.instance = new AIModelAnalysisService();
    }
    return AIModelAnalysisService.instance;
  }

  /**
   * Get comprehensive analysis of all supported models
   */
  async getAllModelsAnalysis(): Promise<ModelPerformanceMetrics[]> {
    const analysis: ModelPerformanceMetrics[] = [];

    for (const modelId of Object.keys(SUPPORTED_MODELS) as modelID[]) {
      const metrics = await this.getModelPerformanceMetrics(modelId);
      analysis.push(metrics);
    }

    return analysis;
  }

  /**
   * Get detailed performance metrics for a specific model
   */
  async getModelPerformanceMetrics(modelId: modelID): Promise<ModelPerformanceMetrics> {
    const modelInfo = getModelInfo(modelId);
    const modelConfig = SUPPORTED_MODELS[modelId];

    // This would typically fetch from a database/cache
    // For now, return mock data based on model characteristics
    const baseMetrics = this.generateBaseMetrics(modelId);

    return {
      modelId,
      provider: modelConfig.provider as AIModelProvider, 
      status: AIModelStatus.ACTIVE,
      ...baseMetrics,
      healthScore: this.calculateHealthScore(baseMetrics) as number
    };
  }
  
  /**
   * Compare two models across multiple dimensions
   */
  async compareModels(modelA: modelID, modelB: modelID, useCase?: string): Promise<ModelComparisonResult> {
    const metricsA = await this.getModelPerformanceMetrics(modelA);
    const metricsB = await this.getModelPerformanceMetrics(modelB);

    // Calculate comparative scores
    const performanceScore = this.calculatePerformanceScore(metricsA, metricsB);
    const costEfficiency = this.calculateCostEfficiency(metricsA, metricsB);
    const qualityScore = this.calculateQualityScore(metricsA, metricsB);
    const speedScore = this.calculateSpeedScore(metricsA, metricsB);

    // Determine winner based on weighted score
    const weights = { performance: 0.3, cost: 0.3, quality: 0.3, speed: 0.1 };
    const scoreA = (
      performanceScore.A * weights.performance +
      costEfficiency.A * weights.cost +
      qualityScore.A * weights.quality +
      speedScore.A * weights.speed
    );

    const scoreB = (
      performanceScore.B * weights.performance +
      costEfficiency.B * weights.cost +
      qualityScore.B * weights.quality +
      speedScore.B * weights.speed
    );

    let winner: 'A' | 'B' | 'tie';
    if (Math.abs(scoreA - scoreB) < 5) {
      winner = 'tie';
    } else {
      winner = scoreA > scoreB ? 'A' : 'B';
    }

    return {
      modelA,
      modelB,
      winner,
      performanceScore: Math.max(scoreA, scoreB),
      costEfficiency: costEfficiency.winner === modelA ? costEfficiency.A : costEfficiency.B,
      qualityScore: qualityScore.winner === modelA ? qualityScore.A : qualityScore.B,
      speedScore: speedScore.winner === modelA ? speedScore.A : speedScore.B,
      avgResponseTimeA: metricsA.averageResponseTime,
      avgResponseTimeB: metricsB.averageResponseTime,
      costPerRequestA: metricsA.costPerRequest,
      costPerRequestB: metricsB.costPerRequest,
      errorRateA: metricsA.errorRate,
      errorRateB: metricsB.errorRate,
      insights: this.generateComparisonInsights(modelA, modelB, metricsA, metricsB),
      recommendations: this.generateRecommendations(modelA, modelB, useCase)
    };
  }

  /**
   * Generate system alerts based on model performance thresholds
   */
  async generateSystemAlerts(): Promise<SystemAlertConfig[]> {
    const alerts: SystemAlertConfig[] = [];
    const models = await this.getAllModelsAnalysis();

    for (const model of models) {
      // Check error rate threshold
      if (model.errorRate > 5) {
        alerts.push({
          modelId: model.modelId,
          alertType: AlertType.ERROR_RATE,
          severity: model.errorRate > 10 ? AlertSeverity.CRITICAL : AlertSeverity.MEDIUM,
          threshold: 5,
          message: `High error rate detected for ${model.modelId}: ${model.errorRate}%`,
          autoResolve: false
        });
      }

      // Check response time threshold
      if (model.averageResponseTime > 5000) {
        alerts.push({
          modelId: model.modelId,
          alertType: getAlertTypeLabel(AlertType.PERFORMANCE) as AlertType,
          severity: model.averageResponseTime > 10000 ? AlertSeverity.CRITICAL : AlertSeverity.MEDIUM,
          threshold: 5000,
          message: `Slow performance for ${model.modelId}: ${model.averageResponseTime}ms`,
          autoResolve: false
        });
      }

      // Check cost threshold
      if (model.costPerRequest > 0.01) {
        alerts.push({
          alertType: getAlertTypeLabel(AlertType.COST) as AlertType,
          severity: AlertSeverity.MEDIUM,
          threshold: 0.01,
          message: `High cost per request for ${model.modelId}: $${model.costPerRequest}`,
          autoResolve: false
        });
      }

      // Check health score
      if (model.healthScore < 70) {
        alerts.push({
          modelId: model.modelId,
          alertType: getAlertTypeLabel(AlertType.AVAILABILITY) as AlertType,
          severity: model.healthScore < 50 ? AlertSeverity.CRITICAL : AlertSeverity.MEDIUM,
          threshold: 70,
          message: `Low health score for ${model.modelId}: ${model.healthScore}/100`,
          autoResolve: false
        });
      }
    }

    return alerts;
  }

  /**
   * Get model recommendations based on use case and requirements
   */
  getModelRecommendations(requirements: {
    priority: 'cost' | 'quality' | 'speed' | 'balanced';
    useCase: 'code_generation' | 'analysis' | 'chat' | 'documentation';
    budget?: number;
    responseTimeMax?: number;
  }): modelID[] {
    const { priority, useCase, budget, responseTimeMax } = requirements;

    let candidates = Object.keys(SUPPORTED_MODELS) as modelID[];

    // Filter by budget if specified
    if (budget !== undefined) {
      candidates = candidates.filter(modelId => {
        const config = SUPPORTED_MODELS[modelId];
        const estimatedCost = this.getEstimatedCostPerRequest(modelId);
        return estimatedCost <= budget;
      });
    }

    // Filter by response time if specified
    if (responseTimeMax !== undefined) {
      candidates = candidates.filter(modelId => {
        const metrics = this.generateBaseMetrics(modelId);
        return metrics.averageResponseTime <= responseTimeMax;
      });
    }

    // Sort by priority
    candidates.sort((a, b) => {
      const metricsA = this.generateBaseMetrics(a);
      const metricsB = this.generateBaseMetrics(b);

      switch (priority) {
        case 'cost':
          return metricsA.costPerRequest - metricsB.costPerRequest;
        case 'quality':
          return (metricsB.responseQuality || 0) - (metricsA.responseQuality || 0);
        case 'speed':
          return metricsA.averageResponseTime - metricsB.averageResponseTime;
        case 'balanced':
        default:
          // Balanced score: quality + speed - cost
          const scoreA = (metricsA.responseQuality || 5) + (1000 / metricsA.averageResponseTime) - (metricsA.costPerRequest * 100);
          const scoreB = (metricsB.responseQuality || 5) + (1000 / metricsB.averageResponseTime) - (metricsB.costPerRequest * 100);
          return scoreB - scoreA;
      }
    });

    return candidates.slice(0, 3); // Return top 3 recommendations
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private generateBaseMetrics(modelId: modelID): Omit<ModelPerformanceMetrics, 'modelId' | 'provider' | 'status' | 'healthScore'> {
    const modelInfo = getModelInfo(modelId);
    const config = SUPPORTED_MODELS[modelId];

    // Base metrics based on model characteristics
    const baseMetrics = {
      // Performance (varies by model capability)
      averageResponseTime: config.cost === 'low' ? 1500 : config.cost === 'medium' ? 2500 : 4000,
      minResponseTime: config.cost === 'low' ? 800 : config.cost === 'medium' ? 1200 : 2000,
      maxResponseTime: config.cost === 'low' ? 3000 : config.cost === 'medium' ? 5000 : 8000,
      p95ResponseTime: config.cost === 'low' ? 2000 : config.cost === 'medium' ? 3500 : 6000,
      p99ResponseTime: config.cost === 'low' ? 2500 : config.cost === 'medium' ? 4500 : 7500,

      // Usage (mock data - would come from database)
      totalRequests: Math.floor(Math.random() * 10000) + 1000,
      successfulRequests: 0, // Calculated below
      failedRequests: 0, // Calculated below
      errorRate: Math.random() * 3, // 0-3% error rate

      // Token usage
      totalTokensUsed: Math.floor(Math.random() * 1000000) + 100000,
      promptTokensUsed: 0, // Calculated below
      completionTokensUsed: 0, // Calculated below
      averageTokensPerRequest: Math.floor(Math.random() * 1000) + 500,

      // Cost (based on tier)
      totalCost: 0, // Calculated below
      costPerToken: config.cost === 'low' ? 0.0001 : config.cost === 'medium' ? 0.0005 : 0.002,
      costPerRequest: 0, // Calculated below

      // Quality (based on capabilities)
      userSatisfaction: config.capabilities.length >= 4 ? 4.5 : 4.0,
      responseQuality: config.capabilities.length >= 4 ? 8.5 : 7.5,
      contextRelevance: config.capabilities.length >= 4 ? 8.0 : 7.0
    };

    // Calculate derived metrics
    baseMetrics.successfulRequests = Math.floor(baseMetrics.totalRequests * (1 - baseMetrics.errorRate / 100));
    baseMetrics.failedRequests = baseMetrics.totalRequests - baseMetrics.successfulRequests;

    // Estimate token distribution
    baseMetrics.promptTokensUsed = Math.floor(baseMetrics.totalTokensUsed * 0.6);
    baseMetrics.completionTokensUsed = baseMetrics.totalTokensUsed - baseMetrics.promptTokensUsed;

    // Calculate costs
    baseMetrics.totalCost = parseFloat((baseMetrics.totalTokensUsed * baseMetrics.costPerToken).toFixed(2));
    baseMetrics.costPerRequest = parseFloat((baseMetrics.totalCost / baseMetrics.totalRequests).toFixed(4));

    return baseMetrics;
  }

  private calculateHealthScore(metrics: Omit<ModelPerformanceMetrics, 'modelId' | 'provider' | 'status' | 'healthScore'>): number {
    // Health score based on multiple factors
    const responseTimeScore = Math.max(0, 100 - (metrics.averageResponseTime / 50)); // Penalize slow responses
    const errorRateScore = Math.max(0, 100 - (metrics.errorRate * 10)); // Penalize high error rates
    const costScore = Math.max(0, 100 - (metrics.costPerRequest * 5000)); // Penalize high costs
    const qualityScore = ((metrics.responseQuality || 7.5) / 10) * 100;

    return Math.round((responseTimeScore + errorRateScore + costScore + qualityScore) / 4);
  }

  private calculatePerformanceScore(metricsA: ModelPerformanceMetrics, metricsB: ModelPerformanceMetrics) {
    const scoreA = (100 - metricsA.errorRate) * 0.7 + ((metricsA.responseQuality || 7.5) / 10) * 100 * 0.3;
    const scoreB = (100 - metricsB.errorRate) * 0.7 + ((metricsB.responseQuality || 7.5) / 10) * 100 * 0.3;

    return {
      A: Math.round(scoreA),
      B: Math.round(scoreB),
      winner: scoreA > scoreB ? metricsA.modelId : metricsB.modelId
    };
  }

  private calculateCostEfficiency(metricsA: ModelPerformanceMetrics, metricsB: ModelPerformanceMetrics) {
    const efficiencyA = 100 - (metricsA.costPerRequest * 10000); // Lower cost = higher efficiency
    const efficiencyB = 100 - (metricsB.costPerRequest * 10000);

    return {
      A: Math.max(0, Math.round(efficiencyA)),
      B: Math.max(0, Math.round(efficiencyB)),
      winner: efficiencyA > efficiencyB ? metricsA.modelId : metricsB.modelId
    };
  }

  private calculateQualityScore(metricsA: ModelPerformanceMetrics, metricsB: ModelPerformanceMetrics) {
    const qualityA = ((metricsA.responseQuality || 7.5) + (metricsA.contextRelevance || 7.5)) / 2;
    const qualityB = ((metricsB.responseQuality || 7.5) + (metricsB.contextRelevance || 7.5)) / 2;

    return {
      A: Math.round((qualityA / 10) * 100),
      B: Math.round((qualityB / 10) * 100),
      winner: qualityA > qualityB ? metricsA.modelId : metricsB.modelId
    };
  }

  private calculateSpeedScore(metricsA: ModelPerformanceMetrics, metricsB: ModelPerformanceMetrics) {
    const speedA = 100 - (metricsA.averageResponseTime / 50); // Faster = higher score
    const speedB = 100 - (metricsB.averageResponseTime / 50);

    return {
      A: Math.max(0, Math.round(speedA)),
      B: Math.max(0, Math.round(speedB)),
      winner: speedA > speedB ? metricsA.modelId : metricsB.modelId
    };
  }

  private generateComparisonInsights(
    modelA: modelID,
    modelB: modelID,
    metricsA: ModelPerformanceMetrics,
    metricsB: ModelPerformanceMetrics
  ): string[] {
    const insights: string[] = [];

    if (metricsA.averageResponseTime < metricsB.averageResponseTime) {
      insights.push(`${modelA} is ${Math.round((metricsB.averageResponseTime - metricsA.averageResponseTime) / metricsA.averageResponseTime * 100)}% faster than ${modelB}`);
    } else {
      insights.push(`${modelB} is ${Math.round((metricsA.averageResponseTime - metricsB.averageResponseTime) / metricsB.averageResponseTime * 100)}% faster than ${modelA}`);
    }

    if (metricsA.costPerRequest < metricsB.costPerRequest) {
      insights.push(`${modelA} is ${Math.round((1 - metricsA.costPerRequest / metricsB.costPerRequest) * 100)}% more cost-effective than ${modelB}`);
    } else {
      insights.push(`${modelB} is ${Math.round((1 - metricsB.costPerRequest / metricsA.costPerRequest) * 100)}% more cost-effective than ${modelA}`);
    }

    if ((metricsA.responseQuality || 7.5) > (metricsB.responseQuality || 7.5)) {
      insights.push(`${modelA} generally produces higher quality responses than ${modelB}`);
    } else {
      insights.push(`${modelB} generally produces higher quality responses than ${modelA}`);
    }

    return insights;
  }

  private generateRecommendations(modelA: modelID, modelB: modelID, useCase?: string): string[] {
    const recommendations: string[] = [];
    const configA = SUPPORTED_MODELS[modelA];
    const configB = SUPPORTED_MODELS[modelB];

    if (useCase === 'code_generation') {
      if (configA.capabilities.includes('Code Generation') && !configB.capabilities.includes('Code Generation')) {
        recommendations.push(`Use ${modelA} for code generation tasks where ${modelB} may be less suitable`);
      }
    }

    if (configA.cost !== configB.cost) {
      const cheaperModel = configA.cost === 'low' ? modelA : modelB;
      const expensiveModel = configA.cost === 'high' ? modelA : modelB;
      recommendations.push(`Consider ${cheaperModel} for cost-sensitive applications, ${expensiveModel} for quality-critical tasks`);
    }

    recommendations.push(`Monitor both models in production to validate performance characteristics`);
    recommendations.push(`Consider A/B testing to determine which model performs better for your specific use cases`);

    return recommendations;
  }

  private getEstimatedCostPerRequest(modelId: modelID): number {
    const metrics = this.generateBaseMetrics(modelId);
    return metrics.costPerRequest;
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const aiModelAnalysis = AIModelAnalysisService.getInstance();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getModelHealthStatus(modelId: modelID): {
  status: AIModelStatus;
  healthScore: number;
  issues: string[];
} {
  const analysis = aiModelAnalysis['generateBaseMetrics'](modelId);
  const healthScore = aiModelAnalysis['calculateHealthScore'](analysis);

  const issues: string[] = [];
  if (analysis.errorRate > 5) issues.push('High error rate');
  if (analysis.averageResponseTime > 5000) issues.push('Slow response time');
  if (analysis.costPerRequest > 0.01) issues.push('High cost per request');

  let status = AIModelStatus.ACTIVE;
  if (healthScore < 50) status = AIModelStatus.ERROR;
  else if (healthScore < 70) status = AIModelStatus.DEGRADED;

  return { status, healthScore, issues };
}

export function getProviderSummary(): Record<AIModelProvider, {
  totalModels: number;
  activeModels: number;
  averageCost: number;
  averagePerformance: number;
}> {
  const providers = Object.values(AIModelProvider);
  const result: Record<string, any> = {};

  for (const provider of providers) {
    const models = Object.entries(SUPPORTED_MODELS)
      .filter(([_, config]) => config.provider === provider)
      .map(([modelId]) => modelId as modelID);

    const metrics = models.map(modelId => aiModelAnalysis['generateBaseMetrics'](modelId));
    const activeModels = models.filter(modelId => SUPPORTED_MODELS[modelId].provider === provider);

    result[provider] = {
      totalModels: models.length,
      activeModels: activeModels.length,
      averageCost: metrics.reduce((sum, m) => sum + m.costPerRequest, 0) / metrics.length,
      averagePerformance: metrics.reduce((sum, m) => sum + aiModelAnalysis['calculateHealthScore'](m), 0) / metrics.length
    };
  }

  return result;
}
