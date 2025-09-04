<<<<<<< HEAD
import { db } from './logger';

export async function exportNDJSON(runId: string): Promise<string> {
  const logs = await db.logs.where('runId').equals(runId).sortBy('ts');
  return logs
    .map(({ ts, level, nodeId, runId: r, chainId, fields }) =>
      JSON.stringify({ ts, level, nodeId, runId: r, chainId, fields })
    )
    .join('\n');
=======
import type { LogRow } from './logger';

export function toNDJSON(row: LogRow): string {
  return JSON.stringify(row);
>>>>>>> origin/codex/implement-workflow-node-and-workflow-flow-support
}
