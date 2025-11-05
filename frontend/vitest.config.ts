import { defineConfig } from 'vitest/config';
import next from '@next/eslint-plugin-next';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    alias: {
      '@/components': './_components',
      '@/lib': './_lib',
      '@/hooks': './_hooks',
      '@/styles': './_styles',
      '@/types': './_types',
    },
  },
});