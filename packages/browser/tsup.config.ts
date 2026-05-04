import { createConfig } from '../tsup.config.base';

export default createConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['playwright', 'playwright-core'],
});
