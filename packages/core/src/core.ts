import { join } from 'path';
import { homedir } from 'os';
import { PluginLoader } from './plugin-loader.js';
import { ScopeRegistry } from './command/scope-registry.js';
import type {
  CommandContext,
  ContextExtender,
  SiteInstance,
  CommandEntry,
  OutputMode,
  CommandHooks,
  PipelineContext,
  Middleware,
  LoginConfig,
} from './protocol/plugin-protocol.js';
import { buildInputSchema, CommandError } from './protocol/plugin-protocol.js';
import { parseArgs } from './arg-parser.js';
import { coerceCliArgs } from './param-coercion.js';
import { isCommandResult, wrapResult } from './command-result.js';
import { TipCollector } from './tip.js';
import { outputFormatter } from './output-formatter.js';
import { helpGenerator } from './help/help-generator.js';
import type { ScopeDefinition } from './command/scope.js';

export interface CoreConfig {
  name: string;
  version: string;
  description: string;
  configDirName: string;
  envPrefix: string;
  pluginDirs: string[];
  pluginPackageName?: string;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[]);

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

export class Core {
  readonly config: CoreConfig;
  readonly loader: PluginLoader;
  readonly scopeRegistry: ScopeRegistry;

  readonly configDir: string;
  readonly sessionDir: string;
  readonly storageDir: string;

  private contextExtenders: ContextExtender[] = [];
  private hooks: CommandHooks[] = [];
  private pipeline: Middleware[] = [];
  private handlerMiddlewareIndex = -1;

  constructor(config: CoreConfig) {
    this.config = config;
    this.loader = new PluginLoader(this);
    this.scopeRegistry = new ScopeRegistry();

    this.configDir = join(homedir(), config.configDirName);
    this.sessionDir = join(this.configDir, 'sessions');
    this.storageDir = join(this.configDir, 'storage');

    const builtins: Array<{ name: string; fn: Middleware }> = [
      { name: 'versionCheck', fn: this.versionCheckMiddleware.bind(this) },
      { name: 'help', fn: this.helpMiddleware.bind(this) },
      { name: 'commandResolve', fn: this.commandResolveMiddleware.bind(this) },
      { name: 'paramParse', fn: this.paramParseMiddleware.bind(this) },
      { name: 'contextBuild', fn: this.contextBuildMiddleware.bind(this) },
      { name: 'scopeGuard', fn: this.scopeGuardMiddleware.bind(this) },
      { name: 'loginGuard', fn: this.loginGuardMiddleware.bind(this) },
      { name: 'hooks', fn: this.hooksMiddleware.bind(this) },
      { name: 'handler', fn: this.handlerMiddleware.bind(this) },
      { name: 'result', fn: this.resultMiddleware.bind(this) },
    ];

    this.handlerMiddlewareIndex = builtins.findIndex((b) => b.name === 'handler');
    this.pipeline = builtins.map((b) => b.fn);
  }

  use(middleware: Middleware): this {
    this.pipeline.splice(this.handlerMiddlewareIndex, 0, middleware);
    this.handlerMiddlewareIndex++;
    return this;
  }

  extendContext(extender: ContextExtender): this {
    this.contextExtenders.push(extender);
    return this;
  }

  registerHooks(hooks: CommandHooks): this {
    this.hooks.push(hooks);
    return this;
  }

  registerScope(definition: ScopeDefinition): this {
    this.scopeRegistry.registerScope(definition);
    return this;
  }

  get name(): string {
    return this.config.name;
  }

  get version(): string {
    return this.config.version;
  }

  get envPrefix(): string {
    return this.config.envPrefix;
  }

  envVar(suffix: string): string {
    return `${this.config.envPrefix}_${suffix}`;
  }

  async run(argv: string[]): Promise<number> {
    const pipeline: PipelineContext = { argv, exitCode: 0 };
    await this.executePipeline(pipeline);
    return pipeline.exitCode;
  }

  private async executePipeline(pipeline: PipelineContext): Promise<void> {
    let index = 0;
    const middleware = this.pipeline;
    const dispatch = async (): Promise<void> => {
      if (index < middleware.length) {
        const fn = middleware[index++];
        await fn(pipeline, dispatch);
      }
    };
    await dispatch();
  }

  private async versionCheckMiddleware(
    pipeline: PipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    if (pipeline.argv.includes('--version') || pipeline.argv.includes('-v')) {
      console.log(this.config.version);
      pipeline.exitCode = 0;
      return;
    }
    await next();
  }

