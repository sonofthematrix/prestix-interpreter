/**
 * MCP Logger Service
 * Provides comprehensive logging for MCP operations
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  operation?: string;
  duration?: number;
}

class MCPLogger {
  private static instance: MCPLogger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private currentLevel = LogLevel.INFO;

  private constructor() {
    // Set log level from environment
    const envLevel = process.env.MCP_LOG_LEVEL?.toUpperCase();
    if (envLevel && envLevel in LogLevel) {
      this.currentLevel = LogLevel[envLevel as keyof typeof LogLevel];
    }
  }

  static getInstance(): MCPLogger {
    if (!MCPLogger.instance) {
      MCPLogger.instance = new MCPLogger();
    }
    return MCPLogger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  private addLog(level: LogLevel, category: string, message: string, data?: any, operation?: string, duration?: number): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      operation,
      duration,
    };

    this.logs.push(logEntry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with colors
    const levelColors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
    };

    const levelNames = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO',
      [LogLevel.WARN]: 'WARN',
      [LogLevel.ERROR]: 'ERROR',
    };

    const color = levelColors[level];
    const reset = '\x1b[0m';
    const levelName = levelNames[level];

    const logMessage = `${color}[${levelName}]${reset} [${category}] ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }

    // Also log to stderr for MCP server communication
    if (level >= LogLevel.WARN) {
      console.error(`MCP ${levelName}: ${category} - ${message}`, data || '');
    }
  }

  debug(category: string, message: string, data?: any, operation?: string): void {
    this.addLog(LogLevel.DEBUG, category, message, data, operation);
  }

  info(category: string, message: string, data?: any, operation?: string, duration?: number): void {
    this.addLog(LogLevel.INFO, category, message, data, operation, duration);
  }

  warn(category: string, message: string, data?: any, operation?: string): void {
    this.addLog(LogLevel.WARN, category, message, data, operation);
  }

  error(category: string, message: string, data?: any, operation?: string): void {
    this.addLog(LogLevel.ERROR, category, message, data, operation);
  }

  // Specialized logging methods for MCP operations
  mcpServerStart(port?: number): void {
    this.info('MCP_SERVER', `Starting MCP server${port ? ` on port ${port}` : ''}`);
  }

  mcpServerStop(): void {
    this.info('MCP_SERVER', 'MCP server stopped');
  }

  mcpClientConnect(): void {
    this.info('MCP_CLIENT', 'MCP client connecting...');
  }

  mcpClientConnected(): void {
    this.info('MCP_CLIENT', 'MCP client connected successfully');
  }

  mcpClientDisconnect(): void {
    this.info('MCP_CLIENT', 'MCP client disconnected');
  }

  mcpToolCall(toolName: string, args: any, startTime: number): void {
    this.debug('MCP_TOOL', `Calling tool: ${toolName}`, args, toolName);
  }

  mcpToolResult(toolName: string, result: any, startTime: number): void {
    const duration = Date.now() - startTime;
    this.info('MCP_TOOL', `Tool ${toolName} completed successfully`, result, toolName, duration);
  }

  mcpToolError(toolName: string, error: any, startTime: number): void {
    const duration = Date.now() - startTime;
    this.error('MCP_TOOL', `Tool ${toolName} failed`, error);
  }

  mcpTransportError(operation: string, error: any): void {
    this.error('MCP_TRANSPORT', `Transport error during ${operation}`, error, operation);
  }

  mcpProtocolError(operation: string, error: any): void {
    this.error('MCP_PROTOCOL', `Protocol error during ${operation}`, error, operation);
  }

  // AI Integration logging
  aiRequest(provider: string, model: string, prompt: string): void {
    this.info('AI_REQUEST', `AI request to ${provider}/${model}`, { prompt: prompt.substring(0, 100) + '...' });
  }

  aiResponse(provider: string, model: string, response: string, tokens?: number): void {
    this.info('AI_RESPONSE', `AI response from ${provider}/${model}`, { 
      response: response.substring(0, 100) + '...',
      tokens 
    });
  }

  aiError(provider: string, model: string, error: any): void {
    this.error('AI_ERROR', `AI error from ${provider}/${model}`, error);
  }

  // Schema operations
  schemaAnalysis(schema: string, startTime: number): void {
    this.debug('SCHEMA', 'Starting schema analysis', { schemaLength: schema.length });
  }

  schemaAnalysisComplete(result: any, startTime: number): void {
    const duration = Date.now() - startTime;
    this.info('SCHEMA', 'Schema analysis completed', result, 'schema_analysis', duration);
  }

  // Code generation
  codeGeneration(target: string, profile: string, startTime: number): void {
    this.info('CODE_GEN', `Starting code generation for ${target} using ${profile} profile`);
  }

  codeGenerationComplete(target: string, result: any, startTime: number): void {
    const duration = Date.now() - startTime;
    this.info('CODE_GEN', `Code generation completed for ${target}`, result, 'code_generation', duration);
  }

  // Get logs for debugging
  getLogs(level?: LogLevel, category?: string, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= level);
    }

    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  // Get recent logs as formatted string
  getRecentLogs(limit: number = 50): string {
    const recentLogs = this.getLogs(undefined, undefined, limit);
    return recentLogs.map(log => {
      const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
      return `[${log.timestamp}] [${levelNames[log.level]}] [${log.category}] ${log.message}${log.duration ? ` (${log.duration}ms)` : ''}`;
    }).join('\n');
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
    this.info('LOGGER', 'Logs cleared');
  }

  // Set log level
  setLogLevel(level: LogLevel): void {
    this.currentLevel = level;
    this.info('LOGGER', `Log level set to ${LogLevel[level]}`);
  }

  // Get current status
  getStatus(): {
    logLevel: string;
    totalLogs: number;
    recentErrors: number;
    lastLogTime?: string;
  } {
    const recentErrors = this.logs.filter(log => 
      log.level === LogLevel.ERROR && 
      Date.now() - new Date(log.timestamp).getTime() < 60000 // Last minute
    ).length;

    return {
      logLevel: LogLevel[this.currentLevel],
      totalLogs: this.logs.length,
      recentErrors,
      lastLogTime: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : undefined,
    };
  }
}

// Export singleton instance
export const mcpLogger = MCPLogger.getInstance();

// Convenience functions
export const log = {
  debug: (category: string, message: string, data?: any, operation?: string) => 
    mcpLogger.debug(category, message, data, operation),
  info: (category: string, message: string, data?: any, operation?: string, duration?: number) => 
    mcpLogger.info(category, message, data, operation, duration),
  warn: (category: string, message: string, data?: any, operation?: string) => 
    mcpLogger.warn(category, message, data, operation),
  error: (category: string, message: string, data?: any, operation?: string) => 
    mcpLogger.error(category, message, data, operation),
};

// MCP-specific logging functions
export const mcpLog = {
  serverStart: (port?: number) => mcpLogger.mcpServerStart(port),
  serverStop: () => mcpLogger.mcpServerStop(),
  clientConnect: () => mcpLogger.mcpClientConnect(),
  clientConnected: () => mcpLogger.mcpClientConnected(),
  clientDisconnect: () => mcpLogger.mcpClientDisconnect(),
  toolCall: (toolName: string, args: any, startTime: number) => mcpLogger.mcpToolCall(toolName, args, startTime),
  toolResult: (toolName: string, result: any, startTime: number) => mcpLogger.mcpToolResult(toolName, result, startTime),
  toolError: (toolName: string, error: any, startTime: number) => mcpLogger.mcpToolError(toolName, error, startTime),
  transportError: (operation: string, error: any) => mcpLogger.mcpTransportError(operation, error),
  protocolError: (operation: string, error: any) => mcpLogger.mcpProtocolError(operation, error),
};
