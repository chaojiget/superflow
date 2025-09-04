import { describe, it, expect, vi } from 'vitest';
import { ExecRequestSchema, ExecEventSchema, NodeContext } from '../runtime';
import type { RunRecord, LogRecord } from '../runtime';
import { VersionRecord } from '../storage';
import { createError } from '../error';

const ULID = '01ARZ3NDEKTSV4RRFFQ69G5FAV';

describe('类型校验与 JSON 序列化', () => {
  it('ExecRequest 序列化/反序列化', () => {
    const req = {
      kind: 'EXEC',
      runId: ULID,
      nodeId: 'node-1',
      flowId: 'flow-1',
      code: 'export const handler = () => {};',
      language: 'js' as const,
      input: { foo: 1 },
      controls: { timeoutMs: 1000, retries: 2 },
      env: { A: '1' },
      capabilities: ['test'],
    };
    const json = JSON.stringify(req);
    const parsed = ExecRequestSchema.parse(JSON.parse(json));
    expect(parsed).toEqual(req);
  });

  it('ExecEvent 序列化/反序列化', () => {
    const event = {
      kind: 'RESULT' as const,
      runId: ULID,
      ts: Date.now(),
      durationMs: 10,
      output: { ok: true },
    };
    const json = JSON.stringify(event);
    const parsed = ExecEventSchema.parse(JSON.parse(json));
    expect(parsed).toEqual(event);
  });

  it('NodeContext 类型', () => {
    const ctx: NodeContext = {
      signal: new AbortController().signal,
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      env: { A: '1' },
      kv: {
        get: async () => null,
        put: async () => {},
        del: async () => {},
      },
      traceId: 'trace-1',
    } as any;
    expect(ctx.logger.info).toBeDefined();
  });

  it('RunRecord 序列化/反序列化', () => {
    const run: RunRecord = {
      id: ULID,
      createdAt: 1,
      updatedAt: 1,
      flowId: 'flow-1',
      startedAt: 1,
      status: 'pending',
      traceId: 'trace-1',
    } as any;
    const json = JSON.stringify(run);
    const parsed = JSON.parse(json) as RunRecord;
    expect(parsed).toEqual(run);
  });

  it('LogRecord 序列化/反序列化', () => {
    const log: LogRecord = {
      id: ULID,
      createdAt: 1,
      updatedAt: 1,
      runId: ULID,
      timestamp: 1,
      level: 'info',
      event: 'test',
      traceId: 'trace-1',
    } as any;
    const json = JSON.stringify(log);
    const parsed = JSON.parse(json) as LogRecord;
    expect(parsed).toEqual(log);
  });

  it('VersionRecord 序列化/反序列化', () => {
    const version: VersionRecord = {
      id: ULID,
      createdAt: 1,
      updatedAt: 1,
      nodeId: 'node-1',
      author: 'me',
      message: 'msg',
      diff: 'diff',
    } as any;
    const json = JSON.stringify(version);
    const parsed = JSON.parse(json) as VersionRecord;
    expect(parsed).toEqual(version);
  });

  it('错误模型 序列化/反序列化', () => {
    const err = createError('RUNTIME_ERROR', 'fail', { foo: 'bar' });
    const json = JSON.stringify(err);
    const parsed = JSON.parse(json) as ReturnType<typeof createError>;
    expect(parsed).toMatchObject({
      name: 'SuperflowError',
      message: 'fail',
      code: 'RUNTIME_ERROR',
    });
    expect((parsed as any).cause.foo).toBe('bar');
  });
});
