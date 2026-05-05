import { createConfig } from '../tsup.config.base';

export default createConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    external: ['playwright', 'playwright-core'],
  },
  {
    entry: ['bin/xcli-browser.ts'],
    format: ['esm'],
    dts: false,
    clean: false,
    sourcemap: true,
    external: ['playwright', 'playwright-core'],
  },
  {
    entry: ['src/daemon/worker-entry.ts'],
    format: ['esm'],
    dts: false,
    clean: false,
    sourcemap: true,
    external: ['playwright', 'playwright-core'],
  },
]);
