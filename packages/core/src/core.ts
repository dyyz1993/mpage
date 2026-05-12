import { join } from 'path';
import { homedir } from 'os';
import { PluginLoader } from './plugin-loader.js';
import type { CommandContext, SiteInstance, CommandEntry } from './protocol/plugin-protocol.js';
import { buildInputSchema, CommandError } from './protocol/plugin-protocol.js';
import { parseArgs } from './arg-parser.js';
import { coerceCliArgs } from './param-coercion.js';

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

export interface CoreConfig {
  name: string;
  version: string;
  description: string;
  configDirName: string;
  envPrefix: string;
  pluginDirs: string[];
  pluginPackageName?: string;
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
    };

    if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
      showHelp();
      return 0;
    }

    const commandName = argv[0];
    const commandArgs = argv.slice(1);

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
      output: { mode: 'text', showTips: true, color: true, emoji: false },
      error: (msg: string) => {
        console.error(msg);
      },
      config: {},
      site: site as SiteInstance,
      cliName: this.config.name,
    };

    try {
      const result = await entry.handler(params, ctx);
      if (result && typeof result === 'object') {
        console.log(JSON.stringify(result, null, 2));
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
