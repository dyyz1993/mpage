import { tmpdir } from 'os';
import { join, resolve, isAbsolute } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';
import { PluginLoader } from '../plugin-loader.js';
import type {
  XCLIAPI,
  CommandContext,
  StorageContext,
  OutputContext,
  SiteInstance,
} from '../protocol/plugin-protocol.js';
import { wrapResult, type CommandResult } from '../command-result.js';
import { TipCollector } from '../tip.js';

export interface DebugHostOptions {
  cliName?: string;
  storageDir?: string;
  pluginDirs?: string[];
}

export interface ExecContext {
  page?: unknown;
  [key: string]: unknown;
}

export type CommandMap = Record<string, { params: Record<string, unknown>; result: unknown }>;

export class TypedPluginHandle<T extends CommandMap> {
  private host: DebugHost;
  private _commandNames: (keyof T & string)[];

  constructor(host: DebugHost, commandNames: (keyof T & string)[]) {
    this.host = host;
    this._commandNames = commandNames;
  }

  get commandNames(): (keyof T & string)[] {
    return this._commandNames;
  }

  exec<K extends keyof T & string>(
    commandName: K,
    params: T[K]['params'] = {} as T[K]['params'],
    context: ExecContext = {}
  ): Promise<CommandResult<T[K]['result']>> {
    return this.host.exec(commandName, params as Record<string, unknown>, context) as Promise<
      CommandResult<T[K]['result']>
    >;
  }
}

export class DebugHost {
  private loader: PluginLoader;
  private cliName: string;
  private pluginDirs: string[];

  constructor(options: DebugHostOptions = {}) {
    this.cliName = options.cliName || 'debug-host';
    this.pluginDirs = options.pluginDirs || this.defaultPluginDirs();
    this.loader = new PluginLoader({
      config: { name: this.cliName },
      storageDir: options.storageDir || join(tmpdir(), 'xcli-debug'),
      configDir: options.storageDir ? join(options.storageDir, '..') : join(tmpdir(), 'xcli-debug'),
    });
  }

  private defaultPluginDirs(): string[] {
    const cwd = process.cwd();
    return [
      join(cwd, '.xcli/plugins'),
      join(cwd, '..', '.xcli/plugins'),
      join(process.env.HOME || '~', '.xcli/plugins'),
    ];
  }

  resolvePluginPath(name: string): string | null {
    if (isAbsolute(name) || name.startsWith('./') || name.includes('/')) {
      return resolve(name);
    }

    for (const dir of this.pluginDirs) {
      const pluginDir = join(dir, name);
      if (!existsSync(pluginDir)) continue;

      const entryTs = join(pluginDir, 'index.ts');
      if (existsSync(entryTs)) return entryTs;

      const entryJs = join(pluginDir, 'index.js');
      if (existsSync(entryJs)) return entryJs;

      if (statSync(pluginDir).isFile()) return pluginDir;
    }

    return null;
  }

