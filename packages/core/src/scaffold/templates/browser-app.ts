import type { ScaffoldTemplate } from '../scaffold-engine.js';
import {
  getEngineeringFiles,
  getPreCommitHook,
  mergeEngineeringDeps,
} from './shared-engineering.js';

export const BROWSER_APP_TEMPLATE: ScaffoldTemplate = {
  name: 'browser',
  description: 'A browser automation CLI with Playwright, CDP support, and full type inference',
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
      content: mergeEngineeringDeps(`{
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
    "@dyyz1993/xcli-core": "^0.14.0",
    "zod": "^3.25.0",
    "playwright": "^1.59.0",
    "playwright-core": "^1.58.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}`),
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
  "include": ["src/**/*", "bin/**/*", "types/**/*"],
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
      // ─── KEY: Type augmentation for CommandContext ───
      // This file extends CommandContext with browser-specific fields.
      // All plugins automatically get type-safe access to ctx.page, ctx.browser.
      // No `as` casts needed — TypeScript declaration merging handles it.
      path: 'types/browser-context.d.ts',
      content: `import type { Page, Browser, BrowserContext } from 'playwright';

declare module '@dyyz1993/xcli-core' {
  interface CommandContext {
    /** Playwright Page (available for scope: page/element commands) */
    page: Page;
    /** Playwright Browser instance */
    browser: Browser;
    /** Playwright BrowserContext */
    context: BrowserContext;
  }
}
`,
    },
    {
      path: 'src/index.ts',
      content: `import { Core } from '@dyyz1993/xcli-core';
import { loadBrowserCommands } from './commands/index.js';

export function createApp() {
  const app = new Core({
    name: '{{projectName}}',
    version: '0.1.0',
    description: '{{description}}',
    configDirName: '.{{projectName}}',
    envPrefix: '{{ProjectName}}',
    pluginDirs: ['.{{projectName}}/plugins'],
  });

  // Inject browser fields into ctx via ContextExtender.
  // Combined with types/browser-context.d.ts, plugins get type-safe ctx.page.
  app.extendContext(async () => {
    const { ensureBrowser } = await import('./commands/browser.js');
    const page = await ensureBrowser();
    return { page, browser: page.context().browser()!, context: page.context() };
  });

  loadBrowserCommands(app);

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
      content: `import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

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
`,
    },
    {
      path: 'src/commands/index.ts',
      content: `import type { Core } from '@dyyz1993/xcli-core';
import { z } from 'zod/v4';

export function loadBrowserCommands(app: Core): void {
  const api = app.loader.getAPI();
  const site = api.createSite({
    name: 'browser',
    url: '',
  });

  // ─── Example command with full type inference ───
  //
  // params: inferred from z.object({ url: z.string() }) → { url: string }
  // result: inferred from z.object({ title: z.string() }) → { title: string }
  // ctx:    CommandContext + { page, browser, context } via declaration merging
  //         ctx.page is type-safe, no ` as ` needed!
  site.command('open', {
    description: 'Navigate to a URL and return the page title',
    scope: 'page',
    parameters: z.object({
      url: z.string().describe('URL to navigate to'),
    }),
    result: z.object({
      title: z.string(),
      url: z.string(),
    }),
    handler: async (params, ctx) => {
      // ctx.page ← Page (type-safe, declared in types/browser-context.d.ts)
      await ctx.page.goto(params.url);

      const title = await ctx.page.title();
      const url = ctx.page.url();

      ctx.tips.info(\`Navigated to \${url}\`);

      return { title, url };
    },
  });

  site.command('screenshot', {
    description: 'Take a screenshot of the current page',
    scope: 'page',
    parameters: z.object({
      fullPage: z.coerce.boolean().default(false).describe('Capture full page'),
    }),
    result: z.object({
      path: z.string(),
      size: z.number(),
    }),
    handler: async (params, ctx) => {
      const path = \`screenshot-\${Date.now()}.png\`;
      const buf = await ctx.page.screenshot({ fullPage: params.fullPage });

      ctx.tips.info(\`Screenshot saved: \${path} (\${buf.length} bytes)\`);

      return { path, size: buf.length };
    },
  });
}
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
record/
`,
    },
    ...getEngineeringFiles(),
    {
      path: '.husky/pre-commit',
      content: getPreCommitHook(),
      mode: 0o755,
    },
    {
      path: 'README.md',
      content: `# {{projectName}}

{{description}}

## Type Safety

This project demonstrates **end-to-end TypeScript type inference**:

| Layer | How | Example |
|-------|-----|---------|
| **params** | Zod schema → \`z.infer<P>\` | \`params.url\` is \`string\` |
| **result** | Zod schema → \`z.infer<R>\` | return value type-checked |
| **ctx.page** | Declaration merging (\`types/browser-context.d.ts\`) | No \`as\` cast needed |
| **ctx.tips** | CommandContext interface | \`ctx.tips.info/warn/error\` |

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
# Navigate to a page
node dist/cli.js browser open --url https://example.com

# Take a screenshot
node dist/cli.js browser screenshot --fullPage true
\`\`\`

## Writing New Commands

All type inference is automatic. Just write Zod schemas:

\`\`\`typescript
site.command('myCommand', {
  parameters: z.object({
    keyword: z.string(),
    limit: z.coerce.number().default(10),
  }),
  result: z.object({
    items: z.array(z.object({ title: z.string() })),
    total: z.number(),
  }),
  handler: async (params, ctx) => {
    // params.keyword ← string
    // params.limit   ← number
    // ctx.page       ← Playwright Page (no cast!)
    // ctx.tips.info  ← TipCollector

    return { items: [...], total: 0 };
  },
});
\`\`\`
`,
    },
  ],
};
