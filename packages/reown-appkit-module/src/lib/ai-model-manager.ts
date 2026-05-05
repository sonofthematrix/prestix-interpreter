/**
 * AI Model Manager - Dynamic Model Selection with Edge Config Integration
 * 
 * This module provides intelligent model selection based on:
 * - Edge Config settings and feature flags
 * - Cost optimization requirements
 * - Performance metrics and user preferences
 * - Task complexity and context
 */

import { get } from '@vercel/edge-config';
import { type modelID, getModelInfo, MODELS } from '../../../../src/ai/providers';
import { getAIProfile } from '../../../../ai-profiles';

export interface GenerationContext {
  taskType: 'schema_analysis' | 'code_generation' | 'testing' | 'deployment' | 'documentation';
  complexity: 'simple' | 'medium' | 'complex';
  userPreferences?: {
    costSensitivity: 'low' | 'medium' | 'high';
    qualityPreference: 'low' | 'medium' | 'high';
    speedPreference: 'low' | 'medium' | 'high';
  };
  estimatedTokens?: number;
  budget?: number;
}

export interface ModelPerformanceMetrics {
  modelId: modelID;
  responseTime: number;
  qualityScore: number;
  userSatisfaction: number;
  errorRate: number;
  costPerRequest: number;
  lastUpdated: Date;
}

export interface ModelCostConfig {
  modelId: modelID;
  costPerToken: number;
  maxTokens: number;
  qualityScore: number;
  speedScore: number;
  provider: string;
}

// Model cost configuration based on current pricing
export const MODEL_COSTS: Record<modelID, ModelCostConfig> = {
  'gpt-5-nano': { 
    modelId: 'gpt-5-nano',
    costPerToken: 0.0000005, 
    maxTokens: 128000, 
    qualityScore: 9.5, 
    speedScore: 7,
    provider: 'OpenAI'
  },
  'gpt-4o': { 
    modelId: 'gpt-4o' as unknown as modelID,
    costPerToken: 0.00003, 
    maxTokens: 128000, 
    qualityScore: 9.5, 
    speedScore: 7,
    provider: 'OpenAI'
  },
  'gpt-4o-mini': { 
    modelId: 'gpt-4o-mini' as unknown as modelID,
    costPerToken: 0.0000015, 
    maxTokens: 128000, 
    qualityScore: 8.5, 
    speedScore: 9,
    provider: 'OpenAI'
  },
  'claude-3-7-sonnet-20250219': { 
    modelId: 'claude-3-7-sonnet-20250219' as unknown as modelID,
    costPerToken: 0.000015, 
    maxTokens: 200000, 
    qualityScore: 9.8, 
    speedScore: 6,
    provider: 'Anthropic'
  },
  'claude-3-5-sonnet-20241022': { 
    modelId: 'claude-3-5-sonnet-20241022' as unknown as modelID,
    costPerToken: 0.000003, 
    maxTokens: 200000, 
    qualityScore: 9.2, 
    speedScore: 8,
    provider: 'Anthropic'
  },
  'meta-llama/Llama-3.3-70B-Instruct-Turbo': { 
    modelId: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' as unknown as modelID,
    costPerToken: 0.0000008, 
    maxTokens: 4096, 
    qualityScore: 8.8, 
    speedScore: 9,
    provider: 'DeepInfra'
  },
  'moonshotai/Kimi-K2-Instruct': { 
    modelId: 'moonshotai/Kimi-K2-Instruct' as unknown as modelID,
    costPerToken: 0.000001, 
    maxTokens: 4096, 
    qualityScore: 8.2, 
    speedScore: 8,
    provider: 'DeepInfra'
  },
  'grok-beta': { 
    modelId: 'grok-beta' as unknown as modelID,
    costPerToken: 0.000001, 
    maxTokens: 128000, 
    qualityScore: 8.0, 
    speedScore: 9,
    provider: 'xAI'
  },
  'grok-code-faster-1': { 
    modelId: 'grok-code-faster-1' as unknown as modelID,
    costPerToken: 0.0000005, 
    maxTokens: 128000, 
    qualityScore: 7.5, 
    speedScore: 10,
    provider: 'xAI'
  }
};

export class AIModelManager {
  private static instance: AIModelManager;
  private performanceCache: Map<modelID, ModelPerformanceMetrics> = new Map();
  private lastConfigUpdate: Date = new Date(0);

  private constructor() {}

  public static getInstance(): AIModelManager {
    if (!AIModelManager.instance) {
      AIModelManager.instance = new AIModelManager();
    }
    return AIModelManager.instance;
  }

