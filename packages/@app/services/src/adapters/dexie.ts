import 'fake-indexeddb/auto';
import Dexie, { type Table } from 'dexie';
import type { RunRecord, StoragePort } from '../ports/storage';

class RunDB extends Dexie {
  runs!: Table<RunRecord, string>;

  constructor() {
    super('runs');
    this.version(1).stores({ runs: 'id' });
  }
}

const db = new RunDB();

export const dexieStorage: StoragePort = {
  async saveRun(run) {
    await db.runs.put(run);
  },
  async getRun(id) {
    return db.runs.get(id);
  },
};
