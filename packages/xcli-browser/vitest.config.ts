import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['__tests__/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov', 'html'],
      exclude: ['node_modules/', 'dist/', '__tests__/', '*.config.ts'],
    },
  },
});
