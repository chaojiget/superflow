/// <reference lib="webworker" />

import { RunnerClient } from './RunnerClient';
import type { ExecRequest, ExecEvent } from '@/shared/types/runtime';
import { ulid } from 'ulid';

interface RunRequest {
  id: string;
  fnCode: string;
  args: unknown[];
}

interface RunResponse {
  id: string;
  result?: unknown;
  error?: string;
}

const ctx: any = self;
const runner = new RunnerClient();

ctx.onmessage = async (event: MessageEvent<RunRequest>) => {
  const { id, fnCode, args } = event.data;
  try {
    const code = `export async function handler(input){ const fn = (${fnCode}); return await fn(...(Array.isArray(input) ? input : [])); }`;
    const req: ExecRequest = {
      kind: 'EXEC',
      runId: ulid(),
      nodeId: 'preview',
      flowId: 'preview',
      code,
      language: 'js',
      input: args,
    };
    let output: unknown;
    await runner.run(req, (ev: ExecEvent) => {
      if (ev.kind === 'RESULT') {
        output = ev.output;
      }
    });
    ctx.postMessage({ id, result: output } as RunResponse);
  } catch (err) {
    try {
      const fn = Function('return (' + fnCode + ')')();
      const result = await fn(...(Array.isArray(args) ? args : []));
      ctx.postMessage({ id, result } as RunResponse);
    } catch (err2) {
      ctx.postMessage({
        id,
        error: err2 instanceof Error ? err2.message : String(err2),
      } as RunResponse);
    }
  }
};

export {}; // 使文件成为模块

