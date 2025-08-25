/**
 * 测试应用辅助工具
 */

import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { vi, expect } from 'vitest';

/**
 * 测试应用配置
 */
export interface TestAppConfig {
  initialState?: any;
  mocks?: Record<string, any>;
  providers?: React.ComponentType<{ children: React.ReactNode }>[];
}

/**
 * 创建测试包装器
 */
export function createTestWrapper(config: TestAppConfig = {}) {
  const { providers = [] } = config;

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return providers.reduce(
      (acc, Provider) => React.createElement(Provider, { children: acc }, acc),
      children
    );
  };
}

/**
 * 自定义渲染函数
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderOptions & TestAppConfig = {}
): RenderResult {
  const { initialState, mocks, providers, ...renderOptions } = options;

  // 设置 mocks
  if (mocks) {
    Object.entries(mocks).forEach(([key, value]) => {
      vi.mocked(globalThis as any)[key] = value;
    });
  }

  const Wrapper = createTestWrapper({
    initialState,
    ...(providers && { providers }),
  });

  return render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  });
}

/**
 * 模拟组件
 */
export function createMockComponent(name: string) {
  return vi.fn().mockImplementation(({ children, ...props }) =>
    React.createElement(
      'div',
      {
        'data-testid': `mock-${name.toLowerCase()}`,
        'data-props': JSON.stringify(props),
      },
      children
    )
  );
}

/**
 * 模拟 React Hook
 */
export function mockHook<T>(hookName: string, returnValue: T): void {
  vi.doMock('react', async () => {
    const actual = await vi.importActual('react');
    return {
      ...actual,
      [hookName]: () => returnValue,
    };
  });
}

/**
 * 模拟模块
 */
export function mockModule(moduleName: string, mockImplementation: any): void {
  vi.doMock(moduleName, () => mockImplementation);
}

/**
 * 创建测试用的 React Flow 节点
 */
export function createTestNode(overrides: any = {}) {
  return {
    id: 'test-node',
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label: 'Test Node' },
    ...overrides,
  };
}

/**
 * 创建测试用的 React Flow 边
 */
export function createTestEdge(overrides: any = {}) {
  return {
    id: 'test-edge',
    source: 'node1',
    target: 'node2',
    ...overrides,
  };
}

/**
 * 模拟 localStorage
 */
export function mockLocalStorage(): Storage {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) || null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    key: vi.fn((index: number) => Array.from(store.keys())[index] || null),
    get length() {
      return store.size;
    },
  };
}

/**
 * 模拟 sessionStorage
 */
export function mockSessionStorage(): Storage {
  return mockLocalStorage(); // 相同的实现
}

/**
 * 设置存储 mocks
 */
export function setupStorageMocks(): void {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage(),
    writable: true,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage(),
    writable: true,
  });
}

/**
 * 模拟 ResizeObserver
 */
export function mockResizeObserver(): void {
  (globalThis as any).ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}

/**
 * 模拟 IntersectionObserver
 */
export function mockIntersectionObserver(): void {
  (globalThis as any).IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  }));
}

/**
 * 设置全局 mocks
 */
export function setupGlobalMocks(): void {
  setupStorageMocks();
  mockResizeObserver();
  mockIntersectionObserver();

  // Mock console methods for cleaner test output
  (globalThis as any).console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock window.scrollTo
  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    writable: true,
  });
}

/**
 * 清理 mocks
 */
export function cleanupMocks(): void {
  vi.clearAllMocks();
  vi.resetAllMocks();
}

/**
 * 断言工具
 */
export const assertions = {
  /**
   * 断言元素存在
   */
  elementExists: (element: HTMLElement | null, message?: string) => {
    if (!element) {
      throw new Error(message || 'Element does not exist');
    }
  },

  /**
   * 断言元素有特定文本
   */
  hasText: (element: HTMLElement, expectedText: string) => {
    if (!element.textContent?.includes(expectedText)) {
      throw new Error(`Element does not contain text: ${expectedText}`);
    }
  },

  /**
   * 断言元素有特定属性
   */
  hasAttribute: (element: HTMLElement, attribute: string, value?: string) => {
    if (!element.hasAttribute(attribute)) {
      throw new Error(`Element does not have attribute: ${attribute}`);
    }
    if (value !== undefined && element.getAttribute(attribute) !== value) {
      throw new Error(`Element attribute ${attribute} is not ${value}`);
    }
  },

  /**
   * 断言函数被调用
   */
  wasCalled: (mockFn: any, times?: number) => {
    if (times !== undefined) {
      expect(mockFn).toHaveBeenCalledTimes(times);
    } else {
      expect(mockFn).toHaveBeenCalled();
    }
  },

  /**
   * 断言异步操作
   */
  async eventually(assertion: () => void | Promise<void>, timeout = 5000) {
    const start = Date.now();
    let lastError: Error | undefined;

    while (Date.now() - start < timeout) {
      try {
        await assertion();
        return; // 断言成功
      } catch (error) {
        lastError = error as Error;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    throw lastError || new Error('Assertion timeout');
  },
};

/**
 * 创建测试数据工厂
 */
export function createTestDataFactory<T>(defaultData: T) {
  return function (overrides: Partial<T> = {}): T {
    return { ...defaultData, ...overrides };
  };
}

/**
 * 性能测试工具
 */
export class PerformanceTracker {
  private marks = new Map<string, number>();
  private measures = new Map<string, number>();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const startTime = this.marks.get(startMark);
    const endTime = endMark ? this.marks.get(endMark) : performance.now();

    if (startTime === undefined) {
      throw new Error(`Start mark "${startMark}" not found`);
    }
    if (endMark && endTime === undefined) {
      throw new Error(`End mark "${endMark}" not found`);
    }

    const duration = endTime! - startTime;
    this.measures.set(name, duration);
    return duration;
  }

  getMeasure(name: string): number | undefined {
    return this.measures.get(name);
  }

  getAllMeasures(): Map<string, number> {
    return new Map(this.measures);
  }

  clear(): void {
    this.marks.clear();
    this.measures.clear();
  }
}

/**
 * 创建性能追踪器
 */
export function createPerformanceTracker(): PerformanceTracker {
  return new PerformanceTracker();
}

/**
 * 创建测试应用实例
 */
export async function createTestApp(): Promise<{
  render: (ui: React.ReactElement) => RenderResult;
  cleanup: () => Promise<void>;
  storage: any;
  mocks: Record<string, any>;
}> {
  // 设置全局 mocks
  setupGlobalMocks();

  // 创建测试存储
  const { createStorage } = await import('../../shared/db');
  const storage = await createStorage('test-e2e-db');

  // 收集 mocks
  const mocks = {
    localStorage: mockLocalStorage(),
    sessionStorage: mockSessionStorage(),
    storage,
  };

  return {
    render: (ui: React.ReactElement) => {
      return renderWithProviders(ui, { mocks });
    },
    cleanup: async () => {
      cleanupMocks();
      if (storage && typeof (storage as any).close === 'function') {
        await (storage as any).close();
      }
    },
    storage,
    mocks,
  };
}
