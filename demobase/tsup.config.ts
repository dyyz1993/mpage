import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
  },
  {
    entry: ['bin/cli.ts'],
    format: ['esm'],
    dts: false,
    clean: false,
  },
]);
