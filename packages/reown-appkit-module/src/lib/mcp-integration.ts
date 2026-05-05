/**
 * MCP Integration Service
 * Handles MCP client initialization, connection, and tool calling
 */

import 'server-only';
// MCP client is imported dynamically to avoid build-time bundling
// See loadDependencies() function below   
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { mcpLogger, mcpLog } from '../lib/mcp-logger';

// Type definition for MCPClient (imported dynamically at runtime)
type MCPClient = any;

export class MCPIntegrationService {
  private static instance: MCPIntegrationService;
  private mcpClient: MCPClient | null = null;
  private mcpServerProcess: ChildProcess | null = null;
  private isInitialized = false;
  private connectionAttempts = 0;
  private maxRetries = 3;

  private constructor() {}

  static getInstance(): MCPIntegrationService {
    if (!MCPIntegrationService.instance) {
      MCPIntegrationService.instance = new MCPIntegrationService();
    }
    return MCPIntegrationService.instance;
  }

  /**
   * Initialize MCP server and client
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      mcpLog.serverStart();
      
      // Start MCP server
      await this.startMCPServer();
      
      // Initialize MCP client
      await this.initializeMCPClient();
      
      this.isInitialized = true;
      mcpLogger.info('MCP_INTEGRATION', 'MCP Integration Service initialized successfully');
    } catch (error) {
      mcpLogger.error('MCP_INTEGRATION', 'Failed to initialize MCP Integration Service', error);
      throw error;
    }
  }

  /**
   * Start MCP server process
   */
  private async startMCPServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const serverPath = path.join(process.cwd(), 'mcp-server', 'dist', 'index.js');
        
        mcpLogger.info('MCP_SERVER', `Starting MCP server at: ${serverPath}`);
        
        this.mcpServerProcess = spawn('node', [serverPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: process.cwd(),
          env: {
            ...process.env,
            NODE_ENV: process.env.NODE_ENV || 'development',
            MCP_LOG_LEVEL: 'DEBUG'
          }
        });

        this.mcpServerProcess.stdout?.on('data', (data) => {
          mcpLogger.debug('MCP_SERVER', 'Server stdout', data.toString());
        });

        this.mcpServerProcess.stderr?.on('data', (data) => {
          mcpLogger.debug('MCP_SERVER', 'Server stderr', data.toString());
        });

        this.mcpServerProcess.on('error', (error) => {
          mcpLogger.error('MCP_SERVER', 'Server process error', error);
          reject(error);
        });

        this.mcpServerProcess.on('exit', (code) => {
          mcpLogger.warn('MCP_SERVER', `Server exited with code: ${code}`);
        });

        // Give server time to start
        setTimeout(() => {
          mcpLogger.info('MCP_SERVER', 'MCP Server started successfully');
          resolve();
        }, 2000);

      } catch (error) {
        mcpLogger.error('MCP_SERVER', 'Failed to start MCP server', error);
        reject(error);
      }
    });
  }

  /**
   * Initialize MCP client connection
   */
  private async initializeMCPClient(): Promise<void> {
    try {
      mcpLog.clientConnect();
      // @ts-expect-error - Dynamic import path resolved at runtime by bundler
      const mcpClientModule = await import('../../../../src/lib/mcp-client');
      this.mcpClient = mcpClientModule.getMCPClient();
      await this.mcpClient.connect();
      mcpLog.clientConnected();
    } catch (error) {
      mcpLogger.error('MCP_CLIENT', 'Failed to connect MCP client', error);
      
      if (this.connectionAttempts < this.maxRetries) {
        this.connectionAttempts++;
        mcpLogger.warn('MCP_CLIENT', `Retrying MCP client connection (attempt ${this.connectionAttempts}/${this.maxRetries})`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.initializeMCPClient();
      }
      
      throw error;
    }
  }

  /**
   * Call MCP tool with retry logic
   */
  async callTool(toolName: string, args: any, timeout: number = 30000): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.mcpClient) {
      throw new Error('MCP client not initialized');
    }

    const startTime = Date.now();
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`MCP tool ${toolName} timed out after ${timeout}ms`));
      }, timeout);
    });

    try {
      mcpLog.toolCall(toolName, args, startTime);
      
      // Race between the tool call and timeout
      const result = await Promise.race([
        (await this.mcpClient).callTool(toolName, args),
        timeoutPromise
      ]);
      
      mcpLog.toolResult(toolName, result, startTime);
      return result;
    } catch (error) {
      mcpLog.toolError(toolName, error, startTime);
      
      // Don't retry on timeout errors
      if (error instanceof Error && error.message.includes('timed out')) {
        throw error;
      }
      
      // Try to reconnect and retry once for other errors
      if (this.connectionAttempts < this.maxRetries) {
        mcpLogger.warn('MCP_CLIENT', 'Attempting to reconnect MCP client...');
        this.isInitialized = false;
        await this.initialize();
        return this.callTool(toolName, args, timeout);
      }
      
      throw error;
    }
  }

  /**
   * List available MCP tools
   */
  async listTools(): Promise<any[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.mcpClient) {
      throw new Error('MCP client not initialized');
    }

    try {
      const tools = await (await this.mcpClient).listTools();
      console.log('📋 Available MCP tools:', tools.map(t => t.name));
      return tools;
    } catch (error) {
      console.error('❌ Failed to list MCP tools:', error);
      throw error;
    }
  }

  /**
   * Get tool information
   */
  async getToolInfo(toolName: string): Promise<any> {
    if (!this.mcpClient) {
      throw new Error('MCP client not initialized');
    }

    return (await this.mcpClient).getToolInfo(toolName);
  }

  /**
   * Check if MCP is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.mcpClient?.isConnected() === true;
  }

  /**
   * Cleanup MCP resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.mcpClient) {
        await (await this.mcpClient).disconnect();
        this.mcpClient = null;
      }

      if (this.mcpServerProcess) {
        this.mcpServerProcess.kill();
        this.mcpServerProcess = null;
      }

      this.isInitialized = false;
      this.connectionAttempts = 0;
      
      console.log('🧹 MCP Integration Service cleaned up');
    } catch (error) {
      console.error('❌ Error during MCP cleanup:', error);
    }
  }

  /**
   * Get MCP status
   */
  async getStatus(): Promise<{
    initialized: boolean;
    clientConnected: boolean;
    serverRunning: boolean;
    connectionAttempts: number;
  }> {
    return {
      initialized: this.isInitialized,
      clientConnected: (this.mcpClient as any)?.isConnected() || false,
      serverRunning: (this.mcpServerProcess as any) !== null,
      connectionAttempts: this.connectionAttempts
    };
  }
}

// Singleton instance
export const mcpIntegration = MCPIntegrationService.getInstance();

// Helper functions
export async function initializeMCP(): Promise<MCPIntegrationService> {
  await mcpIntegration.initialize();
  return mcpIntegration;
}

export async function callMCPTool(toolName: string, args: any, timeout?: number): Promise<any> {
  return mcpIntegration.callTool(toolName, args, timeout);
}

export async function listMCPTools(): Promise<any[]> {
  return mcpIntegration.listTools();
}

export function getMCPStatus() {
  return mcpIntegration.getStatus().then(status => status);
}

export async function cleanupMCP(): Promise<void> {
  return mcpIntegration.cleanup();
}
