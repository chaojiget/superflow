export interface Trace {
  chainId: string;
  runId: string;
  parentId?: string | undefined;
  nodeId?: string | undefined;
}

export function createTrace(trace: Trace): Trace {
  return trace;
}
