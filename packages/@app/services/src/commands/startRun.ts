import { ulid } from 'ulid';
import type { StoragePort, RunRecord } from '../ports/storage';
import type { RuntimePort } from '../ports/runtime';
import type { LogPort } from '../ports/log';

export interface ExecRequest {
  flowId: string;
  input?: unknown;
}

export async function startRun(
  deps: { storage: StoragePort; runtime: RuntimePort; log: LogPort },
  req: ExecRequest
): Promise<string> {
  const runId = ulid();
  const run: RunRecord = {
    id: runId,
    flowId: req.flowId,
    input: req.input,
    status: 'running',
  };
  await deps.storage.saveRun(run);
  try {
    await deps.runtime.execute(req.flowId, req.input);
    deps.log.info(`run ${runId} started`);
  } catch (err: unknown) {
    deps.log.error(err instanceof Error ? err.message : String(err));
  }
  return runId;
}
