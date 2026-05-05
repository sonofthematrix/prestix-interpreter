// Optional dependency, may not be available in all environments
// @ts-ignore - @vercel/edge-config is optional
import { get } from '@vercel/edge-config';
import { EDGE_CONFIG_TOKEN } from '@/config/edge-config';

/**
 * Edge Config utility functions for ZenStack AI Builder
 */

export interface FeatureFlags {
  enableAIBuilder?: boolean;
  enableChatbot?: boolean;
  enableBlog?: boolean;
  enableDashboard?: boolean;
  enableAuth?: boolean;
  enableMCP?: boolean;
  enableMonitoring?: boolean;
  enableDarkMode?: boolean;
  enableBetaFeatures?: boolean;
  maxChatMessages?: number;
  maxFileUploadSize?: number;
  allowedFileTypes?: string[];
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  // AI Model Selection Feature Flags
  enableDynamicModelSelection?: boolean;
  enableCostOptimization?: boolean;
  enableModelABTesting?: boolean;
  enablePerformanceTracking?: boolean;
  enableUserModelPreferences?: boolean;
  enableModelFallback?: boolean;
  enableModelHealthChecks?: boolean;
  enableRealTimeModelSwitching?: boolean;
  enableModelAnalytics?: boolean;
}

export interface AppConfig {
  appName?: string;
  appVersion?: string;
  environment?: string;
  apiBaseUrl?: string;
  cdnUrl?: string;
  analyticsId?: string;
  supportEmail?: string;
  documentationUrl?: string;
  githubUrl?: string;
  discordUrl?: string;
}

export interface AIConfig {
  defaultModel?: string;
  maxTokens?: number;
  temperature?: number;
  enableStreaming?: boolean;
  enableReasoning?: boolean;
  allowedModels?: string[];
  rateLimitPerHour?: number;
  rateLimitPerDay?: number;
}

/**
 * Get feature flags from Edge Config
 */
export async function getFeatureFlags(): Promise<FeatureFlags | null> {
  try {
    const flags = await get('featureFlags');
    return flags as FeatureFlags | null;
  } catch (error) {
    console.error('Failed to get feature flags:', error);
    return null;
  }
}

/**
 * Get app configuration from Edge Config
 */
export async function getAppConfig(): Promise<AppConfig | null> {
  try {
    const config = await get('appConfig');
    return config as AppConfig | null;
  } catch (error) {
    console.error('Failed to get app config:', error);
    return null;
  }
}

/**
 * Get AI configuration from Edge Config
 */
export async function getAIConfig(): Promise<AIConfig | null> {
  try {
    const config = await get('aiConfig');
    return config as AIConfig | null;
  } catch (error) {
    console.error('Failed to get AI config:', error);
    return null;
  }
}

/**
 * Get a specific configuration value
 */
export async function getConfigValue<T = any>(key: string): Promise<T | null> {
  try {
    const value = await get(key);
    return value as T | null;
  } catch (error) {
    console.error(`Failed to get config value for key "${key}":`, error);
    return null;
  }
}

/**
 * Check if a feature is enabled
 */
export async function isFeatureEnabled(feature: keyof FeatureFlags): Promise<boolean> {
  try {
    const flags = await getFeatureFlags();
    return flags?.[feature] === true;
  } catch (error) {
    console.error(`Failed to check feature "${feature}":`, error);
    return false;
  }
}

/**
 * Get maintenance mode status
 */
export async function getMaintenanceMode(): Promise<{ enabled: boolean; message?: string }> {
  try {
    const flags = await getFeatureFlags();
    return {
      enabled: flags?.maintenanceMode === true,
      message: flags?.maintenanceMessage
    };
  } catch (error) {
    console.error('Failed to get maintenance mode:', error);
    return { enabled: false };
  }
}

/**
 * Get rate limits for AI features
 */
export async function getAIRateLimits(): Promise<{ perHour: number; perDay: number }> {
  try {
    const config = await getAIConfig();
    return {
      perHour: config?.rateLimitPerHour || 100,
      perDay: config?.rateLimitPerDay || 1000
    };
  } catch (error) {
    console.error('Failed to get AI rate limits:', error);
    return { perHour: 100, perDay: 1000 };
  }
}

/**
 * Get allowed AI models
 */
export async function getAllowedAIModels(): Promise<string[]> {
  try {
    const config = await getAIConfig();
    return config?.allowedModels || ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet'];
  } catch (error) {
    console.error('Failed to get allowed AI models:', error);
    return ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet'];
  }
}

/**
 * Get file upload configuration
 */
export async function getFileUploadConfig(): Promise<{
  maxSize: number;
  allowedTypes: string[];
}> {
  try {
    const flags = await getFeatureFlags();
    return {
      maxSize: flags?.maxFileUploadSize || 10 * 1024 * 1024, // 10MB default
      allowedTypes: flags?.allowedFileTypes || ['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/pdf']
    };
  } catch (error) {
    console.error('Failed to get file upload config:', error);
    return {
      maxSize: 10 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/pdf']
    };
  }
}

/**
 * Get chat configuration
 */
export async function getChatConfig(): Promise<{
  maxMessages: number;
  enableStreaming: boolean;
  enableReasoning: boolean;
}> {
  try {
    const flags = await getFeatureFlags();
    const aiConfig = await getAIConfig();
    
    return {
      maxMessages: flags?.maxChatMessages || 100,
      enableStreaming: aiConfig?.enableStreaming !== false,
      enableReasoning: aiConfig?.enableReasoning === true
    };
  } catch (error) {
    console.error('Failed to get chat config:', error);
    return {
      maxMessages: 100,
      enableStreaming: true,
      enableReasoning: false
    };
  }
}

/**
 * Get environment-specific configuration
 */
export async function getEnvironmentConfig(): Promise<{
  environment: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isStaging: boolean;
}> {
  try {
    const config = await getAppConfig();
    const environment = config?.environment || process.env.NODE_ENV || 'development';
    
    return {
      environment,
      isDevelopment: environment === 'development',
      isProduction: environment === 'production',
      isStaging: environment === 'test'
    };
  } catch (error) {
    console.error('Failed to get environment config:', error);
    const environment = process.env.NODE_ENV || 'development';
    return {
      environment,
      isDevelopment: environment === 'development',
      isProduction: environment === 'production',
      isStaging: environment === 'test'
    };
  }
}
