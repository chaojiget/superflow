/**
 * 测试服务器辅助工具
 */

import { vi } from 'vitest';

/**
 * Mock HTTP 服务器
 */
export class MockServer {
  private handlers = new Map<string, (req: any) => any>();
  private requestHistory: any[] = [];

  /**
   * 注册路由处理器
   */
  on(method: string, path: string, handler: (req: any) => any): void {
    const key = `${method.toUpperCase()} ${path}`;
    this.handlers.set(key, handler);
  }

  /**
   * 模拟请求
   */
  async request(method: string, path: string, data?: any): Promise<any> {
    const key = `${method.toUpperCase()} ${path}`;
    const handler = this.handlers.get(key);

    const request = {
      method: method.toUpperCase(),
      path,
      data,
      headers: {},
      timestamp: Date.now(),
    };

    this.requestHistory.push(request);

    if (!handler) {
      throw new Error(`No handler for ${key}`);
    }

    return handler(request);
  }

  /**
   * 获取请求历史
   */
  getRequestHistory(): any[] {
    return [...this.requestHistory];
  }

  /**
   * 清除请求历史
   */
  clearHistory(): void {
    this.requestHistory = [];
  }

  /**
   * 重置服务器
   */
  reset(): void {
    this.handlers.clear();
    this.requestHistory = [];
  }
}

/**
 * 创建模拟服务器
 */
export function createMockServer(): MockServer {
  return new MockServer();
}

/**
 * 模拟 fetch API
 */
export function mockFetch(responses: Record<string, any> = {}): void {
  global.fetch = vi.fn((url: string | URL, options?: RequestInit) => {
    const urlString = url.toString();
    const method = options?.method || 'GET';
    const key = `${method} ${urlString}`;

    const response = responses[key] || responses[urlString];

    if (!response) {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Not Found' }),
        text: () => Promise.resolve('Not Found'),
      } as Response);
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
      headers: new Headers(),
      clone: () => ({}),
      body: null,
      bodyUsed: false,
      redirected: false,
      type: 'basic',
      url: urlString,
    } as Response);
  });
}

/**
 * 模拟 WebSocket
 */
export class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  public readyState = MockWebSocket.CONNECTING;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  private messageQueue: any[] = [];

  constructor(public url: string) {
    // 模拟异步连接
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: any): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.messageQueue.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // 测试辅助方法
  simulateMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  getMessageQueue(): any[] {
    return [...this.messageQueue];
  }
}

/**
 * 设置 WebSocket mock
 */
export function mockWebSocket(): void {
  global.WebSocket = MockWebSocket as any;
}

/**
 * 模拟时间
 */
export class MockTimer {
  private currentTime = 0;
  private timers = new Map<number, { callback: () => void; time: number }>();
  private nextId = 1;

  constructor(startTime: number = 0) {
    this.currentTime = startTime;
  }

  setTimeout(callback: () => void, delay: number): number {
    const id = this.nextId++;
    this.timers.set(id, {
      callback,
      time: this.currentTime + delay,
    });
    return id;
  }

  clearTimeout(id: number): void {
    this.timers.delete(id);
  }

  setInterval(callback: () => void, interval: number): number {
    const id = this.nextId++;
    const repeatingCallback = () => {
      callback();
      this.timers.set(id, {
        callback: repeatingCallback,
        time: this.currentTime + interval,
      });
    };
    this.timers.set(id, {
      callback: repeatingCallback,
      time: this.currentTime + interval,
    });
    return id;
  }

  clearInterval(id: number): void {
    this.timers.delete(id);
  }

  tick(time: number): void {
    this.currentTime += time;

    const readyTimers = Array.from(this.timers.entries())
      .filter(([_, timer]) => timer.time <= this.currentTime)
      .sort(([_, a], [__, b]) => a.time - b.time);

    for (const [id, timer] of readyTimers) {
      this.timers.delete(id);
      timer.callback();
    }
  }

  now(): number {
    return this.currentTime;
  }

  reset(): void {
    this.timers.clear();
    this.currentTime = 0;
    this.nextId = 1;
  }
}

/**
 * 设置时间 mock
 */
export function mockTimer(): MockTimer {
  const timer = new MockTimer();

  global.setTimeout = timer.setTimeout.bind(timer);
  global.clearTimeout = timer.clearTimeout.bind(timer);
  global.setInterval = timer.setInterval.bind(timer);
  global.clearInterval = timer.clearInterval.bind(timer);
  global.Date.now = timer.now.bind(timer);

  return timer;
}

/**
 * 等待条件满足
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    timeoutMessage?: string;
  } = {}
): Promise<void> {
  const {
    timeout = 5000,
    interval = 50,
    timeoutMessage = 'Condition not met within timeout',
  } = options;

  const start = Date.now();

  while (Date.now() - start < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(timeoutMessage);
}

/**
 * 模拟异步延迟
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 创建测试用的 Promise
 */
export function createDeferred<T = any>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
} {
  let resolve: (value: T) => void;
  let reject: (error: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve: resolve!, reject: reject! };
}

/**
 * 启动测试服务器
 */
export async function startTestServer(port: number = 3000): Promise<{
  url: string;
  close: () => Promise<void>;
  mockServer: MockServer;
}> {
  const mockServer = createMockServer();
  
  // 设置默认路由
  mockServer.on('GET', '/health', () => ({ status: 'ok' }));
  mockServer.on('GET', '/api/flows', () => ({ flows: [] }));
  mockServer.on('POST', '/api/flows', (req) => ({ 
    id: 'test-flow-id', 
    ...req.data 
  }));
  
  return {
    url: `http://localhost:${port}`,
    close: async () => {
      // 清理资源
      mockServer.reset();
    },
    mockServer,
  };
}

/**
 * 监听事件发射器
 */
export class EventCapture {
  private events: Array<{ type: string; data: any; timestamp: number }> = [];

  capture(type: string, data: any): void {
    this.events.push({
      type,
      data,
      timestamp: Date.now(),
    });
  }

  getEvents(
    type?: string
  ): Array<{ type: string; data: any; timestamp: number }> {
    if (type) {
      return this.events.filter((event) => event.type === type);
    }
    return [...this.events];
  }

  getLastEvent(
    type?: string
  ): { type: string; data: any; timestamp: number } | undefined {
    const events = this.getEvents(type);
    return events[events.length - 1];
  }

  clear(): void {
    this.events = [];
  }

  count(type?: string): number {
    return this.getEvents(type).length;
  }
}
