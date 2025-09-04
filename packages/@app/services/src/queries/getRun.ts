import type { StoragePort, RunRecord } from '../ports/storage';

export async function getRun(
  deps: { storage: StoragePort },
  id: string
): Promise<RunRecord | undefined> {
  return deps.storage.getRun(id);
}
