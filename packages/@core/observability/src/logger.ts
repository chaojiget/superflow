import Dexie, { type Table } from 'dexie';
import type { LogLevel } from '@core/protocol';

export interface LogEntry {
  ts: number;
  level: LogLevel;
  nodeId?: string;
  runId?: string;
  chainId?: string;
  fields?: Record<string, unknown>;
}

interface LogRow extends LogEntry {
  id?: number;
}

class ObservabilityDB extends Dexie {
  logs!: Table<LogRow, number>;

  constructor() {
    super('observability');
    this.version(1).stores({
      logs: '++id, runId, nodeId, chainId, level, ts',
    });
  }
}

export const db = new ObservabilityDB();

export interface LoggerOptions {
  runId?: string;
  nodeId?: string;
  chainId?: string;
}

export class Logger {
  private context: LoggerOptions;

  constructor(context: LoggerOptions = {}) {
    this.context = context;
  }

  child(options: LoggerOptions): Logger {
    return new Logger({ ...this.context, ...options });
  }

  private async write(
    level: LogLevel,
    entry: Omit<LogEntry, 'level' | 'ts'> & { ts?: number }
  ): Promise<void> {
    const log: LogRow = {
      ts: entry.ts ?? Date.now(),
      level,
      nodeId: entry.nodeId ?? this.context.nodeId,
      runId: entry.runId ?? this.context.runId,
      chainId: entry.chainId ?? this.context.chainId,
      fields: entry.fields,
    };
    await db.logs.add(log);
  }

  debug(entry: Omit<LogEntry, 'level' | 'ts'> & { ts?: number } = {}): Promise<void> {
    return this.write('debug', entry);
  }

  info(entry: Omit<LogEntry, 'level' | 'ts'> & { ts?: number } = {}): Promise<void> {
    return this.write('info', entry);
  }

  warn(entry: Omit<LogEntry, 'level' | 'ts'> & { ts?: number } = {}): Promise<void> {
    return this.write('warn', entry);
  }

  error(entry: Omit<LogEntry, 'level' | 'ts'> & { ts?: number } = {}): Promise<void> {
    return this.write('error', entry);
  }
}

export const logger = new Logger();

