import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/shared': resolve(__dirname, 'src/shared'),
      '@/ideas': resolve(__dirname, 'src/ideas'),
      '@/planner': resolve(__dirname, 'src/planner'),
      '@/flow': resolve(__dirname, 'src/flow'),
      '@/nodes': resolve(__dirname, 'src/nodes'),
      '@/run-center': resolve(__dirname, 'src/run-center'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@core': resolve(__dirname, 'packages/@core/src'),
      '@data': resolve(__dirname, 'packages/@data/src'),
      '@app/services': resolve(__dirname, 'packages/@app/services/src'),
    },
  },
});
