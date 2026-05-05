"use client";

import { useState, useEffect } from 'react';
import { FeatureFlags, AppConfig, AIConfig } from '@/lib/edge-config';

/**
 * React hook for accessing Edge Config data
 */

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFlags() {
      try {
        setLoading(true);
        const response = await fetch('/api/edge-config/feature-flags');
        if (!response.ok) throw new Error('Failed to fetch feature flags');
        const data = await response.json();
        setFlags(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setFlags(null);
      } finally {
        setLoading(false);
      }
    }

    fetchFlags();
  }, []);

  return { flags, loading, error };
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        const response = await fetch('/api/edge-config/app-config');
        if (!response.ok) throw new Error('Failed to fetch app config');
        const data = await response.json();
        setConfig(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setConfig(null);
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, []);

  return { config, loading, error };
}

export function useAIConfig() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        const response = await fetch('/api/edge-config/ai-config');
        if (!response.ok) throw new Error('Failed to fetch AI config');
        const data = await response.json();
        setConfig(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setConfig(null);
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, []);

  return { config, loading, error };
}

export function useFeatureFlag(feature: keyof FeatureFlags) {
  const { flags, loading, error } = useFeatureFlags();
  
  return {
    enabled: flags?.[feature] === true,
    loading,
    error
  };
}

export function useMaintenanceMode() {
  const { flags, loading, error } = useFeatureFlags();
  
  return {
    enabled: flags?.maintenanceMode === true,
    message: flags?.maintenanceMessage,
    loading,
    error
  };
}

export function useChatConfig() {
  const { flags, loading: flagsLoading, error: flagsError } = useFeatureFlags();
  const { config: aiConfig, loading: aiLoading, error: aiError } = useAIConfig();
  
  return {
    maxMessages: flags?.maxChatMessages || 100,
    enableStreaming: aiConfig?.enableStreaming !== false,
    enableReasoning: aiConfig?.enableReasoning === true,
    loading: flagsLoading || aiLoading,
    error: flagsError || aiError
  };
}

export function useFileUploadConfig() {
  const { flags, loading, error } = useFeatureFlags();
  
  return {
    maxSize: flags?.maxFileUploadSize || 10 * 1024 * 1024, // 10MB default
    allowedTypes: flags?.allowedFileTypes || [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'text/plain', 
      'application/pdf'
    ],
    loading,
    error
  };
}

export function useAIRateLimits() {
  const { config, loading, error } = useAIConfig();
  
  return {
    perHour: config?.rateLimitPerHour || 100,
    perDay: config?.rateLimitPerDay || 1000,
    loading,
    error
  };
}