  private async helpMiddleware(
    pipeline: PipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    const showHelp = (): void => {
      console.log(`${this.config.name} v${this.config.version}`);
      console.log(`${this.config.description}\n`);
      console.log('USAGE');
      console.log(`  ${this.config.name} <command> [options]\n`);

      const commands = this.loader.getAllCommands();
      if (commands.length > 0) {
        console.log('COMMANDS');
        for (const cmd of commands) {
          console.log(`  ${cmd.name.padEnd(20)}${cmd.description}`);
        }
        console.log();
      }

      console.log('OPTIONS');
      console.log('  --version, -v        Print version');
      console.log('  --help, -h           Print help');
      console.log('  <command> --help     Show command-specific help');
    };

    if (
      pipeline.argv.length === 0 ||
      (pipeline.argv.includes('--help') && pipeline.argv.length === 1) ||
      (pipeline.argv.includes('-h') && pipeline.argv.length === 1)
    ) {
      showHelp();
      pipeline.exitCode = 0;
      return;
    }

    const helpIdx = pipeline.argv.indexOf('--help');
    const hIdx = pipeline.argv.indexOf('-h');
    const helpPos = helpIdx !== -1 ? helpIdx : hIdx;

    if (helpPos > 0) {
      const cmdParts = pipeline.argv.slice(0, helpPos);
      const nested = this.loader.resolveNestedCommand(cmdParts);

      if (nested) {
        console.log(helpGenerator.generate(nested.entry, { color: true, emoji: true }));
        pipeline.exitCode = 0;
        return;
      }

      const flatName = cmdParts.join('.');
      const flatEntry = this.loader.resolveCommand(flatName);
      if (flatEntry) {
        console.log(helpGenerator.generate(flatEntry, { color: true, emoji: true }));
        pipeline.exitCode = 0;
        return;
      }

      const prefix = cmdParts.join('.');
      const subCommands = this.loader.getSubCommands(prefix);
      if (subCommands.length > 0) {
        const parentEntry = this.loader.resolveCommand(prefix);
        if (parentEntry) {
          console.log(helpGenerator.generate(parentEntry, { color: true, emoji: true }));
        }
        console.log('\nSub-commands:');
        for (const sub of subCommands) {
          if (sub.name !== prefix) {
            const subName = sub.name.slice(prefix.length + 1);
            console.log(`  ${subName.padEnd(20)}${sub.description}`);
          }
        }
        pipeline.exitCode = 0;
        return;
      }

      const suggestion = this.suggestCommand(prefix);
      console.error(`Unknown command: ${cmdParts.join(' ')}`);
      if (suggestion) {
        console.error(`Did you mean: ${suggestion}?`);
      }
      console.error();
      showHelp();
      pipeline.exitCode = 0;
      return;
    }

    pipeline.commandName = pipeline.argv[0];
    pipeline.commandArgs = pipeline.argv.slice(1);

    await next();
  }

  private async commandResolveMiddleware(
    pipeline: PipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    const nested = this.loader.resolveNestedCommand(pipeline.argv);

    if (nested) {
      pipeline.commandName = nested.entry.name;
      pipeline.commandArgs = pipeline.argv.slice(nested.consumedArgs);
      pipeline.entry = nested.entry;
      pipeline.site = nested.site;
      await next();
      return;
    }

    const commandName = pipeline.commandName!;
    const entry = this.loader.resolveCommand(commandName);
    if (!entry) {
      const suggestion = this.suggestCommand(commandName);
      console.error(`Unknown command: ${commandName}`);
      if (suggestion) {
        console.error(`Did you mean: ${suggestion}?`);
      }
      console.error();

      console.log(`${this.config.name} v${this.config.version}`);
      console.log(`${this.config.description}\n`);
      console.log('USAGE');
      console.log(`  ${this.config.name} <command> [options]\n`);

      const commands = this.loader.getAllCommands();
      if (commands.length > 0) {
        console.log('COMMANDS');
        for (const cmd of commands) {
          console.log(`  ${cmd.name.padEnd(20)}${cmd.description}`);
        }
        console.log();
      }

      console.log('OPTIONS');
      console.log('  --version, -v        Print version');
      console.log('  --help, -h           Print help');
      console.log('  <command> --help     Show command-specific help');

      pipeline.exitCode = 1;
      return;
    }

    pipeline.entry = entry;
    pipeline.site = this.loader.findCommand(commandName)?.site;
    await next();
  }

