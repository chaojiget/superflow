export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogRow {
  ts: number;
  level: LogLevel;
  nodeId?: string;
  runId?: string;
  chainId?: string;
  fields?: Record<string, unknown>;
}

export function createLogRow(
  level: LogLevel,
  options: {
    nodeId?: string;
    runId?: string;
    chainId?: string;
    fields?: Record<string, unknown>;
  } = {}
): LogRow {
  const { nodeId, runId, chainId, fields } = options;
  return {
    ts: Date.now(),
    level,
    ...(nodeId !== undefined ? { nodeId } : {}),
    ...(runId !== undefined ? { runId } : {}),
    ...(chainId !== undefined ? { chainId } : {}),
    ...(fields !== undefined ? { fields } : {}),
  };
}
