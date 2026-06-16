import { z } from 'zod/v4';
import type { CommandResult } from '../command-result.js';
import { TipCollector } from '../tip.js';

export type BaseScope = 'project' | 'module' | 'resource' | 'action';
export type CommandScope = string;

export const BROWSER_SCOPE_ORDER: Record<string, number> = {
  project: 0,
  browser: 1,
  page: 2,
  element: 3,
};

export const COMMAND_SCOPE_ORDER: Record<string, number> = {
  ...BROWSER_SCOPE_ORDER,
};

export const DEFAULT_SCOPE: CommandScope = 'page';

export const OptionSchema = z.object({
  name: z.string(),
  short: z.string().optional(),
  type: z.enum(['string', 'number', 'boolean', 'array']).default('string'),
  description: z.string(),
  default: z.unknown().optional(),
  required: z.boolean().optional(),
});
export type Option = z.infer<typeof OptionSchema>;

export const CommandSchema = z.object({
  name: z.string(),
  description: z.string(),
  requiresLogin: z.boolean().optional().default(false),
  options: z.array(OptionSchema).optional(),
  examples: z
    .array(
      z.object({
        cmd: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  tips: z.array(z.string()).optional(),
});
export type Command = z.infer<typeof CommandSchema>;

export type CommandHandler<T = unknown> = (
  params: Record<string, unknown>,
  ctx: CommandContext
) => Promise<CommandResult<T> | Record<string, unknown>>;

export interface CommandContext {
  args: string[];
  options: Record<string, unknown>;
  cwd: string;
  storage: StorageContext;
  output: OutputContext;
  error: (msg: string) => void;
  config: Record<string, unknown>;
  site: SiteInstance;
  cliName: string;
  tips: TipCollector;
}

export type ContextExtender = (
  base: CommandContext
) => Record<string, unknown> | Promise<Record<string, unknown>>;

export interface StorageContext {
  // ─── Plugin-scoped persistent (backward-compatible top-level) ───
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;

  // ─── Layered storage ───
  plugin: PluginStore;
  global: GlobalStore;
  cache: CacheStore;
  tmp: TmpStore;
}

export interface PluginStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

export interface GlobalStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export interface CacheStore {
  get<T>(key: string, maxAge?: number): Promise<T | null>;
  set<T>(key: string, value: T, maxAge: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface TmpStore {
  path(filename: string): string;
  read(filename: string): Promise<Buffer>;
  write(filename: string, data: Buffer | string): Promise<void>;
  clean(): Promise<void>;
}

export interface OutputContext {
  mode: OutputMode;
  showTips: boolean;
  color: boolean;
  emoji: boolean;
}

export type OutputMode = 'text' | 'json' | 'yaml';

export interface SiteConfig {
  name: string;
  url?: string;
  description?: string;
  requiresLogin?: boolean;
  isLogin?: (ctx: CommandContext) => Promise<boolean>;
}

export interface LoginConfig {
  handler: (ctx: CommandContext) => Promise<void>;
  persist?: boolean;
  restore?: (ctx: CommandContext) => Promise<boolean>;
  isLoginCheck?: (ctx: CommandContext) => Promise<boolean>;
  persistHandler?: (ctx: CommandContext) => Promise<void>;
  auto?: boolean;
}

export interface SessionExtractor {
  extractCookies(ctx: CommandContext): Promise<Record<string, string>>;
  extractToken(
    ctx: CommandContext,
    source: 'localStorage' | 'sessionStorage' | 'cookie',
    key: string
  ): Promise<string | null>;
}

export type ZodSchema = z.ZodType<unknown>;

export interface XCLIAPI {
  createSite(config: SiteConfig): SiteInstance;
  registerCommand(cmd: Command & { handler: CommandHandler }): this;
  registerFlag(flag: FlagConfig): this;
  registerTool(tool: ToolConfig): this;
  overrideTool(name: string, tool: ToolConfig): this;
  onLoad(handler: () => void | Promise<void>): this;
  onUnload(handler: () => void | Promise<void>): this;
  onEvent(event: string, handler: EventHandler): this;
}

export interface CommandEntry {
  name: string;
  description: string;
  requiresLogin?: boolean;
  scope: CommandScope;
  override: boolean;
  parameters?: ZodSchema;
  result?: ZodSchema;
  examples?: Array<{ cmd: string; description: string }>;
  tips?: string[];
  handler: CommandHandler;
  previousHandler?: CommandHandler;
}

export interface SiteInstance {
  name: string;
  url: string;
  config: SiteConfig;

  command<P extends ZodSchema = ZodSchema, R extends ZodSchema = ZodSchema>(
    name: string,
    config: {
      description: string;
      scope?: CommandScope;
      override?: boolean;
      parameters?: P;
      result?: R;
      requiresLogin?: boolean;
      examples?: Array<{ cmd: string; description: string }>;
      tips?: string[];
      handler: (params: z.infer<P>, ctx: CommandContext) => Promise<z.infer<R>>;
    }
  ): SiteInstance;

  group(name: string): SiteInstance;

  login(handler: ((ctx: CommandContext) => Promise<void>) | LoginConfig): SiteInstance;
  logout(handler: (ctx: CommandContext) => Promise<void>): SiteInstance;

  isLoggedIn(): Promise<boolean>;
  requireLogin(): Promise<void>;
  getStorage(): StorageContext;
  getAllCommands(): Array<{
    name: string;
    description: string;
    requiresLogin?: boolean;
    scope: CommandScope;
  }>;
  getCommand(name: string): CommandEntry | null;
  getOriginalHandler(commandName: string): CommandHandler | undefined;
  executeLogin(ctx: CommandContext): Promise<void>;
  executeLogout(ctx: CommandContext): Promise<void>;
  restoreLogin(ctx: CommandContext): Promise<boolean>;
}

export interface FlagConfig {
  name: string;
  short?: string;
  type?: 'string' | 'number' | 'boolean';
  description: string;
  default?: unknown;
  global?: boolean;
}

export interface ToolConfig {
  name: string;
  scope?: string;
  description: string;
  parameters?: Record<string, unknown>;
  execute: (params: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown>;
}

export type EventHandler = (event: EventContext) => unknown;

export interface EventContext {
  type: string;
  cwd: string;
  args: Record<string, unknown>;
}

export interface HookContext {
  command: string;
  params: Record<string, unknown>;
  ctx: CommandContext;
}

export interface AfterHookContext extends HookContext {
  result: CommandResult;
  duration: number;
}

export interface CommandHooks {
  beforeCommand?: (hookCtx: HookContext) => void | Promise<void>;
  afterCommand?: (hookCtx: AfterHookContext) => void | Promise<void>;
}

export interface PipelineContext {
  argv: string[];
  commandName?: string;
  commandArgs?: string[];
  entry?: CommandEntry;
  site?: SiteInstance;
  params?: Record<string, unknown>;
  ctx?: CommandContext;
  result?: unknown;
  exitCode: number;
  duration?: number;
  skipped?: boolean;
}

export type Middleware = (pipeline: PipelineContext, next: () => Promise<void>) => Promise<void>;

export class CommandError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'CommandError';
  }
}

export class SiteInstanceImpl implements SiteInstance {
  name: string;
  url: string;
  config: SiteConfig;
  private commands: Map<string, CommandEntry> = new Map();
  private loginHandler?: (ctx: CommandContext) => Promise<void>;
  private loginConfig?: LoginConfig;
  private logoutHandler?: (ctx: CommandContext) => Promise<void>;
  private storage: StorageContext;
  private loggedIn: boolean = false;
  private cliName: string;

  private get loginStateKey(): string {
    return `__login_state_${this.name}`;
  }

  constructor(config: SiteConfig, storage: StorageContext, cliName?: string) {
    this.name = config.name;
    this.url = config.url || '';
    this.config = config;
    this.storage = storage;
    this.cliName = cliName ?? 'xcli';
  }

  command<P extends ZodSchema = ZodSchema, R extends ZodSchema = ZodSchema>(
    name: string,
    cmd: {
      description: string;
      scope?: CommandScope;
      override?: boolean;
      parameters?: P;
      result?: R;
      requiresLogin?: boolean;
      examples?: Array<{ cmd: string; description: string }>;
      tips?: string[];
      handler: (params: z.infer<P>, ctx: CommandContext) => Promise<z.infer<R>>;
    }
  ): SiteInstance {
    const existing = this.commands.get(name);
    if (existing && !existing.override) {
      return this;
    }

    if (!cmd.result) {
      console.warn(
        `⚠️ [xcli-core] Command "${name}" on site "${this.name}" has no "result" schema. Declare a result schema for runtime validation and help generation.`
      );
    }

    this.commands.set(name, {
      name,
      description: cmd.description,
      requiresLogin: cmd.requiresLogin ?? false,
      scope: cmd.scope ?? DEFAULT_SCOPE,
      override: cmd.override ?? true,
      parameters: cmd.parameters as ZodSchema | undefined,
      result: cmd.result as ZodSchema | undefined,
      examples: cmd.examples,
      tips: cmd.tips,
      handler: cmd.handler as unknown as CommandHandler,
      previousHandler: existing?.handler,
    });
    return this;
  }

  group(name: string): SiteInstance {
    return new GroupedSiteInstance(this, name);
  }

  login(handler: ((ctx: CommandContext) => Promise<void>) | LoginConfig): SiteInstance {
    if (typeof handler === 'function') {
      this.loginHandler = handler;
    } else {
      this.loginConfig = handler;
      this.loginHandler = handler.handler;
    }
    return this;
  }

  logout(handler: (ctx: CommandContext) => Promise<void>): SiteInstance {
    this.logoutHandler = handler;
    return this;
  }

  getCommand(name: string): CommandEntry | null {
    return this.commands.get(name) ?? null;
  }

  getOriginalHandler(commandName: string): CommandHandler | undefined {
    const cmd = this.commands.get(commandName);
    return cmd?.previousHandler;
  }

  getAllCommands(): Array<{
    name: string;
    description: string;
    requiresLogin?: boolean;
    scope: CommandScope;
  }> {
    return Array.from(this.commands.values()).map(
      ({ name, description, requiresLogin, scope }) => ({
        name,
        description,
        requiresLogin,
        scope,
      })
    );
  }

  hasLoginCommand(): boolean {
    return !!this.loginHandler;
  }

  hasLogoutCommand(): boolean {
    return !!this.logoutHandler;
  }

  async isLoggedIn(): Promise<boolean> {
    if (!this.config.requiresLogin) {
      return true;
    }
    if (this.loginConfig?.isLoginCheck) {
      return this.loginConfig.isLoginCheck({
        args: [],
        options: {},
        cwd: '',
        storage: this.storage,
        output: { mode: 'text', showTips: false, color: false, emoji: false },
        error: () => {},
        config: {},
        site: this,
        cliName: this.cliName,
        tips: new TipCollector(),
      });
    }
    if (this.loggedIn) {
      return true;
    }
    if (this.config.isLogin) {
      return this.config.isLogin({
        args: [],
        options: {},
        cwd: '',
        storage: this.storage,
        output: { mode: 'text', showTips: false, color: false, emoji: false },
        error: () => {},
        config: {},
        site: this,
        cliName: this.cliName,
        tips: new TipCollector(),
      });
    }
    const token = await this.storage.get('auth_token');
    return !!token;
  }

  async requireLogin(): Promise<void> {
    if (!this.config.requiresLogin) {
      return;
    }
    const loggedIn = await this.isLoggedIn();
    if (!loggedIn) {
      throw new CommandError(
        'NOT_LOGGED_IN',
        `请先登录: ${this.cliName} ${this.name} login --username <username> --password <password>`
      );
    }
  }

  getStorage(): StorageContext {
    return this.storage;
  }

  async executeLogin(ctx: CommandContext): Promise<void> {
    if (!this.loginHandler) {
      throw new CommandError('NO_LOGIN_HANDLER', '此网站不支持登录');
    }
    await this.loginHandler(ctx);
    this.loggedIn = true;
    if (this.loginConfig?.persist) {
      await this.storage.set(this.loginStateKey, {
        loggedIn: true,
        timestamp: Date.now(),
      });
    }
    if (this.loginConfig?.persistHandler) {
      await this.loginConfig.persistHandler(ctx);
    }
    await this.storage.set('auth_token', { loggedIn: true, at: Date.now() });
  }

  async executeLogout(ctx: CommandContext): Promise<void> {
    if (!this.logoutHandler) {
      throw new CommandError('NO_LOGOUT_HANDLER', '此网站不支持退出');
    }
    await this.logoutHandler(ctx);
    this.loggedIn = false;
    await this.storage.delete(this.loginStateKey);
    await this.storage.delete('auth_token');
  }

  async restoreLogin(ctx: CommandContext): Promise<boolean> {
    const state = await this.storage.get<{ loggedIn: boolean; timestamp: number }>(
      this.loginStateKey
    );
    if (!state?.loggedIn) {
      return false;
    }
    if (this.loginConfig?.restore) {
      const restored = await this.loginConfig.restore(ctx);
      if (!restored) {
        await this.storage.delete(this.loginStateKey);
        return false;
      }
    }
    if (this.loginConfig?.isLoginCheck) {
      const valid = await this.loginConfig.isLoginCheck(ctx);
      if (!valid) {
        await this.storage.delete(this.loginStateKey);
        this.loggedIn = false;
        return false;
      }
    }
    this.loggedIn = true;
    return true;
  }
}

export class GroupedSiteInstance implements SiteInstance {
  name: string;
  url: string;
  config: SiteConfig;
  private prefix: string;
  private parent: SiteInstanceImpl;

  constructor(parent: SiteInstanceImpl, groupName: string) {
    this.parent = parent;
    this.prefix = groupName + '.';
    this.name = parent.name;
    this.url = parent.url;
    this.config = parent.config;
  }

  command<P extends ZodSchema = ZodSchema, R extends ZodSchema = ZodSchema>(
    name: string,
    cmd: {
      description: string;
      scope?: CommandScope;
      override?: boolean;
      parameters?: P;
      result?: R;
      requiresLogin?: boolean;
      examples?: Array<{ cmd: string; description: string }>;
      tips?: string[];
      handler: (params: z.infer<P>, ctx: CommandContext) => Promise<z.infer<R>>;
    }
  ): SiteInstance {
    if (!cmd.result) {
      console.warn(
        `⚠️ [xcli-core] Command "${this.prefix}${name}" on site "${this.name}" has no "result" schema. Declare a result schema for runtime validation and help generation.`
      );
    }
    this.parent.command(this.prefix + name, cmd);
    return this;
  }

  group(name: string): SiteInstance {
    return new GroupedSiteInstance(this.parent, this.prefix + name);
  }

  login(handler: ((ctx: CommandContext) => Promise<void>) | LoginConfig): SiteInstance {
    this.parent.login(handler);
    return this;
  }

  logout(handler: (ctx: CommandContext) => Promise<void>): SiteInstance {
    this.parent.logout(handler);
    return this;
  }

  isLoggedIn(): Promise<boolean> {
    return this.parent.isLoggedIn();
  }

  requireLogin(): Promise<void> {
    return this.parent.requireLogin();
  }

  getStorage(): StorageContext {
    return this.parent.getStorage();
  }

  getAllCommands(): Array<{
    name: string;
    description: string;
    requiresLogin?: boolean;
    scope: CommandScope;
  }> {
    return this.parent.getAllCommands().filter((c) => c.name.startsWith(this.prefix));
  }

  getCommand(name: string): CommandEntry | null {
    return this.parent.getCommand(this.prefix + name);
  }

  getOriginalHandler(commandName: string): CommandHandler | undefined {
    return this.parent.getOriginalHandler(this.prefix + commandName);
  }

  executeLogin(ctx: CommandContext): Promise<void> {
    return this.parent.executeLogin(ctx);
  }

  executeLogout(ctx: CommandContext): Promise<void> {
    return this.parent.executeLogout(ctx);
  }

  restoreLogin(ctx: CommandContext): Promise<boolean> {
    return this.parent.restoreLogin(ctx);
  }
}

export function buildInputSchema(command: { parameters?: ZodSchema; options?: Option[] }) {
  if (command.parameters) {
    return command.parameters;
  }

  const shape: Record<string, z.ZodType> = {};

  for (const opt of command.options || []) {
    let schema: z.ZodType;

    switch (opt.type) {
      case 'string':
        schema = z.string();
        break;
      case 'number':
        schema = z.coerce.number();
        break;
      case 'boolean':
        schema = z.boolean();
        break;
      case 'array':
        schema = z.string().array();
        break;
      default:
        schema = z.string();
    }

    if (opt.default !== undefined) {
      schema = schema.default(opt.default as unknown as z.ZodType);
    }
    if (!opt.required) {
      schema = schema.optional();
    }

    shape[opt.name] = schema;
  }

  return z.object(shape);
}

export interface ScanOptions {
  priority?: 'first-wins' | 'last-wins';
  validate?: (meta: PluginMeta) => boolean;
  ignoreDotFiles?: boolean;
}

export interface ScanResult {
  loaded: string[];
  failed: Array<{ path: string; error: string }>;
  skipped: string[];
}

export interface PluginMeta {
  name: string;
  version?: string;
  description?: string;
  commands?: string[];
  dependencies?: Record<string, string>;
}

export function validateArgs<T>(
  command: { parameters?: ZodSchema; options?: Option[] },
  argv: Record<string, unknown>
): T {
  const schema = buildInputSchema(command);
  const result = schema.safeParse(argv);

  if (!result.success) {
    const msg = result.error.issues
      .map((e: { path: PropertyKey[]; message: string }) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new CommandError('INVALID_ARGS', msg);
  }

  return result.data as T;
}
