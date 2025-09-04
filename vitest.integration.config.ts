import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: '集成测试',
    globals: true,
    include: ['**/*.integration.test.{js,ts}'],
    exclude: ['node_modules/**', 'dist/**'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    timeout: 30000, // 集成测试需要更长时间
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.{js,ts}',
        '**/*.config.{js,ts}',
        'src/test/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, 'packages/@core/src'),
      '@data': resolve(__dirname, 'packages/@data/src'),
      '@app/services': resolve(__dirname, 'packages/@app/services/src'),
      '@ai/orchestrator': resolve(__dirname, 'packages/@ai/orchestrator/src'),
    },
  },
});
