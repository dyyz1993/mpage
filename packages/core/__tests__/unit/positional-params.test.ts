import { describe, it, expect } from 'vitest';
import { z } from 'zod/v4';
import {
  extractPositionalParams,
  mapPositionalValues,
  unquote,
} from '../../src/positional-params.js';

describe('unquote()', () => {
  it('should remove double quotes', () => {
    expect(unquote('"hello"')).toBe('hello');
  });

  it('should remove single quotes', () => {
    expect(unquote("'hello'")).toBe('hello');
  });

  it('should return as-is if no quotes', () => {
    expect(unquote('hello')).toBe('hello');
  });

  it('should handle empty string', () => {
    expect(unquote('')).toBe('');
  });

  it('should not strip inner quotes', () => {
    expect(unquote('"hello \'world\'"')).toBe("hello 'world'");
  });
});

describe('extractPositionalParams()', () => {
  it('should return empty array for non-ZodObject schema', () => {
    expect(extractPositionalParams(z.string())).toEqual([]);
  });

  it('should return string field names in order', () => {
    const schema = z.object({ name: z.string(), path: z.string() });
    expect(extractPositionalParams(schema)).toEqual(['name', 'path']);
  });

  it('should include optional string fields', () => {
    const schema = z.object({ name: z.string(), alias: z.string().optional() });
    expect(extractPositionalParams(schema)).toEqual(['name', 'alias']);
  });

  it('should exclude number fields', () => {
    const schema = z.object({ name: z.string(), count: z.number() });
    expect(extractPositionalParams(schema)).toEqual(['name']);
  });

  it('should exclude boolean fields', () => {
    const schema = z.object({ name: z.string(), verbose: z.boolean() });
    expect(extractPositionalParams(schema)).toEqual(['name']);
  });

  it('should handle mixed schema', () => {
    const schema = z.object({
      name: z.string(),
      count: z.number(),
      verbose: z.boolean(),
      alias: z.string().optional(),
      limit: z.number().optional(),
    });
    expect(extractPositionalParams(schema)).toEqual(['name', 'alias']);
  });

  it('should return keys in schema definition order', () => {
    const schema = z.object({
      third: z.string().optional(),
      first: z.string(),
      second: z.string(),
    });
    expect(extractPositionalParams(schema)).toEqual(['third', 'first', 'second']);
  });

  it('should return empty array for empty object schema', () => {
    const schema = z.object({});
    expect(extractPositionalParams(schema)).toEqual([]);
  });
});

describe('mapPositionalValues()', () => {
  it('should map single positional value to first string field', () => {
    const schema = z.object({ name: z.string() });
    const result = mapPositionalValues(schema, ['alice'], {});
    expect(result.name).toBe('alice');
  });

  it('should map multiple positional values in order', () => {
    const schema = z.object({ name: z.string(), path: z.string() });
    const result = mapPositionalValues(schema, ['alice', '/tmp'], {});
    expect(result.name).toBe('alice');
    expect(result.path).toBe('/tmp');
  });

  it('should not override existing named args', () => {
    const schema = z.object({ name: z.string(), path: z.string() });
    const result = mapPositionalValues(schema, ['alice', '/tmp'], { name: 'bob' });
    expect(result.name).toBe('bob');
    expect(result.path).toBe('/tmp');
  });

  it('should coerce string to number for ZodNumber fields', () => {
    const schema = z.object({ name: z.string(), count: z.number() });
    const result = mapPositionalValues(schema, ['alice', '42'], {});
    expect(result.name).toBe('alice');
    expect(result.count).toBe(42);
  });

  it('should coerce string to boolean for ZodBoolean fields', () => {
    const schema = z.object({ name: z.string(), flag: z.boolean() });
    const result = mapPositionalValues(schema, ['alice', 'true'], {});
    expect(result.name).toBe('alice');
    expect(result.flag).toBe(true);
  });

  it('should handle ZodOptional<ZodString> like regular string', () => {
    const schema = z.object({ name: z.string(), alias: z.string().optional() });
    const result = mapPositionalValues(schema, ['alice', 'ali'], {});
    expect(result.name).toBe('alice');
    expect(result.alias).toBe('ali');
  });

  it('should skip optional number field when value is non-numeric', () => {
    const schema = z.object({
      query: z.string(),
      limit: z.number().optional(),
      output: z.string(),
    });
    const result = mapPositionalValues(schema, ['search', 'notanumber', 'out.txt'], {});
    expect(result.query).toBe('search');
    expect(result.limit).toBeUndefined();
    expect(result.output).toBe('notanumber');
  });

  it('should assign numeric value to optional number field when valid', () => {
    const schema = z.object({
      query: z.string(),
      limit: z.number().optional(),
    });
    const result = mapPositionalValues(schema, ['search', '10'], {});
    expect(result.query).toBe('search');
    expect(result.limit).toBe(10);
  });

  it('should unquote double-quoted values', () => {
    const schema = z.object({ name: z.string() });
    const result = mapPositionalValues(schema, ['"hello world"'], {});
    expect(result.name).toBe('hello world');
  });

  it('should unquote single-quoted values', () => {
    const schema = z.object({ name: z.string() });
    const result = mapPositionalValues(schema, ["'hello world'"], {});
    expect(result.name).toBe('hello world');
  });

  it('should return existing unchanged when no positional values', () => {
    const schema = z.object({ name: z.string() });
    const result = mapPositionalValues(schema, [], { name: 'preset' });
    expect(result).toEqual({ name: 'preset' });
  });

  it('should work with empty schema', () => {
    const schema = z.object({});
    const result = mapPositionalValues(schema, ['extra'], { foo: 'bar' });
    expect(result).toEqual({ foo: 'bar' });
  });

  it('should handle ZodDefault wrapping ZodString', () => {
    const schema = z.object({ name: z.string().default('anon') });
    const result = mapPositionalValues(schema, ['alice'], {});
    expect(result.name).toBe('alice');
  });

  it('should coerce "false" to false for ZodBoolean', () => {
    const schema = z.object({ flag: z.boolean() });
    const result = mapPositionalValues(schema, ['false'], {});
    expect(result.flag).toBe(false);
  });

  it('should coerce "1" to true for ZodBoolean', () => {
    const schema = z.object({ flag: z.boolean() });
    const result = mapPositionalValues(schema, ['1'], {});
    expect(result.flag).toBe(true);
  });

  it('should coerce "0" to false for ZodBoolean', () => {
    const schema = z.object({ flag: z.boolean() });
    const result = mapPositionalValues(schema, ['0'], {});
    expect(result.flag).toBe(false);
  });

  it('should handle float coercion for ZodNumber', () => {
    const schema = z.object({ ratio: z.number() });
    const result = mapPositionalValues(schema, ['3.14'], {});
    expect(result.ratio).toBeCloseTo(3.14);
  });

  it('should not coerce non-numeric string for ZodNumber', () => {
    const schema = z.object({ count: z.number() });
    const result = mapPositionalValues(schema, ['abc'], {});
    expect(result.count).toBe('abc');
  });

  it('should handle non-ZodObject schema by returning existing', () => {
    const result = mapPositionalValues(z.string(), ['val'], { foo: 'bar' });
    expect(result).toEqual({ foo: 'bar' });
  });
});
