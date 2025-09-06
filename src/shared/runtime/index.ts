/**
 * 运行时工具模块
 * 提供超时控制、重试机制、AbortController 等功能
 */

import type { Result } from '@core/error';

/**
 * 超时控制结果
 */
export interface TimeoutResult {
  controller: AbortController;
  promise: Promise<never>;
}

/**
 * 创建超时控制器
 */
export function createTimeout(timeoutMs: number): TimeoutResult {
  const controller = new AbortController();

  const promise = new Promise<never>((_, reject) => {
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error('操作被取消'));
    }, timeoutMs);

    // 如果手动取消，清除定时器
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new Error('操作被取消'));
    });
  });

  return { controller, promise };
}

/**
 * 为 Promise 添加超时控制
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<T> {
  // 如果已经取消，直接抛出错误
  if (signal?.aborted) {
    throw new Error('操作已取消');
  }

  const { controller, promise: timeoutPromise } = createTimeout(timeoutMs);

  // 监听外部取消信号
  if (signal) {
    signal.addEventListener('abort', () => {
      controller.abort();
    });
  }

  try {
    return await Promise.race([
      promise,
      timeoutPromise.catch(() => {
        if (signal?.aborted) {
          throw new Error('操作已取消');
        }
        throw new Error('操作超时');
      }),
    ]);
  } finally {
    controller.abort(); // 清理资源
  }
}

/**
 * 重试配置
 */
export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitter?: boolean;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  signal?: AbortSignal;
}

/**
 * 默认重试配置
 */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'signal'>> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
  jitter: true,
  shouldRetry: () => true,
};

/**
 * 带重试的异步操作执行
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    // 检查是否已取消
    if (config.signal?.aborted) {
      throw new Error('操作已取消');
    }

    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 最后一次尝试失败，不再重试
      if (attempt === config.maxAttempts) {
        break;
      }

      // 检查是否应该重试
      if (!config.shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      // 计算延迟时间
      const baseDelay =
        config.baseDelayMs * Math.pow(config.backoffFactor, attempt - 1);
      const clampedDelay = Math.min(baseDelay, config.maxDelayMs);
      const jitterDelay = config.jitter
        ? clampedDelay * (0.5 + Math.random() * 0.5)
        : clampedDelay;

      // 等待重试
      await new Promise((resolve) => setTimeout(resolve, jitterDelay));
    }
  }

  throw lastError!;
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): T {
  let timeoutId: ReturnType<typeof setTimeout>;

  return ((...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  }) as T;
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  intervalMs: number
): T {
  let lastCallTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall >= intervalMs) {
      lastCallTime = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        timeoutId = null;
        fn(...args);
      }, intervalMs - timeSinceLastCall);
    }
  }) as T;
}

/**
 * 任务队列管理
 */
export class TaskQueue {
  private tasks: Array<() => Promise<unknown>> = [];
  private concurrency: number;
  private activeCount = 0;

  constructor(concurrency = 1) {
    this.concurrency = concurrency;
  }

  /**
   * 添加任务到队列
   */
  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.tasks.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * 处理队列中的任务
   */
  private async processQueue(): Promise<void> {
    if (this.activeCount >= this.concurrency || this.tasks.length === 0) {
      return;
    }

    this.activeCount++;
    const task = this.tasks.shift()!;

    try {
      await task();
    } finally {
      this.activeCount--;
      this.processQueue(); // 处理下一个任务
    }
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.tasks.length = 0;
  }

  /**
   * 获取队列长度
   */
  get size(): number {
    return this.tasks.length;
  }

  /**
   * 获取活跃任务数量
   */
  get active(): number {
    return this.activeCount;
  }
}

/**
 * 批处理工具
 */
export class BatchProcessor<T, R> {
  private items: T[] = [];
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private processor: (items: T[]) => Promise<R[]>,
    private batchSize: number = 10,
    private maxWaitMs: number = 1000
  ) {}

  /**
   * 添加项目到批处理队列
   */
  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.items.push(item);

      const itemIndex = this.items.length - 1;

      // 如果达到批处理大小，立即处理
      if (this.items.length >= this.batchSize) {
        this.processBatch()
          .then((results) => resolve(results[itemIndex] as R))
          .catch(reject);
      } else {
        // 设置延迟处理
        if (!this.timeoutId) {
          this.timeoutId = setTimeout(() => {
            this.processBatch()
              .then((results) => resolve(results[itemIndex] as R))
              .catch(reject);
          }, this.maxWaitMs);
        }
      }
    });
  }

  /**
   * 处理当前批次
   */
  private async processBatch(): Promise<R[]> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    const currentItems = this.items.splice(0);
    if (currentItems.length === 0) {
      return [];
    }

    return await this.processor(currentItems);
  }
}

/**
 * 信号量实现
 */
export class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  /**
   * 获取许可证
   */
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  /**
   * 释放许可证
   */
  release(): void {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift()!;
      resolve();
    } else {
      this.permits++;
    }
  }

  /**
   * 使用信号量保护的执行
   */
  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/**
 * 结果类型（用于错误处理）
 */
/**
 * 创建成功结果
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * 创建失败结果
 */
export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * 安全执行异步操作
 */
export async function safeAsync<T>(
  operation: () => Promise<T>
): Promise<Result<T, Error>> {
  try {
    const data = await operation();
    return success(data);
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 链式操作结果
 */
export function chain<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> {
  if (!result.success) {
    return result;
  }
  return fn(result.data);
}

/**
 * 映射结果数据
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> {
  if (!result.success) {
    return result;
  }
  return success(fn(result.data));
}

/**
 * 异步映射结果数据
 */
export async function mapAsync<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Promise<U>
): Promise<Result<U, E>> {
  if (!result.success) {
    return result;
  }
  try {
    const mappedData = await fn(result.data);
    return success(mappedData);
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error(String(error))
    ) as Result<U, E>;
  }
}
export * from './capabilities';
