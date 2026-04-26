import type {
  XCLIAPI,
  Command,
  CommandHandler,
  SiteConfig,
  SiteInstance,
  StorageContext,
  FlagConfig,
  ToolConfig,
  EventContext,
} from '../protocol/plugin-protocol';
import { SiteInstanceImpl } from '../protocol/plugin-protocol';
import { resolve, isAbsolute, extname } from 'path';
import { createJiti } from 'jiti';

export class PluginLoader {
  private commands: Map<string, Command & { handler: CommandHandler }> = new Map();
  private sites: Map<string, SiteInstance> = new Map();
  private flags: Map<string, FlagConfig> = new Map();
  private tools: Map<string, ToolConfig> = new Map();
  private loadHandlers: Array<() => void | Promise<void>> = [];
  private unloadHandlers: Array<() => void | Promise<void>> = [];
  private eventHandlers: Map<string, Array<(event: EventContext) => void>> = new Map();
  private storage: StorageContext;

  private api: XCLIAPI = this.createAPI();

  constructor() {
    this.storage = this.createStorage();
  }

  private createStorage(): StorageContext {
    const store: Record<string, unknown> = {};
    return {
      async get<T>(key: string): Promise<T | null> {
        return (store[key] as T) ?? null;
      },
      async set<T>(key: string, value: T): Promise<void> {
        store[key] = value;
      },
      async delete(key: string): Promise<void> {
        delete store[key];
      },
    };
  }

  private createAPI(): XCLIAPI {
    const self = this; // eslint-disable-line @typescript-eslint/no-this-alias

    return {
      createSite(config: SiteConfig): SiteInstance {
        const site = new SiteInstanceImpl(config, self.storage);
        self.sites.set(config.name, site);

        return site;
      },

      registerCommand(cmd: Command & { handler: CommandHandler }) {
        const key = cmd.name;
        self.commands.set(key, cmd);
        return this;
      },

      registerFlag(flag: FlagConfig) {
        self.flags.set(flag.name, flag);
        return this;
      },

      registerTool(tool: ToolConfig) {
        self.tools.set(tool.name, tool);
        return this;
      },

      overrideTool(name: string, tool: ToolConfig) {
        self.tools.set(name, tool);
        return this;
      },

      onLoad(handler: () => void | Promise<void>) {
        self.loadHandlers.push(handler);
        return this;
      },

      onUnload(handler: () => void | Promise<void>) {
        self.unloadHandlers.push(handler);
        return this;
      },

      onEvent(event: string, handler: (event: EventContext) => void) {
        if (!self.eventHandlers.has(event)) {
          self.eventHandlers.set(event, []);
        }
        self.eventHandlers.get(event)!.push(handler);
        return this;
      },
    };
  }

  getAPI(): XCLIAPI {
    return this.api;
  }

  async loadPlugin(path: string): Promise<void> {
    let importPath = path;
    if (!isAbsolute(path)) {
      const cwd = process.cwd();
      importPath = resolve(cwd, path);
    }

    let plugin: Record<string, unknown> | undefined;

    if (extname(importPath) === '.ts') {
      const jiti = createJiti(import.meta.url, { interopDefault: true });
      plugin = await jiti.import(importPath);
    } else {
      plugin = await import(`file://${importPath}`);
    }

    const setup = plugin?.default ?? plugin;

    if (typeof setup === 'function') {
      setup(this.api);
    }

    for (const handler of this.loadHandlers) {
      await handler();
    }
  }

  async loadFromFunction(setup: (xcli: XCLIAPI) => void): Promise<void> {
    setup(this.api);

    for (const handler of this.loadHandlers) {
      await handler();
    }
  }

  getCommand(name: string): (Command & { handler: CommandHandler }) | undefined {
    return this.commands.get(name);
  }

  getSiteCommand(
    siteName: string,
    cmdName: string
  ): (Command & { handler: CommandHandler }) | undefined {
    return this.commands.get(`${siteName}:${cmdName}`);
  }

  getAllCommands(): Array<Command & { handler: CommandHandler }> {
    return Array.from(this.commands.values());
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
    const handlers = this.eventHandlers.get(event) || [];
    for (const handler of handlers) {
      await handler(context);
    }
  }

  getStorage(): StorageContext {
    return this.storage;
  }

  async unload(): Promise<void> {
    for (const handler of this.unloadHandlers) {
      await handler();
    }
  }
}

export const globalLoader = new PluginLoader();
