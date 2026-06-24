import { describe, it, expect } from 'vitest';
import {
  parseArgs,
  mergeArgsWithDefaults,
  resolveShortOptions,
  UnknownOptionError,
  type ParsedArgs,
} from '../../src/arg-parser.js';
import type { Command } from '../../src/protocol/plugin-protocol.js';

describe('parseArgs()', () => {
  it('should parse --flag as boolean true', () => {
    const result = parseArgs(['--verbose']);
    expect(result.options.verbose).toBe(true);
    expect(result.positional).toEqual([]);
  });

  it('should parse --key=value', () => {
    const result = parseArgs(['--name=alice']);
    expect(result.options.name).toBe('alice');
  });

  it('should parse --key value when next arg is not a flag', () => {
    const result = parseArgs(['--name', 'alice']);
    expect(result.options.name).toBe('alice');
  });

  it('should treat --key as boolean when next arg starts with -', () => {
    const result = parseArgs(['--verbose', '--other']);
    expect(result.options.verbose).toBe(true);
    expect(result.options.other).toBe(true);
  });

  it('should parse -k v as short option', () => {
    const result = parseArgs(['-n', 'alice']);
    expect(result.options.n).toBe('alice');
  });

  it('should parse -k as boolean when no value follows', () => {
    const result = parseArgs(['-v']);
    expect(result.options.v).toBe(true);
  });

  it('should parse --no-flag as flag: false', () => {
    const result = parseArgs(['--no-cache']);
    expect(result.options.cache).toBe(false);
  });

  it('should collect args after -- as positional in "--" key', () => {
    const result = parseArgs(['--flag', '--', 'arg1', 'arg2']);
    expect(result.options.flag).toBe(true);
    expect(result['--']).toEqual(['arg1', 'arg2']);
  });

  it('should auto-detect integer values', () => {
    const result = parseArgs(['--count=3']);
    expect(result.options.count).toBe(3);
  });

  it('should auto-detect float values', () => {
    const result = parseArgs(['--ratio=3.14']);
    expect(result.options.ratio).toBeCloseTo(3.14);
  });

  it('should auto-detect boolean string "true"', () => {
    const result = parseArgs(['--enabled=true']);
    expect(result.options.enabled).toBe(true);
  });

  it('should auto-detect boolean string "false"', () => {
    const result = parseArgs(['--enabled=false']);
    expect(result.options.enabled).toBe(false);
  });

  it('should auto-detect null string', () => {
    const result = parseArgs(['--val=null']);
    expect(result.options.val).toBe(null);
  });

  it('should auto-detect undefined string', () => {
    const result = parseArgs(['--val=undefined']);
    expect(result.options.val).toBe(undefined);
  });

  it('should parse [] as empty array', () => {
    const result = parseArgs(['--items=[]']);
    expect(result.options.items).toEqual([]);
  });

  it('should parse [a,b,c] as string array', () => {
    const result = parseArgs(['--items=[a,b,c]']);
    expect(result.options.items).toEqual(['a', 'b', 'c']);
  });

  it('should handle multiple same keys (last wins for non-array)', () => {
    const result = parseArgs(['--name=alice', '--name=bob']);
    expect(result.options.name).toBe('bob');
  });

  it('should return empty result for empty input', () => {
    const result = parseArgs([]);
    expect(result).toEqual({ positional: [], options: {} });
  });

  it('should collect positional args', () => {
    const result = parseArgs(['foo', 'bar']);
    expect(result.positional).toEqual(['foo', 'bar']);
    expect(result.options).toEqual({});
  });

  it('should handle mixed positional and named args', () => {
    const result = parseArgs(['input.txt', '--mode=fast', 'output.txt']);
    expect(result.positional).toEqual(['input.txt', 'output.txt']);
    expect(result.options.mode).toBe('fast');
  });

  it('should handle multiple short flags combined', () => {
    const result = parseArgs(['-abc']);
    expect(result.options.a).toBe(true);
    expect(result.options.b).toBe(true);
    expect(result.options.c).toBe(true);
  });

  it('should assign value to first short flag and rest become true in combined form', () => {
    const result = parseArgs(['-abc', 'value']);
    expect(result.options.a).toBe('value');
    expect(result.options.b).toBe(true);
    expect(result.options.c).toBe(true);
  });

  it('should not create "--" key when no double dash', () => {
    const result = parseArgs(['--flag']);
    expect(result['--']).toBeUndefined();
  });

  it('should parse quoted JSON array values correctly', () => {
    const result = parseArgs(['--urls=["https://example.com","https://test.com"]']);
    expect(result.options.urls).toEqual(['https://example.com', 'https://test.com']);
  });

  it('should parse JSON array with numbers', () => {
    const result = parseArgs(['--ids=[1,2,3]']);
    expect(result.options.ids).toEqual([1, 2, 3]);
  });

  it('should fallback to naive split for non-JSON arrays', () => {
    const result = parseArgs(['--items=[a,b,c]']);
    expect(result.options.items).toEqual(['a', 'b', 'c']);
  });
});

