import { ulid } from 'ulid';

/**
 * 生成全局唯一标识符 (ULID)
 * ULID 是 UUID 的改进版本，具有时间排序特性
 */
export function generateId(): string {
  return ulid();
}

/**
 * 验证 ULID 格式是否有效
 */
export function isValidId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // ULID 格式: 26字符，使用 Crockford's Base32
  const ulidPattern = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;
  return ulidPattern.test(id);
}

/**
 * 格式化时间戳为可读字符串
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * 创建延迟Promise
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
 * 深拷贝对象（结构化克隆）
 */
export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

/**
 * 截断字符串到指定长度
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * 数学工具函数
 */
export const math = {
  /**
   * 将数值限制在指定范围内
   */
  clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * 线性插值
   */
  lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  },

  /**
   * 将数值从一个范围映射到另一个范围
   */
  map(
    value: number,
    fromMin: number,
    fromMax: number,
    toMin: number,
    toMax: number
  ): number {
    const t = (value - fromMin) / (fromMax - fromMin);
    return this.lerp(toMin, toMax, t);
  },

  /**
   * 计算两点间距离
   */
  distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },
};

/**
 * 日志工具
 */
export interface LogContext {
  event: string;
  data?: unknown;
  traceId?: string;
  userId?: string;
  flowId?: string;
  nodeId?: string;
  runId?: string;
}

export interface Logger {
  info(context: LogContext): void;
  warn(context: LogContext): void;
  error(context: LogContext): void;
}

/**
 * 创建控制台日志器
 */
export function createConsoleLogger(): Logger {
  return {
    info(context: LogContext): void {
      console.info('[INFO]', context);
    },
    warn(context: LogContext): void {
      console.warn('[WARN]', context);
    },
    error(context: LogContext): void {
      console.error('[ERROR]', context);
    },
  };
}

/**
 * 创建结构化日志器（生产环境使用）
 */
export function createStructuredLogger(): Logger {
  return {
    info(context: LogContext): void {
      console.log(
        JSON.stringify({ level: 'info', timestamp: Date.now(), ...context })
      );
    },
    warn(context: LogContext): void {
      console.log(
        JSON.stringify({ level: 'warn', timestamp: Date.now(), ...context })
      );
    },
    error(context: LogContext): void {
      console.log(
        JSON.stringify({ level: 'error', timestamp: Date.now(), ...context })
      );
    },
  };
}

// 默认日志器
export const logger = createConsoleLogger();
