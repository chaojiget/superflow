import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Shared Module', () => {
  describe('类型系统', () => {
    it('应该导出基础类型', async () => {
      const types = await import('../types');

      expect(types).toBeDefined();
      // NodeType 是 TypeScript 类型，在运行时不存在
      expect(types).toBeDefined(); // 测试模块存在
    });

    it('应该有错误类型定义', async () => {
      const { createError } = await import('../types/error');

      const error = createError('VALIDATION_ERROR', '验证失败', {
        cause: { field: 'email' },
      });
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('验证失败');
      expect((error.cause as any)?.field).toBe('email');
    });
  });

  describe('存储适配器', () => {
    it('应该创建存储实例', async () => {
      const { createTestStorage } = await import(
        '../../test/helpers/test-storage'
      );
      const storage = createTestStorage();

      expect(storage).toBeDefined();
      expect(typeof storage.get).toBe('function');
      expect(typeof storage.put).toBe('function');
      expect(typeof storage.delete).toBe('function');
    });

    it('应该支持 CRUD 操作', async () => {
      const { createTestStorage } = await import(
        '../../test/helpers/test-storage'
      );
      const storage = createTestStorage();

      const testData = { id: 'test-id', name: 'Test Item' };

      await storage.put('items', testData);
      const retrieved = await storage.get('items', 'test-id');

      expect(retrieved).toEqual(testData);
    });

    it('应该支持批量操作', async () => {
      const { createTestStorage } = await import(
        '../../test/helpers/test-storage'
      );
      const storage = createTestStorage();

      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' },
      ];

      await storage.putMany('items', items);
      const allItems = await storage.getAll('items');

      expect(allItems.length).toBe(3);
    });

    it('应该记录事件日志', async () => {
      const { createTestStorage } = await import(
        '../../test/helpers/test-storage'
      );
      const storage = createTestStorage();
      const event = {
        id: 'evt-1',
        type: 'test',
        payload: { msg: 'hello' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await storage.addEvent(event);
      const events = await storage.getAll('events');
      expect(events).toHaveLength(1);
      expect((events[0] as any).type).toBe('test');
    });
  });

  describe('工具函数', () => {
    it('应该生成 ULID', async () => {
      const { generateId } = await import('../utils');

      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1.length).toBe(26); // ULID 标准长度
    });

    it('应该验证 ULID 格式', async () => {
      const { isValidId } = await import('../utils');

      expect(isValidId('01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(true);
      expect(isValidId('invalid-id')).toBe(false);
      expect(isValidId('')).toBe(false);
    });

    it('应该格式化时间戳', async () => {
      const { formatTimestamp } = await import('../utils');

      const timestamp = Date.now();
      const formatted = formatTimestamp(timestamp);

      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('运行时工具', () => {
    it('应该创建 AbortController', async () => {
      const { createTimeout } = await import('../runtime');

      const { controller, promise } = createTimeout(1000);

      expect(controller).toBeInstanceOf(AbortController);
      expect(promise).toBeInstanceOf(Promise);

      controller.abort();
      await expect(promise).rejects.toThrow('操作被取消');
    });

    it('应该支持超时控制', async () => {
      const { withTimeout } = await import('../runtime');

      const slowOperation = () =>
        new Promise((resolve) => setTimeout(resolve, 2000));

      await expect(withTimeout(slowOperation(), 100)).rejects.toThrow(
        '操作超时'
      );
    });

    it('应该支持重试机制', async () => {
      const { retry } = await import('../runtime');

      let attemptCount = 0;
      const flakyOperation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('暂时性失败');
        }
        return '成功';
      };

      const result = await retry(flakyOperation, { maxAttempts: 3 });
      expect(result).toBe('成功');
      expect(attemptCount).toBe(3);
    });
  });

  describe('Web Worker 封装', () => {
    beforeEach(() => {
      (globalThis as any).Worker = vi.fn().mockImplementation(() => ({
        postMessage: vi.fn(),
        terminate: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onerror: null,
        onmessage: null,
      }));
    });

    it.skip('应该创建 Worker 包装器', async () => {
      const { createWorker } = await import('../runtime/worker');

      const worker = await createWorker('/test-worker.js');

      expect(worker).toBeDefined();
      expect(typeof worker.execute).toBe('function');
      expect(typeof worker.terminate).toBe('function');
    });

    it.skip('应该处理 Worker 消息', async () => {
      const { createWorker } = await import('../runtime/worker');

      const worker = await createWorker('/test-worker.js');
      const mockMessage = { type: 'test', data: 'hello' };

      // Mock worker response
      const mockWorker = ((globalThis as any).Worker as any).mock.results[0]
        .value;
      setTimeout(() => {
        mockWorker.onmessage?.({ data: { result: 'processed' } });
      }, 10);

      const result = await worker.execute(mockMessage);
      expect(result).toEqual({ result: 'processed' });
    });

    it.skip('应该处理 Worker 错误', async () => {
      const { createWorker } = await import('../runtime/worker');

      const worker = await createWorker('/test-worker.js');
      const mockWorker = ((globalThis as any).Worker as any).mock.results[0]
        .value;

      setTimeout(() => {
        mockWorker.onerror?.({ message: 'Worker error' });
      }, 10);

      await expect(worker.execute({ type: 'error' })).rejects.toThrow();
    });
  });
});
