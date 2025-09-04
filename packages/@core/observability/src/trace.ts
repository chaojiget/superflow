<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { ulid } from 'ulid';

=======
>>>>>>> origin/codex/integrate-superflowdb-in-runcenterservice
=======
>>>>>>> origin/codex/define-capabilities-in-capabilities.ts
export interface Trace {
  chainId: string;
  runId: string;
  parentId?: string;
  nodeId?: string;
}

<<<<<<< HEAD
<<<<<<< HEAD
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
=======
export function createTrace(input: Trace): Trace {
  return {
    chainId: input.chainId,
    runId: input.runId,
    ...(input.parentId && { parentId: input.parentId }),
    ...(input.nodeId && { nodeId: input.nodeId }),
>>>>>>> origin/codex/integrate-superflowdb-in-runcenterservice
  };
=======
export function createTrace(
  chainId: string,
  runId: string,
  parentId?: string,
  nodeId?: string
): Trace {
  return { chainId, runId, parentId, nodeId };
>>>>>>> origin/codex/define-capabilities-in-capabilities.ts
=======
export interface Trace {
  chainId: string;
  runId: string;
  parentId?: string | undefined;
  nodeId?: string | undefined;
}

export function createTrace(data: Trace): Trace {
  return data;
>>>>>>> origin/codex/define-log-structure-and-export-functionality
}
