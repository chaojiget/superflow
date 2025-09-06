/**
 * Utils 模块统一导出
 */

// 数学工具
export * from './src/math';

// UUID 工具
export * from './src/uuid';

// 日志工具
export * from './src/logger';

// 剪贴板工具
export * from './src/clipboard';

// 预览运行器
export * from './src/preview-runner';

// 安全复制
export * from './src/safeCopy';

// 通用辅助函数
export * from './src/helpers';

// 重新导出常用函数（兼容性）
export {
  generateULID as generateId,
  isValidULID as isValidId,
} from './src/uuid';

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
} from './src/math';

export {
  Logger,
  LogLevel,
  createLogger,
  logger,
  filters as logFilters,
  measurePerformance,
  withLogging,
} from './src/logger';
