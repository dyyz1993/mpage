import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import {
  unwrapZod,
  fieldsFromZodObject,
  extractEnumValues,
  zodTypeToContractType,
  type ZodUnwrapResult,
} from '../src/param-reflection.js';

describe('unwrapZod', () => {
  it('returns the typeName and inner schema for a bare ZodString', () => {
    const s = z.string();
    const result: ZodUnwrapResult = unwrapZod(s);
    expect(result.typeName).toBe('ZodString');
    expect(result.optional).toBe(false);
    expect(result.defaultValue).toBeUndefined();
  });

  it('marks ZodOptional as optional and unwraps to inner type', () => {
    const s = z.string().optional();
    const result = unwrapZod(s);
    expect(result.typeName).toBe('ZodString');
    expect(result.optional).toBe(true);
  });

  it('marks ZodNullable as optional and unwraps to inner type', () => {
    const s = z.string().nullable();
    const result = unwrapZod(s);
    expect(result.typeName).toBe('ZodString');
    expect(result.optional).toBe(true);
  });

  it('unwraps ZodDefault and captures the default value', () => {
    const s = z.string().default('hello');
    const result = unwrapZod(s);
    expect(result.typeName).toBe('ZodString');
    expect(result.optional).toBe(true);
    expect(result.defaultValue).toBe('hello');
  });

  it('handles ZodDefault wrapping a function-style default', () => {
    const s = z.string().default(() => 'computed');
    const result = unwrapZod(s);
    expect(result.defaultValue).toBe('computed');
  });

  it('unwraps ZodOptional(ZodDefault(...))', () => {
    const s = z.string().default('x').optional();
    const result = unwrapZod(s);
    expect(result.typeName).toBe('ZodString');
    expect(result.optional).toBe(true);
    expect(result.defaultValue).toBe('x');
  });

  it('captures the description from any layer of the chain', () => {
    const s = z.string().describe('a name').default('anon');
    const result = unwrapZod(s);
    expect(result.description).toBe('a name');
  });

  it('returns unknown for nullish input', () => {
    expect(unwrapZod(null).typeName).toBe('unknown');
    expect(unwrapZod(undefined).typeName).toBe('unknown');
    expect(unwrapZod(42).typeName).toBe('unknown');
  });
});

describe('zodTypeToContractType', () => {
  it.each([
    ['ZodString', 'string'],
    ['ZodNumber', 'number'],
    ['ZodBoolean', 'boolean'],
    ['ZodEnum', 'enum'],
    ['ZodNativeEnum', 'enum'],
    ['ZodArray', 'array'],
    ['ZodObject', 'object'],
    ['ZodLiteral', 'literal'],
    ['ZodUnknown', 'unknown'],
  ])('maps %s to %s', (input, expected) => {
    expect(zodTypeToContractType(input)).toBe(expected);
  });
});

describe('extractEnumValues', () => {
  it('returns the string values for ZodEnum', () => {
    const s = z.enum(['red', 'green', 'blue']);
    expect(extractEnumValues(s)).toStrictEqual(['red', 'green', 'blue']);
  });

  it('returns string-keyed values for ZodNativeEnum', () => {
    enum Color {
      Red = 'red',
      Green = 'green',
    }
    const s = z.nativeEnum(Color);
    expect(extractEnumValues(s)?.sort()).toStrictEqual(['Red', 'red', 'Green', 'green'].sort());
  });

  it('returns undefined for non-enum schemas', () => {
    expect(extractEnumValues(z.string())).toBeUndefined();
    expect(extractEnumValues(z.number())).toBeUndefined();
  });
});

describe('fieldsFromZodObject', () => {
  it('returns an empty array for non-object schemas', () => {
    expect(fieldsFromZodObject(null)).toStrictEqual([]);
    expect(fieldsFromZodObject(z.string())).toStrictEqual([]);
  });

  it('produces a field entry per shape key', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      active: z.boolean(),
    });
    const fields = fieldsFromZodObject(schema);
    expect(fields).toHaveLength(3);
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]));
    expect(byName.name).toMatchObject({ type: 'string', required: true });
    expect(byName.age).toMatchObject({ type: 'number', required: true });
    expect(byName.active).toMatchObject({ type: 'boolean', required: true });
  });

  it('marks optional fields and captures their default', () => {
    const schema = z.object({
      name: z.string(),
      tag: z.string().default('misc').describe('A category tag'),
    });
    const fields = fieldsFromZodObject(schema);
    const tag = fields.find((f) => f.name === 'tag');
    expect(tag).toMatchObject({
      type: 'string',
      required: false,
      default: 'misc',
      description: 'A category tag',
    });
  });

  it('expands ZodEnum fields with the enum option list', () => {
    const schema = z.object({
      color: z.enum(['red', 'green', 'blue']),
    });
    const fields = fieldsFromZodObject(schema);
    expect(fields[0]).toMatchObject({
      name: 'color',
      type: 'enum',
      required: true,
      enum: ['red', 'green', 'blue'],
    });
  });

  it('produces an array field with item type metadata', () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });
    const fields = fieldsFromZodObject(schema);
    expect(fields[0]).toMatchObject({
      name: 'tags',
      type: 'array',
      required: true,
      itemType: { type: 'string', required: true },
    });
  });

  it('handles nested ZodObject with field shape', () => {
    const schema = z.object({
      address: z.object({
        city: z.string(),
        zip: z.string().optional(),
      }),
    });
    const fields = fieldsFromZodObject(schema);
    expect(fields[0]).toMatchObject({ name: 'address', type: 'object', required: true });
  });
});
