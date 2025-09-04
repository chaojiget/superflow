import { z } from 'zod';
import { BaseEntity, TraceId, UlidSchema, TimestampSchema } from './base';

// 运行状态与日志级别
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

// 运行记录与日志记录
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

// Worker 上下文与协议
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
  capabilities?: string[];
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

// 执行请求与事件（供序列化测试）
export const ExecRequestSchema = z.object({
  kind: z.literal('EXEC'),
  runId: UlidSchema,
  nodeId: z.string(),
  flowId: z.string(),
  code: z.string(),
  language: z.enum(['js', 'ts']),
  input: z.unknown(),
  controls: z
    .object({
      timeoutMs: z.number().int().positive().optional(),
      retries: z.number().int().nonnegative().optional(),
    })
    .optional(),
  env: z
    .object({
      capabilities: z.array(z.string()).optional(),
    })
    .catchall(z.string())
    .optional(),
});
export type ExecRequest = z.infer<typeof ExecRequestSchema>;

const StartedEventSchema = z.object({
  kind: z.literal('STARTED'),
  runId: UlidSchema,
  ts: TimestampSchema,
});
const LogEventSchema = z.object({
  kind: z.literal('LOG'),
  runId: UlidSchema,
  ts: TimestampSchema,
  level: LogLevelSchema,
  event: z.string(),
  data: z.unknown().optional(),
});
const ResultEventSchema = z.object({
  kind: z.literal('RESULT'),
  runId: UlidSchema,
  ts: TimestampSchema,
  durationMs: z.number().int().nonnegative().optional(),
  output: z.unknown().optional(),
});
export const ExecEventSchema = z.union([
  StartedEventSchema,
  LogEventSchema,
  ResultEventSchema,
]);
export type ExecEvent = z.infer<typeof ExecEventSchema>;

// 别名：NodeContext 等同 WorkerContext
export type NodeContext = WorkerContext;

// 节点运行状态与运行中心事件（供 FlowCanvas 绑定）
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
