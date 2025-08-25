export interface PreviewRunnerMessage {
  id: number;
  fn: string;
  arg: unknown;
}

export interface PreviewRunnerResponse {
  id: number;
  result?: unknown;
  error?: string;
}

export class PreviewRunner {
  private worker: Worker;
  private seq = 0;
  private pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (err: Error) => void }
  >();

  constructor() {
    this.worker = new Worker(
      new URL('./preview-runner.worker.ts', import.meta.url),
      { type: 'module' }
    );
    this.worker.onmessage = (event: MessageEvent<PreviewRunnerResponse>) => {
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

  run<T, R>(fn: (arg: T) => R | Promise<R>, arg: T): Promise<R> {
    const id = this.seq++;
    return new Promise<R>((resolve, reject) => {
      // 存储回调时统一使用 unknown 类型
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      const message: PreviewRunnerMessage = { id, fn: fn.toString(), arg };
      this.worker.postMessage(message);
    });
  }

  terminate(): void {
    this.worker.terminate();
    this.pending.clear();
  }
}
