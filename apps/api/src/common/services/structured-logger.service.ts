import { Injectable, LoggerService, Scope } from '@nestjs/common';

export interface LogContext {
  requestId?: string;
  userId?: string;
  tenantId?: string;
  [key: string]: any;
}

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger implements LoggerService {
  private context?: string;
  private defaultContext: LogContext = {};

  setContext(context: string) {
    this.context = context;
  }

  setDefaultContext(context: LogContext) {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  log(message: string, context?: LogContext) {
    this.writeLog('info', message, context);
  }

  error(message: string, trace?: string, context?: LogContext) {
    this.writeLog('error', message, { ...context, trace });
  }

  warn(message: string, context?: LogContext) {
    this.writeLog('warn', message, context);
  }

  debug(message: string, context?: LogContext) {
    this.writeLog('debug', message, context);
  }

  verbose(message: string, context?: LogContext) {
    this.writeLog('verbose', message, context);
  }

  private writeLog(level: string, message: string, context?: LogContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      ...this.defaultContext,
      ...context,
    };

    // In production, use JSON format for structured logging
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      // In development, use pretty format
      const { requestId, userId, tenantId, ...rest } = logEntry as any;
      const metadata = [];
      if (requestId) metadata.push(`[${requestId.substring(0, 8)}]`);
      if (userId) metadata.push(`[user:${userId}]`);
      if (tenantId) metadata.push(`[tenant:${tenantId}]`);

      console.log(
        `[${logEntry.timestamp}] ${level.toUpperCase().padEnd(7)} ${metadata.join(' ')} ${logEntry.context ? `[${logEntry.context}]` : ''} ${message}`,
        Object.keys(rest).length > 4 ? rest : '',
      );
    }
  }
}
