import { describe, it, expect } from 'vitest';
import { MemoryStorageAdapter } from '@/test/helpers/test-storage';
import {
  getLogsByRunId,
  getRunsByTraceId,
  exportLogsAsNDJSON,
} from '../index';

describe('db queries', () => {
  it('getLogsByRunId returns logs of specified run', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.put('logs', {
      id: '1',
      runId: 'run-1',
      ts: 1,
      level: 'info',
      event: 'e1',
      traceId: 't1',
    });
    await storage.put('logs', {
      id: '2',
      runId: 'run-2',
      ts: 2,
      level: 'info',
      event: 'e2',
      traceId: 't2',
    });
    const logs = await getLogsByRunId(storage, 'run-1');
    expect(logs).toHaveLength(1);
    expect(logs[0]!.id).toBe('1');
  });

  it('getRunsByTraceId returns matching runs', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.put('runs', {
      id: 'run-1',
      flowId: 'flow',
      startedAt: 1,
      status: 'success',
      traceId: 'trace-1',
    });
    await storage.put('runs', {
      id: 'run-2',
      flowId: 'flow',
      startedAt: 2,
      status: 'failed',
      traceId: 'trace-2',
    });
    const runs = await getRunsByTraceId(storage, 'trace-1');
    expect(runs).toHaveLength(1);
    expect(runs[0]!.id).toBe('run-1');
  });

  it('exportLogsAsNDJSON streams logs', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.put('logs', {
      id: '1',
      runId: 'run-1',
      ts: 1,
      level: 'info',
      event: 'e1',
      traceId: 't1',
    });
    await storage.put('logs', {
      id: '2',
      runId: 'run-1',
      ts: 2,
      level: 'info',
      event: 'e2',
      traceId: 't1',
    });
    const chunks: string[] = [];
    await exportLogsAsNDJSON(storage, 'run-1', {
      write: (c: string) => {
        chunks.push(c);
      },
    } as any);
    expect(chunks.join('')).toBe(
      JSON.stringify({
        id: '1',
        runId: 'run-1',
        ts: 1,
        level: 'info',
        event: 'e1',
        traceId: 't1',
      }) +
        '\n' +
        JSON.stringify({
          id: '2',
          runId: 'run-1',
          ts: 2,
          level: 'info',
          event: 'e2',
          traceId: 't1',
        }) +
        '\n'
    );
  });
});
