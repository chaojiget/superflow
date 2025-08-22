export interface RunRecord {
  id: string;
  input: string;
  output: string;
  createdAt: number;
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

export function RunRecordList() {
  // TODO: 实现记录列表组件
  return getRunRecords();
}
