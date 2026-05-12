import { describe, it, expect } from 'vitest';
import { z } from 'zod/v4';
import { coerceCliArgs } from '../../src/param-coercion.js';

describe('coerceCliArgs()', () => {
  it('should coerce string to number when schema expects z.number()', () => {
    const schema = z.object({ count: z.number() });
    const result = coerceCliArgs(schema, { count: '42' });
    expect(result.count).toBe(42);
  });

  it('should coerce string to boolean when schema expects z.boolean()', () => {
    const schema = z.object({ enabled: z.boolean() });
    const result = coerceCliArgs(schema, { enabled: 'true' });
    expect(result.enabled).toBe(true);
  });

  it('should coerce "1" to true for z.boolean()', () => {
    const schema = z.object({ flag: z.boolean() });
    const result = coerceCliArgs(schema, { flag: '1' });
    expect(result.flag).toBe(true);
  });

  it('should coerce "0" to false for z.boolean()', () => {
    const schema = z.object({ flag: z.boolean() });
    const result = coerceCliArgs(schema, { flag: '0' });
    expect(result.flag).toBe(false);
  });

  it('should not coerce when value is already correct type', () => {
    const schema = z.object({ count: z.number() });
    const result = coerceCliArgs(schema, { count: 42 });
    expect(result.count).toBe(42);
  });

  it('should not coerce string field to number', () => {
    const schema = z.object({ name: z.string() });
    const result = coerceCliArgs(schema, { name: '42' });
    expect(result.name).toBe('42');
  });

  it('should keep fields not in schema unchanged', () => {
    const schema = z.object({ count: z.number() });
    const result = coerceCliArgs(schema, { count: '5', extra: 'hello' });
    expect(result.extra).toBe('hello');
  });

  it('should skip fields not present in rawArgs', () => {
    const schema = z.object({ count: z.number(), name: z.string() });
    const result = coerceCliArgs(schema, { count: '10' });
    expect(result.count).toBe(10);
    expect(result.name).toBeUndefined();
  });

  it('should handle undefined schema by returning raw args', () => {
    const result = coerceCliArgs(undefined, { foo: 'bar' });
    expect(result).toEqual({ foo: 'bar' });
  });

  it('should handle non-ZodObject schema by returning raw args', () => {
    const schema = z.string();
    const result = coerceCliArgs(schema, { foo: 'bar' });
    expect(result).toEqual({ foo: 'bar' });
  });

  it('should handle nested object values without coercion', () => {
    const schema = z.object({ data: z.object({ x: z.number() }) });
    const input = { data: { x: '5' } };
    const result = coerceCliArgs(schema, input);
    expect(result.data).toEqual({ x: '5' });
  });

  it('should coerce inside ZodDefault wrapping ZodNumber', () => {
    const schema = z.object({ count: z.number().default(0) });
    const result = coerceCliArgs(schema, { count: '7' });
    expect(result.count).toBe(7);
  });

  it('should coerce inside ZodDefault wrapping ZodBoolean', () => {
    const schema = z.object({ flag: z.boolean().default(false) });
    const result = coerceCliArgs(schema, { flag: 'true' });
    expect(result.flag).toBe(true);
  });

  it('should coerce float strings to number', () => {
    const schema = z.object({ ratio: z.number() });
    const result = coerceCliArgs(schema, { ratio: '3.14' });
    expect(result.ratio).toBeCloseTo(3.14);
  });

  it('should not coerce non-numeric string to number', () => {
    const schema = z.object({ count: z.number() });
    const result = coerceCliArgs(schema, { count: 'abc' });
    expect(result.count).toBe('abc');
  });

  it('should coerce "false" string to false for z.boolean()', () => {
    const schema = z.object({ flag: z.boolean() });
    const result = coerceCliArgs(schema, { flag: 'false' });
    expect(result.flag).toBe(false);
  });

  it('should handle optional fields without coercion when undefined', () => {
    const schema = z.object({ name: z.string().optional() });
    const result = coerceCliArgs(schema, {});
    expect(result.name).toBeUndefined();
  });

  it('should keep optional string field as-is when provided', () => {
    const schema = z.object({ name: z.string().optional() });
    const result = coerceCliArgs(schema, { name: 'hello' });
    expect(result.name).toBe('hello');
  });

  it('should handle empty schema', () => {
    const schema = z.object({});
    const result = coerceCliArgs(schema, { foo: 'bar' });
    expect(result).toEqual({ foo: 'bar' });
  });
});
