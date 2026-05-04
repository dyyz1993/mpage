import { createConfig } from '../tsup.config.base';

export default createConfig([
  {
    entry: ['bin/ghcli.ts'],
    format: ['esm'],
    dts: false,
    clean: true,
    sourcemap: true,
    outDir: 'dist/bin',
  },
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    sourcemap: true,
  },
]);
