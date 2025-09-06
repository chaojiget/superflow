import { describe, it, expect, vi } from 'vitest';
import { NodePage } from '../src/NodePage';

// 声明 global 对象类型
declare const global: typeof globalThis;

// Mock Web Worker
global.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

describe('Nodes Module', () => {
  describe('NodePage', () => {
    it('应该创建节点页面实例', () => {
      const page = new NodePage();
      expect(page).toBeInstanceOf(NodePage);
    });

    it('应该有必要的节点操作方法', () => {
      const page = new NodePage();
      expect(typeof page.createNode).toBe('function');
      expect(typeof page.updateNode).toBe('function');
      expect(typeof page.deleteNode).toBe('function');
      expect(typeof page.executeNode).toBe('function');
    });

    it('应该支持节点类型注册', () => {
      const page = new NodePage();
      const nodeType = {
        id: 'test-node',
        name: '测试节点',
        description: '用于测试的节点',
        category: 'utility',
        inputs: [],
        outputs: [],
        handler: async () => ({ result: 'test' }),
      };

      expect(typeof page.registerNodeType).toBe('function');
      page.registerNodeType(nodeType);

      const registeredTypes = page.getRegisteredTypes();
      expect(registeredTypes).toContain('test-node');
    });

    it('应该支持节点调试', async () => {
      const page = new NodePage();
      const debugInfo = await page.debugNode('test-node', { input: 'test' });

      expect(debugInfo).toBeDefined();
      expect(debugInfo.nodeId).toBe('test-node');
    });

    it('应该处理节点执行错误', async () => {
      const page = new NodePage();
      const errorHandler = vi.fn();

      page.onError(errorHandler);

      await expect(page.executeNode('invalid-node', {})).rejects.toThrow();
      expect(errorHandler).toHaveBeenCalled();
    });

    it('应该校验节点输入输出的 schema', async () => {
      const page = new NodePage();
      page.registerNodeType({
        id: 'schema-node',
        name: 'schema 节点',
        description: '',
        category: 'test',
        inputs: [],
        outputs: [],
        handler: async (input) => ({ foo: (input as any).foo }),
        inputSchema: {
          type: 'object',
          properties: { foo: { type: 'number' } },
          required: ['foo'],
          additionalProperties: false,
        },
        outputSchema: {
          type: 'object',
          properties: { foo: { type: 'number' } },
          required: ['foo'],
          additionalProperties: false,
        },
      });

      await expect(
        page.executeNode('schema-node', { foo: 1 })
      ).resolves.toEqual({ foo: 1 });

      await expect(
        page.executeNode('schema-node', { foo: 'bar' })
      ).rejects.toThrow();
      expect(page.getNodeStatus('schema-node')).toBe('failed');

      page.registerNodeType({
        id: 'schema-node-invalid',
        name: 'schema 输出错误节点',
        description: '',
        category: 'test',
        inputs: [],
        outputs: [],
        handler: async () => ({ foo: 'bar' }),
        inputSchema: {
          type: 'object',
          properties: { foo: { type: 'number' } },
          required: ['foo'],
          additionalProperties: false,
        },
        outputSchema: {
          type: 'object',
          properties: { foo: { type: 'number' } },
          required: ['foo'],
          additionalProperties: false,
        },
      });

      await expect(
        page.executeNode('schema-node-invalid', { foo: 1 })
      ).rejects.toThrow();
      expect(page.getNodeStatus('schema-node-invalid')).toBe('failed');
    });
  });

  describe('节点生命周期管理', () => {
    it('应该管理节点状态', () => {
      const page = new NodePage();
      const nodeId = 'lifecycle-test';

      page.setNodeStatus(nodeId, 'running');
      expect(page.getNodeStatus(nodeId)).toBe('running');

      page.setNodeStatus(nodeId, 'completed');
      expect(page.getNodeStatus(nodeId)).toBe('completed');
    });

    it('应该跟踪节点执行时间', async () => {
      const page = new NodePage();
      const startTime = Date.now();

      await page.executeNode('timer-test', {});

      const execution = page.getLastExecution('timer-test');
      expect(execution).toBeDefined();
      expect(execution!.duration).toBeGreaterThan(0);
      expect(execution!.startTime).toBeGreaterThanOrEqual(startTime);
    });
  });
});
