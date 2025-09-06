/**
 * Web Worker 封装模块
 * 提供类型安全的 Worker 通信和生命周期管理
 */

import { logger, type Logger } from '@/utils';
import { withTimeout } from './index';
import type { Capability } from './capabilities';

/**
 * Worker 消息类型
 */
export interface WorkerMessage {
  id: string;
  type: string;
  data?: unknown;
}

/**
 * Worker 响应类型
 */
export interface WorkerResponse {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Worker 执行上下文
 */
export interface WorkerContext {
  signal: AbortSignal;
  logger: Logger;
  env?: Record<string, string>;
  kv?: WorkerKVInterface;
  capabilities?: Capability[];
}

/**
 * Worker 中可用的 KV 接口（受限版本）
 */
export interface WorkerKVInterface {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

/**
 * 用户代码处理函数签名
 */
export type UserCodeHandler = (
  input: unknown,
  ctx: WorkerContext
) => Promise<unknown>;

/**
 * Worker 配置
 */
export interface WorkerConfig {
  timeoutMs?: number;
  maxMessageSize?: number;
  env?: Record<string, string>;
  capabilities?: Capability[];
}

/**
 * Worker 客户端
 */
export class WorkerClient {
  private worker: Worker;
  private pendingMessages = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      controller: AbortController;
    }
  >();
  private messageId = 0;

  constructor(
    workerScript: string,
    private config: WorkerConfig = {}
  ) {
    this.worker = new Worker(workerScript, { type: 'module' });
    this.setupMessageHandler();
    this.setupErrorHandler();
  }

