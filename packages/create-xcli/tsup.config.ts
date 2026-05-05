import { createConfig } from '../tsup.config.base';

export default createConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
  },
  {
    entry: ['bin/create-xcli.ts'],
    format: ['esm'],
    dts: false,
    clean: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
