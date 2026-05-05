# @dyyz1993/xcli-core

A powerful, domain-agnostic framework for building plugin-based CLI applications.

[![npm version](https://img.shields.io/npm/v/@dyyz1993/xcli-core.svg)](https://www.npmjs.com/package/@dyyz1993/xcli-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

`@dyyz1993/xcli-core` is a comprehensive CLI framework that provides:

- **Plugin System** — Extensible plugin architecture with jiti-powered TypeScript loading
- **Command Registration** — Zod-powered parameter validation and command registration
- **Scope Management** — Hierarchical scope system for command execution context
- **Session Management** — Built-in session handling with persistence
- **Daemon Mode** — Long-running background processes with worker pools
- **WebSocket Support** — Real-time communication via WebSocket server/client
- **Output Formatting** — Unified output in text, JSON, or YAML formats
- **Scaffolding** — Template-based project and plugin generation
- **Configuration Management** — RC file configuration with environment variable support

## Installation

```bash
npm install @dyyz1993/xcli-core
```

Requires Node.js >= 18.0.0.

## Core Concepts

### 1. Core Framework

The `Core` class is the entry point for your CLI application:

```typescript
import { Core } from '@dyyz1993/xcli-core';

const core = new Core({
  name: 'mycli',
  version: '1.0.0',
  description: 'My CLI tool',
});

core.start();
```

### 2. Plugin System

Create plugins with TypeScript support:

```typescript
import type { XCLIAPI } from '@dyyz1993/xcli-core';
import { z } from 'zod';

export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
    name: 'my-plugin',
    url: 'https://example.com',
  });

  site.command('hello', {
    description: 'Say hello',
    parameters: z.object({
      name: z.string().default('World'),
    }),
    handler: async (params, ctx) => {
      return {
        ok: true,
        message: `Hello, ${params.name}!`,
      };
    },
  });
}
```

### 3. Scope Management

Define hierarchical scopes for command execution:

```typescript
import { ScopeRegistry } from '@dyyz1993/xcli-core';

const scopeRegistry = new ScopeRegistry([
  { name: 'project', order: 0 },
  { name: 'browser', order: 1 },
  { name: 'page', order: 2 },
  { name: 'element', order: 3 },
]);
```

### 4. Session Management

Built-in session handling with persistence:

```typescript
import { createSessionMeta, sessions, clearAllSessions } from '@dyyz1993/xcli-core';

// Create session
const meta = createSessionMeta('default', { url: 'https://example.com' });
sessions.set('default', meta);

// List sessions
const allSessions = listSessions();

// Clear all sessions
clearAllSessions();
```

### 5. Daemon Mode

Run background processes with worker management:

```typescript
import { startDaemon, isDaemonRunning, getDaemonStatus } from '@dyyz1993/xcli-core';

// Start daemon
await startDaemon({
  port: 9222,
  workerCount: 3,
});

// Check status
if (isDaemonRunning()) {
  const status = getDaemonStatus();
  console.log('Daemon is running:', status);
}

// Stop daemon
await stopDaemon();
```

### 6. WebSocket Support

Real-time communication for interactive features:

```typescript
import { WSServer } from '@dyyz1993/xcli-core';

const server = new WSServer({
  port: 9223,
  onMessage: (ws, message) => {
    console.log('Received:', message);
  },
});

await server.start();
```

### 7. Output Formatting

Unified output in multiple formats:

```typescript
import { outputFormatter } from '@dyyz1993/xcli-core';

// Format as text
const text = outputFormatter.format({ ok: true, data: 'hello' }, 'text');

// Format as JSON
const json = outputFormatter.format({ ok: true, data: 'hello' }, 'json');

// Format as YAML
const yaml = outputFormatter.format({ ok: true, data: 'hello' }, 'yaml');
```

### 8. Scaffolding

Generate projects and plugins from templates:

```typescript
import { ScaffoldEngine } from '@dyyz1993/xcli-core';

const engine = new ScaffoldEngine();

await engine.generate({
  template: MINIMAL_PLUGIN_TEMPLATE,
  targetDir: './my-plugin',
  variables: {
    projectName: 'my-plugin',
  },
});
```

## Documentation

- **[Architecture](./docs/architecture.md)** — Framework architecture overview
- **[Session Management](./docs/session-management.md)** — Session system guide
- **[Daemon Management](./docs/daemon-management.md)** — Daemon system guide
- **[Plugin System](./docs/plugin-system.md)** — Plugin development guide
- **[WebSocket Integration](./docs/websocket.md)** — WebSocket server/client guide

## API Reference

See the [API Reference](#api-reference) section below for detailed API documentation.

## Use Cases

### CLI Tools

Build command-line tools with rich features:

```typescript
import { Core } from '@dyyz1993/xcli-core';

const core = new Core({
  name: 'mycli',
  version: '1.0.0',
});

core.command('build', {
  description: 'Build the project',
  scope: 'project',
  handler: async () => {
    // Build logic
  },
});

core.start();
```

### Web Scrapers

Create extensible web scrapers:

```typescript
export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
    name: 'scraper',
    url: 'https://example.com',
  });

  site.command('scrape', {
    description: 'Scrape data',
    handler: async (params, ctx) => {
      // Scraping logic
    },
  });
}
```

### Developer Tools

Build developer utilities:

```typescript
import { Core, startDaemon } from '@dyyz1993/xcli-core';

const core = new Core({
  name: 'devtool',
  version: '1.0.0',
});

// Start background daemon
core.addBuiltin('daemon', {
  description: 'Manage daemon',
  handler: async (args) => {
    if (args.command === 'start') {
      await startDaemon();
    }
  },
});

core.start();
```

## Related Projects

- **@dyyz1993/xpage** — Browser automation engine
- **@dyyz1993/xbrowser** — Browser automation CLI (built on xcli-core)
- **create-xcli** — Project scaffolding tool

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

## License

MIT

## Support

- Issues: [GitHub Issues](https://github.com/dyyz1993/mpage/issues)
- Documentation: [Full Docs](./docs/)

---

## API Reference

### Core Classes

#### Core

Main framework class.

```typescript
class Core {
  constructor(config: CoreConfig);
  start(): void;
  command(name: string, definition: CommandDefinition): void;
  builtin(name: string, handler: BuiltinHandler): void;
  // ...
}
```

#### PluginLoader

Load and manage plugins.

```typescript
class PluginLoader {
  loadPlugin(pluginPath: string): PluginInstance;
  scanAndLoad(dirs: string[]): PluginInstance[];
  reloadPlugin(pluginId: string): void;
  // ...
}
```

#### SessionManager

Manage sessions.

```typescript
class SessionManager {
  createSession(id: string, meta: SessionMeta): void;
  getSession(id: string): SessionMeta | undefined;
  removeSession(id: string): void;
  listSessions(): SessionMeta[];
  // ...
}
```

### Daemon Classes

#### DaemonManager

Manage daemon processes.

```typescript
class DaemonManager {
  start(config: DaemonConfig): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getStatus(): DaemonStatus;
  // ...
}
```

#### WorkerManager

Manage worker processes.

```typescript
class WorkerManager {
  start(config: WorkerManagerConfig): Promise<void>;
  stop(): Promise<void>;
  execute(command: string, args: CommandArgs): Promise<CommandResult>;
  // ...
}
```

#### WSServer

WebSocket server.

```typescript
class WSServer {
  constructor(config: WSServerConfig);
  start(): Promise<void>;
  stop(): Promise<void>;
  broadcast(message: WSMessage): void;
  // ...
}
```

#### WSClient

WebSocket client.

```typescript
class WSClient {
  constructor(config: WSClientConfig);
  connect(): Promise<void>;
  send(message: WSMessage): void;
  on(event: 'message' | 'open' | 'close' | 'error', callback: Callback): void;
  // ...
}
```

### Output Classes

#### OutputFormatter

Format command results.

```typescript
class OutputFormatter {
  format(result: CommandResult, mode: OutputMode): string;
  formatJSON(result: CommandResult): string;
  formatYAML(result: CommandResult): string;
  formatText(result: CommandResult): string;
  // ...
}
```

#### HelpGenerator

Generate help text.

```typescript
class HelpGenerator {
  generate(options: HelpOptions): string;
  generateCommandHelp(command: CommandEntry): string;
  generatePluginHelp(plugin: PluginInstance): string;
  // ...
}
```

### Scaffolding Classes

#### ScaffoldEngine

Generate from templates.

```typescript
class ScaffoldEngine {
  generate(options: ScaffoldOptions): Promise<ScaffoldResult>;
  loadTemplate(name: string): ScaffoldTemplate;
  registerTemplate(name: string, template: ScaffoldTemplate): void;
  // ...
}
```

### Utility Functions

#### Configuration

```typescript
loadConfig(): RcConfig;
saveConfig(config: RcConfig): void;
getConfigValue(key: string): unknown;
setConfigValue(key: string, value: void): void;
getEffectiveValue(key: string): unknown;
```

#### Argument Parsing

```typescript
parseArgs(args: string[]): ParsedArgs;
mergeArgsWithDefaults(args: ParsedArgs, defaults: Record<string, unknown>): ParsedArgs;
resolveShortOptions(args: string[]): string[];
```

#### Validation

```typescript
validateArgs(schema: ZodType, args: Record<string, unknown>): ValidationResult;
buildInputSchema(params: ZodType): Record<string, unknown>;
```

### Types

#### Core Config

```typescript
interface CoreConfig {
  name: string;
  version: string;
  description?: string;
  defaultScope?: string;
}
```

#### Command Entry

```typescript
interface CommandEntry {
  name: string;
  description: string;
  scope: CommandScope;
  parameters?: ZodType;
  handler: CommandHandler;
  examples?: Example[];
}
```

#### Command Context

```typescript
interface CommandContext {
  sessionId?: string;
  storage: StorageContext;
  output: OutputContext;
  metadata?: Record<string, unknown>;
}
```

#### Plugin Instance

```typescript
interface PluginInstance {
  id: string;
  name: string;
  commands: CommandEntry[];
  setup: (api: XCLIAPI) => void;
}
```

For complete type definitions, see the TypeScript definitions in the package.
