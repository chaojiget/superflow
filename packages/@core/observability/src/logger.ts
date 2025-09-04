<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import Dexie, { type Table } from 'dexie';
import type { LogLevel } from '@core/protocol';

export interface LogEntry {
=======
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogRow {
>>>>>>> origin/codex/define-capabilities-in-capabilities.ts
  ts: number;
  level: LogLevel;
  nodeId?: string;
  runId?: string;
  chainId?: string;
  fields?: Record<string, unknown>;
}

<<<<<<< HEAD
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

  debug(
    entry: Omit<LogEntry, 'level' | 'ts'> & { ts?: number } = {}
  ): Promise<void> {
    return this.write('debug', entry);
  }

  info(
    entry: Omit<LogEntry, 'level' | 'ts'> & { ts?: number } = {}
  ): Promise<void> {
    return this.write('info', entry);
  }

  warn(
    entry: Omit<LogEntry, 'level' | 'ts'> & { ts?: number } = {}
  ): Promise<void> {
    return this.write('warn', entry);
  }

  error(
    entry: Omit<LogEntry, 'level' | 'ts'> & { ts?: number } = {}
  ): Promise<void> {
    return this.write('error', entry);
  }
}

export const logger = new Logger();
=======
import type { LogLevel } from '../protocol/src';
=======
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
>>>>>>> origin/codex/integrate-superflowdb-in-runcenterservice
=======
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
>>>>>>> origin/codex/define-log-structure-and-export-functionality

export interface LogRow {
  ts: number;
  level: LogLevel;
<<<<<<< HEAD
<<<<<<< HEAD
  nodeId?: string | undefined;
  runId?: string | undefined;
  chainId?: string | undefined;
  fields?: Record<string, unknown> | undefined;
}

=======
>>>>>>> origin/codex/define-capabilities-in-capabilities.ts
export interface Logger {
  log(row: LogRow): void;
}

<<<<<<< HEAD
export function createLogRow(row: LogRow): LogRow {
  return row;
}
>>>>>>> origin/codex/define-execrequest-and-related-types
=======
  runId?: string;
  chainId?: string;
  nodeId?: string;
  fields?: Record<string, unknown>;
}

export type LogTransport = (row: LogRow) => void;

export function createLogger(transport: LogTransport) {
  return function log(
    level: LogLevel,
    context: {
      runId?: string;
      chainId?: string;
      nodeId?: string;
      fields?: Record<string, unknown>;
    } = {}
  ): void {
    const row: LogRow = {
      ts: Date.now(),
      level,
      ...(context.runId && { runId: context.runId }),
      ...(context.chainId && { chainId: context.chainId }),
      ...(context.nodeId && { nodeId: context.nodeId }),
      ...(context.fields && { fields: context.fields }),
    };
    transport(row);
  };
}
>>>>>>> origin/codex/integrate-superflowdb-in-runcenterservice
=======
export function createLogger(writer: (row: LogRow) => void): Logger {
  return {
    log: writer,
  };
}
>>>>>>> origin/codex/define-capabilities-in-capabilities.ts
=======
  runId?: string | undefined;
  chainId?: string | undefined;
  nodeId?: string | undefined;
  fields?: Record<string, unknown> | undefined;
}

export function createLog(row: LogRow): LogRow {
  return row;
}
>>>>>>> origin/codex/define-log-structure-and-export-functionality
