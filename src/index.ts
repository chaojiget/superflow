// Superflow - 让用户能够从想法快速迭代到可运行的代码流程的开放平台

// Export main modules
export * from './flow';
export * from './nodes';
export * from './planner';
export * from './ideas';
export * from './run-center';
export * from './shared';

// Main library interface
export interface SuperflowConfig {
  version: string;
  environment: 'development' | 'production';
}

export const version = '0.1.0';

export default {
  version,
};