describe('parseArgs() — booleanFlags option', () => {
  it('should treat booleanFlags as booleans, not consuming next arg', () => {
    const result = parseArgs(['--json', 'goto https://example.com'], {
      booleanFlags: ['json', 'yaml'],
    });
    expect(result.options.json).toBe(true);
    expect(result.positional).toEqual(['goto https://example.com']);
  });

  it('should still consume arg for non-booleanFlags', () => {
    const result = parseArgs(['--name', 'alice'], { booleanFlags: ['json'] });
    expect(result.options.name).toBe('alice');
    expect(result.positional).toEqual([]);
  });

  it('should work with multiple boolean flags in sequence', () => {
    const result = parseArgs(['--json', '--yaml', 'cmd'], {
      booleanFlags: ['json', 'yaml'],
    });
    expect(result.options.json).toBe(true);
    expect(result.options.yaml).toBe(true);
    expect(result.positional).toEqual(['cmd']);
  });

  it('should not affect behavior when booleanFlags is empty', () => {
    const result = parseArgs(['--name', 'alice'], { booleanFlags: [] });
    expect(result.options.name).toBe('alice');
    expect(result.positional).toEqual([]);
  });

  it('should not affect behavior when booleanFlags is not provided', () => {
    const result = parseArgs(['--name', 'alice']);
    expect(result.options.name).toBe('alice');
    expect(result.positional).toEqual([]);
  });
});

describe('parseArgs() strict mode', () => {
  it('should accept known options in strict mode', () => {
    const result = parseArgs(['--verbose', '--output', 'out.txt'], {
      strict: true,
      knownOptions: ['verbose', 'output'],
    });
    expect(result.options.verbose).toBe(true);
    expect(result.options.output).toBe('out.txt');
  });

  it('should throw UnknownOptionError for unknown long option with value', () => {
    expect(() =>
      parseArgs(['--cdp-endpont', 'http://localhost:9222'], {
        strict: true,
        knownOptions: ['cdp-endpoint'],
      })
    ).toThrow(UnknownOptionError);
  });

  it('should throw UnknownOptionError for unknown --key=value', () => {
    expect(() =>
      parseArgs(['--foo-bar=baz'], {
        strict: true,
        knownOptions: ['verbose'],
      })
    ).toThrow(UnknownOptionError);
  });

  it('should include option name in error', () => {
    try {
      parseArgs(['--typo-flag'], { strict: true, knownOptions: ['verbose'] });
    } catch (e) {
      expect(e).toBeInstanceOf(UnknownOptionError);
      expect((e as UnknownOptionError).option).toBe('typo-flag');
    }
  });

  it('should throw for unknown --no-* option', () => {
    expect(() => parseArgs(['--no-cache'], { strict: true, knownOptions: ['verbose'] })).toThrow(
      UnknownOptionError
    );
  });

  it('should throw for unknown short option', () => {
    expect(() => parseArgs(['-x'], { strict: true, knownOptions: ['v'] })).toThrow(
      UnknownOptionError
    );
  });

  it('should accept --no-X when X is known', () => {
    const result = parseArgs(['--no-cache'], {
      strict: true,
      knownOptions: ['cache'],
    });
    expect(result.options.cache).toBe(false);
  });

  it('should not validate when strict is false (default)', () => {
    const result = parseArgs(['--unknown-flag', 'value']);
    expect(result.options['unknown-flag']).toBe('value');
  });

  it('should not validate when strict is true but knownOptions is undefined', () => {
    const result = parseArgs(['--unknown-flag'], { strict: true });
    expect(result.options['unknown-flag']).toBe(true);
  });

  it('should accept positional args regardless of strict mode', () => {
    const result = parseArgs(['foo', 'bar'], {
      strict: true,
      knownOptions: ['verbose'],
    });
    expect(result.positional).toEqual(['foo', 'bar']);
  });
});

