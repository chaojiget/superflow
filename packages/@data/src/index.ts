import Dexie, { type Transaction } from 'dexie';
import type {
  StorageAdapter,
  StorageTransaction,
  EventRecord,
} from '@core/storage';

/**
 * 数据库版本
 * 修改表结构时请增加版本号并添加迁移逻辑
 */
export const DB_VERSION = 4;

/**
 * 运行记录表结构
 */
export interface RunRecord {
  id: string;
  flowId: string;
  startedAt: number;
  finishedAt?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  traceId: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 日志记录表结构
 */
export interface LogRecord {
  id: string;
  runId: string;
  ts: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  event: string;
  data?: unknown;
  traceId?: string;
}

/**
 * 版本记录表结构
 */
export interface VersionRecord {
  id: string;
  nodeId: string;
  createdAt: number;
  author: string;
  message: string;
  diff: string;
  version: string;
}

/**
 * 流程定义表结构
 */
export interface FlowRecord {
  id: string;
  name: string;
  description?: string;
  nodes: unknown[];
  edges: unknown[];
  createdAt: number;
  updatedAt: number;
  version: string;
  metadata?: Record<string, unknown>;
}

/**
 * 节点定义表结构
 */
export interface NodeRecord {
  id: string;
  kind: string;
  name: string;
  description: string;
  version: string;
  code?: string;
  schema?: unknown;
  createdAt: number;
  updatedAt: number;
  author?: string;
}

/**
 * 键值存储表结构
 */
export interface KVRecord {
  key: string;
  value: unknown;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  namespace?: string;
}

/**
 * 事件日志记录（追加写）
 */
export interface LocalEventRecord extends EventRecord {}

/**
 * Superflow 数据库类
 */
class SuperflowDB extends Dexie {
  runs!: Dexie.Table<RunRecord, string>;
  logs!: Dexie.Table<LogRecord, string>;
  versions!: Dexie.Table<VersionRecord, string>;
  flows!: Dexie.Table<FlowRecord, string>;
  nodes!: Dexie.Table<NodeRecord, string>;
  kv!: Dexie.Table<KVRecord, string>;
  events!: Dexie.Table<LocalEventRecord, string>;

  constructor(name: string) {
    super(name);

    this.version(1).stores({
      runs: 'id, flowId, startedAt, status, traceId',
      logs: 'id, runId, ts, level, event, traceId',
      versions: 'id, nodeId, createdAt, author',
      flows: 'id, name, createdAt, updatedAt, version',
      nodes: 'id, kind, name, version, createdAt, updatedAt',
      kv: 'key, createdAt, updatedAt, expiresAt, namespace',
    });

    this.version(2).stores({
      runs: 'id, flowId, startedAt, finishedAt, status, traceId',
      logs: 'id, runId, ts, level, event, traceId',
      versions: 'id, nodeId, createdAt, author, version',
      flows: 'id, name, createdAt, updatedAt, version',
      nodes: 'id, kind, name, version, createdAt, updatedAt, author',
      kv: 'key, createdAt, updatedAt, expiresAt, namespace',
    });

    this.version(3).stores({
      runs: 'id, flowId, startedAt, finishedAt, status, traceId',
      logs: 'id, runId, ts, level, event, traceId',
      versions: 'id, nodeId, createdAt, author, version',
      flows: 'id, name, createdAt, updatedAt, version',
      nodes: 'id, kind, name, version, createdAt, updatedAt, author',
      kv: 'key, createdAt, updatedAt, expiresAt, namespace',
    });

    this.version(4).stores({
      runs: 'id, flowId, startedAt, finishedAt, status, traceId',
      logs: 'id, runId, ts, level, event, traceId',
      versions: 'id, nodeId, createdAt, author, version',
      flows: 'id, name, createdAt, updatedAt, version',
      nodes: 'id, kind, name, version, createdAt, updatedAt, author',
      kv: 'key, createdAt, updatedAt, expiresAt, namespace',
      events: 'id, createdAt, type',
    });

    // 数据迁移逻辑
    this.version(2).upgrade((trans) => {
      return trans
        .table('versions')
        .toCollection()
        .modify((version) => {
          if (!version.version) {
            version.version = '1.0.0';
          }
        });
    });

    this.version(3).upgrade((trans) => {
      return trans
        .table('nodes')
        .toCollection()
        .modify((node) => {
          if (!node.author) {
            node.author = 'system';
          }
        });
    });

    this.version(4).upgrade(() => {
      // 新增 events 表，无需迁移现有数据
    });
  }
}

/**
 * 存储适配器实现
 */
class DexieStorageAdapter implements StorageAdapter {
  constructor(private db: SuperflowDB) {}

