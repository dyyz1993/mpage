import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: [
      'tests/e2e/**',
      'tests/server/recorder-integration.test.ts',
      'tests/server/recorder-navigation.test.ts',
      'node_modules/**',
      'dist/**',
    ],
  },
});
