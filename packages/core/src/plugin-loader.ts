import type {
  XCLIAPI,
  Command,
  CommandHandler,
  CommandScope,
  SiteConfig,
  SiteInstance,
  StorageContext,
  FlagConfig,
  ToolConfig,
  EventContext,
  CommandEntry,
  ScanOptions,
  ScanResult,
  PluginMeta,
} from './protocol/plugin-protocol.js';
import { SiteInstanceImpl, DEFAULT_SCOPE } from './protocol/plugin-protocol.js';
import { resolve, isAbsolute, extname, basename, dirname, join } from 'path';
import { createJiti } from 'jiti';
import { fileURLToPath } from 'url';
import { readdirSync, readFileSync, statSync } from 'fs';
import { CompositeStorage } from './plugin-storage.js';
import { PluginInstance } from './plugin-instance.js';
import type { PluginStatus } from './plugin-instance.js';
export type { PluginStatus, PluginLoaderHost } from './plugin-instance.js';

interface CoreHost {
  readonly config: {
    readonly name: string;
    readonly pluginPackageName?: string;
  };
  readonly storageDir: string;
  readonly configDir: string;
}

export interface BuiltinCommandEntry {
  name: string;
  scope: CommandScope;
  handler: (args: string[], values: Record<string, unknown>) => Promise<void>;
}

export class PluginLoader {
  private commands: Map<string, Command & { handler: CommandHandler }> = new Map();
  private builtinScopeMap: Map<string, CommandScope> = new Map();
  private sites: Map<string, SiteInstance> = new Map();
  private flags: Map<string, FlagConfig> = new Map();
  private tools: Map<string, ToolConfig> = new Map();
  private globalEventHandlers: Map<string, Array<(event: EventContext) => void>> = new Map();
  private plugins: Map<string, PluginInstance> = new Map();
  private storage: StorageContext;

  private readonly core: CoreHost;
  private api: XCLIAPI = this.createAPI();

  constructor(core: CoreHost) {
    this.core = core;
    this.storage = this.createStorage();
  }

