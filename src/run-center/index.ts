export interface RunRecord {
  id: string;
  input: string;
  output: string;
  createdAt: number;
  version: number;
}

const runQueue: RunRecord[] = [];

export function logRun(record: RunRecord): void {
  runQueue.push(record);
}

export function getRunRecords(): RunRecord[] {
  return [...runQueue];
}

export function clearRunRecords(): void {
  runQueue.length = 0;
}

