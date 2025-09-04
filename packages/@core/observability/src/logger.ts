import type { LogLevel } from '../protocol/src';

export interface LogRow {
  ts: number;
  level: LogLevel;
  nodeId?: string | undefined;
  runId?: string | undefined;
  chainId?: string | undefined;
  fields?: Record<string, unknown> | undefined;
}

export interface Logger {
  log(row: LogRow): void;
}

export function createLogRow(row: LogRow): LogRow {
  return row;
}
