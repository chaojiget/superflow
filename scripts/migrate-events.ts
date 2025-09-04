/* eslint-disable no-console */
import { ulid } from 'ulid';
import { createStorage } from '../src/shared/db';
import type {
  StorageAdapter,
  EventRecord,
  RunRecord,
  LogRecord,
} from '../src/shared/types';

/**
 * 将现有 runs 和 logs 表中的数据迁移到 events 事件流中
 */
export async function migrateToEventLog(
  storage: StorageAdapter
): Promise<void> {
  const runRecords = await storage.getAll<RunRecord>('runs');
  for (const run of runRecords) {
    const event: EventRecord = {
      id: ulid(),
      type: 'run.created',
      payload: run,
      createdAt: run.startedAt,
      updatedAt: run.startedAt,
    };
    await storage.addEvent(event);
  }

  const logRecords = await storage.getAll<LogRecord>('logs');
  for (const log of logRecords) {
    const event: EventRecord = {
      id: ulid(),
      type: 'run.log',
      payload: log,
      createdAt: log.ts,
      updatedAt: log.ts,
    };
    await storage.addEvent(event);
  }
}

/**
 * 如果作为独立脚本执行，则自动迁移默认数据库
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbName = process.env.SUPERFLOW_DB_NAME ?? 'superflow';
  createStorage(dbName).then(async (storage) => {
    await migrateToEventLog(storage);
    console.log('事件日志迁移完成');
  });
}
