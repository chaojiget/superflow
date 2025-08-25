import { z } from 'zod';
import { BaseEntity, TraceId } from './base';

export const RunStatusSchema = z.enum([
  'pending',
  'running',
  'success',
  'failed',
  'cancelled',
]);

export type RunStatus = z.infer<typeof RunStatusSchema>;

export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

export interface RunRecord extends BaseEntity {
  flowId: string;
  startedAt: number;
  finishedAt?: number;
  status: RunStatus;
  traceId: TraceId;
  result?: unknown;
  error?: string;
}

export interface LogRecord extends BaseEntity {
  runId: string;
  nodeId?: string;
  timestamp: number;
  level: LogLevel;
  event: string;
  data?: unknown;
  traceId: TraceId;
}

export interface WorkerContext {
  signal: AbortSignal;
  logger: {
    debug: (event: string, data?: unknown) => void;
    info: (event: string, data?: unknown) => void;
    warn: (event: string, data?: unknown) => void;
    error: (event: string, data?: unknown) => void;
  };
  env?: Record<string, string>;
  kv?: {
    get: (key: string) => Promise<unknown>;
    put: (key: string, value: unknown) => Promise<void>;
    del: (key: string) => Promise<void>;
  };
  traceId: TraceId;
}

export type NodeHandler = (
  input: unknown,
  ctx: WorkerContext
) => Promise<unknown>;

export interface WorkerMessage {
  type: 'execute' | 'cancel' | 'log';
  id: string;
  payload?: unknown;
}

export interface WorkerResponse {
  type: 'result' | 'error' | 'log';
  id: string;
  payload?: unknown;
}

export const NodeRuntimeStatusSchema = z.enum([
  'idle',
  'running',
  'success',
  'error',
]);

export type NodeRuntimeStatus = z.infer<typeof NodeRuntimeStatusSchema>;

export interface NodeExecutionEventHandlers {
  onNodeStart?: (nodeId: string) => void;
  onNodeSuccess?: (nodeId: string) => void;
  onNodeError?: (nodeId: string) => void;
}

export interface NodeExecutionEventSource {
  subscribeNodeEvents(
    runId: string,
    handlers: NodeExecutionEventHandlers
  ): () => void;
  retryNode(runId: string, nodeId: string): Promise<void>;
}
