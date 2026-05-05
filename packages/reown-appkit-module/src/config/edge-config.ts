/**
 * Edge Config Configuration
 * This file contains the Edge Config token and configuration
 */

export const EDGE_CONFIG_TOKEN = 'b778bcfe-aa4f-48bd-b513-278b48921b81';

export const EDGE_CONFIG_URL = `https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_TOKEN}`;

// Default configuration values
export const DEFAULT_FEATURE_FLAGS = {
  enableAIBuilder: true,
  enableChatbot: true,
  enableBlog: true,
  enableDashboard: true,
  enableAuth: true,
  enableMCP: true,
  enableMonitoring: true,
  enableDarkMode: true,
  enableBetaFeatures: false,
  maxChatMessages: 100,
  maxFileUploadSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/pdf'],
  maintenanceMode: false,
  maintenanceMessage: 'We are currently performing maintenance. Please try again later.',
  // AI Model Selection Feature Flags
  enableDynamicModelSelection: true,
  enableCostOptimization: true,
  enableModelABTesting: false,
  enablePerformanceTracking: true,
  enableUserModelPreferences: false,
  enableModelFallback: true,
  enableModelHealthChecks: true,
  enableRealTimeModelSwitching: true,
  enableModelAnalytics: true
};

export const DEFAULT_APP_CONFIG = {
  appName: 'ZenStack AI Builder',
  appVersion: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  cdnUrl: process.env.NEXT_PUBLIC_CDN_URL || '',
  analyticsId: process.env.NEXT_PUBLIC_ANALYTICS_ID || '',
  supportEmail: 'support@zenstack.dev',
  documentationUrl: 'https://zenstack.dev/docs',
  githubUrl: 'https://github.com/zenstackhq/zenstack',
  discordUrl: 'https://discord.gg/zenstack'
};

export const DEFAULT_AI_CONFIG = {
  defaultModel: 'gpt-4',
  maxTokens: 4000,
  temperature: 0.7,
  enableStreaming: true,
  enableReasoning: false,
  allowedModels: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'claude-3-haiku'],
  rateLimitPerHour: 100,
  rateLimitPerDay: 1000
};

export const DEFAULT_AI_MODEL_CONFIG = {
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
  },
  performanceTracking: {
    enabled: true,
    metricsRetentionDays: 30,
    alertThresholds: {
      responseTime: 5000, // 5 seconds
      errorRate: 0.05,    // 5%
      costPerRequest: 0.02 // $0.02
    }
  }
};
