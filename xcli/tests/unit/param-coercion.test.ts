import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { coerceCliArgs } from '../../src/core/param-coercion';

describe('coerceCliArgs', () => {
  it('should return raw args when schema is undefined', () => {
    const raw = { name: 'test', count: '5' };
    expect(coerceCliArgs(undefined, raw)).toEqual(raw);
  });

  it('should coerce string to number for ZodNumber fields', () => {
    const schema = z.object({ count: z.number() });
    const result = coerceCliArgs(schema, { count: '42' });
    expect(result.count).toBe(42);
    expect(typeof result.count).toBe('number');
  });

  it('should coerce string to number for ZodNumber inside ZodDefault', () => {
    const schema = z.object({ page: z.number().default(1) });
    const result = coerceCliArgs(schema, { page: '3' });
    expect(result.page).toBe(3);
  });

  it('should coerce string to boolean for ZodBoolean fields', () => {
    const schema = z.object({ verbose: z.boolean() });
    expect(coerceCliArgs(schema, { verbose: 'true' }).verbose).toBe(true);
    expect(coerceCliArgs(schema, { verbose: '1' }).verbose).toBe(true);
    expect(coerceCliArgs(schema, { verbose: 'false' }).verbose).toBe(false);
    expect(coerceCliArgs(schema, { verbose: '0' }).verbose).toBe(false);
  });

  it('should not coerce non-string values', () => {
    const schema = z.object({ count: z.number() });
    const result = coerceCliArgs(schema, { count: 10 });
    expect(result.count).toBe(10);
  });

  it('should skip undefined fields', () => {
    const schema = z.object({ count: z.number(), name: z.string() });
    const result = coerceCliArgs(schema, { name: 'hello' });
    expect(result.name).toBe('hello');
    expect(result.count).toBeUndefined();
  });

  it('should not coerce NaN strings to number', () => {
    const schema = z.object({ count: z.number() });
    const result = coerceCliArgs(schema, { count: 'not-a-number' });
    expect(result.count).toBe('not-a-number');
  });

  it('should leave string fields unchanged', () => {
    const schema = z.object({ name: z.string() });
    const result = coerceCliArgs(schema, { name: '42' });
    expect(result.name).toBe('42');
    expect(typeof result.name).toBe('string');
  });

  it('should handle mixed schema with multiple types', () => {
    const schema = z.object({
      name: z.string(),
      count: z.number(),
      verbose: z.boolean(),
      page: z.number().default(1),
    });
    const result = coerceCliArgs(schema, {
      name: 'test',
      count: '10',
      verbose: 'true',
      page: '2',
    });
    expect(result).toEqual({ name: 'test', count: 10, verbose: true, page: 2 });
  });
});
