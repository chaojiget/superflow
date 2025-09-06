import { ulid } from 'ulid';

export interface Trace {
  chainId: string;
  runId: string;
  parentId?: string;
  nodeId?: string;
}

export function createTrace(
  runId: string,
  nodeId?: string,
  parentId?: string
): Trace {
  const trace: Trace = { chainId: ulid(), runId };
  if (parentId !== undefined) trace.parentId = parentId;
  if (nodeId !== undefined) trace.nodeId = nodeId;
  return trace;
}
