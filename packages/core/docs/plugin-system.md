# Plugin System

Guide to developing plugins for @dyyz1993/xcli-core.

## Overview

The plugin system provides:

- **TypeScript Support** — Full TypeScript with jiti compilation
- **Hot Reload** — Load and reload plugins without restart
- **Command Registration** — Define commands with Zod validation
- **Site Creation** — Create site-specific plugins
- **Event Handlers** — Register login/logout hooks
- **Storage Integration** — Per-plugin key-value storage

## Plugin Structure

### Basic Plugin

```
my-plugin/
├── index.ts          # Plugin entry (required)
├── package.json      # Package config (required)
└── README.md         # Documentation (recommended)
```

### index.ts

```typescript
import type { XCLIAPI } from '@dyyz1993/xcli-core';
import { z } from 'zod';

export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
    name: 'my-plugin',
    url: 'https://example.com',
    description: 'My awesome plugin',
  });

  site.command('hello', {
    description: 'Say hello',
    scope: 'project',
    parameters: z.object({
      name: z.string().default('World'),
    }),
    examples: [
      { cmd: 'xcli hello', description: 'Say hello to World' },
      { cmd: 'xcli hello --name Alice', description: 'Say hello to Alice' },
    ],
    handler: async (params, ctx) => {
      return {
        ok: true,
        message: `Hello, ${params.name}!`,
      };
    },
  });
}
```

### package.json

```json
{
  "name": "xcli-plugin-my-plugin",
  "version": "1.0.0",
  "description": "My awesome xcli plugin",
  "main": "index.ts",
  "keywords": ["xcli", "plugin", "my-plugin"],
  "author": "Your Name",
  "license": "MIT"
}
```

## XCLIAPI

The `XCLIAPI` object provides methods for plugin development.

### createSite

Create a site for plugin commands.

```typescript
const site = xcli.createSite({
  name: string;           // Plugin/site name
  url?: string;           // Target URL (optional)
  description?: string;    // Plugin description
  requiresLogin?: boolean; // Requires login flag
});

// Returns SiteBuilder instance
```

## SiteBuilder

The `SiteBuilder` provides methods for registering commands and handlers.

### command

Register a command.

```typescript
site.command('command-name', {
  description?: string;           // Command description
  scope?: CommandScope;           // Execution scope
  parameters?: ZodType;          // Parameter schema
  result?: ZodType;              // Result schema
  examples?: Example[];           // Usage examples
  handler: CommandHandler;        // Command handler
});
```

### Example: Multiple Commands

```typescript
export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
    name: 'calculator',
    description: 'Simple calculator plugin',
  });

  // Add command
  site.command('add', {
    description: 'Add two numbers',
    scope: 'project',
    parameters: z.object({
      a: z.number(),
      b: z.number(),
    }),
    handler: async (params) => {
      return {
        ok: true,
        result: params.a + params.b,
      };
    },
  });

  // Subtract command
  site.command('subtract', {
    description: 'Subtract two numbers',
    scope: 'project',
    parameters: z.object({
      a: z.number(),
      b: z.number(),
    }),
    handler: async (params) => {
      return {
        ok: true,
        result: params.a - params.b,
      };
    },
  });

  // Multiply command
  site.command('multiply', {
    description: 'Multiply two numbers',
    scope: 'project',
    parameters: z.object({
      a: z.number(),
      b: z.number(),
    }),
    handler: async (params) => {
      return {
        ok: true,
        result: params.a * params.b,
      };
    },
  });
}
```

### login / logout

Register login/logout handlers.

```typescript
site.login(async (ctx) => {
  // Login logic
  console.log('Logging in...');

  // Save authentication state
  await ctx.storage.set('auth', { loggedIn: true, token: 'abc123' });
});

site.logout(async (ctx) => {
  // Logout logic
  console.log('Logging out...');

  // Clear authentication state
  await ctx.storage.delete('auth');
});
```

### Example: Browser Plugin with Login

```typescript
export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
    name: 'github',
    url: 'https://github.com',
    description: 'GitHub automation plugin',
    requiresLogin: true,
  });

  // Login handler
  site.login(async (ctx) => {
    const page = (ctx as any).page;
    if (!page) return;

    await page.goto('https://github.com/login');
    await page.fill('#login_field', 'username');
    await page.fill('#password', 'password');
    await page.click('input[type="submit"]');
    await page.waitForURL('https://github.com/');

    await ctx.storage.set('github_auth', {
      loggedIn: true,
      at: Date.now(),
    });
  });

  // Logout handler
  site.logout(async (ctx) => {
    const page = (ctx as any).page;
    if (!page) return;

    await page.goto('https://github.com/logout');
    await ctx.storage.delete('github_auth');
  });

  // Get profile command
  site.command('get-profile', {
    description: 'Get GitHub profile',
    scope: 'page',
    handler: async (params, ctx) => {
      const page = (ctx as any).page;
      if (!page) {
        return { ok: false, error: 'No page available' };
      }

      const name = await page.$eval('.p-name', (el) => el.textContent);
      const bio = await page.$eval('.p-note', (el) => el.textContent);

      return {
        ok: true,
        data: { name, bio },
      };
    },
  });
}
```