  async get<T = unknown>(table: string, key: string): Promise<T | undefined> {
    const dbTable = this.getTable(table);
    const result = await dbTable.get(key);
    return result as T | undefined;
  }

  async put<T = unknown>(
    table: string,
    value: T & { id: string }
  ): Promise<void> {
    const dbTable = this.getTable(table);
    await dbTable.put(value);
  }

  async delete(table: string, key: string): Promise<void> {
    const dbTable = this.getTable(table);
    await dbTable.delete(key);
  }

  async getAll<T = unknown>(table: string): Promise<T[]> {
    const dbTable = this.getTable(table);
    const results = await dbTable.toArray();
    return results as T[];
  }

  async putMany<T = unknown>(
    table: string,
    values: (T & { id: string })[]
  ): Promise<void> {
    const dbTable = this.getTable(table);
    await dbTable.bulkPut(values);
  }

  async deleteMany(table: string, keys: string[]): Promise<void> {
    const dbTable = this.getTable(table);
    await dbTable.bulkDelete(keys);
  }

  async count(table: string): Promise<number> {
    const dbTable = this.getTable(table);
    return await dbTable.count();
  }

  async clear(table: string): Promise<void> {
    const dbTable = this.getTable(table);
    await dbTable.clear();
  }

  async addEvent(event: LocalEventRecord): Promise<void> {
    await this.db.events.add(event);
  }

  async transaction<T>(
    tables: string[],
    mode: 'readonly' | 'readwrite',
    callback: (tx: StorageTransaction) => Promise<T>
  ): Promise<T> {
    const dbTables = tables.map((table) => this.getTable(table));
    return await this.db.transaction(
      mode,
      dbTables,
      async (tx: Transaction) => {
        const storageTransaction: StorageTransaction = {
          get: async <U = unknown>(table: string, key: string) => {
            const dbTable = tx.table(table);
            return (await dbTable.get(key)) as U | undefined;
          },
          put: async <U = unknown>(
            table: string,
            value: U & { id: string }
          ) => {
            const dbTable = tx.table(table);
            await dbTable.put(value);
          },
          delete: async (table: string, key: string) => {
            const dbTable = tx.table(table);
            await dbTable.delete(key);
          },
          addEvent: async (event: LocalEventRecord) => {
            const table = tx.table('events');
            await table.add(event);
          },
        };
        return await callback(storageTransaction);
      }
    );
  }

