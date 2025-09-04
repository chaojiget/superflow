export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogRow {
  ts: number;
  level: LogLevel;
  runId?: string;
  chainId?: string;
  nodeId?: string;
  fields?: Record<string, unknown>;
}

export type LogTransport = (row: LogRow) => void;

export function createLogger(transport: LogTransport) {
  return function log(
    level: LogLevel,
    context: {
      runId?: string;
      chainId?: string;
      nodeId?: string;
      fields?: Record<string, unknown>;
    } = {}
  ): void {
    const row: LogRow = {
      ts: Date.now(),
      level,
      ...(context.runId && { runId: context.runId }),
      ...(context.chainId && { chainId: context.chainId }),
      ...(context.nodeId && { nodeId: context.nodeId }),
      ...(context.fields && { fields: context.fields }),
    };
    transport(row);
  };
}
