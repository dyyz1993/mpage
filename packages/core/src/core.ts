import { join } from 'path';
import { homedir } from 'os';
import { PluginLoader } from './plugin-loader.js';
import type {
  CommandContext,
  SiteInstance,
  CommandEntry,
  OutputMode,
} from './protocol/plugin-protocol.js';
import { buildInputSchema, CommandError } from './protocol/plugin-protocol.js';
import { parseArgs } from './arg-parser.js';
import { coerceCliArgs } from './param-coercion.js';
import { isCommandResult } from './command-result.js';
import { outputFormatter } from './output-formatter.js';
import { helpGenerator } from './help/help-generator.js';

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

  readonly configDir: string;
  readonly sessionDir: string;
  readonly storageDir: string;

  constructor(config: CoreConfig) {
    this.config = config;
    this.loader = new PluginLoader(this);

    this.configDir = join(homedir(), config.configDirName);
    this.sessionDir = join(this.configDir, 'sessions');
    this.storageDir = join(this.configDir, 'storage');
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
    if (argv.includes('--version') || argv.includes('-v')) {
      console.log(this.config.version);
      return 0;
    }

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

    if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
      showHelp();
      return 0;
    }

    const commandName = argv[0];
    const commandArgs = argv.slice(1);

    // Command-level --help: "cli <command> --help"
    if (commandArgs.includes('--help') || commandArgs.includes('-h')) {
      const entry = this.loader.resolveCommand(commandName);
      if (entry) {
        console.log(helpGenerator.generate(entry, { color: true, emoji: true }));
      } else {
        const suggestion = this.suggestCommand(commandName);
        console.error(`Unknown command: ${commandName}`);
        if (suggestion) {
          console.error(`Did you mean: ${suggestion}?`);
        }
        console.error();
        showHelp();
      }
      return 0;
    }

    const entry = this.loader.resolveCommand(commandName);
    if (!entry) {
      const suggestion = this.suggestCommand(commandName);
      console.error(`Unknown command: ${commandName}`);
      if (suggestion) {
        console.error(`Did you mean: ${suggestion}?`);
      }
      console.error();
      showHelp();
      return 1;
    }

    const site = this.loader.findCommand(commandName)?.site;
    const parsed = parseArgs(commandArgs);

    const params = this.buildValidatedParams(entry, parsed.options, parsed.positional);

    // Resolve output mode from --json / --yaml flags
    const mode: OutputMode = parsed.options.json ? 'json' : parsed.options.yaml ? 'yaml' : 'text';

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
    };

    try {
      const result = await entry.handler(params, ctx);

      // No output for void/undefined handlers
      if (result === undefined || result === null) {
        return 0;
      }

      // Validate result against declared schema if present
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
            .map(
              (e: { path: PropertyKey[]; message: string }) => `${e.path.join('.')}: ${e.message}`
            )
            .join('; ');
          console.error(`Result validation failed for "${entry.name}": ${details}`);
          return 1;
        }
      }

      if (isCommandResult(result)) {
        // CommandResult: format data only, tips routed separately
        if (mode === 'json' || mode === 'yaml') {
          // Machine mode: data → stdout, tips → stderr
          console.log(outputFormatter.format(result.data, { mode, color: false, emoji: false }));
          if (result.tips?.length) {
            for (const tip of result.tips) {
              console.error(`💡 ${tip}`);
            }
          }
        } else {
          // Human mode: everything to stdout
          console.log(
            outputFormatter.format(result.data, { mode: 'text', color: true, emoji: true })
          );
          if (result.tips?.length && ctx.output.showTips) {
            for (const tip of result.tips) {
              console.log(`  💡 ${tip}`);
            }
          }
        }
      } else if (typeof result === 'string') {
        // Plain string passthrough
        console.log(result);
      } else if (typeof result === 'object') {
        // Non-CommandResult object: format as-is
        console.log(outputFormatter.format(result, { mode, color: false, emoji: false }));
      } else {
        console.log(String(result));
      }

      return 0;
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      return 1;
    }
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
