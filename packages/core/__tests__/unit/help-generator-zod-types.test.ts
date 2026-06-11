import { describe, it, expect } from 'vitest';
import { HelpGenerator } from '../../src/help/help-generator.js';
import { z } from 'zod/v4';

describe('HelpGenerator — getZodType 边界测试', () => {
  const gen = new HelpGenerator();
  const g = gen as unknown as { getZodType(schema: unknown, depth?: number): string };

  it('should handle nullable types (ZodNullable)', () => {
    const schema = z.string().nullable();
    const type = g.getZodType(schema);
    expect(type).toBe('[string]');
  });

  it('should unwrap ZodOptional with innerType property', () => {
    const schema = z.object({ name: z.string() }).optional();
    const type = g.getZodType(schema);
    expect(type).toBe('[object] { name }');
  });

  it('should unwrap ZodOptional with unwrap() method', () => {
    const schema = z.number().optional();
    const type = g.getZodType(schema);
    expect(type).toBe('[number]');
  });

  it('should unwrap ZodDefault with defaultValue as string fallback', () => {
    const schema = z.string().default('fallback');
    const type = g.getZodType(schema);
    expect(type).toBe('[string]');
  });

  it('should unwrap ZodDefault with multiple extraction paths', () => {
    const schema = z.object({ field: z.string() }).default({ field: 'value' });
    const type = g.getZodType(schema);
    expect(type).toBe('[object] { field }');
  });

  it('should handle ZodArray with innerType, wrapped, unwrap', () => {
    const schema = z.array(z.string());
    const type = g.getZodType(schema);
    expect(type).toBe('[[string]]');
  });

  it('should return [max-depth] when recursion depth > 3', () => {
    const schema = z.array(z.array(z.array(z.string())));
    const type = g.getZodType(schema);
    expect(type).toBe('[[[[string]]]]');
  });

  it('should return [unknown] on schema parsing errors', () => {
    const schema = { _def: null };
    const type = g.getZodType(schema);
    expect(type).toBe('[object]');
  });
});
