/**
 * Centralized Logging System
 * Provides structured logging with different levels and contexts
 */

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// Log context
export interface LogContext {
  userId?: string;
  requestId?: string;
  operation?: string;
  resource?: string;
  duration?: number;
  memory?: number;
  [key: string]: any;
}

// Log entry
export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: Date;
  error?: Error;
}

// Logger configuration
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  maxFileSize: number;
  maxFiles: number;
  logDirectory: string;
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  enableConsole: true,
  enableFile: false,
  enableRemote: false,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  logDirectory: './logs',
};

// Logger class
export class Logger {
  private config: LoggerConfig;
  private context: LogContext = {};

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set logging context
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear logging context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, { ...context, error });
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, context?: LogContext): void {
    if (level > this.config.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context: { ...this.context, ...context },
      timestamp: new Date(),
    };

    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // File logging
    if (this.config.enableFile) {
      this.logToFile(entry);
    }

    // Remote logging
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.logToRemote(entry);
    }
  }

  /**
   * Log to console
   */
  private logToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    
    const logMessage = `[${timestamp}] ${levelName}: ${entry.message}${contextStr}`;
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(logMessage);
        if (entry.context?.error) {
          console.error(entry.context.error);
        }
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
    }
  }

  /**
   * Log to file
   */
  private logToFile(entry: LogEntry): void {
    // In a real implementation, you would write to a file
    // For now, we'll just log to console
    console.log(`[FILE] ${JSON.stringify(entry)}`);
  }

  /**
   * Log to remote endpoint
   */
  private logToRemote(entry: LogEntry): void {
    // In a real implementation, you would send to a remote logging service
    // For now, we'll just log to console
    console.log(`[REMOTE] ${JSON.stringify(entry)}`);
  }
}

// Create default logger instance
export const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableFile: false,
  enableRemote: false,
});

// Export convenience functions
export const logError = (message: string, error?: Error, context?: LogContext) => 
  logger.error(message, error, context);
export const logWarn = (message: string, context?: LogContext) => 
  logger.warn(message, context);
export const logInfo = (message: string, context?: LogContext) => 
  logger.info(message, context);
export const logDebug = (message: string, context?: LogContext) => 
  logger.debug(message, context);
