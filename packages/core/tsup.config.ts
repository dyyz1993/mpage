import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { resolve: false },
  clean: true,
  sourcemap: true,
  external: ['jiti'],
});
