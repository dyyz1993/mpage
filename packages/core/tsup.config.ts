import { createConfig } from '../tsup.config.base';

export default createConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { resolve: false },
  clean: true,
  sourcemap: true,
  external: ['jiti', 'zod'],
});
