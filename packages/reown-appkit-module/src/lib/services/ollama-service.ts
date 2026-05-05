/**
 * Ollama Local LLM Service
 * Provides integration with local Ollama instance for voice conversations
 */

export interface OllamaConfig {
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  contextWindow: number;
  numGpu: number;
  numThread: number;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  context?: number[];
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

class OllamaService {
  private config: OllamaConfig;
  private isAvailable: boolean = false;
  private lastHealthCheck: Date | null = null;

  constructor() {
    this.config = {
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      apiKey: process.env.OLLAMA_API_KEY,
      defaultModel: process.env.OLLAMA_DEFAULT_MODEL || "llama3.2",
      contextWindow: parseInt(process.env.OLLAMA_CONTEXT_WINDOW || "4096"),
      numGpu: parseInt(process.env.OLLAMA_NUM_GPU || "1"),
      numThread: parseInt(process.env.OLLAMA_NUM_THREAD || "8"),
    };
  }

  /**
   * Check if Ollama is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      this.isAvailable = response.ok;
      this.lastHealthCheck = new Date();

      return this.isAvailable;
    } catch (error) {
      console.error("Ollama health check failed:", error);
      this.isAvailable = false;
      this.lastHealthCheck = new Date();
      return false;
    }
  }

  /**
   * Get available models
   */
  async getModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error("Failed to get Ollama models:", error);
      return [];
    }
  }

  /**
   * Generate text completion
   */
  async generate(
    request: OllamaGenerateRequest
  ): Promise<OllamaGenerateResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: request.model || this.config.defaultModel,
          prompt: request.prompt,
          system: request.system,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || 500,
          stream: false,
          options: {
            num_ctx: this.config.contextWindow,
            num_gpu: this.config.numGpu,
            num_thread: this.config.numThread,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Ollama generate error:", error);
      throw error;
    }
  }

  /**
   * Generate streaming text completion
   */
  async *generateStream(
    request: OllamaGenerateRequest
  ): AsyncGenerator<string> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: request.model || this.config.defaultModel,
          prompt: request.prompt,
          system: request.system,
          temperature: request.temperature || 0.7,
          stream: true,
          options: {
            num_ctx: this.config.contextWindow,
            num_gpu: this.config.numGpu,
            num_thread: this.config.numThread,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete JSON lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                yield data.response;
              }
            } catch (error) {
              console.error("Failed to parse Ollama response:", error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Ollama stream error:", error);
      throw error;
    }
  }

  /**
   * Chat completion (conversation format)
   */
  async chat(
    messages: Array<{ role: string; content: string }>,
    model?: string
  ): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: model || this.config.defaultModel,
          messages,
          stream: false,
          options: {
            num_ctx: this.config.contextWindow,
            num_gpu: this.config.numGpu,
            num_thread: this.config.numThread,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.message?.content || "";
    } catch (error) {
      console.error("Ollama chat error:", error);
      throw error;
    }
  }

  /**
   * Pull a model from Ollama library
   */
  async pullModel(modelName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/pull`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: modelName,
          stream: false,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to pull Ollama model:", error);
      return false;
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/delete`, {
        method: "DELETE",
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: modelName,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to delete Ollama model:", error);
      return false;
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/show`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: modelName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to get Ollama model info:", error);
      return null;
    }
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  /**
   * Get current configuration
   */
  getConfig(): OllamaConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Check if service is available
   */
  getIsAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Get last health check time
   */
  getLastHealthCheck(): Date | null {
    return this.lastHealthCheck;
  }
}

// Export singleton instance
export const ollamaService = new OllamaService();

