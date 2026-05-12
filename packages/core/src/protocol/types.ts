import { z } from 'zod/v4';

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
) => Promise<T>;

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
}

export interface StorageContext {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
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

  command<P extends ZodSchema, R extends ZodSchema>(
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

  login(handler: (ctx: CommandContext) => Promise<void>): SiteInstance;
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
