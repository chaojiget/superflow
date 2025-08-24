import { generateId } from '../../shared/utils';

export interface TestFlow {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
  cleanup: () => Promise<void>;
}

export async function createTestFlow(name = '测试流程'): Promise<TestFlow> {
  const flowId = generateId();

  const testFlow: TestFlow = {
    id: flowId,
    name,
    nodes: [],
    edges: [],
    cleanup: async () => {
      // 清理测试数据
      const { clearTestData } = await import('./test-storage');
      const { createStorage } = await import('../../shared/db');
      const storage = await createStorage('test-db');
      await clearTestData(storage);
    },
  };

  return testFlow;
}

export async function createSimpleFlow(): Promise<TestFlow> {
  const flow = await createTestFlow('简单测试流程');

  flow.nodes = [
    {
      id: 'start',
      type: 'input',
      position: { x: 0, y: 0 },
      data: { value: 'Hello' },
    },
    {
      id: 'process',
      type: 'transform',
      position: { x: 200, y: 0 },
      data: {
        handler: async (input: string) => input + ' World',
      },
    },
    {
      id: 'end',
      type: 'output',
      position: { x: 400, y: 0 },
      data: {},
    },
  ];

  flow.edges = [
    { id: 'e1', source: 'start', target: 'process' },
    { id: 'e2', source: 'process', target: 'end' },
  ];

  return flow;
}

export async function createParallelFlow(): Promise<TestFlow> {
  const flow = await createTestFlow('并行测试流程');

  flow.nodes = [
    {
      id: 'start',
      type: 'input',
      position: { x: 0, y: 100 },
      data: { value: 10 },
    },
    {
      id: 'double',
      type: 'transform',
      position: { x: 200, y: 50 },
      data: {
        handler: async (input: number) => input * 2,
      },
    },
    {
      id: 'triple',
      type: 'transform',
      position: { x: 200, y: 150 },
      data: {
        handler: async (input: number) => input * 3,
      },
    },
    {
      id: 'sum',
      type: 'aggregate',
      position: { x: 400, y: 100 },
      data: {
        handler: async (...inputs: number[]) =>
          inputs.reduce((a, b) => a + b, 0),
      },
    },
  ];

  flow.edges = [
    { id: 'e1', source: 'start', target: 'double' },
    { id: 'e2', source: 'start', target: 'triple' },
    { id: 'e3', source: 'double', target: 'sum' },
    { id: 'e4', source: 'triple', target: 'sum' },
  ];

  return flow;
}

export async function createErrorFlow(): Promise<TestFlow> {
  const flow = await createTestFlow('错误测试流程');

  flow.nodes = [
    {
      id: 'start',
      type: 'input',
      position: { x: 0, y: 0 },
      data: { value: 'test' },
    },
    {
      id: 'error',
      type: 'error',
      position: { x: 200, y: 0 },
      data: {
        handler: async () => {
          throw new Error('测试错误');
        },
      },
    },
  ];

  flow.edges = [{ id: 'e1', source: 'start', target: 'error' }];

  return flow;
}
