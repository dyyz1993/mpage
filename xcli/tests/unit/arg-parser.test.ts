import { describe, it, expect } from 'vitest';
import { parseArgs, mergeArgsWithDefaults, resolveShortOptions } from '../../src/core/arg-parser';

describe('parseArgs', () => {
  describe('positional args', () => {
    it('should collect positional arguments', () => {
      const result = parseArgs(['site', 'scrape', 'selector']);
      expect(result.positional).toEqual(['site', 'scrape', 'selector']);
    });

    it('should return empty positional for no args', () => {
      const result = parseArgs([]);
      expect(result.positional).toEqual([]);
    });
  });

  describe('long flags (--xxx)', () => {
    it('should parse --flag as boolean true', () => {
      const result = parseArgs(['--verbose']);
      expect(result.options.verbose).toBe(true);
    });

    it('should parse --key value as key=value', () => {
      const result = parseArgs(['--name', 'test']);
      expect(result.options.name).toBe('test');
    });

    it('should parse --key=value', () => {
      const result = parseArgs(['--name=test']);
      expect(result.options.name).toBe('test');
    });

    it('should treat next arg as value only if not starting with -', () => {
      const result = parseArgs(['--name', '--other']);
      expect(result.options.name).toBe(true);
      expect(result.options.other).toBe(true);
    });

    it('should parse --no-xxx as false', () => {
      const result = parseArgs(['--no-color']);
      expect(result.options.color).toBe(false);
    });
  });

  describe('short flags (-x)', () => {
    it('should parse -f as boolean true', () => {
      const result = parseArgs(['-f']);
      expect(result.options.f).toBe(true);
    });

    it('should parse -f value as key=value', () => {
      const result = parseArgs(['-f', 'file.txt']);
      expect(result.options.f).toBe('file.txt');
    });

    it('should parse combined short flags -abc', () => {
      const result = parseArgs(['-abc']);
      expect(result.options.a).toBe(true);
      expect(result.options.b).toBe(true);
      expect(result.options.c).toBe(true);
    });

    it('should parse -ab value where first short consumes the value', () => {
      const result = parseArgs(['-ab', 'value']);
      expect(result.options.a).toBe('value');
      expect(result.options.b).toBe(true);
    });
  });

  describe('value parsing', () => {
    it('should parse "true" as boolean true', () => {
      expect(parseArgs(['--flag', 'true']).options.flag).toBe(true);
    });

    it('should parse "false" as boolean false', () => {
      expect(parseArgs(['--flag', 'false']).options.flag).toBe(false);
    });

    it('should parse "null" as null', () => {
      expect(parseArgs(['--flag', 'null']).options.flag).toBeNull();
    });

    it('should parse "undefined" as undefined', () => {
      expect(parseArgs(['--flag', 'undefined']).options.flag).toBeUndefined();
    });

    it('should parse integers', () => {
      expect(parseArgs(['--count', '42']).options.count).toBe(42);
    });

    it('should parse floats', () => {
      expect(parseArgs(['--ratio', '3.14']).options.ratio).toBeCloseTo(3.14);
    });

    it('should parse "[]" as empty array', () => {
      expect(parseArgs(['--items', '[]']).options.items).toEqual([]);
    });

    it('should parse "[a,b,c]" as array', () => {
      expect(parseArgs(['--items', '[a,b,c]']).options.items).toEqual(['a', 'b', 'c']);
    });

    it('should keep plain strings as-is', () => {
      expect(parseArgs(['--name', 'hello']).options.name).toBe('hello');
    });
  });

  describe('-- separator', () => {
    it('should collect everything after -- as-is', () => {
      const result = parseArgs(['site', 'cmd', '--', '--not-a-flag', 'value']);
      expect(result.positional).toEqual(['site', 'cmd']);
      expect(result['--']).toEqual(['--not-a-flag', 'value']);
    });

    it('should handle -- at start', () => {
      const result = parseArgs(['--', 'arg1', 'arg2']);
      expect(result['--']).toEqual(['arg1', 'arg2']);
      expect(result.positional).toEqual([]);
    });
  });

  describe('mixed args', () => {
    it('should handle positional + flags + values', () => {
      const result = parseArgs(['site', 'scrape', '--limit', '10', '--verbose']);
      expect(result.positional).toEqual(['site', 'scrape']);
      expect(result.options.limit).toBe(10);
      expect(result.options.verbose).toBe(true);
    });

    it('should handle repeated flags (last wins)', () => {
      const result = parseArgs(['--name', 'a', '--name', 'b']);
      expect(result.options.name).toBe('b');
    });
  });
});

describe('mergeArgsWithDefaults', () => {
  it('should apply defaults for missing options', () => {
    const command = {
      name: 'cmd',
      description: '',
      options: [
        { name: 'format', type: 'string', description: '', default: 'json' },
        { name: 'limit', type: 'number', description: '', default: 10 },
      ],
    };
    const result = mergeArgsWithDefaults({}, command);
    expect(result.format).toBe('json');
    expect(result.limit).toBe(10);
  });

  it('should not override user-provided values', () => {
    const command = {
      name: 'cmd',
      description: '',
      options: [{ name: 'format', type: 'string', description: '', default: 'json' }],
    };
    const result = mergeArgsWithDefaults({ format: 'yaml' }, command);
    expect(result.format).toBe('yaml');
  });

  it('should default boolean options to false', () => {
    const command = {
      name: 'cmd',
      description: '',
      options: [{ name: 'verbose', type: 'boolean', description: '' }],
    };
    const result = mergeArgsWithDefaults({}, command);
    expect(result.verbose).toBe(false);
  });

  it('should handle command with no options', () => {
    const command = { name: 'cmd', description: '' };
    const result = mergeArgsWithDefaults({ foo: 'bar' }, command);
    expect(result).toEqual({ foo: 'bar' });
  });
});

describe('resolveShortOptions', () => {
  it('should map short option to long option', () => {
    const command = {
      name: 'cmd',
      description: '',
      options: [{ name: 'output', short: 'o', type: 'string', description: '' }],
    };
    const result = resolveShortOptions({ o: 'json' }, command);
    expect(result.output).toBe('json');
    expect(result.o).toBeUndefined();
  });

  it('should keep unresolved short options', () => {
    const command = { name: 'cmd', description: '', options: [] };
    const result = resolveShortOptions({ x: true }, command);
    expect(result.x).toBe(true);
  });

  it('should handle multiple short options', () => {
    const command = {
      name: 'cmd',
      description: '',
      options: [
        { name: 'output', short: 'o', type: 'string', description: '' },
        { name: 'verbose', short: 'v', type: 'boolean', description: '' },
      ],
    };
    const result = resolveShortOptions({ o: 'json', v: true }, command);
    expect(result.output).toBe('json');
    expect(result.verbose).toBe(true);
  });

  it('should not touch long options', () => {
    const command = {
      name: 'cmd',
      description: '',
      options: [{ name: 'output', short: 'o', type: 'string', description: '' }],
    };
    const result = resolveShortOptions({ output: 'yaml' }, command);
    expect(result.output).toBe('yaml');
  });
});
