import * as Comlink from 'comlink';
import type { ExecRequest, ExecEvent } from '@/shared/types/runtime';

export type EventCallback = (event: ExecEvent) => void;

async function loadModuleFromCode(code: string): Promise<any> {
  const blob = new Blob([code], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  try {
    return await import(/* @vite-ignore */ url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function exec(req: ExecRequest, cb: Comlink.Remote<EventCallback>) {
  const ts = Date.now();
  await cb({ kind: 'STARTED', runId: req.runId, ts });
  try {
    const mod = await loadModuleFromCode(req.code);
    const handler = mod?.handler;
    if (typeof handler !== 'function') {
      throw new Error('handler is not exported as a function');
    }
    const started = performance.now();
    const ctx = {
      signal: new AbortController().signal,
      logger: {
        debug: (event: string, data?: unknown) =>
          cb({ kind: 'LOG', runId: req.runId, ts: Date.now(), level: 'debug', event, data }),
        info: (event: string, data?: unknown) =>
          cb({ kind: 'LOG', runId: req.runId, ts: Date.now(), level: 'info', event, data }),
        warn: (event: string, data?: unknown) =>
          cb({ kind: 'LOG', runId: req.runId, ts: Date.now(), level: 'warn', event, data }),
        error: (event: string, data?: unknown) =>
          cb({ kind: 'LOG', runId: req.runId, ts: Date.now(), level: 'error', event, data }),
      },
      env: req.env ?? {},
      traceId: '' as any,
    } as const;

    const output = await handler(req.input, ctx);
    const durationMs = Math.round(performance.now() - started);
    await cb({
      kind: 'RESULT',
      runId: req.runId,
      ts: Date.now(),
      durationMs,
      output,
    });
  } catch (err) {
    await cb({
      kind: 'LOG',
      runId: req.runId,
      ts: Date.now(),
      level: 'error',
      event: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

Comlink.expose({ exec });

export {}; // ensure module
