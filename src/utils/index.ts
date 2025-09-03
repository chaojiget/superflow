/**
 * Utils 模块统一导出
 */

// 数学工具
export * from './math';

// UUID 工具
export * from './uuid';

// 日志工具
export * from './logger';
// 剪贴板工具
export * from './clipboard';
// 预览运行器
export * from './preview-runner';

// 剪贴板工具
export * from './clipboard';

// 重新导出常用函数（兼容性）
export { generateULID as generateId, isValidULID as isValidId } from './uuid';

export {
  clamp,
  lerp,
  map as mapRange,
  distance,
  random,
  randomInt,
  round,
  average,
  median,
} from './math';

export {
  Logger,
  LogLevel,
  createLogger,
  logger,
  filters as logFilters,
  measurePerformance,
  withLogging,
} from './logger';

// 通用工具函数

/**
 * 延迟执行
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 安全的JSON解析
 */
export function safeJsonParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * 安全的JSON字符串化
 */
export function safeJsonStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/**
 * 深拷贝对象
 */
export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

/**
 * 截断字符串
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(
  timestamp: number,
  format: 'short' | 'long' | 'iso' = 'long'
): string {
  const date = new Date(timestamp);

  switch (format) {
    case 'short':
      return date.toLocaleTimeString();
    case 'iso':
      return date.toISOString();
    default:
      return date.toLocaleString();
  }
}
