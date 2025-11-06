import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    alias: {
      '@/components': './_components',
      '@/lib': './_lib',
      '@/hooks': './_hooks',
      '@/styles': './_styles',
      '@/types': './_types',
    },
  },
});