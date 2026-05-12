#!/usr/bin/env node
import { Core } from '@dyyz1993/xcli-core';

const app = new Core({
  name: 'test-ci-verify',
  version: '0.1.0',
  description: 'A CLI tool built with @dyyz1993/xcli-core',
  configDirName: '.test-ci-verify',
  envPrefix: 'test-ci-verify',
  pluginDirs: [],
});

// Register your plugins here
// app.loadPlugins();

await app.run(process.argv.slice(2));