## Command Handler

The command handler receives parameters and context.

### Signature

```typescript
type CommandHandler = (
  params: Record<string, unknown>,
  ctx: CommandContext
) => Promise<CommandResult>
```

### CommandContext

```typescript
interface CommandContext {
  sessionId?: string;              // Current session ID
  storage: StorageContext;         // Key-value storage
  output: OutputContext;           // Output utilities
  metadata?: Record<string, unknown>; // Custom metadata
}
```

### Example: Using Storage

```typescript
site.command('save-data', {
  description: 'Save data to storage',
  scope: 'project',
  parameters: z.object({
    key: z.string(),
    value: z.any(),
  }),
  handler: async (params, ctx) => {
    // Save to storage
    await ctx.storage.set(params.key, params.value);

    return {
      ok: true,
      message: `Saved ${params.key}`,
    };
  },
});

site.command('get-data', {
  description: 'Get data from storage',
  scope: 'project',
  parameters: z.object({
    key: z.string(),
  }),
  handler: async (params, ctx) => {
    // Get from storage
    const value = await ctx.storage.get(params.key);

    if (!value) {
      return {
        ok: false,
        error: `Key ${params.key} not found`,
      };
    }

    return {
      ok: true,
      data: { [params.key]: value },
    };
  },
});
```

### Example: Using Output

```typescript
site.command('search', {
  description: 'Search with progress',
  scope: 'project',
  parameters: z.object({
    query: z.string(),
  }),
  handler: async (params, ctx) => {
    // Output progress
    ctx.output.progress('Searching...', 0);

    // Simulate search
    await new Promise((resolve) => setTimeout(resolve, 1000));
    ctx.output.progress('Searching...', 50);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    ctx.output.progress('Searching...', 100);

    return {
      ok: true,
      results: [
        { title: 'Result 1', url: 'https://example.com/1' },
        { title: 'Result 2', url: 'https://example.com/2' },
      ],
    };
  },
});
```

## Plugin Loading

### Loading Order

The plugin loader scans directories in this order:

1. `./.xcli/plugins/` — Current directory (local)
2. `../.xcli/plugins/` — Parent directory
3. `~/.xcli/plugins/` — User global directory

Same-name plugins: local overrides global, last loaded wins.

### Manual Loading

```typescript
import { PluginLoader } from '@dyyz1993/xcli-core';

const loader = new PluginLoader();

// Load single plugin
const plugin = loader.loadPlugin('./plugins/my-plugin');
console.log('Loaded plugin:', plugin.id);

// Scan and load all
const plugins = loader.scanAndLoad([
  './.xcli/plugins',
  '../.xcli/plugins',
  '~/.xcli/plugins',
]);

console.log('Loaded plugins:', plugins.length);
```

### Hot Reload

```typescript
import { PluginLoader } from '@dyyz1993/xcli-core';

const loader = new PluginLoader();

// Load plugin
loader.loadPlugin('./plugins/my-plugin');

// Later, reload plugin
loader.reloadPlugin('my-plugin');
```

## Advanced Features

### Custom Result Schema

```typescript
import { z } from 'zod';

site.command('calculate', {
  description: 'Calculate something',
  scope: 'project',
  parameters: z.object({
    x: z.number(),
    y: z.number(),
  }),
  result: z.object({
    sum: z.number(),
    product: z.number(),
    difference: z.number(),
  }),
  handler: async (params) => {
    return {
      ok: true,
      sum: params.x + params.y,
      product: params.x * params.y,
      difference: params.x - params.y,
    };
  },
});
```

### Command Aliases

```typescript
// Create multiple commands with same handler
const calcHandler = async (params: any) => {
  const [a, b] = params.args || [];
  return { ok: true, result: a + b };
};

site.command('add', { handler: calcHandler });
site.command('plus', { handler: calcHandler });
site.command('sum', { handler: calcHandler });
```

### Conditional Commands

```typescript
site.command('admin-only', {
  description: 'Admin only command',
  scope: 'project',
  handler: async (params, ctx) => {
    const isAdmin = await ctx.storage.get('isAdmin');

    if (!isAdmin) {
      return {
        ok: false,
        error: 'Permission denied: admin only',
      };
    }

    return { ok: true, data: 'Secret admin data' };
  },
});
```

