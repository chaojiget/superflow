export interface Trace {
  chainId: string;
  parentId?: string | undefined;
  runId: string;
  nodeId?: string | undefined;
}

export function createTrace(trace: Trace): Trace {
  return trace;
}
