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
} from './protocol/plugin-protocol.js';
import { SiteInstanceImpl, DEFAULT_SCOPE } from './protocol/plugin-protocol.js';
import { resolve, isAbsolute, extname, basename, dirname } from 'path';
import { createJiti } from 'jiti';
import { fileURLToPath } from 'url';
import { PluginStorage } from './plugin-storage.js';
import { PluginInstance } from './plugin-instance.js';
import type { PluginStatus } from './plugin-instance.js';
export type { PluginStatus, PluginLoaderHost } from './plugin-instance.js';

interface CoreHost {
  readonly config: {
    readonly name: string;
    readonly pluginPackageName?: string;
  };
  readonly storageDir: string;
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
    };
  }

  private createPluginStorage(pluginId: string): StorageContext {
    return new PluginStorage(pluginId, this.core.storageDir);
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

  async unload(): Promise<void> {
    await this.unloadAll();
  }
}

export function derivePluginId(pluginPath: string): string {
  const base = basename(pluginPath, extname(pluginPath));
  if (base === 'index') {
    const parentDir = pluginPath.split('/').slice(-2, -1)[0] || base;
    return parentDir;
  }
  return base;
}
