import type { ScaffoldTemplate } from '../scaffold-engine.js';
import {
  getEngineeringFiles,
  getPreCommitHook,
  mergeEngineeringDeps,
} from './shared-engineering.js';

export const API_CLI_TEMPLATE: ScaffoldTemplate = {
  name: 'api',
  description: 'An API interaction CLI tool (like httpie/postman)',
  variables: [
    {
      name: 'description',
      description: 'Project description',
      default: 'An API CLI tool built with @dyyz1993/xcli-core',
    },
    {
      name: 'baseUrl',
      description: 'Default API base URL',
      default: 'https://api.example.com',
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
    "@dyyz1993/xcli-core": "^0.9.0",
    "zod": "^3.25.0",
    "undici": "^7.0.0"
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
      content: `import { Core } from '@dyyz1993/xcli-core';
import { createAPIWorker } from './worker.js';
import { registerCommands } from './commands/index.js';

export function createApp() {
  const app = new Core({
    name: '{{projectName}}',
    version: '0.1.0',
    description: '{{description}}',
    configDirName: '.{{projectName}}',
    envPrefix: '{{ProjectName}}',
    pluginDirs: [],
  });

  registerCommands(app);

  return app;
}

export { createAPIWorker };
export { version } from './version.js';
`,
    },
    {
      path: 'src/version.ts',
      content: `export const version = '0.1.0';
`,
    },
    {
      path: 'src/types.ts',
      content: `export interface APIConfig {
  baseUrl: string;
  defaultHeaders: Record<string, string>;
  timeout: number;
}

export interface RequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface APIResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
}
`,
    },
    {
      path: 'src/context.ts',
      content: `import type { CommandContext } from '@dyyz1993/xcli-core';
import type { APIConfig } from './types.js';

export interface APICommandContext extends CommandContext {
  apiConfig: APIConfig;
}
`,
    },
    {
      path: 'src/scope.ts',
      content: `export const API_SCOPE_ORDER: Record<string, number> = {
  project: 0,
  endpoint: 1,
  method: 2,
  param: 3,
};
`,
    },
    {
      path: 'src/worker.ts',
      content: `import type { WorkerEntryPoint, WorkerContext } from '@dyyz1993/xcli-core';
import { request } from 'undici';
import type { APIConfig, RequestOptions, APIResponse } from './types.js';

function parseConfig(raw: Record<string, unknown>): APIConfig {
  return {
    baseUrl: (raw.baseUrl as string) || 'https://api.example.com',
    defaultHeaders: (raw.defaultHeaders as Record<string, string>) || {},
    timeout: (raw.timeout as number) || 30000,
  };
}

export class APIWorker implements WorkerEntryPoint {
  private ctx!: WorkerContext;
  private config!: APIConfig;

  async init(ctx: WorkerContext): Promise<void> {
    this.ctx = ctx;
    this.config = parseConfig(ctx.config);
    ctx.ipc.send('api:ready', { baseUrl: this.config.baseUrl });
  }

  async execute(method: string, params: Record<string, unknown>): Promise<unknown> {
    const url = this.resolveUrl(params.url as string);
    const headers = { ...this.config.defaultHeaders, ...(params.headers as Record<string, string> | undefined) };

    switch (method) {
      case 'get':
        return this.doRequest({ method: 'GET', url, headers, timeout: params.timeout as number | undefined });

      case 'post':
        return this.doRequest({ method: 'POST', url, headers, body: params.body, timeout: params.timeout as number | undefined });

      case 'put':
        return this.doRequest({ method: 'PUT', url, headers, body: params.body, timeout: params.timeout as number | undefined });

      case 'delete':
        return this.doRequest({ method: 'DELETE', url, headers, timeout: params.timeout as number | undefined });

      case 'head':
        return this.doRequest({ method: 'HEAD', url, headers, timeout: params.timeout as number | undefined });

      case 'ping': {
        const start = Date.now();
        const res = await request(this.config.baseUrl, { method: 'GET', headers });
        return { status: res.statusCode, duration: Date.now() - start };
      }

      default:
        throw new Error(\`Unknown method: \${method}\`);
    }
  }

  async destroy(): Promise<void> {}

  private resolveUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = this.config.baseUrl.replace(/\\/$/, '');
    const rel = path.startsWith('/') ? path : \`/\${path}\`;
    return \`\${base}\${rel}\`;
  }

  private async doRequest(opts: RequestOptions): Promise<APIResponse> {
    const start = Date.now();

    const res = await request(opts.url, {
      method: opts.method,
      headers: opts.headers || {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      headersTimeout: opts.timeout || this.config.timeout,
      bodyTimeout: opts.timeout || this.config.timeout,
    });

    let body: unknown;
    const contentType = res.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      body = await res.body.json();
    } else {
      body = await res.body.text();
    }

    const responseHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(res.headers)) {
      if (typeof value === 'string') responseHeaders[key] = value;
      else if (Array.isArray(value)) responseHeaders[key] = value.join(', ');
    }

    return {
      status: res.statusCode,
      statusText: '',
      headers: responseHeaders,
      body,
      duration: Date.now() - start,
    };
  }
}

export function createAPIWorker(): WorkerEntryPoint {
  return new APIWorker();
}
`,
    },
    {
      path: 'src/commands/get.ts',
      content: `import { z } from 'zod/v4';
import type { Core } from '@dyyz1993/xcli-core';
import { ok } from '@dyyz1993/xcli-core';
import { request } from 'undici';

const BASE_URL = '{{baseUrl}}';

function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = BASE_URL.replace(/\\/$/, '');
  const rel = path.startsWith('/') ? path : \`/\${path}\`;
  return \`\${base}\${rel}\`;
}

export function registerGetCommand(app: Core): void {
  const site = app.loader.getAPI().createSite({
    name: '{{projectName}}',
    url: '{{baseUrl}}',
  });

  site.command('get', {
    description: 'Send a GET request',
    scope: 'endpoint',
    parameters: z.object({
      url: z.string().describe('Request URL or path'),
      headers: z.record(z.string()).optional().describe('Additional headers'),
    }),
    handler: async (params) => {
      const start = Date.now();
      const url = resolveUrl(params.url);
      const res = await request(url, {
        method: 'GET',
        headers: params.headers || {},
      });
      const body = await res.body.json();
      return ok({ status: res.statusCode, body, duration: Date.now() - start }, [\`\${res.statusCode} \${url}\`]);
    },
  });
}
`,
    },
    {
      path: 'src/commands/post.ts',
      content: `import { z } from 'zod/v4';
import type { Core } from '@dyyz1993/xcli-core';
import { ok } from '@dyyz1993/xcli-core';
import { request } from 'undici';

const BASE_URL = '{{baseUrl}}';

function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = BASE_URL.replace(/\\/$/, '');
  const rel = path.startsWith('/') ? path : \`/\${path}\`;
  return \`\${base}\${rel}\`;
}

export function registerPostCommand(app: Core): void {
  const site = app.loader.getAPI().createSite({
    name: '{{projectName}}',
    url: '{{baseUrl}}',
  });

  site.command('post', {
    description: 'Send a POST request',
    scope: 'endpoint',
    parameters: z.object({
      url: z.string().describe('Request URL or path'),
      body: z.unknown().optional().describe('Request body (JSON)'),
      headers: z.record(z.string()).optional().describe('Additional headers'),
    }),
    handler: async (params) => {
      const start = Date.now();
      const url = resolveUrl(params.url);
      const res = await request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...params.headers },
        body: params.body ? JSON.stringify(params.body) : undefined,
      });
      const body = await res.body.json();
      return ok({ status: res.statusCode, body, duration: Date.now() - start }, [\`\${res.statusCode} \${url}\`]);
    },
  });
}
`,
    },
    {
      path: 'src/commands/put.ts',
      content: `import { z } from 'zod/v4';
import type { Core } from '@dyyz1993/xcli-core';
import { ok } from '@dyyz1993/xcli-core';
import { request } from 'undici';

const BASE_URL = '{{baseUrl}}';

function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = BASE_URL.replace(/\\/$/, '');
  const rel = path.startsWith('/') ? path : \`/\${path}\`;
  return \`\${base}\${rel}\`;
}

export function registerPutCommand(app: Core): void {
  const site = app.loader.getAPI().createSite({
    name: '{{projectName}}',
    url: '{{baseUrl}}',
  });

  site.command('put', {
    description: 'Send a PUT request',
    scope: 'endpoint',
    parameters: z.object({
      url: z.string().describe('Request URL or path'),
      body: z.unknown().optional().describe('Request body (JSON)'),
    }),
    handler: async (params) => {
      const start = Date.now();
      const url = resolveUrl(params.url);
      const res = await request(url, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: params.body ? JSON.stringify(params.body) : undefined,
      });
      const body = await res.body.json();
      return ok({ status: res.statusCode, body, duration: Date.now() - start }, [\`\${res.statusCode} \${url}\`]);
    },
  });
}
`,
    },
    {
      path: 'src/commands/delete.ts',
      content: `import { z } from 'zod/v4';
import type { Core } from '@dyyz1993/xcli-core';
import { ok } from '@dyyz1993/xcli-core';
import { request } from 'undici';

const BASE_URL = '{{baseUrl}}';

function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = BASE_URL.replace(/\\/$/, '');
  const rel = path.startsWith('/') ? path : \`/\${path}\`;
  return \`\${base}\${rel}\`;
}

export function registerDeleteCommand(app: Core): void {
  const site = app.loader.getAPI().createSite({
    name: '{{projectName}}',
    url: '{{baseUrl}}',
  });

  site.command('delete', {
    description: 'Send a DELETE request',
    scope: 'endpoint',
    parameters: z.object({
      url: z.string().describe('Request URL or path'),
    }),
    handler: async (params) => {
      const start = Date.now();
      const url = resolveUrl(params.url);
      const res = await request(url, { method: 'DELETE' });
      const body = await res.body.json();
      return ok({ status: res.statusCode, body, duration: Date.now() - start }, [\`\${res.statusCode} \${url}\`]);
    },
  });
}
`,
    },
    {
      path: 'src/commands/index.ts',
      content: `import type { Core } from '@dyyz1993/xcli-core';
import { registerGetCommand } from './get.js';
import { registerPostCommand } from './post.js';
import { registerPutCommand } from './put.js';
import { registerDeleteCommand } from './delete.js';

export function registerCommands(app: Core): void {
  registerGetCommand(app);
  registerPostCommand(app);
  registerPutCommand(app);
  registerDeleteCommand(app);
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
      path: '.gitignore',
      content: `node_modules/
dist/
*.tgz
.env
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

## Commands

| Command | Scope | Description |
|---------|-------|-------------|
| \`get\` | endpoint | Send a GET request |
| \`post\` | endpoint | Send a POST request |
| \`put\` | endpoint | Send a PUT request |
| \`delete\` | endpoint | Send a DELETE request |

## Configuration

Set the base URL via config or environment variable:

\`\`\`bash
export {{ProjectName}}_BASE_URL=https://api.example.com
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`
`,
    },
  ],
};
