import { z } from 'zod';
import { BaseEntity } from './base';

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

/**
 * 事件记录表结构
 */
export interface EventRecord extends BaseEntity {
  /** 事件类型，例如 run.created */
  type: string;
  /** 事件携带的数据 */
  payload: unknown;
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

/**
 * 存储适配器接口
 */
export interface StorageAdapter {
  get<T = unknown>(table: string, key: string): Promise<T | undefined>;
  put<T = unknown>(table: string, value: T & { id: string }): Promise<void>;
  delete(table: string, key: string): Promise<void>;
  getAll<T = unknown>(table: string): Promise<T[]>;
  putMany<T = unknown>(
    table: string,
    values: (T & { id: string })[]
  ): Promise<void>;
  deleteMany(table: string, keys: string[]): Promise<void>;
  count(table: string): Promise<number>;
  clear(table: string): Promise<void>;
  /** 追加事件日志 */
  addEvent(event: EventRecord): Promise<void>;
  transaction<T>(
    tables: string[],
    mode: 'readonly' | 'readwrite',
    callback: (tx: StorageTransaction) => Promise<T>
  ): Promise<T>;
}

/**
 * 存储事务接口
 */
export interface StorageTransaction {
  get<T = unknown>(table: string, key: string): Promise<T | undefined>;
  put<T = unknown>(table: string, value: T & { id: string }): Promise<void>;
  delete(table: string, key: string): Promise<void>;
  addEvent(event: EventRecord): Promise<void>;
}
