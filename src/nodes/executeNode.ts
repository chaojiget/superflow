export interface ExecuteResult {
  output: unknown;
  logs: string[];
}

/**
 * Execute a node handler and capture its output and logs.
 * @param code handler code defining a `handler` function
 * @param input input provided to handler
 */
export async function executeNode(
  code: string,
  input: unknown
): Promise<ExecuteResult> {
  const logs: string[] = [];
  const fakeConsole = {
    log: (...args: unknown[]) => {
      logs.push(args.map((a) => String(a)).join(' '));
    },
  };
  const runner = new Function(
    'input',
    'console',
    `"use strict";${code}; return handler(input);`
  );
  const output = await runner(input, fakeConsole);
  return { output, logs };
}
