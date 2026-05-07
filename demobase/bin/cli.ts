#!/usr/bin/env node
import { Core } from '@dyyz1993/xcli-core';

const app = new Core({
  name: 'demobase',
  version: '0.1.0',
  description: 'A CLI tool built with @dyyz1993/xcli-core',
  configDirName: '.demobase',
  envPrefix: 'demobase',
  pluginDirs: [],
});

// Register your plugins here
// app.loadPlugins();

await app.run(process.argv.slice(2));
