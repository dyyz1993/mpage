import type { ScaffoldTemplate } from '../scaffold-engine.js';

export const BASE_CLI_TEMPLATE: ScaffoldTemplate = {
  name: 'base',
  description: 'A basic CLI application using @dyyz1993/xcli-core',
  variables: [
    {
      name: 'description',
      description: 'Project description',
      default: 'A CLI tool built with @dyyz1993/xcli-core',
    },
    {
      name: 'author',
      description: 'Author name',
      default: '',
    },
  ],
  files: [
    {
      path: 'package.json',
      content: `{
  "name": "{{projectName}}",
  "version": "0.1.0",
  "description": "{{description}}",
  "type": "module",
  "bin": {
    "{{projectName}}": "dist/bin/cli.js"
  },
  "main": "dist/index.js",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@dyyz1993/xcli-core": "^1.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}`,
    },
    {
      path: 'tsconfig.json',
      content: `{
  "extends": "./node_modules/@dyyz1993/xcli-core/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*", "bin/**/*"]
}`,
    },
    {
      path: 'tsup.config.ts',
      content: `import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
  },
  {
    entry: ['bin/cli.ts'],
    format: ['esm'],
    dts: false,
    clean: false,
  },
]);`,
    },
    {
      path: 'src/index.ts',
      content: `export { version } from './version.js';
`,
    },
    {
      path: 'src/version.ts',
      content: `export const version = '0.1.0';
`,
    },
    {
      path: 'bin/cli.ts',
      content: `#!/usr/bin/env node
import { Core } from '@dyyz1993/xcli-core';

const app = new Core({
  name: '{{projectName}}',
  version: '0.1.0',
});

// Register your plugins here
// app.loadPlugins();

await app.run(process.argv.slice(2));
`,
      mode: 0o755,
    },
    {
      path: '.gitignore',
      content: `node_modules/
dist/
*.tgz
.env
`,
    },
    {
      path: 'README.md',
      content: `# {{projectName}}

{{description}}

## Install

\`\`\`bash
npm install
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Usage

\`\`\`bash
node dist/bin/cli.js <command>
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`
`,
    },
  ],
};
