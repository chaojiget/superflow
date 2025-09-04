export interface Trace {
  chainId: string;
  runId: string;
  parentId?: string | undefined;
  nodeId?: string | undefined;
}

export function createTrace(data: Trace): Trace {
  return data;
}
