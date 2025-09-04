import { describe, it, expect, vi } from 'vitest';
import { FlowCanvas } from '../FlowCanvas';

// 单元测试：验证执行逻辑

describe('流程执行', () => {
  it('应按顺序执行节点并返回输出', async () => {
    const canvas = new FlowCanvas();
    canvas.addNode({
      id: 'in',
      kind: 'input',
      position: { x: 0, y: 0 },
      data: { value: 'hello' },
    });
    canvas.addNode({
      id: 'trans',
      kind: 'transform',
      position: { x: 0, y: 0 },
      data: { handler: (d: string) => `${d} world` },
    });
    canvas.addNode({
      id: 'out',
      kind: 'output',
      position: { x: 0, y: 0 },
      data: { label: 'result' },
    });

    const result = await canvas.execute();
    expect(result.status).toBe('completed');
    expect(result.outputs?.result).toBe('hello world');
  });

  it('应在错误节点时返回失败', async () => {
    const canvas = new FlowCanvas();
    canvas.addNode({
      id: 'err',
      kind: 'custom',
      position: { x: 0, y: 0 },
      data: {
        handler: () => {
          throw new Error('boom');
        },
        shouldFail: true,
      },
    });

    const result = await canvas.execute();
    expect(result.status).toBe('failed');
    expect(result.error).toContain('boom');
  });

  it('应与 RunCenter 集成记录状态', async () => {
    const canvas = new FlowCanvas();
    canvas.addNode({
      id: 'in',
      kind: 'input',
      position: { x: 0, y: 0 },
      data: { value: 1 },
    });

    const runCenter = {
      addLog: vi.fn(async () => {}),
      updateRunStatus: vi.fn(async () => {}),
    };

    const res = await canvas.execute('run1', undefined, runCenter);
    expect(res.status).toBe('completed');
    expect(runCenter.addLog).toHaveBeenCalled();
    expect(runCenter.updateRunStatus).toHaveBeenCalledWith(
      'run1',
      'completed',
      expect.any(Object)
    );
  });
});
