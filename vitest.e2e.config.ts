import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: '端到端测试',
    include: ['**/*.e2e.test.{js,ts}'],
    exclude: ['node_modules/**', 'dist/**'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    timeout: 60000, // E2E测试需要更长时间
    testTimeout: 60000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    coverage: {
      enabled: false, // E2E测试通常不需要覆盖率
    },
    // 串行执行，避免端口冲突
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
