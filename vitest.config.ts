import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: [
      'tests/e2e/**',
      'tests/server/recorder-integration.test.ts',
      'tests/server/recorder-navigation.test.ts',
      'tests/server/websocket.test.ts',
      'node_modules/**',
      'dist/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.d.ts',
        '**/types/**',
      ],
    },
  },
});