  /**
   * Select the optimal model based on profile, context, and Edge Config settings
   */
  async selectModel(
    profile: string,
    context: GenerationContext
  ): Promise<modelID> {
    try {
      // Get Edge Config settings
      const edgeConfig = await this.getEdgeConfig();
      const featureFlags = await this.getFeatureFlags();

      // Check if dynamic model selection is enabled
      if (!featureFlags?.enableDynamicModelSelection) {
        return this.getDefaultModel(profile, edgeConfig);
      }

      // Apply selection algorithm
      const selectedModel = await this.applySelectionAlgorithm(
        profile,
        context,
        edgeConfig,
        featureFlags
      );

      // Track selection for analytics
      await this.trackModelSelection(profile, selectedModel, context);

      return selectedModel;
    } catch (error) {
      console.error('Error in model selection:', error);
      return this.getFallbackModel(profile);
    }
  }

  /**
   * Get Edge Config settings for AI model configuration
   */
  private async getEdgeConfig(): Promise<any> {
    try {
      const config = await get('aiModelConfig');
      return config || this.getDefaultEdgeConfig();
    } catch (error) {
      console.error('Error fetching Edge Config:', error);
      return this.getDefaultEdgeConfig();
    }
  }

  /**
   * Get feature flags for AI model selection
   */
  private async getFeatureFlags(): Promise<any> {
    try {
      const flags = await get('featureFlags');
      return flags || this.getDefaultFeatureFlags();
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      return this.getDefaultFeatureFlags();
    }
  }

  /**
   * Apply the model selection algorithm
   */
  private async applySelectionAlgorithm(
    profile: string,
    context: GenerationContext,
    edgeConfig: any,
    featureFlags: any
  ): Promise<modelID> {
    // 1. Get profile-specific model preferences
    const profileModel = edgeConfig?.profileModels?.[profile];
    if (profileModel && this.isModelAvailable(profileModel)) {
      return profileModel;
    }

    // 2. Apply cost optimization if enabled
    if (featureFlags?.enableCostOptimization) {
      const costOptimizedModel = this.selectCostOptimizedModel(context);
      if (costOptimizedModel) {
        return costOptimizedModel;
      }
    }

    // 3. Apply complexity-based selection
    const complexityModel = this.selectByComplexity(context.complexity);
    if (complexityModel) {
      return complexityModel;
    }

    // 4. Apply task-specific selection
    const taskModel = this.selectByTaskType(context.taskType);
    if (taskModel) {
      return taskModel;
    }

    // 5. Fallback to default
    return edgeConfig?.defaultModel || 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
  }

  /**
   * Select model based on cost optimization
   */
  private selectCostOptimizedModel(context: GenerationContext): modelID | null {
    const { costSensitivity, qualityPreference, speedPreference } = context.userPreferences || {};
    const { estimatedTokens = 1000, budget = 0.01 } = context;

    // Filter models by constraints
    const availableModels = MODELS.filter(modelId => {
      const cost = MODEL_COSTS[modelId];
      const estimatedCost = cost.costPerToken * estimatedTokens;
      
      // Check budget constraint
      if (budget > 0 && estimatedCost > budget) {
        return false;
      }

      // Check quality preference
      if (qualityPreference === 'high' && cost.qualityScore < 9.0) {
        return false;
      } else if (qualityPreference === 'medium' && cost.qualityScore < 8.0) {
        return false;
      }

      // Check speed preference
      if (speedPreference === 'high' && cost.speedScore < 8.0) {
        return false;
      } else if (speedPreference === 'medium' && cost.speedScore < 7.0) {
        return false;
      }

      return true;
    });

    if (availableModels.length === 0) {
      return null;
    }

    // Sort by cost efficiency (quality/cost ratio)
    const sortedModels = availableModels.sort((a, b) => {
      const costA = MODEL_COSTS[a];
      const costB = MODEL_COSTS[b];
      
      const efficiencyA = costA.qualityScore / (costA.costPerToken * estimatedTokens);
      const efficiencyB = costB.qualityScore / (costB.costPerToken * estimatedTokens);
      
      return efficiencyB - efficiencyA;
    });

    return sortedModels[0];
  }

  /**
   * Select model based on task complexity
   */
  private selectByComplexity(complexity: string): modelID | null {
    const complexityMap: Record<string, modelID[]> = {
      simple: ['gpt-4o-mini', 'grok-code-faster-1', 'meta-llama/Llama-3.3-70B-Instruct-Turbo'],
      medium: ['claude-3-5-sonnet-20241022', 'gpt-4o-mini', 'grok-beta'],
      complex: ['gpt-4o', 'claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022']
    };

    const models = complexityMap[complexity] || complexityMap.medium;
    return models.find(model => this.isModelAvailable(model)) || models[0];
  }

