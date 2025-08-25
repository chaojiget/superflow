import { describe, it, expect } from 'vitest';
import { FlowCanvas } from '../FlowCanvas';
import { RunCenter } from '@/run-center';

// Mock IndexedDB for RunCenter
(globalThis as any).indexedDB = {
  open: () => ({}),
  deleteDatabase: () => ({}),
  cmp: () => 0,
};

describe('节点事件与重试', () => {
  it('应同步节点运行状态并支持重试失败节点', async () => {
    const canvas = new FlowCanvas();
    canvas.addNode({ id: 'n1', position: { x: 0, y: 0 } });

    const runCenter = new RunCenter();
    const runRecord = await runCenter.createRun('flow');
    const runId = runRecord.id;

    canvas.attachExecutionEvents(runCenter, runId);

    runCenter.publishNodeStart(runId, 'n1');
    runCenter.publishNodeError(runId, 'n1');

    let node = canvas.getNode('n1');
    expect(node?.data.runtimeStatus).toBe('error');

    await canvas.retryNode(runCenter, runId, 'n1');
    node = canvas.getNode('n1');
    expect(node?.data.runtimeStatus).toBe('success');
  });
});
