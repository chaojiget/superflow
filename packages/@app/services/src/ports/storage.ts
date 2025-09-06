export interface RunRecord {
  id: string;
  flowId: string;
  input?: unknown;
  status: 'running' | 'completed' | 'failed';
}

export interface StoragePort {
  saveRun(run: RunRecord): Promise<void>;
  getRun(id: string): Promise<RunRecord | undefined>;
}
