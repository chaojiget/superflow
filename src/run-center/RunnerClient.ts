import * as Comlink from 'comlink';
import type { ExecRequest, ExecEvent } from '@/shared/types/runtime';

export type EventCallback = (event: ExecEvent) => void;

export class RunnerClient {
  async run(
    req: ExecRequest,
    onEvent: EventCallback,
    options?: { signal?: AbortSignal }
  ): Promise<void> {
    const worker = new Worker(
      new URL('./executor.worker.ts', import.meta.url),
      { type: 'module' }
    );
    const api = Comlink.wrap<{
      exec: (r: ExecRequest, cb: (e: ExecEvent) => void) => Promise<void>;
    }>(worker);

    const hardTimeout = req.controls?.timeoutMs ?? 15000;
    const cb = Comlink.proxy((e: ExecEvent) => {
      if (e.kind === 'LOG') {
        const { level, event, data } = e;
        (console as any)[level]?.(event, data);
      }
      onEvent(e);
    });

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    return new Promise(async (resolve, reject) => {
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        worker.terminate();
      };
      timeoutId = setTimeout(() => {
        worker.terminate();
        onEvent({
          kind: 'LOG',
          runId: req.runId,
          ts: Date.now(),
          level: 'error',
          event: `Timeout ${hardTimeout}ms`,
        });
        reject(new Error(`Timeout ${hardTimeout}ms`));
      }, hardTimeout);

      options?.signal?.addEventListener('abort', () => {
        worker.terminate();
        reject(new DOMException('Aborted', 'AbortError'));
      });

      try {
        await api.exec(req, cb);
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        cleanup();
      }
    });
  }
}
