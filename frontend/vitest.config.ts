import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@/components': path.resolve(__dirname, './_components'),
      '@/lib': path.resolve(__dirname, './_lib'),
      '@/hooks': path.resolve(__dirname, './_hooks'),
      '@/styles': path.resolve(__dirname, './_styles'),
      '@/types': path.resolve(__dirname, './_types'),
    },
  },
});