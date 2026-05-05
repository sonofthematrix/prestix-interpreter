/**
 * React Hook for Dynamic AI Model Selection
 * 
 * This hook provides dynamic model selection capabilities with:
 * - Real-time Edge Config integration
 * - Cost optimization
 * - Performance tracking
 * - User preference support
 */

import { useState, useEffect, useCallback } from 'react';
import { type modelID } from '../../../../src/ai/providers';
import { aiModelManager, type GenerationContext } from '@/lib/ai-model-manager';
import { useFeatureFlags } from './use-edge-config';

export interface DynamicModelState {
  selectedModel: modelID | null;
  isLoading: boolean;
  error: string | null;
  costEstimate: number | null;
  performanceMetrics: any | null;
}

export interface UseDynamicModelOptions {
  profile: string;
  context: GenerationContext;
  autoSelect?: boolean;
  refreshInterval?: number;
}

export function useDynamicModel({
  profile,
  context,
  autoSelect = true,
  refreshInterval = 30000 // 30 seconds
}: UseDynamicModelOptions): DynamicModelState & {
  selectModel: (modelId: modelID) => Promise<void>;
  refreshModel: () => Promise<void>;
  getCostEstimate: (modelId: modelID, tokens: number) => number;
} {
  const [state, setState] = useState<DynamicModelState>({
    selectedModel: null,
    isLoading: true,
    error: null,
    costEstimate: null,
    performanceMetrics: null
  });

  const { flags: featureFlags } = useFeatureFlags();

  // Select model automatically
  const selectModel = useCallback(async (modelId?: modelID) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let selectedModel: modelID;

      if (modelId) {
        selectedModel = modelId;
      } else {
        // Use AI Model Manager for dynamic selection
        selectedModel = await aiModelManager.selectModel(profile, context);
      }

      // Calculate cost estimate
      const costEstimate = aiModelManager.calculateCost(
        selectedModel, 
        context.estimatedTokens || 1000
      );

      setState(prev => ({
        ...prev,
        selectedModel,
        costEstimate,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to select model'
      }));
    }
  }, [profile, context]);

  // Refresh model selection
  const refreshModel = useCallback(async () => {
    await selectModel();
  }, [selectModel]);

  // Get cost estimate for a specific model
  const getCostEstimate = useCallback((modelId: modelID, tokens: number): number => {
    return aiModelManager.calculateCost(modelId, tokens);
  }, []);

  // Auto-select model on mount and when dependencies change
  useEffect(() => {
    if (autoSelect && featureFlags?.enableDynamicModelSelection) {
      selectModel();
    }
  }, [autoSelect, selectModel, featureFlags?.enableDynamicModelSelection]);

  // Set up refresh interval
  useEffect(() => {
    if (!refreshInterval || !featureFlags?.enableDynamicModelSelection) {
      return;
    }

    const interval = setInterval(() => {
      refreshModel();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, refreshModel, featureFlags?.enableDynamicModelSelection]);

  return {
    ...state,
    selectModel,
    refreshModel,
    getCostEstimate
  };
}

/**
 * Hook for model cost comparison
 */
export function useModelCostComparison(models: modelID[], estimatedTokens: number = 1000) {
  const [costs, setCosts] = useState<Array<{ modelId: modelID; cost: number; available: boolean }>>([]);

  useEffect(() => {
    const calculateCosts = () => {
      const costData = models.map(modelId => ({
        modelId,
        cost: aiModelManager.calculateCost(modelId, estimatedTokens),
        available: aiModelManager.getAvailableModels().find(m => m.modelId === modelId)?.available || false
      }));

      setCosts(costData);
    };

    calculateCosts();
  }, [models, estimatedTokens]);

  return costs;
}

/**
 * Hook for model performance tracking
 */
export function useModelPerformance(modelId: modelID) {
  const [performance, setPerformance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      setIsLoading(true);
      try {
        // In a real implementation, this would fetch from your analytics service
        const mockPerformance = {
          responseTime: 2.3,
          qualityScore: 9.5,
          userSatisfaction: 4.8,
          errorRate: 0.02,
          costPerRequest: 0.008,
          lastUpdated: new Date()
        };
        
        setPerformance(mockPerformance);
      } catch (error) {
        console.error('Error fetching performance data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (modelId) {
      fetchPerformance();
    }
  }, [modelId]);

  return { performance, isLoading };
}

/**
 * Hook for A/B testing different models
 */
export function useModelABTest(testId: string, variants: { control: modelID; treatment: modelID }) {
  const [selectedVariant, setSelectedVariant] = useState<modelID | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const selectVariant = () => {
      setIsLoading(true);
      
      // Simple 50/50 split for demo
      // In production, this would use a proper A/B testing service
      const random = Math.random();
      const variant = random < 0.5 ? variants.control : variants.treatment;
      
      setSelectedVariant(variant);
      setIsLoading(false);
    };

    selectVariant();
  }, [testId, variants]);

  return { selectedVariant, isLoading };
}

/**
 * Hook for user model preferences
 */
export function useUserModelPreferences(userId?: string) {
  const [preferences, setPreferences] = useState<{
    preferredModels: Record<string, modelID>;
    costSensitivity: 'low' | 'medium' | 'high';
    qualityPreference: 'low' | 'medium' | 'high';
    speedPreference: 'low' | 'medium' | 'high';
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // In a real implementation, this would fetch from your user preferences service
        const mockPreferences = {
          preferredModels: {
            architect: 'gpt-4o' as modelID,
            developer: 'claude-3-5-sonnet-20241022' as modelID,
            tester: 'gpt-4o-mini' as modelID
          },
          costSensitivity: 'medium' as const,
          qualityPreference: 'high' as const,
          speedPreference: 'medium' as const
        };

        setPreferences(mockPreferences);
      } catch (error) {
        console.error('Error fetching user preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [userId]);

  const updatePreferences = useCallback(async (newPreferences: Partial<typeof preferences>) => {
    if (!userId) return;

    try {
      // In a real implementation, this would save to your user preferences service
      setPreferences(prev => prev ? { ...prev, ...newPreferences } : null);
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  }, [userId]);

  return { preferences, isLoading, updatePreferences };
}
