/// <reference lib="webworker" />

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

ctx.onmessage = async (event: MessageEvent<RunRequest>) => {
  const { id, fnCode, args } = event.data;
  try {
    const fn = Function('return (' + fnCode + ')')();
    const result = await fn(...(Array.isArray(args) ? args : []));
    ctx.postMessage({ id, result } as RunResponse);
  } catch (err) {
    ctx.postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    } as RunResponse);
  }
};

export {}; // 使文件成为模块
