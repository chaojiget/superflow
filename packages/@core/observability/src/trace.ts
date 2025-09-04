export interface Trace {
  chainId: string;
  runId: string;
  parentId?: string;
  nodeId?: string;
}

export function createTrace(
  chainId: string,
  runId: string,
  options: { parentId?: string; nodeId?: string } = {}
): Trace {
  const { parentId, nodeId } = options;
  return {
    chainId,
    runId,
    ...(parentId !== undefined ? { parentId } : {}),
    ...(nodeId !== undefined ? { nodeId } : {}),
  };
}
