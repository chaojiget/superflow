export { RunCenterService } from './RunCenterService';
export * as Commands from './commands';
export * as Queries from './queries';
import { startRun as startRunCmd } from './commands/startRun';
import { getRun as getRunQuery } from './queries/getRun';
import { dexieStorage } from './adapters/dexie';
import { workerRuntime } from './adapters/worker';
import { loggerAdapter } from './adapters/logger';

export function startRun(flowId: string, input?: unknown) {
  return startRunCmd(
    { storage: dexieStorage, runtime: workerRuntime, log: loggerAdapter },
    { flowId, input }
  );
}

export function getRun(id: string) {
  return getRunQuery({ storage: dexieStorage }, id);
}

export type { StoragePort, RunRecord } from './ports/storage';
export type { RuntimePort } from './ports/runtime';
export type { LogPort } from './ports/log';
