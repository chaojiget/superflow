/**
 * 日志工具
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 日志上下文
 */
export interface LogContext {
  event: string;
  data?: unknown;
  traceId?: string;
  userId?: string;
  flowId?: string;
  nodeId?: string;
  runId?: string;
  [key: string]: unknown;
}

/**
 * 日志记录
 */
export interface LogRecord {
  timestamp: number;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: Error;
}

/**
 * 日志输出器接口
 */
export interface LogWriter {
  write(record: LogRecord): void;
}

/**
 * 控制台日志输出器
 */
export class ConsoleWriter implements LogWriter {
  write(record: LogRecord): void {
    const timestamp = new Date(record.timestamp).toISOString();
    const levelName = LogLevel[record.level];
    const message = `[${timestamp}] ${levelName}: ${record.message}`;

    const contextStr =
      Object.keys(record.context).length > 0
        ? ` ${JSON.stringify(record.context)}`
        : '';

    switch (record.level) {
      case LogLevel.DEBUG:
        console.debug(message + contextStr);
        break;
      case LogLevel.INFO:
        console.info(message + contextStr);
        break;
      case LogLevel.WARN:
        console.warn(message + contextStr);
        if (record.error) console.warn(record.error);
        break;
      case LogLevel.ERROR:
        console.error(message + contextStr);
        if (record.error) console.error(record.error);
        break;
    }
  }
}

/**
 * 结构化日志输出器
 */
export class StructuredWriter implements LogWriter {
  write(record: LogRecord): void {
    const logEntry = {
      timestamp: record.timestamp,
      level: LogLevel[record.level],
      message: record.message,
      ...record.context,
    };

    if (record.error) {
      (logEntry as any).error = {
        name: record.error.name,
        message: record.error.message,
        stack: record.error.stack,
      };
    }

    console.log(JSON.stringify(logEntry));
  }
}

/**
 * 内存日志输出器
 */
export class MemoryWriter implements LogWriter {
  private records: LogRecord[] = [];
  private maxRecords: number;

  constructor(maxRecords: number = 1000) {
    this.maxRecords = maxRecords;
  }

  write(record: LogRecord): void {
    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }
  }

  getRecords(): LogRecord[] {
    return [...this.records];
  }

  getRecordsByLevel(level: LogLevel): LogRecord[] {
    return this.records.filter((record) => record.level === level);
  }

  getRecordsSince(timestamp: number): LogRecord[] {
    return this.records.filter((record) => record.timestamp >= timestamp);
  }

  clear(): void {
    this.records = [];
  }
}

/**
 * 日志过滤器
 */
export type LogFilter = (record: LogRecord) => boolean;

/**
 * 多路输出器
 */
export class MultiWriter implements LogWriter {
  private writers: LogWriter[] = [];
  private filters: Map<LogWriter, LogFilter[]> = new Map();

  addWriter(writer: LogWriter, filters: LogFilter[] = []): void {
    this.writers.push(writer);
    this.filters.set(writer, filters);
  }

  removeWriter(writer: LogWriter): void {
    const index = this.writers.indexOf(writer);
    if (index !== -1) {
      this.writers.splice(index, 1);
      this.filters.delete(writer);
    }
  }

  write(record: LogRecord): void {
    for (const writer of this.writers) {
      const filters = this.filters.get(writer) || [];
      const shouldWrite =
        filters.length === 0 || filters.every((filter) => filter(record));

      if (shouldWrite) {
        try {
          writer.write(record);
        } catch (error) {
          console.error('日志写入失败:', error);
        }
      }
    }
  }
}

/**
 * 日志器
 */
export class Logger {
  private writer: LogWriter;
  private minLevel: LogLevel;
  private defaultContext: Partial<LogContext>;

  constructor(
    writer: LogWriter = new ConsoleWriter(),
    minLevel: LogLevel = LogLevel.INFO,
    defaultContext: Partial<LogContext> = {}
  ) {
    this.writer = writer;
    this.minLevel = minLevel;
    this.defaultContext = defaultContext;
  }

  private log(
    level: LogLevel,
    message: string,
    context: Partial<LogContext> = {},
    error?: Error
  ): void {
    if (level < this.minLevel) {
      return;
    }

    const record: LogRecord = {
      timestamp: Date.now(),
      level,
      message,
      context: {
        event: context.event || 'unknown',
        ...this.defaultContext,
        ...context,
      },
      ...(error && { error }),
    };

    this.writer.write(record);
  }

  debug(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Partial<LogContext>, error?: Error): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  error(message: string, context?: Partial<LogContext>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  setWriter(writer: LogWriter): void {
    this.writer = writer;
  }

  withContext(context: Partial<LogContext>): Logger {
    return new Logger(this.writer, this.minLevel, {
      ...this.defaultContext,
      ...context,
    });
  }

  child(context: Partial<LogContext>): Logger {
    return this.withContext(context);
  }
}

/**
 * 创建默认日志器
 */
export function createLogger(
  level: LogLevel = LogLevel.INFO,
  writer?: LogWriter
): Logger {
  const defaultWriter =
    writer ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'
      ? new StructuredWriter()
      : new ConsoleWriter());

  return new Logger(defaultWriter, level);
}

/**
 * 全局默认日志器
 */
export const logger = createLogger();

/**
 * 常用的日志过滤器
 */
export const filters = {
  byLevel: (level: LogLevel) => (record: LogRecord) => record.level >= level,
  byEvent: (event: string) => (record: LogRecord) =>
    record.context.event === event,
  byTraceId: (traceId: string) => (record: LogRecord) =>
    record.context.traceId === traceId,
  byUserId: (userId: string) => (record: LogRecord) =>
    record.context.userId === userId,
  byFlowId: (flowId: string) => (record: LogRecord) =>
    record.context.flowId === flowId,
  byNodeId: (nodeId: string) => (record: LogRecord) =>
    record.context.nodeId === nodeId,
  withError: () => (record: LogRecord) => record.error !== undefined,
  timeRange: (start: number, end: number) => (record: LogRecord) =>
    record.timestamp >= start && record.timestamp <= end,
};

/**
 * 性能测量装饰器
 */
export function measurePerformance(logger: Logger, event: string) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      const context = { event, method: _propertyKey };

      logger.debug('方法开始执行', context);

      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - startTime;

        logger.info('方法执行完成', {
          ...context,
          duration: Math.round(duration),
          success: true,
        });

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;

        logger.error(
          '方法执行失败',
          {
            ...context,
            duration: Math.round(duration),
            success: false,
          },
          error as Error
        );

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 异步操作日志包装器
 */
export async function withLogging<T>(
  operation: () => Promise<T>,
  logger: Logger,
  event: string,
  context: Partial<LogContext> = {}
): Promise<T> {
  const startTime = performance.now();
  const logContext = { event, ...context };

  logger.debug('操作开始', logContext);

  try {
    const result = await operation();
    const duration = performance.now() - startTime;

    logger.info('操作完成', {
      ...logContext,
      duration: Math.round(duration),
      success: true,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    logger.error(
      '操作失败',
      {
        ...logContext,
        duration: Math.round(duration),
        success: false,
      },
      error as Error
    );

    throw error;
  }
}
