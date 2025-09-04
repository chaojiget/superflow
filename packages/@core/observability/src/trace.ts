import { ulid } from 'ulid';

export interface Trace {
  chainId: string;
  parentId?: string;
  runId: string;
  nodeId?: string;
}

export function createTrace(
  runId: string,
  nodeId?: string,
  parentId?: string
): Trace {
  return {
    chainId: ulid(),
    parentId,
    runId,
    nodeId,
  };
}