### Error Handling

```typescript
import { fail } from '@dyyz1993/xcli-core';

site.command('risky-command', {
  description: 'Command that might fail',
  scope: 'project',
  handler: async (params) => {
    try {
      const result = await riskyOperation(params);
      return { ok: true, data: result };
    } catch (error) {
      return fail('Operation failed: ' + error.message);
    }
  },
});
```

### Async Initialization

```typescript
export default async function (xcli: XCLIAPI): Promise<void> {
  // Initialize plugin resources
  const config = await loadConfig();

  const site = xcli.createSite({
    name: 'async-plugin',
    description: 'Plugin with async init',
  });

  site.command('get-config', {
    description: 'Get loaded config',
    handler: () => ({ ok: true, config }),
  });
}
```

## Best Practices

### 1. Use Zod Schemas

```typescript
// Good
parameters: z.object({
  url: z.string().url(),
  timeout: z.number().min(0).optional(),
})

// Bad (no validation)
parameters: z.object({
  url: z.any(),
  timeout: z.any(),
})
```

### 2. Return Proper Results

```typescript
// Good
return {
  ok: true,
  data: { result: 'success' },
}

// Bad
return 'success'
```

### 3. Use Storage for State

```typescript
// Good
await ctx.storage.set('state', { count: 1 });
const state = await ctx.storage.get('state');

// Bad (global variable)
let state = { count: 1 };
```

### 4. Provide Examples

```typescript
site.command('search', {
  description: 'Search the web',
  examples: [
    {
      cmd: 'search --query "playwright"',
      description: 'Search for playwright',
    },
    {
      cmd: 'search --query "typescript" --limit 10',
      description: 'Search with limit',
    },
  ],
  handler: async (params) => { ... },
});
```

### 5. Handle Errors Gracefully

```typescript
import { fail } from '@dyyz1993/xcli-core';

site.command('fetch-data', {
  description: 'Fetch data from API',
  handler: async (params) => {
    try {
      const data = await fetchData(params.url);
      return { ok: true, data };
    } catch (error) {
      return fail(`Failed to fetch: ${error.message}`);
    }
  },
});
```

## Plugin Templates

Use scaffolding to create plugin templates:

```typescript
import {
  ScaffoldEngine,
  MINIMAL_PLUGIN_TEMPLATE,
  BROWSER_APP_TEMPLATE,
} from '@dyyz1993/xcli-core';

const engine = new ScaffoldEngine();

// Generate minimal plugin
await engine.generate({
  template: MINIMAL_PLUGIN_TEMPLATE,
  targetDir: './my-plugin',
  variables: {
    projectName: 'my-plugin',
  },
});

// Generate browser plugin
await engine.generate({
  template: BROWSER_APP_TEMPLATE,
  targetDir: './browser-plugin',
  variables: {
    projectName: 'browser-plugin',
    targetUrl: 'https://example.com',
  },
});
```

## Testing Plugins

### Unit Testing

```typescript
import { describe, it, expect } from 'vitest';
import { Core } from '@dyyz1993/xcli-core';

describe('my-plugin', () => {
  it('should execute hello command', async () => {
    const core = new Core({ name: 'test' });

    core.command('hello', {
      description: 'Say hello',
      handler: async (params) => ({
        ok: true,
        message: `Hello, ${params.name || 'World'}!`,
      }),
    });

    const result = await core.execute('hello', { name: 'Alice' });

    expect(result.ok).toBe(true);
    expect(result.message).toBe('Hello, Alice!');
  });
});
```

## API Reference

### Types

#### XCLIAPI

```typescript
interface XCLIAPI {
  createSite(config: SiteConfig): SiteBuilder;
  registerCommand(name: string, definition: CommandDefinition): void;
  // ...
}
```

#### SiteConfig

```typescript
interface SiteConfig {
  name: string;
  url?: string;
  description?: string;
  requiresLogin?: boolean;
}
```

#### SiteBuilder

```typescript
interface SiteBuilder {
  command(name: string, definition: CommandDefinition): void;
  login(handler: EventHandler): void;
  logout(handler: EventHandler): void;
  // ...
}
```

#### CommandDefinition

```typescript
interface CommandDefinition {
  description?: string;
  scope?: CommandScope;
  parameters?: ZodType;
  result?: ZodType;
  examples?: Example[];
  handler: CommandHandler;
}
```

## See Also

- [Architecture](./architecture.md) — Framework architecture overview
- [Session Management](./session-management.md) — Session system guide
- [Daemon Management](./daemon-management.md) — Background process management