  private async paramParseMiddleware(
    pipeline: PipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    const parsed = parseArgs(pipeline.commandArgs!);
    pipeline.params = this.buildValidatedParams(pipeline.entry!, parsed.options, parsed.positional);

    const mode: OutputMode = parsed.options.json ? 'json' : parsed.options.yaml ? 'yaml' : 'text';
    (pipeline as { _parsedArgs?: typeof parsed; _outputMode?: OutputMode })._parsedArgs = parsed;
    (pipeline as { _outputMode?: OutputMode })._outputMode = mode;

    await next();
  }

  private async contextBuildMiddleware(
    pipeline: PipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    const parsed = (
      pipeline as { _parsedArgs?: { positional: string[]; options: Record<string, unknown> } }
    )._parsedArgs!;
    const mode = (pipeline as { _outputMode?: OutputMode })._outputMode ?? 'text';
    const site = pipeline.site;

    const ctx: CommandContext = {
      args: parsed.positional,
      options: parsed.options,
      cwd: process.cwd(),
      storage: site?.getStorage() ?? {
        get: () => Promise.resolve(null),
        set: () => Promise.resolve(),
        delete: () => Promise.resolve(),
        clear: () => Promise.resolve(),
        keys: () => Promise.resolve([]),
      },
      output: { mode, showTips: true, color: true, emoji: false },
      error: (msg: string) => {
        console.error(msg);
      },
      config: {},
      site: site as SiteInstance,
      cliName: this.config.name,
      tips: new TipCollector(),
    };

    for (const extender of this.contextExtenders) {
      const extra = await extender(ctx);
      Object.assign(ctx, extra);
    }

    pipeline.ctx = ctx;
    await next();
  }

  private async scopeGuardMiddleware(
    pipeline: PipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    const entry = pipeline.entry!;
    const scopeName = entry.scope;
    if (!scopeName) {
      await next();
      return;
    }

    const scope = this.scopeRegistry.getScope(scopeName);
    if (!scope) {
      await next();
      return;
    }

    const guardError = this.scopeRegistry.checkGuard(scopeName, scopeName, pipeline.ctx!);
    if (guardError) {
      pipeline.ctx!.error(guardError);
      pipeline.exitCode = 1;
      return;
    }

    const injected = await this.scopeRegistry.injectContext(scopeName, scopeName, pipeline.ctx!);
    if (Object.keys(injected).length > 0) {
      Object.assign(pipeline.ctx!, injected);
    }

    await next();
  }

  private async loginGuardMiddleware(
    pipeline: PipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    const entry = pipeline.entry!;
    const site = pipeline.site;

    if (entry.requiresLogin || site?.config?.requiresLogin) {
      const loginConfig = (site as unknown as { loginConfig?: LoginConfig }).loginConfig;
      const auto = loginConfig?.auto !== false;

      if (!auto) {
        await next();
        return;
      }

      const loggedIn = await site!.isLoggedIn();
      if (!loggedIn) {
        const restored = await site!.restoreLogin(pipeline.ctx!);
        if (!restored) {
          await site!.executeLogin(pipeline.ctx!);
        }
      }

      const stillLoggedIn = await site!.isLoggedIn();
      if (!stillLoggedIn) {
        pipeline.ctx!.error('Login verification failed: still not logged in after login attempt');
        pipeline.exitCode = 1;
        return;
      }
    }

    await next();
  }