  /**
   * 执行用户代码
   */
  async execute(
    input: unknown,
    options: {
      signal?: AbortSignal;
      timeoutMs?: number;
      logger?: Logger;
      env?: Record<string, string>;
      capabilities?: Capability[];
    } = {}
  ): Promise<unknown> {
    const messageId = this.generateMessageId();
    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs ?? 15000;
    const controller = new AbortController();

    // 检查消息大小
    const messageSize = this.getMessageSize(input);
    const maxSize = this.config.maxMessageSize ?? 1024 * 1024; // 1MB
    if (messageSize > maxSize) {
      throw new Error(`消息大小 ${messageSize} 超过限制 ${maxSize}`);
    }

    // 监听外部取消信号
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        controller.abort();
      });
    }

    const message: WorkerMessage = {
      id: messageId,
      type: 'execute',
      data: {
        input,
        config: {
          env: { ...this.config.env, ...options.env },
          signal: controller.signal,
          logger: options.logger,
          timeoutMs,
          capabilities: options.capabilities ?? this.config.capabilities,
        },
      },
    };

    return new Promise((resolve, reject) => {
      this.pendingMessages.set(messageId, { resolve, reject, controller });

      // 设置超时
      withTimeout(
        new Promise(() => {}), // 永不解决的 Promise
        timeoutMs,
        controller.signal
      ).catch((error) => {
        this.pendingMessages.delete(messageId);
        reject(error);
      });

      // 发送消息
      try {
        this.worker.postMessage(message);
      } catch (error) {
        this.pendingMessages.delete(messageId);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * 终止 Worker
   */
  terminate(): void {
    // 取消所有待处理的消息
    for (const [, { reject, controller }] of this.pendingMessages) {
      controller.abort();
      reject(new Error('Worker 已终止'));
    }
    this.pendingMessages.clear();

    this.worker.terminate();
  }

  /**
   * 检查 Worker 是否健康
   */
  async ping(timeoutMs = 5000): Promise<boolean> {
    try {
      await this.execute({ type: 'ping' }, { timeoutMs });
      return true;
    } catch {
      return false;
    }
  }

  private setupMessageHandler(): void {
    this.worker.onmessage = (event) => {
      const response = event.data as WorkerResponse;
      const pending = this.pendingMessages.get(response.id);

      if (!pending) {
        logger.warn('收到未知消息 ID', {
          event: 'worker.unknownMessage',
          messageId: response.id,
        });
        return;
      }

      this.pendingMessages.delete(response.id);

      if (response.success) {
        pending.resolve(response.data);
      } else {
        pending.reject(new Error(response.error || 'Worker 执行失败'));
      }
    };
  }

  private setupErrorHandler(): void {
    this.worker.onerror = (event) => {
      const error = new Error(`Worker 错误: ${event.message}`);

      // 拒绝所有待处理的消息
      for (const [, { reject }] of this.pendingMessages) {
        reject(error);
      }
      this.pendingMessages.clear();
    };
  }

  private generateMessageId(): string {
    return `msg_${++this.messageId}_${Date.now()}`;
  }

  private getMessageSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }
}

/**
 * 创建 Worker 客户端
 */
export async function createWorker(
  workerScript: string,
  config?: WorkerConfig
): Promise<WorkerClient> {
  const client = new WorkerClient(workerScript, config);

  // 等待 Worker 初始化完成
  const isHealthy = await client.ping();
  if (!isHealthy) {
    client.terminate();
    throw new Error('Worker 初始化失败');
  }

  return client;
}

/**
 * Worker 池管理
 */
export class WorkerPool {
  private workers: WorkerClient[] = [];
  private available: WorkerClient[] = [];
  private busy: Set<WorkerClient> = new Set();

  constructor(
    private workerScript: string,
    private poolSize: number = 4,
    private config?: WorkerConfig
  ) {}

  /**
   * 初始化 Worker 池
   */
  async initialize(): Promise<void> {
    const promises = Array.from({ length: this.poolSize }, () =>
      createWorker(this.workerScript, this.config)
    );

    this.workers = await Promise.all(promises);
    this.available = [...this.workers];
  }

  /**
   * 执行任务
   */
  async execute(
    input: unknown,
    options?: Parameters<WorkerClient['execute']>[1]
  ): Promise<unknown> {
    const worker = await this.acquireWorker();

    try {
      return await worker.execute(input, options);
    } finally {
      this.releaseWorker(worker);
    }
  }

  /**
   * 销毁 Worker 池
   */
  destroy(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.available = [];
    this.busy.clear();
  }

  /**
   * 获取池状态
   */
  getStatus(): {
    total: number;
    available: number;
    busy: number;
  } {
    return {
      total: this.workers.length,
      available: this.available.length,
      busy: this.busy.size,
    };
  }

  private async acquireWorker(): Promise<WorkerClient> {
    // 如果有可用的 Worker，直接返回
    if (this.available.length > 0) {
      const worker = this.available.pop()!;
      this.busy.add(worker);
      return worker;
    }

    // 等待有 Worker 可用
    return new Promise((resolve) => {
      const checkAvailable = () => {
        if (this.available.length > 0) {
          const worker = this.available.pop()!;
          this.busy.add(worker);
          resolve(worker);
        } else {
          setTimeout(checkAvailable, 10);
        }
      };
      checkAvailable();
    });
  }

  private releaseWorker(worker: WorkerClient): void {
    this.busy.delete(worker);
    this.available.push(worker);
  }
}

/**
 * Worker 端代码基础框架
 * 在 Worker 脚本中使用
 */
export interface WorkerHost {
  register(handler: UserCodeHandler): void;
  ready(): void;
}

/**
 * 创建 Worker 宿主环境（在 Worker 脚本中调用）
 */
export function createWorkerHost(): WorkerHost {
  let userHandler: UserCodeHandler | null = null;

  const originalFetch = self.fetch;
  const originalWebSocket = (self as any).WebSocket;

  const disableNetwork = () => {
    (self as any).fetch = () => Promise.reject(new Error('fetch 被禁用'));
    (self as any).WebSocket = function () {
      throw new Error('WebSocket 被禁用');
    } as any;
  };
  disableNetwork();

  self.onmessage = async (event) => {
    const message = event.data as WorkerMessage;

    try {
      if (message.type === 'ping') {
        self.postMessage({
          id: message.id,
          success: true,
          data: 'pong',
        } as WorkerResponse);
        return;
      }

      if (message.type === 'execute' && userHandler) {
        const { input, config } = message.data as any;

        const caps: Capability[] = config.capabilities || [];
        if (caps.includes('fetch')) {
          self.fetch = originalFetch;
        } else {
          (self as any).fetch = () => Promise.reject(new Error('fetch 被禁用'));
        }
        if (caps.includes('websocket')) {
          (self as any).WebSocket = originalWebSocket;
        } else {
          (self as any).WebSocket = function () {
            throw new Error('WebSocket 被禁用');
          } as any;
        }

        const controller = new AbortController();
        if (config.signal) {
          config.signal.addEventListener('abort', () => controller.abort());
        }
        const timeout = config.timeoutMs ?? 15000;
        const timeoutId = setTimeout(() => {
          controller.abort();
          self.postMessage({
            id: message.id,
            success: false,
            error: `执行超时 ${timeout}ms`,
          } as WorkerResponse);
          self.close();
        }, timeout);

        const context: WorkerContext = {
          signal: controller.signal,
          logger: config.logger || {
            info: () => {},
            warn: () => {},
            error: () => {},
          },
          env: config.env || {},
          kv: config.kv,
          capabilities: config.capabilities,
        };

        try {
          const result = await userHandler(input, context);
          clearTimeout(timeoutId);
          self.postMessage({
            id: message.id,
            success: true,
            data: result,
          } as WorkerResponse);
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      } else {
        throw new Error(`未知消息类型: ${message.type}`);
      }
    } catch (error) {
      self.postMessage({
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } as WorkerResponse);
    }
  };

  return {
    register(handler: UserCodeHandler): void {
      userHandler = handler;
    },

    ready(): void {
      // Worker 已准备就绪的信号
      self.postMessage({ type: 'ready' });
    },
  };
}

// 类型已在文件顶部定义，无需重复导出
