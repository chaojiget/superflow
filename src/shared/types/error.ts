import { z } from 'zod';

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

export interface AppError {
  name: string;
  message: string;
  stack?: string;
  code: ErrorCode;
  cause?: unknown;
}

export function createError(
  code: ErrorCode,
  message: string,
  cause?: unknown,
  name = 'SuperflowError'
): AppError {
  return {
    name,
    message,
    code,
    stack: undefined,
    cause,
  };
}

export function serializeError(err: unknown): AppError {
  if (err && typeof err === 'object') {
    const e = err as any;
    const parsedCode = ErrorCodeSchema.safeParse(e.code);
    return {
      name: typeof e.name === 'string' ? e.name : 'Error',
      message: typeof e.message === 'string' ? e.message : String(err),
      stack: typeof e.stack === 'string' ? e.stack : undefined,
      code: parsedCode.success ? parsedCode.data : 'UNKNOWN_ERROR',
      cause: e.cause,
    };
  }
  return {
    name: 'Error',
    message: String(err),
    code: 'UNKNOWN_ERROR',
  };
}

export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

export const createResult = {
  success: <T>(data: T): Result<T> => ({ success: true, data }),
  error: <E = AppError>(error: E): Result<never, E> => ({
    success: false,
    error,
  }),
};
