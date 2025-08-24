import { z } from 'zod';
import type { TraceId } from './base';

export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'RUNTIME_ERROR',
  'TIMEOUT_ERROR',
  'ABORT_ERROR',
  'NETWORK_ERROR',
  'STORAGE_ERROR',
  'WORKER_ERROR',
  'UNKNOWN_ERROR',
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export interface SuperflowError {
  code: ErrorCode;
  message: string;
  cause?: unknown;
  traceId?: TraceId | undefined;
  timestamp: number;
}

export class SuperflowErrorImpl extends Error implements SuperflowError {
  public readonly code: ErrorCode;
  public readonly cause?: unknown;
  public readonly traceId?: TraceId | undefined;
  public readonly timestamp: number;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      cause?: unknown;
      traceId?: TraceId;
    }
  ) {
    super(message);
    this.name = 'SuperflowError';
    this.code = code;
    this.cause = options?.cause;
    this.traceId = options?.traceId;
    this.timestamp = Date.now();
  }
}

export type Result<T, E = SuperflowError> =
  | { success: true; data: T }
  | { success: false; error: E };

export const createResult = {
  success: <T>(data: T): Result<T> => ({ success: true, data }),
  error: <E = SuperflowError>(error: E): Result<never, E> => ({
    success: false,
    error,
  }),
};

export function createError(
  code: ErrorCode,
  message: string,
  options?: {
    cause?: unknown;
    traceId?: TraceId;
  }
): SuperflowErrorImpl {
  return new SuperflowErrorImpl(code, message, options);
}
