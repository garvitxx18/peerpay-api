import { Injectable, Logger } from '@nestjs/common';

export type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

export interface LogContext {
  userId?: string;
  requestId?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AppLogger {
  private readonly logger = new Logger();

  private formatMessage(message: string, context?: LogContext): string {
    const parts = [message];
    
    if (context?.userId) {
      parts.push(`[User: ${context.userId}]`);
    }
    
    if (context?.requestId) {
      parts.push(`[Request: ${context.requestId}]`);
    }
    
    if (context?.operation) {
      parts.push(`[Operation: ${context.operation}]`);
    }
    
    if (context?.metadata && Object.keys(context.metadata).length > 0) {
      parts.push(`[Metadata: ${JSON.stringify(context.metadata)}]`);
    }
    
    return parts.join(' ');
  }

  log(message: string, context?: LogContext): void {
    this.logger.log(this.formatMessage(message, context));
  }

  error(message: string, trace?: string, context?: LogContext): void {
    this.logger.error(this.formatMessage(message, context), trace);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(this.formatMessage(message, context));
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(this.formatMessage(message, context));
  }

  verbose(message: string, context?: LogContext): void {
    this.logger.verbose(this.formatMessage(message, context));
  }

  // Convenience methods for common operations
  logUserAction(action: string, userId: string, metadata?: Record<string, unknown>): void {
    this.log(`User action: ${action}`, { userId, operation: 'USER_ACTION', metadata });
  }

  logApiCall(endpoint: string, method: string, userId?: string, metadata?: Record<string, unknown>): void {
    this.log(`API call: ${method} ${endpoint}`, { userId, operation: 'API_CALL', metadata });
  }

  logDatabaseOperation(operation: string, table: string, userId?: string, metadata?: Record<string, unknown>): void {
    this.log(`Database ${operation}: ${table}`, { userId, operation: 'DATABASE', metadata: { table, ...metadata } });
  }

  logAuthEvent(event: string, userId?: string, metadata?: Record<string, unknown>): void {
    this.log(`Auth event: ${event}`, { userId, operation: 'AUTH', metadata });
  }

  logError(error: Error, context?: LogContext): void {
    this.error(`Error occurred: ${error.message}`, error.stack, context);
  }
}
