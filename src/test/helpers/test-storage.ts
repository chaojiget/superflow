/**
 * 测试存储辅助工具
 */

import { vi } from 'vitest';
import type { StorageAdapter, StorageTransaction } from '@/shared/types';

/**
 * 内存存储适配器（用于测试）
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private data = new Map<string, Map<string, any>>();

  async get<T = unknown>(table: string, key: string): Promise<T | undefined> {
    const tableData = this.data.get(table);
    return tableData?.get(key) as T | undefined;
  }

  async put<T = unknown>(
    table: string,
    value: T & { id: string }
  ): Promise<void> {
    if (!this.data.has(table)) {
      this.data.set(table, new Map());
    }
    this.data.get(table)!.set(value.id, value);
  }

  async delete(table: string, key: string): Promise<void> {
    const tableData = this.data.get(table);
    if (tableData) {
      tableData.delete(key);
    }
  }

  async getAll<T = unknown>(table: string): Promise<T[]> {
    const tableData = this.data.get(table);
    return tableData ? Array.from(tableData.values()) : [];
  }

  async putMany<T = unknown>(
    table: string,
    values: (T & { id: string })[]
  ): Promise<void> {
    if (!this.data.has(table)) {
      this.data.set(table, new Map());
    }
    const tableData = this.data.get(table)!;
    for (const value of values) {
      tableData.set(value.id, value);
    }
  }

  async deleteMany(table: string, keys: string[]): Promise<void> {
    const tableData = this.data.get(table);
    if (tableData) {
      for (const key of keys) {
        tableData.delete(key);
      }
    }
  }

  async count(table: string): Promise<number> {
    const tableData = this.data.get(table);
    return tableData?.size || 0;
  }

  async clear(table: string): Promise<void> {
    this.data.delete(table);
  }

  async addEvent(event: any & { id: string }): Promise<void> {
    await this.put('events', event);
  }

  async transaction<T>(
    _tables: string[],
    _mode: 'readonly' | 'readwrite',
    callback: (tx: StorageTransaction) => Promise<T>
  ): Promise<T> {
    // 简单的事务实现（不支持回滚）
    const transaction: StorageTransaction = {
      get: this.get.bind(this),
      put: this.put.bind(this),
      delete: this.delete.bind(this),
      addEvent: this.addEvent.bind(this),
    };

    return await callback(transaction);
  }

  // 测试辅助方法
  getAllTables(): string[] {
    return Array.from(this.data.keys());
  }

  getTableSize(table: string): number {
    return this.data.get(table)?.size || 0;
  }

  clearAll(): void {
    this.data.clear();
  }

  hasTable(table: string): boolean {
    return this.data.has(table);
  }

  hasRecord(table: string, key: string): boolean {
    return this.data.get(table)?.has(key) || false;
  }

  export(): Record<string, Record<string, any>> {
    const result: Record<string, Record<string, any>> = {};
    for (const [tableName, tableData] of this.data) {
      result[tableName] = Object.fromEntries(tableData);
    }
    return result;
  }

  import(data: Record<string, Record<string, any>>): void {
    this.data.clear();
    for (const [tableName, tableData] of Object.entries(data)) {
      this.data.set(tableName, new Map(Object.entries(tableData)));
    }
  }
}

/**
 * 创建测试存储
 */
export function createTestStorage(): MemoryStorageAdapter {
  return new MemoryStorageAdapter();
}

/**
 * 模拟 IndexedDB
 */
export function mockIndexedDB(): void {
  const databases = new Map<string, any>();

  (globalThis as any).indexedDB = {
    open: vi.fn().mockImplementation((name: string, version?: number) => {
      const request = {
        result: {
          name,
          version: version || 1,
          objectStoreNames: [
            'runs',
            'logs',
            'versions',
            'flows',
            'nodes',
            'kv',
          ],
          createObjectStore: vi.fn().mockReturnValue({
            add: vi.fn(),
            put: vi.fn(),
            get: vi.fn(),
            delete: vi.fn(),
            getAll: vi.fn().mockReturnValue({ onsuccess: null, result: [] }),
            clear: vi.fn(),
            count: vi.fn().mockReturnValue({ onsuccess: null, result: 0 }),
            createIndex: vi.fn(),
            index: vi.fn(),
          }),
          transaction: vi
            .fn()
            .mockImplementation((_stores: string[], _mode: string) => ({
              objectStore: vi.fn().mockImplementation((_storeName: string) => ({
                add: vi
                  .fn()
                  .mockReturnValue({ onsuccess: null, onerror: null }),
                put: vi
                  .fn()
                  .mockReturnValue({ onsuccess: null, onerror: null }),
                get: vi.fn().mockReturnValue({
                  onsuccess: null,
                  onerror: null,
                  result: null,
                }),
                delete: vi
                  .fn()
                  .mockReturnValue({ onsuccess: null, onerror: null }),
                getAll: vi.fn().mockReturnValue({
                  onsuccess: null,
                  onerror: null,
                  result: [],
                }),
                clear: vi
                  .fn()
                  .mockReturnValue({ onsuccess: null, onerror: null }),
                count: vi.fn().mockReturnValue({
                  onsuccess: null,
                  onerror: null,
                  result: 0,
                }),
                openCursor: vi
                  .fn()
                  .mockReturnValue({ onsuccess: null, onerror: null }),
                index: vi.fn(),
              })),
              oncomplete: null,
              onerror: null,
              onabort: null,
            })),
          close: vi.fn(),
        },
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      // 模拟异步打开
      setTimeout(() => {
        if (request.onsuccess) {
          (request.onsuccess as any)({ target: request } as any);
        }
      }, 0);

      return request;
    }),

    deleteDatabase: vi.fn().mockImplementation((name: string) => {
      databases.delete(name);
      return {
        onsuccess: null,
        onerror: null,
      };
    }),

    cmp: vi.fn().mockImplementation((a: any, b: any) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    }),
  } as any;
}

