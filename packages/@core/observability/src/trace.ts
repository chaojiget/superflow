export interface Trace {
  chainId: string;
  runId: string;
  parentId?: string;
  nodeId?: string;
}

export function createTrace(input: Trace): Trace {
  return {
    chainId: input.chainId,
    runId: input.runId,
    ...(input.parentId && { parentId: input.parentId }),
    ...(input.nodeId && { nodeId: input.nodeId }),
  };
}
