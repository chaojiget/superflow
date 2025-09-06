import { db } from './logger';

export async function exportNDJSON(runId: string): Promise<string> {
  const logs = await db.logs.where('runId').equals(runId).sortBy('ts');
  return logs
    .map(({ ts, level, nodeId, runId: r, chainId, fields }) =>
      JSON.stringify({ ts, level, nodeId, runId: r, chainId, fields })
    )
    .join('\n');
}