/**
 * 创建测试数据集
 */
export function createTestDataset() {
  return {
    flows: [
      {
        id: 'flow-1',
        name: '测试流程 1',
        description: '用于测试的流程',
        nodes: [],
        edges: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: '1.0.0',
      },
      {
        id: 'flow-2',
        name: '测试流程 2',
        description: '另一个测试流程',
        nodes: [],
        edges: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: '1.0.0',
      },
    ],

    runs: [
      {
        id: 'run-1',
        flowId: 'flow-1',
        status: 'completed',
        startTime: Date.now() - 10000,
        endTime: Date.now() - 5000,
        progress: {
          total: 3,
          completed: 3,
          failed: 0,
          running: 0,
          percentage: 100,
        },
        logs: [],
        metrics: {
          executionTime: 5000,
          nodeCount: 3,
          successCount: 3,
          failureCount: 0,
        },
      },
      {
        id: 'run-2',
        flowId: 'flow-1',
        status: 'running',
        startTime: Date.now() - 2000,
        progress: {
          total: 3,
          completed: 1,
          failed: 0,
          running: 1,
          percentage: 33,
        },
        logs: [],
        metrics: {
          executionTime: 2000,
          nodeCount: 3,
          successCount: 1,
          failureCount: 0,
        },
      },
    ],

    nodes: [
      {
        id: 'node-1',
        kind: 'input',
        name: '输入节点',
        description: '接收输入数据',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        author: 'test',
      },
      {
        id: 'node-2',
        kind: 'transform',
        name: '处理节点',
        description: '处理数据',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        author: 'test',
      },
    ],

    logs: [
      {
        id: 'log-1',
        runId: 'run-1',
        ts: Date.now() - 8000,
        level: 'info',
        event: 'node_started',
        data: { nodeId: 'node-1' },
      },
      {
        id: 'log-2',
        runId: 'run-1',
        ts: Date.now() - 7000,
        level: 'info',
        event: 'node_completed',
        data: { nodeId: 'node-1' },
      },
    ],
  };
}

/**
 * 填充测试数据
 */
export async function seedTestData(
  storage: StorageAdapter,
  dataset = createTestDataset()
): Promise<void> {
  for (const [table, records] of Object.entries(dataset)) {
    if (Array.isArray(records)) {
      await storage.putMany(table, records as any);
    }
  }
}

/**
 * 清空测试数据
 */
export async function clearTestData(storage: StorageAdapter): Promise<void> {
  const tables = ['flows', 'runs', 'nodes', 'logs', 'versions', 'kv', 'events'];
  for (const table of tables) {
    await storage.clear(table);
  }
}

/**
 * 验证存储状态
 */
export async function verifyStorageState(
  storage: StorageAdapter,
  expectations: Record<string, number>
): Promise<void> {
  for (const [table, expectedCount] of Object.entries(expectations)) {
    const actualCount = await storage.count(table);
    if (actualCount !== expectedCount) {
      throw new Error(
        `Table ${table} count mismatch: expected ${expectedCount}, got ${actualCount}`
      );
    }
  }
}

/**
 * 存储快照
 */
export class StorageSnapshot {
  private snapshot: Record<string, any[]> = {};

  constructor(private storage: StorageAdapter) {}

  async capture(tables: string[]): Promise<void> {
    for (const table of tables) {
      this.snapshot[table] = await this.storage.getAll(table);
    }
  }

  async restore(): Promise<void> {
    // 清空现有数据
    for (const table of Object.keys(this.snapshot)) {
      await this.storage.clear(table);
    }

    // 恢复快照数据
    for (const [table, records] of Object.entries(this.snapshot)) {
      if (records.length > 0) {
        await this.storage.putMany(table, records);
      }
    }
  }

  getSnapshot(): Record<string, any[]> {
    return { ...this.snapshot };
  }
}

/**
 * 创建存储快照
 */
export function createStorageSnapshot(
  storage: StorageAdapter
): StorageSnapshot {
  return new StorageSnapshot(storage);
}

/**
 * 存储性能测试工具
 */
export class StoragePerformanceTester {
  constructor(private storage: StorageAdapter) {}

  async benchmarkInsert(table: string, recordCount: number): Promise<number> {
    const records = Array.from({ length: recordCount }, (_, i) => ({
      id: `test-${i}`,
      data: `test data ${i}`,
      timestamp: Date.now(),
    }));

    const start = performance.now();
    await this.storage.putMany(table, records);
    const end = performance.now();

    return end - start;
  }

  async benchmarkRead(table: string, keyCount: number): Promise<number> {
    const start = performance.now();

    for (let i = 0; i < keyCount; i++) {
      await this.storage.get(table, `test-${i}`);
    }

    const end = performance.now();
    return end - start;
  }

  async benchmarkQuery(table: string): Promise<number> {
    const start = performance.now();
    await this.storage.getAll(table);
    const end = performance.now();

    return end - start;
  }
}
