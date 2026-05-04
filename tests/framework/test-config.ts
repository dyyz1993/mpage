import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '.xcli/', 'tests/', '*.config.ts'],
    },
    reporters: ['verbose', 'json'],
    outputFile: {
      json: 'test-results/vitest-results.json',
    },
  },
});
