import type { ScaffoldTemplate } from '../scaffold-engine.js';

export const BROWSER_APP_TEMPLATE: ScaffoldTemplate = {
  name: 'browser',
  description: 'A browser automation CLI with Playwright and CDP support',
  variables: [
    {
      name: 'description',
      description: 'Project description',
      default: 'A browser automation CLI built with @dyyz1993/xcli-core',
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
    "{{projectName}}": "dist/cli.js"
  },
  "main": "dist/index.js",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "start": "node dist/cli.js"
  },
  "dependencies": {
    "@dyyz1993/xcli-core": "^0.6.0",
    "zod": "^3.24.0",
    "playwright": "^1.59.0",
    "playwright-core": "^1.58.0"
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
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "outDir": "dist"
  },
  "include": ["src/**/*", "bin/**/*"],
  "exclude": ["node_modules", "dist"]
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
    external: ['playwright', 'playwright-core'],
  },
  {
    entry: ['bin/cli.ts'],
    format: ['esm'],
    dts: false,
    clean: false,
    external: ['playwright', 'playwright-core'],
  },
]);`,
    },
    {
      path: 'src/index.ts',
      content: `import { Core } from '@dyyz1993/xcli-core';
import { loadBrowserPlugin } from './commands/browser.js';

export function createApp() {
  const app = new Core({
    name: '{{projectName}}',
    version: '0.1.0',
    description: '{{description}}',
    configDirName: '.{{projectName}}',
    envPrefix: '{{projectName}}',
    pluginDirs: [],
  });

  loadBrowserPlugin(app);

  return app;
}

export { version } from './version.js';
`,
    },
    {
      path: 'src/version.ts',
      content: `export const version = '0.1.0';
`,
    },
    {
      path: 'src/commands/browser.ts',
      content: `import type { Core } from '@dyyz1993/xcli-core';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

interface BrowserState {
  browser: Browser | null;
  context: BrowserContext | null;
  page: Page | null;
}

const state: BrowserState = {
  browser: null,
  context: null,
  page: null,
};

export async function ensureBrowser(): Promise<Page> {
  if (state.page) return state.page;

  state.browser = await chromium.launch({ headless: true });
  state.context = await state.browser.newContext();
  state.page = await state.context.newPage();

  return state.page;
}

export async function closeBrowser(): Promise<void> {
  await state.page?.close();
  await state.context?.close();
  await state.browser?.close();

  state.page = null;
  state.context = null;
  state.browser = null;
}

export function loadBrowserPlugin(_app: Core): void {
  // Register browser commands here
  // Example:
  // const site = app.loader.getAPI().createSite({ name: 'browser', url: '' });
  // site.command('open', { ... });
}
`,
    },
    {
      path: 'src/commands/index.ts',
      content: `export { loadBrowserPlugin, ensureBrowser, closeBrowser } from './browser.js';
`,
    },
    {
      path: 'bin/cli.ts',
      content: `#!/usr/bin/env node
import { createApp } from '../src/index.js';

const app = createApp();

try {
  await app.run(process.argv.slice(2));
} catch (err) {
  console.error(err);
  process.exit(1);
}
`,
      mode: 0o755,
    },
    {
      path: '.{{projectName}}/plugins/.gitkeep',
      content: ``,
    },
    {
      path: '.gitignore',
      content: `node_modules/
dist/
*.tgz
.env
.{{projectName}}/storage/
recordings/
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
node dist/cli.js <command>
\`\`\`

## Browser Automation

This project includes Playwright for browser automation. The browser commands are registered through the plugin system.

### Example

\`\`\`typescript
import { ensureBrowser, closeBrowser } from './commands/browser.js';

const page = await ensureBrowser();
await page.goto('https://example.com');
console.log(await page.title());
await closeBrowser();
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`
`,
    },
  ],
};
