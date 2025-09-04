self.onmessage = async (event: MessageEvent) => {
  const { id, fn, arg } = event.data as {
    id: number;
    fn: string;
    arg: unknown;
  };
  try {
    // 使用 Function 构造函数执行传入的函数，避免主线程直接 eval
    const handler = new Function(`return (${fn})`)();
    const result = await handler(arg);
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export {};
