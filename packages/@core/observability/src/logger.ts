export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogRow {
  ts: number;
  level: LogLevel;
  runId?: string | undefined;
  chainId?: string | undefined;
  nodeId?: string | undefined;
  fields?: Record<string, unknown> | undefined;
}

export function createLog(row: LogRow): LogRow {
  return row;
}
