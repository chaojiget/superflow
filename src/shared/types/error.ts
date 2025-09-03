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
    // 确保 message 在 JSON 序列化时可见
    this.message = message;
    this.code = code;
    this.cause = options?.cause;
    this.traceId = options?.traceId;
    this.timestamp = Date.now();
  }

  toJSON(): SuperflowError {
    return {
      // 让 name 在序列化结果中可见
      // @ts-expect-error augment
      name: this.name as any,
      code: this.code,
      message: this.message,
      cause: this.cause,
      traceId: this.traceId,
      timestamp: this.timestamp,
    };
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

/**
 * 兼容两种调用方式：
 * - createError(code, message, cause)
 * - createError(code, message, { cause, traceId })
 */
export function createError(
  code: ErrorCode,
  message: string,
  optionsOrCause?: { cause?: unknown; traceId?: TraceId } | unknown
): SuperflowErrorImpl {
  if (
    optionsOrCause &&
    typeof optionsOrCause === 'object' &&
    ('cause' in (optionsOrCause as any) || 'traceId' in (optionsOrCause as any))
  ) {
    return new SuperflowErrorImpl(
      code,
      message,
      optionsOrCause as { cause?: unknown; traceId?: TraceId }
    );
  }
  return new SuperflowErrorImpl(code, message, { cause: optionsOrCause });
}
