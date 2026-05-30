import { describe, it, expect } from 'vitest';
import { parseArgsToRecord } from '../../src/commands/parser.js';
import { commands } from '../../src/commands/definitions.js';
import { z } from 'zod/v4';

describe('parseArgsToRecord', () => {
  it('should parse positional arguments', () => {
    const schema = z.object({ url: z.string() });
    const result = parseArgsToRecord(['https://example.com'], schema);
    expect(result).toStrictEqual({ url: 'https://example.com' });
  });

  it('should parse named arguments with --', () => {
    const schema = z.object({ url: z.string(), timeout: z.number().optional() });
    const result = parseArgsToRecord(['https://example.com', '--timeout', '5000'], schema);
    expect(result).toStrictEqual({ url: 'https://example.com', timeout: 5000 });
  });

  it('should parse boolean flags', () => {
    const schema = z.object({ force: z.boolean().optional() });
    const result = parseArgsToRecord(['--force'], schema);
    expect(result).toStrictEqual({ force: true });
  });

  it('should parse quoted strings', () => {
    const schema = z.object({ selector: z.string(), value: z.string() });
    const result = parseArgsToRecord(["'#kw'", "'hello world'"], schema);
    expect(result).toStrictEqual({ selector: '#kw', value: 'hello world' });
  });

  it('should parse double quoted strings', () => {
    const schema = z.object({ selector: z.string(), value: z.string() });
    const result = parseArgsToRecord(['"#kw"', '"hello world"'], schema);
    expect(result).toStrictEqual({ selector: '#kw', value: 'hello world' });
  });

  it('should parse float numbers', () => {
    const schema = z.object({ delay: z.number().optional() });
    const result = parseArgsToRecord(['--delay', '1.5'], schema);
    expect(result).toStrictEqual({ delay: 1.5 });
  });

  it('should parse --clean true as boolean', () => {
    const schema = z.object({ clean: z.boolean().optional() });
    const result = parseArgsToRecord(['--clean', 'true'], schema);
    expect(result).toStrictEqual({ clean: true });
  });

  it('should parse --clean false as boolean', () => {
    const schema = z.object({ clean: z.boolean().optional() });
    const result = parseArgsToRecord(['--clean', 'false'], schema);
    expect(result).toStrictEqual({ clean: false });
  });

  it('should work with real goto command schema', () => {
    const schema = commands.goto.schema;
    const result = parseArgsToRecord(['https://example.com', '--timeout', '10000'], schema);
    expect(result).toStrictEqual({ url: 'https://example.com', timeout: 10000 });
  });

  it('should work with real fill command schema', () => {
    const schema = commands.fill.schema;
    const result = parseArgsToRecord(["'#kw'", "'hello'"], schema);
    expect(result).toStrictEqual({ selector: '#kw', value: 'hello' });
  });

  it('should handle optional positional args', () => {
    const schema = z.object({
      selector: z.string(),
      x: z.number().optional(),
      y: z.number().optional(),
    });
    const result = parseArgsToRecord(["'body'", '100', '200'], schema);
    expect(result).toStrictEqual({ selector: 'body', x: 100, y: 200 });
  });

  it('should handle empty args array', () => {
    const result = parseArgsToRecord([]);
    expect(result).toStrictEqual({});
  });

  it('should handle args without schema', () => {
    const result = parseArgsToRecord(['--key', 'value']);
    expect(result).toStrictEqual({ key: 'value' });
  });

  it('should handle bare -- flag as boolean true', () => {
    const result = parseArgsToRecord(['--verbose']);
    expect(result).toStrictEqual({ verbose: true });
  });

  it('should handle --flag followed by --another as two flags', () => {
    const result = parseArgsToRecord(['--flag1', '--flag2']);
    expect(result).toStrictEqual({ flag1: true, flag2: true });
  });

  it('should parse integer from named arg', () => {
    const result = parseArgsToRecord(['--count', '42']);
    expect(result).toStrictEqual({ count: 42 });
  });

  it('should parse float from named arg', () => {
    const result = parseArgsToRecord(['--ratio', '3.14']);
    expect(result).toStrictEqual({ ratio: 3.14 });
  });

  it('should skip single dash args (not treated as positional)', () => {
    const schema = z.object({ selector: z.string() });
    const result = parseArgsToRecord(['-someValue'], schema);
    expect(result).toStrictEqual({});
  });

  it('should handle positional with boolean schema', () => {
    const schema = z.object({ flag: z.boolean() });
    const result = parseArgsToRecord(['true'], schema);
    expect(result).toStrictEqual({ flag: true });
  });

  it('should skip optional number field when positional is non-numeric', () => {
    const schema = z.object({
      name: z.string(),
      count: z.number().optional(),
    });
    const result = parseArgsToRecord(['hello'], schema);
    expect(result).toStrictEqual({ name: 'hello' });
  });

  it('should work with real select command schema', () => {
    const schema = commands.select.schema;
    const result = parseArgsToRecord(["'#city'", "'shanghai'"], schema);
    expect(result).toStrictEqual({ selector: '#city', value: 'shanghai' });
  });

  it('should work with real check command schema', () => {
    const schema = commands.check.schema;
    const result = parseArgsToRecord(["'#agree'"], schema);
    expect(result).toStrictEqual({ selector: '#agree' });
  });

  it('should work with real waitForSelector command schema', () => {
    const schema = commands.waitForSelector.schema;
    const result = parseArgsToRecord(["'.loaded'", '--timeout', '5000'], schema);
    expect(result).toStrictEqual({ selector: '.loaded', timeout: 5000 });
  });

  it('should parse waitForSelector without optional timeout', () => {
    const schema = commands.waitForSelector.schema;
    const result = parseArgsToRecord(["'.item'"], schema);
    expect(result).toStrictEqual({ selector: '.item' });
  });
});

