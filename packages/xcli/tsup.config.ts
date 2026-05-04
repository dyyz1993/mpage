import { createConfig } from '../tsup.config.base';

export default createConfig([
  {
    entry: ['bin/xcli.ts'],
    format: ['esm'],
    dts: false,
    clean: true,
    sourcemap: true,
    outDir: 'dist/bin',
    external: ['playwright', 'playwright-core'],
  },
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    sourcemap: true,
  },
]);
