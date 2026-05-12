import type { Command, CommandHandler, EventHandler } from './protocol/plugin-protocol.js';

export type PluginStatus = 'loaded' | 'unloaded' | 'error';

export interface PluginLoaderHost {
  cleanupPluginRegistrations(instance: PluginInstance): void;
  loadPlugin(pluginPath: string, explicitId?: string): Promise<PluginInstance>;
}

export class PluginInstance {
  readonly id: string;
  readonly path: string;
  readonly siteName: string;

  private registeredSiteNames: string[] = [];
  private registeredCommands: string[] = [];
  private registeredFlags: string[] = [];
  private registeredTools: string[] = [];
  private overriddenCommands: Map<string, Command & { handler: CommandHandler }> = new Map();
  private loadHandlers: Array<() => void | Promise<void>> = [];
  private unloadHandlers: Array<() => void | Promise<void>> = [];
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();

  private _loaded = false;
  private _status: PluginStatus = 'unloaded';
  private _error?: Error;
  private readonly loader: PluginLoaderHost;

  constructor(id: string, pluginPath: string, loader: PluginLoaderHost) {
    this.id = id;
    this.path = pluginPath;
    this.siteName = id;
    this.loader = loader;
  }

  get loaded(): boolean {
    return this._loaded;
  }

  get status(): PluginStatus {
    return this._status;
  }

  get error(): Error | undefined {
    return this._error;
  }

  addSiteName(name: string): void {
    this.registeredSiteNames.push(name);
  }

  addCommand(name: string): void {
    this.registeredCommands.push(name);
  }

  addFlag(name: string): void {
    this.registeredFlags.push(name);
  }

  addTool(name: string): void {
    this.registeredTools.push(name);
  }

  addOverriddenCommand(name: string, original: Command & { handler: CommandHandler }): void {
    if (!this.overriddenCommands.has(name)) {
      this.overriddenCommands.set(name, original);
    }
  }

  getOverriddenCommands(): Map<string, Command & { handler: CommandHandler }> {
    return this.overriddenCommands;
  }

  addLoadHandler(handler: () => void | Promise<void>): void {
    this.loadHandlers.push(handler);
  }

  addUnloadHandler(handler: () => void | Promise<void>): void {
    this.unloadHandlers.push(handler);
  }

  addEventHandler(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(handler);
  }

  getRegisteredSiteNames(): string[] {
    return [...this.registeredSiteNames];
  }

  getRegisteredCommands(): string[] {
    return [...this.registeredCommands];
  }

  getRegisteredFlags(): string[] {
    return [...this.registeredFlags];
  }

  getRegisteredTools(): string[] {
    return [...this.registeredTools];
  }

  getEventHandlers(): Map<string, Set<EventHandler>> {
    return this.eventHandlers;
  }

  setError(err: Error): void {
    this._error = err;
    this._status = 'error';
  }

  async mount(): Promise<void> {
    if (this._loaded) return;

    try {
      for (const handler of this.loadHandlers) {
        await handler();
      }
      this._loaded = true;
      this._status = 'loaded';
    } catch (err) {
      this._status = 'error';
      this._error = err instanceof Error ? err : new Error(String(err));
      throw err;
    }
  }

  async unmount(): Promise<void> {
    if (!this._loaded) return;

    for (const handler of this.unloadHandlers) {
      try {
        await handler();
      } catch {
        // swallow errors during unmount
      }
    }

    this.loader.cleanupPluginRegistrations(this);

    this.loadHandlers = [];
    this.unloadHandlers = [];
    this.eventHandlers.clear();
    this.registeredSiteNames = [];
    this.registeredCommands = [];
    this.registeredFlags = [];
    this.registeredTools = [];

    this._loaded = false;
    this._status = 'unloaded';
  }

  async reload(): Promise<PluginInstance> {
    await this.unmount();
    return this.loader.loadPlugin(this.path, this.id);
  }
}
