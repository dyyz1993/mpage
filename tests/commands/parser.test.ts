import { describe, it, expect } from 'vitest';
import { parseArgsToRecord } from '../../src/commands/parser.js';
import { commands } from '../../src/commands/definitions.js';
import { z } from 'zod';

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