  private getTable(tableName: string): Dexie.Table {
    switch (tableName) {
      case 'runs':
        return this.db.runs;
      case 'logs':
        return this.db.logs;
      case 'versions':
        return this.db.versions;
      case 'flows':
        return this.db.flows;
      case 'nodes':
        return this.db.nodes;
      case 'kv':
        return this.db.kv;
      case 'events':
        return this.db.events;
      case 'items': // 用于测试
        return this.db.kv; // 复用 kv 表
      default:
        throw new Error(`Unknown table: ${tableName}`);
    }
  }
}

/**
 * 创建存储实例
 */
export async function createStorage(dbName: string): Promise<StorageAdapter> {
  const db = new SuperflowDB(dbName);
  await db.open();
  return new DexieStorageAdapter(db);
}

/**
 * 导出数据到 JSON
 */
export async function exportData(storage: StorageAdapter): Promise<string> {
  const data = {
    version: DB_VERSION,
    timestamp: Date.now(),
    tables: {
      runs: await storage.getAll('runs'),
      logs: await storage.getAll('logs'),
      versions: await storage.getAll('versions'),
      flows: await storage.getAll('flows'),
      nodes: await storage.getAll('nodes'),
      kv: await storage.getAll('kv'),
      events: await storage.getAll('events'),
    },
  };
  return JSON.stringify(data, null, 2);
}

/**
 * 从 JSON 导入数据
 */
export async function importData(
  storage: StorageAdapter,
  jsonData: string
): Promise<void> {
  const data = JSON.parse(jsonData);

  // 版本兼容性检查
  if (data.version > DB_VERSION) {
    throw new Error(
      `数据版本 ${data.version} 高于当前支持的版本 ${DB_VERSION}`
    );
  }

  // 清空现有数据
  for (const tableName of Object.keys(data.tables)) {
    await storage.clear(tableName);
  }

  // 导入数据
  for (const [tableName, records] of Object.entries(data.tables)) {
    if (Array.isArray(records) && records.length > 0) {
      await storage.putMany(tableName, records);
    }
  }
}

/**
 * 根据 runId 获取日志
 */
export async function getLogsByRunId(
  storage: StorageAdapter,
  runId: string
): Promise<LogRecord[]> {
  const logs = await storage.getAll<LogRecord>('logs');
  return logs.filter((l) => l.runId === runId);
}

/**
 * 根据 traceId 获取运行记录
 */
export async function getRunsByTraceId(
  storage: StorageAdapter,
  traceId: string
): Promise<RunRecord[]> {
  const runs = await storage.getAll<RunRecord>('runs');
  return runs.filter((r) => r.traceId === traceId);
}

/**
 * 按 runId 以 NDJSON 格式导出日志
 */
export async function exportLogsAsNDJSON(
  storage: StorageAdapter,
  runId: string,
  writer: { write: (chunk: string) => void }
): Promise<void> {
  const logs = await getLogsByRunId(storage, runId);
  for (const log of logs) {
    const hasData =
      typeof (log as any).data === 'object' && (log as any).data !== null;
    const withFields = hasData
      ? ({ ...log, fields: (log as any).data } as any)
      : (log as any);
    writer.write(JSON.stringify(withFields) + '\n');
  }
}

/**
 * 键值存储封装
 */
export class KVStore {
  constructor(
    private storage: StorageAdapter,
    private namespace?: string
  ) {}

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const record = await this.storage.get<KVRecord>(
      'kv',
      this.getNamespacedKey(key)
    );
    if (!record) return undefined;

    // 检查过期时间
    if (record.expiresAt && record.expiresAt < Date.now()) {
      await this.delete(key);
      return undefined;
    }

    return record.value as T;
  }

  async put<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void> {
    const now = Date.now();
    const record: KVRecord = {
      key: this.getNamespacedKey(key),
      value,
      createdAt: now,
      updatedAt: now,
      ...(this.namespace && { namespace: this.namespace }),
      ...(ttlMs && { expiresAt: now + ttlMs }),
    };
    await this.storage.put('kv', { ...record, id: record.key });
  }

  async delete(key: string): Promise<void> {
    await this.storage.delete('kv', this.getNamespacedKey(key));
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  async keys(): Promise<string[]> {
    const allRecords = await this.storage.getAll<KVRecord>('kv');
    const prefix = this.namespace ? `${this.namespace}:` : '';
    return allRecords
      .filter((record) => record.key.startsWith(prefix))
      .map((record) => record.key.slice(prefix.length));
  }

  async clear(): Promise<void> {
    const keys = await this.keys();
    await this.storage.deleteMany(
      'kv',
      keys.map((key) => this.getNamespacedKey(key))
    );
  }

  private getNamespacedKey(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key;
  }
}

/**
 * 创建键值存储实例
 */
export function createKVStore(
  storage: StorageAdapter,
  namespace?: string
): KVStore {
  return new KVStore(storage, namespace);
}

// 导出数据库类
export { SuperflowDB };
