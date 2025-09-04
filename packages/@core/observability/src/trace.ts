export interface Trace {
  chainId: string;
  runId: string;
  parentId?: string;
  nodeId?: string;
}

export function createTrace(
  chainId: string,
  runId: string,
  parentId?: string,
  nodeId?: string
): Trace {
  return { chainId, runId, parentId, nodeId };
}