  listAvailablePlugins(): string[] {
    const seen = new Set<string>();
    for (const dir of this.pluginDirs) {
      if (!existsSync(dir)) continue;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('_') || entry.name === 'metadata.json') continue;
        if (entry.isDirectory() || entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
          const name = entry.name.replace(/\.(ts|js)$/, '');
          seen.add(name);
        }
      }
    }
    return Array.from(seen);
  }

  async load<T extends CommandMap = CommandMap>(name: string): Promise<TypedPluginHandle<T>> {
    const path = this.resolvePluginPath(name);
    if (!path) {
      const available = this.listAvailablePlugins();
      throw new Error(
        `Plugin "${name}" not found.\nSearched: ${this.pluginDirs.join(', ')}\nAvailable: ${available.join(', ')}`
      );
    }
    await this.loader.loadPlugin(path);
    const names = this.loader.getAllCommands().map((c) => c.name) as (keyof T & string)[];
    return new TypedPluginHandle<T>(this, names);
  }

  async loadFunction(setup: (xcli: XCLIAPI) => void): Promise<void> {
    await this.loader.loadFromFunction(setup);
  }

  async exec<T = unknown>(
    commandName: string,
    params: Record<string, unknown> = {},
    context: ExecContext = {}
  ): Promise<CommandResult<T>> {
    const entry = this.loader.resolveCommand(commandName);
    if (!entry) {
      const names = this.getCommandNames();
      throw new Error(`Command "${commandName}" not found. Available: ${names.join(', ')}`);
    }

    const ctx = this.buildContext(context, entry.name);
    const raw = await entry.handler(params, ctx);
    return wrapResult(raw) as CommandResult<T>;
  }

  getCommandNames(): string[] {
    return this.loader.getAllCommands().map((c) => c.name);
  }

  getSite(name: string): SiteInstance | undefined {
    return this.loader.getSite(name);
  }

  get api(): XCLIAPI {
    return this.loader.getAPI();
  }

  private buildContext(context: ExecContext, commandName: string): CommandContext {
    const memStore: Record<string, unknown> = {};

    const makeNoopStore = () => ({
      // eslint-disable-next-line require-await
      async get<T>(_key: string): Promise<T | null> {
        return null;
      },
      // eslint-disable-next-line require-await
      async set<T>(_key: string, _value: T): Promise<void> {},
      // eslint-disable-next-line require-await
      async delete(_key: string): Promise<void> {},
      // eslint-disable-next-line require-await
      async clear(): Promise<void> {},
      // eslint-disable-next-line require-await
      async keys(): Promise<string[]> {
        return [];
      },
    });

    const noopGlobal = {
      // eslint-disable-next-line require-await
      async get<T>(_key: string): Promise<T | null> {
        return null;
      },
      // eslint-disable-next-line require-await
      async set<T>(_key: string, _value: T): Promise<void> {},
      // eslint-disable-next-line require-await
      async delete(_key: string): Promise<void> {},
      // eslint-disable-next-line require-await
      async keys(): Promise<string[]> {
        return [];
      },
    };

    const noopCache = {
      // eslint-disable-next-line require-await
      async get<T>(_key: string, _maxAge?: number): Promise<T | null> {
        return null;
      },
      // eslint-disable-next-line require-await
      async set<T>(_key: string, _value: T, _maxAge: number): Promise<void> {},
      // eslint-disable-next-line require-await
      async delete(_key: string): Promise<void> {},
      // eslint-disable-next-line require-await
      async clear(): Promise<void> {},
    };

    const noopTmp = {
      path: (f: string) => f,
      // eslint-disable-next-line require-await
      async read(_f: string): Promise<Buffer> {
        return Buffer.alloc(0);
      },
      // eslint-disable-next-line require-await
      async write(_f: string, _d: Buffer | string): Promise<void> {},
      // eslint-disable-next-line require-await
      async clean(): Promise<void> {},
    };

    // eslint-disable-next-line require-await
    const storage: StorageContext = {
      // eslint-disable-next-line require-await
      get: async <T>(key: string): Promise<T | null> => (memStore[key] as T) ?? null,
      // eslint-disable-next-line require-await
      set: async <T>(key: string, value: T): Promise<void> => {
        memStore[key] = value;
      },
      // eslint-disable-next-line require-await
      delete: async (key: string): Promise<void> => {
        delete memStore[key];
      },
      // eslint-disable-next-line require-await
      clear: async (): Promise<void> => {
        for (const k of Object.keys(memStore)) delete memStore[k];
      },
      // eslint-disable-next-line require-await
      keys: async (): Promise<string[]> => Object.keys(memStore),
      plugin: makeNoopStore(),
      global: noopGlobal,
      cache: noopCache,
      tmp: noopTmp,
    };

    const output: OutputContext = {
      mode: 'json',
      showTips: true,
      color: false,
      emoji: false,
    };

    const entry = this.loader.resolveCommand(commandName);
    const site = entry
      ? (this.loader.findCommand(commandName)?.site ?? this.loader.getSites()[0])
      : this.loader.getSites()[0];

    return {
      args: [],
      options: {},
      cwd: process.cwd(),
      storage,
      output,
      error: (msg: string) => {
        throw new Error(msg);
      },
      config: {},
      site: site!,
      cliName: this.cliName,
      tips: new TipCollector(),
      ...context,
    };
  }
}

export function createDebugHost(options?: DebugHostOptions): DebugHost {
  return new DebugHost(options);
}
