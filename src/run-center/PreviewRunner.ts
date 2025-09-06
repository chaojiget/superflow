import { generateId } from '@/shared';

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

export class PreviewRunner {
  private worker: Worker;
  private pending = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: unknown) => void }
  >();

  constructor() {
    this.worker = new Worker(
      new URL('./preview-runner.worker.ts', import.meta.url),
      { type: 'module' }
    );
    this.worker.onmessage = (event: MessageEvent<RunResponse>) => {
      const { id, result, error } = event.data;
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      if (error) {
        pending.reject(new Error(error));
      } else {
        pending.resolve(result);
      }
    };
  }

  run(
    fn: (...args: unknown[]) => unknown,
    ...args: unknown[]
  ): Promise<unknown> {
    const id = generateId();
    const message: RunRequest = {
      id,
      fnCode: fn.toString(),
      args,
    };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage(message);
    });
  }

  terminate(): void {
    this.worker.terminate();
    for (const { reject } of this.pending.values()) {
      reject(new Error('Worker terminated'));
    }
    this.pending.clear();
  }
}

