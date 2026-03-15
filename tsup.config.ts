import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['bin/mpage.ts', 'bin/mpage-server.ts'],
    outDir: 'dist/bin',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    clean: true,
    minify: false,
    sourcemap: true,
    dts: false,
    external: ['playwright-core'],
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
    external: ['playwright-core'],
  },
]);