  /**
   * Select model based on task type
   */
  private selectByTaskType(taskType: string): modelID | null {
    const taskMap: Record<string, modelID[]> = {
      schema_analysis: ['gpt-4o', 'claude-3-7-sonnet-20250219'],
      code_generation: ['claude-3-5-sonnet-20241022', 'gpt-4o', 'grok-code-faster-1'],
      testing: ['gpt-4o-mini', 'grok-code-faster-1'],
      deployment: ['grok-beta', 'gpt-4o-mini'],
      documentation: ['gpt-4o', 'claude-3-5-sonnet-20241022']
    };

    const models = taskMap[taskType] || taskMap.code_generation;
    return models.find(model => this.isModelAvailable(model)) || models[0];
  }

  /**
   * Check if a model is available (has API key)
   */
  private isModelAvailable(modelId: modelID): boolean {
    const modelInfo = getModelInfo(modelId);
    const apiKeyMap: Record<string, string> = {
      'OpenAI': 'OPENAI_API_KEY',
      'Anthropic': 'ANTHROPIC_API_KEY',
      'DeepInfra': 'DEEPINFRA_API_KEY',
      'xAI': 'XAI_API_KEY'
    };

    const requiredKey = apiKeyMap[modelInfo.provider];
    return !!(process.env[requiredKey]);
  }

  /**
   * Get default model for profile
   */
  private getDefaultModel(profile: string, edgeConfig: any): modelID {
    const profileModel = edgeConfig?.profileModels?.[profile];
    if (profileModel && this.isModelAvailable(profileModel)) {
      return profileModel;
    }

    const aiProfile = getAIProfile(profile);
    if (aiProfile?.model && this.isModelAvailable(aiProfile.model as modelID)) {
      return aiProfile.model as modelID;
    }

    return edgeConfig?.defaultModel || 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
  }

  /**
   * Get fallback model
   */
  private getFallbackModel(profile: string): modelID {
    // Try to get a working model in order of preference
    const fallbackOrder: modelID[] = [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'gpt-4o-mini',
      'claude-3-5-sonnet-20241022',
      'grok-code-faster-1'
    ];

    for (const model of fallbackOrder) {
      if (this.isModelAvailable(model)) {
        return model;
      }
    }

    // Last resort
    return 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
  }

  /**
   * Track model selection for analytics
   */
  private async trackModelSelection(
    profile: string,
    modelId: modelID,
    context: GenerationContext
  ): Promise<void> {
    try {
      // In a real implementation, this would send to analytics service
      console.log('Model Selection:', {
        profile,
        modelId,
        context,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error tracking model selection:', error);
    }
  }

  /**
   * Get default Edge Config
   */
  private getDefaultEdgeConfig(): any {
    return {
      defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      profileModels: {
        architect: 'gpt-4o',
        developer: 'claude-3-5-sonnet-20241022',
        tester: 'gpt-4o-mini',
        devops: 'grok-beta',
        writer: 'claude-3-7-sonnet-20250219'
      },
      fallbackModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      costOptimization: {
        enabled: true,
        maxCostPerRequest: 0.01,
        preferLowCost: true
      }
    };
  }

  /**
   * Get default feature flags
   */
  private getDefaultFeatureFlags(): any {
    return {
      enableDynamicModelSelection: true,
      enableCostOptimization: true,
      enableModelABTesting: false,
      enablePerformanceTracking: true,
      enableUserModelPreferences: false,
      enableModelFallback: true,
      enableModelHealthChecks: true
    };
  }

  /**
   * Get model cost information
   */
  getModelCost(modelId: modelID): ModelCostConfig {
    return MODEL_COSTS[modelId];
  }

  /**
   * Get all available models with cost information
   */
  getAvailableModels(): Array<ModelCostConfig & { available: boolean }> {
    return Object.values(MODEL_COSTS).map(cost => ({
      ...cost,
      available: this.isModelAvailable(cost.modelId)
    }));
  }

  /**
   * Calculate estimated cost for a request
   */
  calculateCost(modelId: modelID, estimatedTokens: number): number {
    const cost = MODEL_COSTS[modelId];
    return cost.costPerToken * estimatedTokens;
  }
}

// Export singleton instance
export const aiModelManager = AIModelManager.getInstance();
