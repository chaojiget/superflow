import { z } from 'zod';
import { BaseEntity, TraceId } from './base';
import { RunStatus, LogLevel } from './runtime';
import type { AppError } from './error';

export const DB_VERSION = 1;

export interface VersionRecord extends BaseEntity {
  nodeId: string;
  author: string;
  message: string;
  diff: string;
  parentVersion?: string;
}

export interface ConfigRecord extends BaseEntity {
  key: string;
  value: unknown;
  scope: 'global' | 'flow' | 'node';
  scopeId?: string;
}

export interface KVRecord extends BaseEntity {
  key: string;
  value: unknown;
  expiresAt?: number;
}

export interface RunRecord extends BaseEntity {
  flowId: string;
  startedAt: number;
  finishedAt?: number;
  status: RunStatus;
  traceId: TraceId;
  result?: unknown;
  error?: AppError;
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

export interface ImportExportSchema {
  version: number;
  timestamp: number;
  data: {
    flows?: unknown[];
    nodes?: unknown[];
    runs?: unknown[];
    logs?: unknown[];
    configs?: unknown[];
  };
}

export const ImportExportSchemaValidator = z.object({
  version: z.number().int().positive(),
  timestamp: z.number().int().positive(),
  data: z.object({
    flows: z.array(z.unknown()).optional(),
    nodes: z.array(z.unknown()).optional(),
    runs: z.array(z.unknown()).optional(),
    logs: z.array(z.unknown()).optional(),
    configs: z.array(z.unknown()).optional(),
  }),
});