describe('parseArgsToRecord: --key=value syntax', () => {
  it('should parse --key=value for strings', () => {
    const result = parseArgsToRecord(['--name=alice']);
    expect(result).toStrictEqual({ name: 'alice' });
  });

  it('should parse --key=value for integers', () => {
    const result = parseArgsToRecord(['--count=42']);
    expect(result).toStrictEqual({ count: 42 });
  });

  it('should parse --key=value for floats', () => {
    const result = parseArgsToRecord(['--ratio=3.14']);
    expect(result).toStrictEqual({ ratio: 3.14 });
  });

  it('should parse --key=true as boolean', () => {
    const result = parseArgsToRecord(['--enabled=true']);
    expect(result).toStrictEqual({ enabled: true });
  });

  it('should parse --key=false as boolean', () => {
    const result = parseArgsToRecord(['--enabled=false']);
    expect(result).toStrictEqual({ enabled: false });
  });

  it('should parse --key= negative integer', () => {
    const result = parseArgsToRecord(['--offset=-5']);
    expect(result).toStrictEqual({ offset: -5 });
  });

  it('should parse --key= negative float', () => {
    const result = parseArgsToRecord(['--delta=-2.5']);
    expect(result).toStrictEqual({ delta: -2.5 });
  });

  it('should parse --key= with quoted value', () => {
    const result = parseArgsToRecord(['--name="hello world"']);
    expect(result).toStrictEqual({ name: 'hello world' });
  });

  it('should parse --key= with single-quoted value', () => {
    const result = parseArgsToRecord(["--name='hello world'"]);
    expect(result).toStrictEqual({ name: 'hello world' });
  });

  it('should mix --key=value with --flag style', () => {
    const result = parseArgsToRecord(['--verbose', '--count=10']);
    expect(result).toStrictEqual({ verbose: true, count: 10 });
  });

  it('should mix --key=value with positional args', () => {
    const schema = z.object({ url: z.string(), timeout: z.number().optional() });
    const result = parseArgsToRecord(['https://example.com', '--timeout=5000'], schema);
    expect(result).toStrictEqual({ url: 'https://example.com', timeout: 5000 });
  });

  it('should parse value containing equals sign', () => {
    const result = parseArgsToRecord(['--expr=a=b']);
    expect(result).toStrictEqual({ expr: 'a=b' });
  });

  it('should parse --key= with empty value', () => {
    const result = parseArgsToRecord(['--name=']);
    expect(result).toStrictEqual({ name: '' });
  });

  it('should handle --key=value with real goto schema', () => {
    const schema = commands.goto.schema;
    const result = parseArgsToRecord(['https://example.com', '--timeout=8000'], schema);
    expect(result).toStrictEqual({ url: 'https://example.com', timeout: 8000 });
  });
});

