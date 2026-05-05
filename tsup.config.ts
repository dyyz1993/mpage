import { createConfig } from './packages/tsup.config.base';

export default createConfig([
  {
    entry: ['src/index.ts'],
    outDir: 'dist/src',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    clean: true,
    minify: false,
    sourcemap: true,
    dts: true,
    external: ['playwright-core'],
  },
]);
