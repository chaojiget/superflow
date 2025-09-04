import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
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
<<<<<<< HEAD
      '@core': resolve(__dirname, 'packages/@core/src'),
      '@data': resolve(__dirname, 'packages/@data/src'),
      '@app/services': resolve(__dirname, 'packages/@app/services/src'),
=======
      '@app/services': resolve(
        __dirname,
        'packages/@app/services/src'
      ),
>>>>>>> origin/codex/structure-services-into-commands-and-queries
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          flow: ['reactflow'],
          db: ['dexie'],
        },
      },
    },
  },
  worker: {
    format: 'es',
    plugins: [react()],
  },
});