describe('mergeArgsWithDefaults()', () => {
  const baseCommand: Command = {
    name: 'test',
    description: 'test command',
    options: [
      { name: 'output', type: 'string', description: 'output path', default: './out' },
      { name: 'verbose', type: 'boolean', description: 'verbose mode' },
      { name: 'count', type: 'number', description: 'count', default: 5 },
    ],
  };

  it('should fill default values for missing options', () => {
    const merged = mergeArgsWithDefaults({}, baseCommand);
    expect(merged.output).toBe('./out');
    expect(merged.count).toBe(5);
  });

  it('should not override user-provided values with defaults', () => {
    const merged = mergeArgsWithDefaults({ output: '/tmp' }, baseCommand);
    expect(merged.output).toBe('/tmp');
  });

  it('should set boolean options to false when not provided', () => {
    const merged = mergeArgsWithDefaults({}, baseCommand);
    expect(merged.verbose).toBe(false);
  });

  it('should preserve user-provided boolean value', () => {
    const merged = mergeArgsWithDefaults({ verbose: true }, baseCommand);
    expect(merged.verbose).toBe(true);
  });

  it('should handle command with no options', () => {
    const cmd: Command = { name: 'bare', description: 'no opts' };
    const merged = mergeArgsWithDefaults({ extra: 1 }, cmd);
    expect(merged).toEqual({ extra: 1 });
  });

  it('should handle empty options array', () => {
    const cmd: Command = { name: 'bare', description: 'no opts', options: [] };
    const merged = mergeArgsWithDefaults({}, cmd);
    expect(merged).toEqual({});
  });
});

describe('resolveShortOptions()', () => {
  const cmd: Command = {
    name: 'test',
    description: 'test',
    options: [
      { name: 'verbose', short: 'v', type: 'boolean', description: 'verbose' },
      { name: 'output', short: 'o', type: 'string', description: 'output' },
      { name: 'count', type: 'number', description: 'count' },
    ],
  };

  it('should expand short option to long name', () => {
    const resolved = resolveShortOptions({ v: true }, cmd);
    expect(resolved.verbose).toBe(true);
    expect(resolved.v).toBeUndefined();
  });

  it('should expand multiple short options', () => {
    const resolved = resolveShortOptions({ v: true, o: 'out.txt' }, cmd);
    expect(resolved.verbose).toBe(true);
    expect(resolved.output).toBe('out.txt');
    expect(resolved.v).toBeUndefined();
    expect(resolved.o).toBeUndefined();
  });

  it('should keep options without short alias unchanged', () => {
    const resolved = resolveShortOptions({ count: 5 }, cmd);
    expect(resolved.count).toBe(5);
  });

  it('should handle empty options', () => {
    const noOptsCmd: Command = { name: 'x', description: 'x' };
    const resolved = resolveShortOptions({ v: true }, noOptsCmd);
    expect(resolved).toEqual({ v: true });
  });
});
