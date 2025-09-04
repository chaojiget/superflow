export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogRow {
  ts: number;
  level: LogLevel;
  nodeId: string | undefined;
  runId: string | undefined;
  chainId: string | undefined;
  fields: Record<string, unknown> | undefined;
}

export interface LoggerContext {
  nodeId?: string;
  runId?: string;
  chainId?: string;
}

export function createLog(
  level: LogLevel,
  ctx: LoggerContext,
  fields?: Record<string, unknown>
): LogRow {
  return {
    ts: Date.now(),
    level,
    nodeId: ctx.nodeId,
    runId: ctx.runId,
    chainId: ctx.chainId,
    fields,
  };
}
