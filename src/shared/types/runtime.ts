import { z } from 'zod';
import { TraceId, UlidSchema, TimestampSchema } from './base';
import { ErrorCodeSchema } from './error';

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
  env: z.record(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
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
  durationMs: z.number().int().nonnegative(),
  output: z.unknown(),
});

const ErrorEventSchema = z.object({
  kind: z.literal('ERROR'),
  runId: UlidSchema,
  ts: TimestampSchema,
  error: z.object({
    name: z.string(),
    message: z.string(),
    stack: z.string().optional(),
    code: ErrorCodeSchema,
  }),
});

export const ExecEventSchema = z.discriminatedUnion('kind', [
  StartedEventSchema,
  LogEventSchema,
  ResultEventSchema,
  ErrorEventSchema,
]);

export type ExecEvent = z.infer<typeof ExecEventSchema>;

export interface NodeContext {
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
  ctx: NodeContext
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
<<<<<<< HEAD

/**
 * 以下为执行协议与事件的最小定义（来自 PR #44 用例）
 */
export const ExecRequestSchema = z.object({
  kind: z.literal('EXEC'),
  runId: z.string(),
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
  env: z.record(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
});

const StartedEventSchema = z.object({
  kind: z.literal('STARTED'),
  runId: z.string(),
  ts: z.number().int().positive(),
});

const LogEventSchema = z.object({
  kind: z.literal('LOG'),
  runId: z.string(),
  ts: z.number().int().positive(),
  level: LogLevelSchema,
  event: z.string(),
  data: z.unknown().optional(),
});

const ResultEventSchema = z.object({
  kind: z.literal('RESULT'),
  runId: z.string(),
  ts: z.number().int().positive(),
  durationMs: z.number().int().nonnegative().optional(),
  output: z.unknown().optional(),
});

export const ExecEventSchema = z.union([
  StartedEventSchema,
  LogEventSchema,
  ResultEventSchema,
]);

// 兼容别名：NodeContext 等同于 WorkerContext
export type NodeContext = WorkerContext;
=======
>>>>>>> pr-44
