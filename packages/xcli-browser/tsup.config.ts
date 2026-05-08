import { createConfig } from '../tsup.config.base';

export default createConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: false,
    clean: true,
    sourcemap: true,
    external: ['playwright', 'playwright-core', '@dyyz1993/xcli-core', '@dyyz1993/xpage'],
  },
  {
    entry: ['bin/xcli-browser.ts'],
    format: ['esm'],
    dts: false,
    clean: false,
    sourcemap: true,
    external: ['playwright', 'playwright-core', '@dyyz1993/xcli-core', '@dyyz1993/xpage'],
  },
  {
    entry: ['src/daemon/worker-entry.ts'],
    format: ['esm'],
    dts: false,
    clean: false,
    sourcemap: true,
    external: ['playwright', 'playwright-core', '@dyyz1993/xcli-core', '@dyyz1993/xpage'],
  },
]);
