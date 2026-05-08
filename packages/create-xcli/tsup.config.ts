import { resolve } from 'path';
import { createConfig } from '../tsup.config.base';

const coreDist = resolve(__dirname, '../core/dist/index.js');

export default createConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: false,
    clean: true,
    noExternal: ['@dyyz1993/xcli-core'],
    alias: { '@dyyz1993/xcli-core': coreDist },
  },
  {
    entry: ['bin/create-xcli.ts'],
    format: ['esm'],
    dts: false,
    clean: false,
    noExternal: ['@dyyz1993/xcli-core'],
    alias: { '@dyyz1993/xcli-core': coreDist },
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
