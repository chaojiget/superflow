import { describe, it, expect, beforeEach } from 'vitest';
import { logRun, getRunRecords, clearRunRecords, type RunRecord } from './index';

describe('run-center', () => {
  beforeEach(() => {
    clearRunRecords();
  });

  it('logs and retrieves records', () => {
    const record: RunRecord = {
      id: '1',
      input: 'input data',
      output: 'output data',
      createdAt: Date.now(),
    };

    logRun(record);

    const records = getRunRecords();
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(record);
  });
});
