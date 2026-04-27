import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['bin/xcli.ts'],
    outDir: 'dist/bin',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    clean: true,
    minify: false,
    sourcemap: true,
    dts: false,
    external: ['playwright', 'playwright-core', 'jiti', 'yaml', 'zod', 'ws', '@dyyz1993/xpage'],
    shims: true,
  },
  {
    entry: ['src/index.ts'],
    outDir: 'dist/src',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    clean: false,
    minify: false,
    sourcemap: true,
    dts: true,
    external: ['playwright', 'playwright-core', 'jiti', 'yaml', 'zod', 'ws', '@dyyz1993/xpage'],
  },
]);
