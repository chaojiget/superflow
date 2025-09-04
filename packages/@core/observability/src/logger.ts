export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogRow {
  ts: number;
  level: LogLevel;
  nodeId?: string | undefined;
  runId?: string | undefined;
  chainId?: string | undefined;
  fields?: Record<string, unknown> | undefined;
}

export function createLog(row: LogRow): LogRow {
  return row;
}
