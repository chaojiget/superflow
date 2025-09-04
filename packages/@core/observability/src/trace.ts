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
  return {
    chainId: ulid(),
    runId,
    parentId,
    nodeId,
  };
}
