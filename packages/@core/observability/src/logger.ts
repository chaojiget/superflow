export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogRow {
  ts: number;
  level: LogLevel;
  nodeId?: string;
  runId?: string;
  chainId?: string;
  fields?: Record<string, unknown>;
}

export interface Logger {
  log(row: LogRow): void;
}

export function createLogger(writer: (row: LogRow) => void): Logger {
  return {
    log: writer,
  };
}
