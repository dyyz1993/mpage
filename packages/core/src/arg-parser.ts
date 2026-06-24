import { type Command } from './protocol/plugin-protocol.js';

export interface ParsedArgs {
  positional: string[];
  options: Record<string, unknown>;
  '--'?: string[];
}

export interface ParseArgsOptions {
  strict?: boolean;
  knownOptions?: string[];
  /** Flags that should always be treated as booleans (never consume the next arg). */
  booleanFlags?: string[];
}

export class UnknownOptionError extends Error {
  readonly option: string;

  constructor(option: string) {
    super(`Unknown option: --${option}`);
    this.name = 'UnknownOptionError';
    this.option = option;
  }
}

export function parseArgs(argv: string[], opts?: ParseArgsOptions): ParsedArgs {
  const result: ParsedArgs = {
    positional: [],
    options: {},
  };

  const strict = opts?.strict ?? false;
  const knownSet = opts?.knownOptions ? new Set(opts.knownOptions) : null;

  function checkOption(key: string): void {
    if (strict && knownSet && !knownSet.has(key)) {
      throw new UnknownOptionError(key);
    }
  }

  let i = 0;
  let afterDoubleDash = false;

  while (i < argv.length) {
    const arg = argv[i];

    if (afterDoubleDash) {
      result['--'] = result['--'] || [];
      result['--'].push(arg);
      i++;
      continue;
    }

    if (arg === '--') {
      afterDoubleDash = true;
      i++;
      continue;
    }

    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const key = arg.slice(2, eqIndex);
        checkOption(key);
        const value = arg.slice(eqIndex + 1);
        result.options[key] = parseValue(value);
      } else {
        const key = arg.slice(2);
        if (key.startsWith('no-')) {
          const realKey = key.slice(3);
          checkOption(realKey);
          result.options[realKey] = false;
        } else {
          checkOption(key);
          const boolFlags = opts?.booleanFlags;
          if (boolFlags?.includes(key)) {
            result.options[key] = true;
          } else {
            const next = argv[i + 1];
            if (next && !next.startsWith('-')) {
              result.options[key] = parseValue(next);
              i++;
            } else {
              result.options[key] = true;
            }
          }
        }
      }
      i++;
      continue;
    }

    if (arg.startsWith('-') && arg.length > 1) {
      const shorts = arg.slice(1).split('');
      for (const short of shorts) {
        checkOption(short);
        const next = argv[i + 1];
        if (next && !next.startsWith('-')) {
          result.options[short] = parseValue(next);
          i++;
        } else {
          result.options[short] = true;
        }
      }
      i++;
      continue;
    }

    result.positional.push(arg);
    i++;
  }

  return result;
}

function parseValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (value === 'undefined') return undefined;
  if (value === '[]') return [];
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // not valid JSON, fallback to naive split
    }
    return value
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim());
  }
  return value;
}

export function mergeArgsWithDefaults(
  options: Record<string, unknown>,
  command: Command
): Record<string, unknown> {
  const merged = { ...options };

  for (const opt of command.options || []) {
    if (opt.default !== undefined && merged[opt.name] === undefined) {
      merged[opt.name] = opt.default;
    }
    if (opt.type === 'boolean' && merged[opt.name] === undefined) {
      merged[opt.name] = false;
    }
  }

  return merged;
}

export function resolveShortOptions(
  options: Record<string, unknown>,
  command: Command
): Record<string, unknown> {
  const resolved = { ...options };
  const shortToLong: Record<string, string> = {};

  for (const opt of command.options || []) {
    if (opt.short) {
      shortToLong[opt.short] = opt.name;
    }
  }

  for (const [key, value] of Object.entries(resolved)) {
    if (shortToLong[key]) {
      resolved[shortToLong[key]] = value;
      delete resolved[key];
    }
  }

  return resolved;
}
