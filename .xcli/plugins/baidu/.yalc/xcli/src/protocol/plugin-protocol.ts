import { z } from 'zod';

export const OptionSchema = z.object({
  name: z.string(),
  short: z.string().optional(),
  type: z.enum(['string', 'number', 'boolean', 'array']).default('string'),
  description: z.string(),
  default: z.any().optional(),
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

export interface CommandContext {
  args: string[];
  options: Record<string, unknown>;
  cwd: string;
  page: any;
  storage: StorageContext;
  output: OutputContext;
  config: Record<string, unknown>;
  site: SiteInstance;
}

export interface StorageContext {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
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
}

export type ZodSchema = z.ZodType<any>;

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

export interface SiteInstance {
  name: string;
  url: string;
  config: SiteConfig;

  command<P extends ZodSchema, R extends ZodSchema>(
    name: string,
    config: {
      description: string;
      parameters: P;
      result?: R;
      requiresLogin?: boolean;
      examples?: Array<{ cmd: string; description: string }>;
      tips?: string[];
      handler: (params: z.infer<P>, ctx: CommandContext) => Promise<z.infer<R>>;
    }
  ): SiteInstance;

  login(handler: (ctx: CommandContext) => Promise<void>): SiteInstance;
  logout(handler: (ctx: CommandContext) => Promise<void>): SiteInstance;

  isLoggedIn(): Promise<boolean>;
  requireLogin(): Promise<void>;
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
  private commands: Map<string, any> = new Map();
  private loginHandler?: (ctx: CommandContext) => Promise<void>;
  private logoutHandler?: (ctx: CommandContext) => Promise<void>;
  private storage: StorageContext;
  private loggedIn: boolean = false;

  constructor(config: SiteConfig, storage: StorageContext) {
    this.name = config.name;
    this.url = config.url || '';
    this.config = config;
    this.storage = storage;
  }

  command<P extends ZodSchema, R extends ZodSchema>(
    name: string,
    cmd: {
      description: string;
      parameters: P;
      result?: R;
      requiresLogin?: boolean;
      examples?: Array<{ cmd: string; description: string }>;
      tips?: string[];
      handler: (params: z.infer<P>, ctx: CommandContext) => Promise<z.infer<R>>;
    }
  ): SiteInstance {
    this.commands.set(name, {
      name,
      description: cmd.description,
      requiresLogin: cmd.requiresLogin ?? false,
      parameters: cmd.parameters,
      result: cmd.result,
      examples: cmd.examples,
      tips: cmd.tips,
      handler: cmd.handler,
    });
    return this;
  }

  login(handler: (ctx: CommandContext) => Promise<void>): SiteInstance {
    this.loginHandler = handler;
    return this;
  }

  logout(handler: (ctx: CommandContext) => Promise<void>): SiteInstance {
    this.logoutHandler = handler;
    return this;
  }

  getCommand(name: string): any {
    return this.commands.get(name);
  }

  getAllCommands(): any[] {
    return Array.from(this.commands.values());
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
    const token = await this.storage.get('auth_token');
    return !!token;
  }

  async requireLogin(): Promise<void> {
    if (this.config.requiresLogin && !(await this.isLoggedIn())) {
      throw new CommandError(
        'NOT_LOGGED_IN',
        `请先登录: xcli ${this.name} login --username <username> --password <password>`
      );
    }
  }

  async executeLogin(ctx: CommandContext): Promise<void> {
    if (!this.loginHandler) {
      throw new CommandError('NO_LOGIN_HANDLER', '此网站不支持登录');
    }
    await this.loginHandler(ctx);
    this.loggedIn = true;
    await this.storage.set('auth_token', { loggedIn: true, at: Date.now() });
  }

  async executeLogout(ctx: CommandContext): Promise<void> {
    if (!this.logoutHandler) {
      throw new CommandError('NO_LOGOUT_HANDLER', '此网站不支持退出');
    }
    await this.logoutHandler(ctx);
    this.loggedIn = false;
    await this.storage.delete('auth_token');
  }
}

export function buildInputSchema(command: any) {
  if (command.parameters) {
    return command.parameters;
  }

  const shape: Record<string, z.ZodTypeAny> = {};

  for (const opt of command.options || []) {
    let schema: z.ZodTypeAny;

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
      schema = schema.default(opt.default as any);
    }
    if (!opt.required) {
      schema = schema.optional();
    }

    shape[opt.name] = schema;
  }

  return z.object(shape);
}

export function validateArgs<T>(command: any, argv: Record<string, unknown>): T {
  const schema = buildInputSchema(command);
  const result = schema.safeParse(argv);

  if (!result.success) {
    const msg = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new CommandError('INVALID_ARGS', msg);
  }

  return result.data as T;
}
