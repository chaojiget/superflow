export interface Trace {
  chainId: string | undefined;
  parentId: string | undefined;
  runId: string | undefined;
  nodeId: string | undefined;
}

export function createTrace(trace: Trace): Trace {
  return trace;
}
