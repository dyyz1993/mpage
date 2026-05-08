import { createConfig } from '../tsup.config.base';

export default createConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: false,
    clean: true,
    noExternal: ['@dyyz1993/xcli-core'],
  },
  {
    entry: ['bin/create-xcli.ts'],
    format: ['esm'],
    dts: false,
    clean: false,
    noExternal: ['@dyyz1993/xcli-core'],
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
