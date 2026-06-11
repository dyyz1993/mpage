import { type z } from 'zod/v4';
import type {
  CommandContext,
  CommandEntry,
  CommandHandler,
  CommandScope,
  SiteConfig,
  SiteInstance,
  StorageContext,
  ZodSchema,
  SiteInstanceImpl,
} from './plugin-protocol.js';

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

  command<P extends ZodSchema, R extends ZodSchema>(
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
    this.parent.command(this.prefix + name, cmd);
    return this;
  }

  group(name: string): SiteInstance {
    return new GroupedSiteInstance(this.parent, this.prefix + name);
  }

  login(handler: (ctx: CommandContext) => Promise<void>): SiteInstance {
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