describe('parseArgsToRecord: negative numbers', () => {
  it('should parse negative integer as named arg value', () => {
    const result = parseArgsToRecord(['--offset', '-5']);
    expect(result).toStrictEqual({ offset: -5 });
  });

  it('should parse negative float as named arg value', () => {
    const result = parseArgsToRecord(['--delta', '-2.5']);
    expect(result).toStrictEqual({ delta: -2.5 });
  });

  it('should parse negative integer as positional with schema', () => {
    const schema = z.object({ value: z.number() });
    const result = parseArgsToRecord(['-10'], schema);
    expect(result).toStrictEqual({ value: -10 });
  });

  it('should parse negative float as positional with schema', () => {
    const schema = z.object({ value: z.number() });
    const result = parseArgsToRecord(['-3.14'], schema);
    expect(result).toStrictEqual({ value: -3.14 });
  });

  it('should parse negative optional number positional', () => {
    const schema = z.object({ name: z.string(), offset: z.number().optional() });
    const result = parseArgsToRecord(['test', '-100'], schema);
    expect(result).toStrictEqual({ name: 'test', offset: -100 });
  });
});

describe('parseArgsToRecord: edge cases', () => {
  it('should treat -hello as flags when following --message (both become flags)', () => {
    const result = parseArgsToRecord(['--message', '-hello']);
    expect(result).toStrictEqual({ message: true });
  });

  it('should treat --flag followed by -v as two separate flags', () => {
    const result = parseArgsToRecord(['--label', '-v']);
    expect(result).toStrictEqual({ label: true });
  });

  it('should handle quoted --flag value', () => {
    const result = parseArgsToRecord(['--name', "'--not-a-flag'"]);
    expect(result).toStrictEqual({ name: '--not-a-flag' });
  });

  it('should handle double-dash positional separator', () => {
    const result = parseArgsToRecord(['--', 'value']);
    expect(result).toStrictEqual({});
  });

  it('should not treat "--" alone as a flag', () => {
    const result = parseArgsToRecord(['--']);
    expect(result).toStrictEqual({});
  });

  it('should handle URL as positional arg', () => {
    const schema = z.object({ url: z.string() });
    const result = parseArgsToRecord(['https://example.com/path?q=1&r=2'], schema);
    expect(result).toStrictEqual({ url: 'https://example.com/path?q=1&r=2' });
  });

  it('should handle multiple --key=value and positional', () => {
    const schema = z.object({
      url: z.string(),
      timeout: z.number().optional(),
      verbose: z.boolean().optional(),
    });
    const result = parseArgsToRecord(
      ['https://example.com', '--timeout=5000', '--verbose=true'],
      schema
    );
    expect(result).toStrictEqual({
      url: 'https://example.com',
      timeout: 5000,
      verbose: true,
    });
  });

  it('should handle value "0" as number', () => {
    const result = parseArgsToRecord(['--count', '0']);
    expect(result).toStrictEqual({ count: 0 });
  });

  it('should handle value "-0" as number via --key=value', () => {
    const result = parseArgsToRecord(['--count=-0']);
    expect(result.count).toBe(0);
  });

  it('should not treat "--" alone as a flag', () => {
    const result = parseArgsToRecord(['--']);
    expect(result).toStrictEqual({});
  });

  it('should handle --key=value where value is 0', () => {
    const result = parseArgsToRecord(['--count=0']);
    expect(result).toStrictEqual({ count: 0 });
  });

  it('should handle string value that looks like negative number via --key=value', () => {
    const result = parseArgsToRecord(['--label=-abc']);
    expect(result).toStrictEqual({ label: '-abc' });
  });

  it('should handle very large integer', () => {
    const result = parseArgsToRecord(['--big', '9999999999']);
    expect(result).toStrictEqual({ big: 9999999999 });
  });

  it('should handle positional before and after named args', () => {
    const schema = z.object({ src: z.string(), dst: z.string(), force: z.boolean().optional() });
    const result = parseArgsToRecord(['input.txt', '--force=true', 'output.txt'], schema);
    expect(result).toStrictEqual({ src: 'input.txt', dst: 'output.txt', force: true });
  });
});
