import type { LogRow } from './logger';

export function toNDJSON(row: LogRow): string {
  return JSON.stringify(row);
}
