import type {
  XCLIAPI,
  Command,
  CommandHandler,
  SiteConfig,
  SiteInstance,
  StorageContext,
} from '../protocol/plugin-protocol';
import { SiteInstanceImpl } from '../protocol/plugin-protocol';

export class PluginLoader {
  private commands: Map<string, Command & { handler: CommandHandler }> = new Map();
  private sites: Map<string, SiteInstance> = new Map();
  private flags: Map<string, any> = new Map();
  private tools: Map<string, any> = new Map();
  private loadHandlers: Array<() => void | Promise<void>> = [];
  private unloadHandlers: Array<() => void | Promise<void>> = [];
  private eventHandlers: Map<string, Array<(event: any) => unknown>> = new Map();
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
    const self = this;

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

      registerFlag(flag: any) {
        self.flags.set(flag.name, flag);
        return this;
      },

      registerTool(tool: any) {
        self.tools.set(tool.name, tool);
        return this;
      },

      overrideTool(name: string, tool: any) {
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

      onEvent(event: string, handler: (event: any) => unknown) {
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
    const plugin = await import(path);
    const setup = plugin.default;

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

  getFlag(name: string): any {
    return this.flags.get(name);
  }

  getAllFlags(): Array<any> {
    return Array.from(this.flags.values());
  }

  getTool(name: string): any {
    return this.tools.get(name);
  }

  getAllTools(): Array<any> {
    return Array.from(this.tools.values());
  }

  async emitEvent(event: string, context: any): Promise<void> {
    const handlers = this.eventHandlers.get(event) || [];
    for (const handler of handlers) {
      await handler(context);
    }
  }

  async unload(): Promise<void> {
    for (const handler of this.unloadHandlers) {
      await handler();
    }
  }
}

export const globalLoader = new PluginLoader();
