import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { TestFlow } from '../helpers/test-flow';
import { RunCenterService } from '../../run-center';

describe('流程集成测试', () => {
  let testFlow: TestFlow;
  let runCenter: RunCenterService;

  beforeEach(async () => {
    // 初始化测试环境
    const { createTestFlow } = await import('../helpers/test-flow');

    testFlow = await createTestFlow();
    runCenter = new RunCenterService();
  });

  afterEach(async () => {
    // 清理测试数据
    await testFlow.cleanup();
    await runCenter.cleanup();
  });

  it('应该完成完整的想法到运行流程', async () => {
    // 1. 从想法生成蓝图
    const { generateBlueprint } = await import('../../ideas/generateBlueprint');
    const idea = '创建一个简单的数据处理流程：输入数据 -> 验证 -> 转换 -> 输出';
    const blueprint = await generateBlueprint(idea);

    expect(blueprint).toBeDefined();
    expect(blueprint.nodes.length).toBeGreaterThan(0);

    // 2. 将蓝图转换为DAG
    const { blueprintToDag } = await import('../../planner/blueprintToDag');
    const dag = blueprintToDag(blueprint);

    expect(dag).toBeDefined();
    expect(dag.executionOrder).toBeDefined();

    // 3. 在Flow画布中渲染
    const { FlowCanvas } = await import('../../flow/FlowCanvas');
    const canvas = new FlowCanvas();
    await canvas.loadDAG(dag);

    expect(canvas.getNodes().length).toBe(blueprint.nodes.length);

    // 4. 执行流程
    const runRecord = await runCenter.createRun(testFlow.id);
    const result = await canvas.execute(
      runRecord.id,
      undefined,
      runCenter as any
    );

    expect(result.status).toBe('completed');
    expect(result.outputs).toBeDefined();

    // 5. 验证运行记录和日志
    const logs = await runCenter.getLogs(runRecord.id);
    expect(logs.length).toBeGreaterThan(0);

    const finalRecord = await runCenter.getRun(runRecord.id);
    expect(finalRecord.status).toBe('completed');
    expect(finalRecord.finishedAt).toBeDefined();
  });

  it('应该处理节点间数据传递', async () => {
    // 创建包含数据传递的测试流程
    const nodes = [
      {
        id: 'input',
        type: 'input',
        data: { value: 'Hello World' },
      },
      {
        id: 'transform',
        type: 'transform',
        data: {
          operation: 'uppercase',
          handler: async (input: string) => input.toUpperCase(),
        },
      },
      {
        id: 'output',
        type: 'output',
        data: {},
      },
    ];

    const edges = [
      { id: 'e1', source: 'input', target: 'transform' },
      { id: 'e2', source: 'transform', target: 'output' },
    ];

    const { FlowCanvas } = await import('../../flow/FlowCanvas');
    const canvas = new FlowCanvas();
    await canvas.loadNodes(nodes, edges);

    const runRecord = await runCenter.createRun('data-flow-test');
    const result = await canvas.execute(
      runRecord.id,
      undefined,
      runCenter as any
    );

    expect(result.status).toBe('completed');
    expect(result.outputs).toBeDefined();
    expect(result.outputs!.output).toBe('HELLO WORLD');
  });

  it('应该处理节点执行失败', async () => {
    const nodes = [
      {
        id: 'error-node',
        type: 'error',
        data: {
          handler: async () => {
            throw new Error('模拟节点失败');
          },
        },
      },
    ];

    const { FlowCanvas } = await import('../../flow/FlowCanvas');
    const canvas = new FlowCanvas();
    await canvas.loadNodes(nodes, []);

    const runRecord = await runCenter.createRun('error-flow-test');
    const result = await canvas.execute(
      runRecord.id,
      undefined,
      runCenter as any
    );

    expect(result.status).toBe('failed');
    expect(result.error).toBeDefined();

    const logs = await runCenter.getLogs(runRecord.id);
    const errorLogs = logs.filter((log: any) => log.level === 'error');
    expect(errorLogs.length).toBeGreaterThan(0);
  });

  it('应该支持并行节点执行', async () => {
    const nodes = [
      { id: 'start', type: 'start', data: {} },
      { id: 'parallel1', type: 'process', data: { delay: 100 } },
      { id: 'parallel2', type: 'process', data: { delay: 100 } },
      { id: 'parallel3', type: 'process', data: { delay: 100 } },
      { id: 'end', type: 'end', data: {} },
    ];

    const edges = [
      { id: 'e1', source: 'start', target: 'parallel1' },
      { id: 'e2', source: 'start', target: 'parallel2' },
      { id: 'e3', source: 'start', target: 'parallel3' },
      { id: 'e4', source: 'parallel1', target: 'end' },
      { id: 'e5', source: 'parallel2', target: 'end' },
      { id: 'e6', source: 'parallel3', target: 'end' },
    ];

    const { FlowCanvas } = await import('../../flow/FlowCanvas');
    const canvas = new FlowCanvas();
    await canvas.loadNodes(nodes, edges);

    const startTime = Date.now();
    const runRecord = await runCenter.createRun('parallel-flow-test');
    const result = await canvas.execute(runRecord.id);
    const duration = Date.now() - startTime;

    expect(result.status).toBe('completed');
    // 并行执行应该比串行执行快
    expect(duration).toBeLessThan(250); // 3个100ms的并行任务应该在250ms内完成
  });

  it('应该支持条件分支', async () => {
    const nodes = [
      {
        id: 'condition',
        type: 'condition',
        data: {
          condition: (input: number) => input > 10,
        },
      },
      { id: 'true-branch', type: 'process', data: { value: 'large' } },
      { id: 'false-branch', type: 'process', data: { value: 'small' } },
    ];

    const edges = [
      {
        id: 'e1',
        source: 'condition',
        target: 'true-branch',
        data: { condition: true },
      },
      {
        id: 'e2',
        source: 'condition',
        target: 'false-branch',
        data: { condition: false },
      },
    ];

    const { FlowCanvas } = await import('../../flow/FlowCanvas');
    const canvas = new FlowCanvas();
    await canvas.loadNodes(nodes, edges);

    // 测试大于10的情况
    const runRecord1 = await runCenter.createRun('condition-flow-test-1');
    const result1 = await canvas.execute(
      runRecord1.id,
      { input: 15 },
      runCenter as any
    );
    expect(result1.outputs).toBeDefined();
    expect(result1.outputs!['true-branch']).toBe('large');

    // 测试小于等于10的情况
    const runRecord2 = await runCenter.createRun('condition-flow-test-2');
    const result2 = await canvas.execute(
      runRecord2.id,
      { input: 5 },
      runCenter as any
    );
    expect(result2.outputs).toBeDefined();
    expect(result2.outputs!['false-branch']).toBe('small');
  });
});