  private async hooksMiddleware(
    pipeline: PipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    for (const h of this.hooks) {
      if (h.beforeCommand) {
        try {
          await h.beforeCommand({
            command: pipeline.entry!.name,
            params: pipeline.params!,
            ctx: pipeline.ctx!,
          });
        } catch (err) {
          pipeline.ctx!.error(
            `beforeCommand hook error: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    await next();

    const duration = pipeline.duration ?? 0;
    for (const h of this.hooks) {
      if (h.afterCommand) {
        try {
          const wrapped = isCommandResult(pipeline.result)
            ? pipeline.result
            : wrapResult(pipeline.result);
          await h.afterCommand({
            command: pipeline.entry!.name,
            params: pipeline.params!,
            ctx: pipeline.ctx!,
            result: wrapped,
            duration,
          });
        } catch (err) {
          pipeline.ctx!.error(
            `afterCommand hook error: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }
  }

  private async handlerMiddleware(
    pipeline: PipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    const entry = pipeline.entry!;
    const ctx = pipeline.ctx!;
    const params = pipeline.params!;

    try {
      const start = Date.now();
      const result = await entry.handler(params, ctx);
      const duration = Date.now() - start;

      // Merge ctx.tips.collected into CommandResult.tips
      const ctxTips = ctx.tips.collected;
      if (ctxTips.length > 0) {
        if (isCommandResult(result)) {
          result.tips = [...result.tips, ...ctxTips];
        } else {
          pipeline.result = { success: true, data: result, tips: ctxTips };
        }
      }

      pipeline.result = result;
      pipeline.duration = duration;

      if (isCommandResult(result)) {
        result.meta = { ...result.meta, duration };
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      pipeline.exitCode = 1;
      return;
    }

    await next();
  }

  private async resultMiddleware(
    pipeline: PipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    const result = pipeline.result;
    const ctx = pipeline.ctx!;

    if (result === undefined || result === null) {
      pipeline.exitCode = 0;
      await next();
      return;
    }

    const entry = pipeline.entry!;
    if (entry.result) {
      const dataToValidate = isCommandResult(result) ? result.data : result;
      const validation = (
        entry.result as {
          safeParse: (d: unknown) => {
            success: boolean;
            error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
          };
        }
      ).safeParse(dataToValidate);
      if (!validation.success) {
        const issues = validation.error?.issues ?? [];
        const details = issues
          .map((e: { path: PropertyKey[]; message: string }) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        console.error(`Result validation failed for "${entry.name}": ${details}`);
        pipeline.exitCode = 1;
        await next();
        return;
      }
    }

    const mode = ctx.output.mode;

    if (isCommandResult(result)) {
      if (mode === 'json' || mode === 'yaml') {
        console.log(outputFormatter.format(result.data, { mode, color: false, emoji: false }));
        if (result.tips?.length) {
          for (const t of result.tips) {
            const icon = t.level === 'warn' ? '⚠️' : t.level === 'error' ? '❌' : '💡';
            const label = t.label ? `[${t.label}] ` : '';
            console.error(`${icon} ${label}${t.message}`);
          }
        }
      } else {
        console.log(
          outputFormatter.format(result.data, { mode: 'text', color: true, emoji: true })
        );
        if (result.tips?.length && ctx.output.showTips) {
          for (const t of result.tips) {
            const icon = t.level === 'warn' ? '⚠️' : t.level === 'error' ? '❌' : '💡';
            const label = t.label ? `[${t.label}] ` : '';
            console.log(`  ${icon} ${label}${t.message}`);
          }
        }
      }
    } else if (typeof result === 'string') {
      console.log(result);
    } else if (typeof result === 'object') {
      console.log(outputFormatter.format(result, { mode, color: false, emoji: false }));
    } else {
      console.log(String(result));
    }

    pipeline.exitCode = 0;
    await next();
  }

  private buildValidatedParams(
    entry: CommandEntry,
    options: Record<string, unknown>,
    positional: string[]
  ): Record<string, unknown> {
    if (!entry.parameters) {
      return { ...options };
    }

    const coerced = coerceCliArgs(entry.parameters, options);
    const combined = { ...coerced };

    const schema = buildInputSchema({ parameters: entry.parameters });
    const shape = this.getZodShape(schema);
    const positionalKeys = Object.keys(shape);

    for (let i = 0; i < positional.length && i < positionalKeys.length; i++) {
      const key = positionalKeys[i];
      if (combined[key] === undefined) {
        combined[key] = positional[i];
      }
    }

    const result = schema.safeParse(combined);
    if (!result.success) {
      const msg = result.error.issues
        .map((e: { path: PropertyKey[]; message: string }) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new CommandError('INVALID_ARGS', msg);
    }

    return result.data as Record<string, unknown>;
  }

  private getZodShape(schema: unknown): Record<string, unknown> {
    if (schema === null || typeof schema !== 'object') return {};
    const def = (schema as { _def?: { type?: string; shape?: unknown } })._def;
    if (!def || def.type !== 'object' || !def.shape) return {};
    return def.shape as Record<string, unknown>;
  }

  private suggestCommand(input: string): string | null {
    const commands = this.loader.getAllCommands();
    let bestMatch = '';
    let bestDist = Infinity;

    for (const cmd of commands) {
      const dist = levenshtein(input, cmd.name);
      if (dist < bestDist && dist <= Math.max(2, Math.floor(cmd.name.length / 3))) {
        bestDist = dist;
        bestMatch = cmd.name;
      }
    }

    return bestMatch || null;
  }
}