  private createStorage(): StorageContext {
    const store: Record<string, unknown> = {};
    const noop = {
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
    return {
      // eslint-disable-next-line require-await
      async get<T>(key: string): Promise<T | null> {
        return (store[key] as T) ?? null;
      },
      // eslint-disable-next-line require-await
      async set<T>(key: string, value: T): Promise<void> {
        store[key] = value;
      },
      // eslint-disable-next-line require-await
      async delete(key: string): Promise<void> {
        delete store[key];
      },
      // eslint-disable-next-line require-await
      async clear(): Promise<void> {
        for (const key of Object.keys(store)) {
          delete store[key];
        }
      },
      // eslint-disable-next-line require-await
      async keys(): Promise<string[]> {
        return Object.keys(store);
      },
      plugin: noop,
      global: {
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
      },
      cache: noopCache,
      tmp: noopTmp,
    };
  }

  private createPluginStorage(pluginId: string): StorageContext {
    return new CompositeStorage(pluginId, this.core.configDir, this.core.config.name);
  }

  private createAPI(): XCLIAPI {
    const self = this; // eslint-disable-line @typescript-eslint/no-this-alias

    return {
      createSite(config: SiteConfig): SiteInstance {
        const existing = self.sites.get(config.name);
        if (existing) {
          return existing;
        }
        const pluginStorage = self.createPluginStorage(config.name);
        const site = new SiteInstanceImpl(config, pluginStorage);
        self.sites.set(config.name, site);

        const active = self.getActiveInstance();
        if (active) {
          active.addSiteName(config.name);
        }

        return site;
      },

      registerCommand(cmd: Command & { handler: CommandHandler }) {
        const key = cmd.name;
        const existing = self.commands.get(key);
        if (existing) {
          const active = self.getActiveInstance();
          if (active) {
            active.addOverriddenCommand(key, existing);
          }
        }
        self.commands.set(key, cmd);

        const active = self.getActiveInstance();
        if (active) {
          active.addCommand(key);
        }

        return this;
      },

      registerFlag(flag: FlagConfig) {
        self.flags.set(flag.name, flag);

        const active = self.getActiveInstance();
        if (active) {
          active.addFlag(flag.name);
        }

        return this;
      },

      registerTool(tool: ToolConfig) {
        self.tools.set(tool.name, tool);

        const active = self.getActiveInstance();
        if (active) {
          active.addTool(tool.name);
        }

        return this;
      },

      overrideTool(name: string, tool: ToolConfig) {
        self.tools.set(name, tool);

        const active = self.getActiveInstance();
        if (active) {
          active.addTool(name);
        }

        return this;
      },

      onLoad(handler: () => void | Promise<void>) {
        const active = self.getActiveInstance();
        if (active) {
          active.addLoadHandler(handler);
        }

        return this;
      },

      onUnload(handler: () => void | Promise<void>) {
        const active = self.getActiveInstance();
        if (active) {
          active.addUnloadHandler(handler);
        }

        return this;
      },

      onEvent(event: string, handler: (event: EventContext) => void) {
        if (!self.globalEventHandlers.has(event)) {
          self.globalEventHandlers.set(event, []);
        }
        self.globalEventHandlers.get(event)?.push(handler);

        const active = self.getActiveInstance();
        if (active) {
          active.addEventHandler(event, handler);
        }

        return this;
      },
    };
  }

  private activeInstanceId: string | null = null;

  private getActiveInstance(): PluginInstance | null {
    if (!this.activeInstanceId) return null;
    return this.plugins.get(this.activeInstanceId) ?? null;
  }

  getAPI(): XCLIAPI {
    return this.api;
  }

  async loadPlugin(pluginPath: string, explicitId?: string): Promise<PluginInstance> {
    let importPath = pluginPath;
    if (!isAbsolute(pluginPath)) {
      const cwd = process.cwd();
      importPath = resolve(cwd, pluginPath);
    }

    const id = explicitId ?? derivePluginId(importPath);

    const existing = this.plugins.get(id);
    if (existing) {
      if (existing.loaded) {
        await existing.unmount();
      }
      this.plugins.delete(id);
    }

    const instance = new PluginInstance(id, importPath, this);
    this.plugins.set(id, instance);
    this.activeInstanceId = id;

    try {
      let plugin: Record<string, unknown> | undefined;

      const packageName = this.core.config.pluginPackageName ?? this.core.config.name;
      const coreEntryPath = resolve(dirname(fileURLToPath(import.meta.url)), '../index.ts');
      const jiti = createJiti(import.meta.url, {
        interopDefault: true,
        alias: { [packageName]: coreEntryPath },
      });
      if (extname(importPath) === '.ts') {
        plugin = await jiti.import(importPath);
      } else {
        plugin = await import(`file://${importPath}`);
      }

      const setup = plugin?.default ?? plugin;

      if (typeof setup === 'function') {
        setup(this.api);
      }

      await instance.mount();
    } catch (err) {
      instance.setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      this.activeInstanceId = null;
    }

    return instance;
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin "${pluginId}" not found`);
    }
    await instance.unmount();
    this.plugins.delete(pluginId);
  }

  // eslint-disable-next-line require-await
  async reloadPlugin(pluginId: string): Promise<PluginInstance> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin "${pluginId}" not found`);
    }
    return instance.reload();
  }

  async unloadAll(): Promise<void> {
    for (const instance of this.plugins.values()) {
      await instance.unmount();
    }
    this.plugins.clear();
  }

  getLoadedPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  getPluginStatus(pluginId: string): PluginStatus {
    const instance = this.plugins.get(pluginId);
    if (!instance) return 'unloaded';
    return instance.status;
  }

  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  cleanupPluginRegistrations(instance: PluginInstance): void {
    for (const cmd of instance.getRegisteredCommands()) {
      const overridden = instance.getOverriddenCommands().get(cmd);
      if (overridden) {
        this.commands.set(cmd, overridden);
      } else {
        this.commands.delete(cmd);
      }
    }

    for (const siteName of instance.getRegisteredSiteNames()) {
      this.sites.delete(siteName);
    }

    for (const flag of instance.getRegisteredFlags()) {
      this.flags.delete(flag);
    }

    for (const tool of instance.getRegisteredTools()) {
      this.tools.delete(tool);
    }

    for (const [event, handlers] of instance.getEventHandlers()) {
      const globalHandlers = this.globalEventHandlers.get(event);
      if (globalHandlers) {
        for (const handler of handlers) {
          const idx = globalHandlers.indexOf(handler as (event: EventContext) => void);
          if (idx !== -1) {
            globalHandlers.splice(idx, 1);
          }
        }
        if (globalHandlers.length === 0) {
          this.globalEventHandlers.delete(event);
        }
      }
    }
  }

  // eslint-disable-next-line require-await
  async loadFromFunction(setup: (xcli: XCLIAPI) => void): Promise<void> {
    setup(this.api);
  }

  getCommand(name: string): (Command & { handler: CommandHandler }) | undefined {
    return this.commands.get(name);
  }

  registerBuiltinScope(name: string, scope: CommandScope): void {
    this.builtinScopeMap.set(name, scope);
  }

  getBuiltinScope(name: string): CommandScope {
    return this.builtinScopeMap.get(name) ?? DEFAULT_SCOPE;
  }

  findCommand(
    name: string,
    scope?: CommandScope
  ): { entry: CommandEntry; site: SiteInstance } | null {
    for (const site of this.sites.values()) {
      const cmd = site.getCommand(name);
      if (cmd && (!scope || cmd.scope === scope)) {
        return { entry: cmd, site };
      }
    }
    return null;
  }

  resolveCommand(name: string, siteName?: string): CommandEntry | null {
    if (siteName) {
      const site = this.sites.get(siteName);
      if (site) {
        return site.getCommand(name);
      }
    }

    for (const site of Array.from(this.sites.values()).reverse()) {
      const cmd = site.getCommand(name);
      if (cmd) return cmd;
    }

    return null;
  }

  resolveNestedCommand(
    argv: string[]
  ): { entry: CommandEntry; site: SiteInstance; consumedArgs: number } | null {
    let bestMatch: { entry: CommandEntry; site: SiteInstance; consumedArgs: number } | null = null;

    for (let len = 1; len <= Math.min(argv.length, 10); len++) {
      const candidate = argv.slice(0, len).join('.');
      for (const site of Array.from(this.sites.values()).reverse()) {
        const cmd = site.getCommand(candidate);
        if (cmd) {
          bestMatch = { entry: cmd, site, consumedArgs: len };
        }
      }
    }

    return bestMatch;
  }

  getSubCommands(prefix: string): CommandEntry[] {
    const results: CommandEntry[] = [];
    const dotPrefix = prefix + '.';

    for (const site of this.sites.values()) {
      for (const summary of site.getAllCommands()) {
        if (summary.name.startsWith(dotPrefix) || summary.name === prefix) {
          const entry = site.getCommand(summary.name);
          if (entry) {
            results.push(entry);
          }
        }
      }
    }

    return results;
  }

  getSiteCommand(
    siteName: string,
    cmdName: string
  ): (Command & { handler: CommandHandler }) | undefined {
    return this.commands.get(`${siteName}:${cmdName}`);
  }

  getAllCommands(): Array<Command & { handler: CommandHandler }> {
    const all = new Map<string, Command & { handler: CommandHandler }>();
    for (const cmd of this.commands.values()) {
      all.set(cmd.name, cmd);
    }
    for (const site of this.sites.values()) {
      for (const summary of site.getAllCommands()) {
        if (!all.has(summary.name)) {
          const entry = site.getCommand(summary.name);
          if (entry) {
            all.set(summary.name, {
              name: entry.name,
              description: entry.description,
              requiresLogin: entry.requiresLogin ?? false,
              tips: entry.tips,
              handler: entry.handler,
            });
          }
        }
      }
    }
    return Array.from(all.values());
  }

  getSite(name: string): SiteInstance | undefined {
    return this.sites.get(name);
  }

  getSites(): Array<SiteInstance> {
    return Array.from(this.sites.values());
  }

  getFlag(name: string): FlagConfig | undefined {
    return this.flags.get(name);
  }

  getAllFlags(): FlagConfig[] {
    return Array.from(this.flags.values());
  }

  getTool(name: string): ToolConfig | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ToolConfig[] {
    return Array.from(this.tools.values());
  }

  async emitEvent(event: string, context: EventContext): Promise<void> {
    const handlers = this.globalEventHandlers.get(event) || [];
    for (const handler of handlers) {
      await handler(context);
    }
  }

  async scanAndLoad(dirs: string[], options?: ScanOptions): Promise<ScanResult> {
    const priority = options?.priority ?? 'first-wins';
    const ignoreDotFiles = options?.ignoreDotFiles ?? true;
    const result: ScanResult = { loaded: [], failed: [], skipped: [] };
    const seenNames = new Set<string>();

    for (const dir of dirs) {
      let entries: string[];
      try {
        entries = readdirSync(dir);
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (ignoreDotFiles && entry.startsWith('.')) {
          continue;
        }

        const fullPath = join(dir, entry);
        let pluginPath: string | null = null;

        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            const indexPath = resolve(fullPath, 'index.ts');
            const indexJsPath = resolve(fullPath, 'index.js');
            try {
              statSync(indexPath);
              pluginPath = indexPath;
            } catch {
              try {
                statSync(indexJsPath);
                pluginPath = indexJsPath;
              } catch {
                continue;
              }
            }
          } else if (stat.isFile() && (extname(entry) === '.ts' || extname(entry) === '.js')) {
            pluginPath = fullPath;
          } else {
            continue;
          }
        } catch {
          continue;
        }

        if (!pluginPath) continue;

        const pluginDir = dirname(pluginPath);
        const meta = readPluginMeta(pluginDir);

        if (options?.validate && meta && !options.validate(meta)) {
          result.skipped.push(pluginPath);
          continue;
        }

        const pluginName = meta?.name ?? derivePluginId(pluginPath);

        if (priority === 'first-wins' && seenNames.has(pluginName)) {
          result.skipped.push(pluginPath);
          continue;
        }

        seenNames.add(pluginName);

        try {
          await this.loadPlugin(pluginPath);
          result.loaded.push(pluginPath);
        } catch (err) {
          result.failed.push({
            path: pluginPath,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    return result;
  }

  async unload(): Promise<void> {
    await this.unloadAll();
  }
}

export function readPluginMeta(
  pluginDir: string,
  options: { metadataField?: string } = {}
): PluginMeta | null {
  const metadataField = options.metadataField ?? 'xcli';
  const pkgPath = resolve(pluginDir, 'package.json');
  let raw: string;
  try {
    raw = readFileSync(pkgPath, 'utf-8');
  } catch {
    return null;
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }

  const meta = pkg[metadataField] as Record<string, unknown> | undefined;
  const name = (meta?.name as string) ?? (pkg.name as string);
  if (!name) return null;

  const result: PluginMeta = { name };

  if (typeof pkg.version === 'string') result.version = pkg.version;
  if (typeof pkg.description === 'string') result.description = pkg.description;
  if (Array.isArray(meta?.commands)) result.commands = meta.commands as string[];
  if (pkg.dependencies && typeof pkg.dependencies === 'object') {
    result.dependencies = pkg.dependencies as Record<string, string>;
  }

  return result;
}

export function derivePluginId(pluginPath: string): string {
  const base = basename(pluginPath, extname(pluginPath));
  if (base === 'index') {
    const parentDir = pluginPath.split('/').slice(-2, -1)[0] || base;
    return parentDir;
  }
  return base;
}
