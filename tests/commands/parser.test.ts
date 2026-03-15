import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseArgsToRecord } from '../../src/commands/parser.js';
import { commands } from '../../src/commands/definitions.js';
import { z } from 'zod';

describe('parseArgsToRecord', () => {
  it('should parse positional arguments', () => {
    const schema = z.object({ url: z.string() });
    const result = parseArgsToRecord(['https://example.com'], schema);
    assert.deepStrictEqual(result, { url: 'https://example.com' });
  });

  it('should parse named arguments with --', () => {
    const schema = z.object({ url: z.string(), timeout: z.number().optional() });
    const result = parseArgsToRecord(['https://example.com', '--timeout', '5000'], schema);
    assert.deepStrictEqual(result, { url: 'https://example.com', timeout: 5000 });
  });

  it('should parse boolean flags', () => {
    const schema = z.object({ force: z.boolean().optional() });
    const result = parseArgsToRecord(['--force'], schema);
    assert.deepStrictEqual(result, { force: true });
  });

  it('should parse quoted strings', () => {
    const schema = z.object({ selector: z.string(), value: z.string() });
    const result = parseArgsToRecord(["'#kw'", "'hello world'"], schema);
    assert.deepStrictEqual(result, { selector: '#kw', value: 'hello world' });
  });

  it('should parse double quoted strings', () => {
    const schema = z.object({ selector: z.string(), value: z.string() });
    const result = parseArgsToRecord(['"#kw"', '"hello world"'], schema);
    assert.deepStrictEqual(result, { selector: '#kw', value: 'hello world' });
  });

  it('should parse float numbers', () => {
    const schema = z.object({ delay: z.number().optional() });
    const result = parseArgsToRecord(['--delay', '1.5'], schema);
    assert.deepStrictEqual(result, { delay: 1.5 });
  });

  it('should parse --clean true as boolean', () => {
    const schema = z.object({ clean: z.boolean().optional() });
    const result = parseArgsToRecord(['--clean', 'true'], schema);
    assert.deepStrictEqual(result, { clean: true });
  });

  it('should parse --clean false as boolean', () => {
    const schema = z.object({ clean: z.boolean().optional() });
    const result = parseArgsToRecord(['--clean', 'false'], schema);
    assert.deepStrictEqual(result, { clean: false });
  });

  it('should work with real goto command schema', () => {
    const schema = commands.goto.schema;
    const result = parseArgsToRecord(['https://example.com', '--timeout', '10000'], schema);
    assert.deepStrictEqual(result, { url: 'https://example.com', timeout: 10000 });
  });

  it('should work with real fill command schema', () => {
    const schema = commands.fill.schema;
    const result = parseArgsToRecord(["'#kw'", "'hello'"], schema);
    assert.deepStrictEqual(result, { selector: '#kw', value: 'hello' });
  });

  it('should handle optional positional args', () => {
    const schema = z.object({
      selector: z.string(),
      x: z.number().optional(),
      y: z.number().optional(),
    });
    const result = parseArgsToRecord(["'body'", '100', '200'], schema);
    assert.deepStrictEqual(result, { selector: 'body', x: 100, y: 200 });
  });
});
