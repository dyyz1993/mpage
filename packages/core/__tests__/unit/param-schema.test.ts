import { describe, it, expect } from 'vitest';
import { z } from 'zod/v4';
import { extractParamFields, getCommandParamFields } from '../../src/param-schema.js';
import type { CommandEntry } from '../../src/protocol/plugin-protocol.js';

describe('extractParamFields()', () => {
  it('should extract string field', () => {
    const schema = z.object({ name: z.string() });
    const result = extractParamFields(schema);
    expect(result).toEqual({
      name: { type: 'string', required: true },
    });
  });

  it('should extract optional number', () => {
    const schema = z.object({ count: z.number().optional() });
    const result = extractParamFields(schema);
    expect(result).toEqual({
      count: { type: 'number', required: false },
    });
  });

  it('should extract enum', () => {
    const schema = z.object({ status: z.enum(['active', 'inactive']) });
    const result = extractParamFields(schema);
    expect(result).toEqual({
      status: { type: 'enum', required: true, enumValues: ['active', 'inactive'] },
    });
  });

  it('should extract optional enum', () => {
    const schema = z.object({ mode: z.enum(['fast', 'slow']).optional() });
    const result = extractParamFields(schema);
    expect(result).toEqual({
      mode: { type: 'enum', required: false, enumValues: ['fast', 'slow'] },
    });
  });

  it('should extract boolean', () => {
    const schema = z.object({ enabled: z.boolean() });
    const result = extractParamFields(schema);
    expect(result).toEqual({
      enabled: { type: 'boolean', required: true },
    });
  });

  it('should extract array of enums', () => {
    const schema = z.object({ items: z.array(z.enum(['x', 'y'])) });
    const result = extractParamFields(schema);
    expect(result).toEqual({
      items: {
        type: 'array',
        required: true,
        itemType: { type: 'enum', required: true, enumValues: ['x', 'y'] },
      },
    });
  });

  it('should extract default value', () => {
    const schema = z.object({ count: z.number().default(5) });
    const result = extractParamFields(schema);
    expect(result).toEqual({
      count: { type: 'number', required: false, default: 5 },
    });
  });

  it('should extract description from .describe()', () => {
    const schema = z.object({ name: z.string().describe('the name field') });
    const result = extractParamFields(schema);
    expect(result).toEqual({
      name: { type: 'string', required: true, description: 'the name field' },
    });
  });

  it('should extract complex mixed schema', () => {
    const schema = z.object({
      query: z.string(),
      category: z.enum(['news', 'blog']).optional(),
      tags: z.array(z.string()),
      verbose: z.boolean().default(false).describe('enable verbose output'),
    });
    const result = extractParamFields(schema);

    expect(result!.query).toEqual({ type: 'string', required: true });
    expect(result!.category).toEqual({
      type: 'enum',
      required: false,
      enumValues: ['news', 'blog'],
    });
    expect(result!.tags).toEqual({
      type: 'array',
      required: true,
      itemType: { type: 'string', required: true },
    });
    expect(result!.verbose).toEqual({
      type: 'boolean',
      required: false,
      default: false,
      description: 'enable verbose output',
    });
  });

  it('should return null for null/undefined input', () => {
    expect(extractParamFields(null as unknown as z.ZodType)).toBeNull();
    expect(extractParamFields(undefined as unknown as z.ZodType)).toBeNull();
  });
});

describe('getCommandParamFields()', () => {
  it('should extract fields from CommandEntry with parameters', () => {
    const entry: CommandEntry = {
      name: 'search',
      description: 'search something',
      scope: 'page',
      override: false,
      parameters: z.object({
        query: z.string(),
        limit: z.number().default(10),
      }),
      handler: async () => ({ data: [], tips: [] }),
    };
    const result = getCommandParamFields(entry);
    expect(result).toEqual({
      query: { type: 'string', required: true },
      limit: { type: 'number', required: false, default: 10 },
    });
  });

  it('should return null for CommandEntry without parameters', () => {
    const entry: CommandEntry = {
      name: 'ping',
      description: 'ping',
      scope: 'page',
      override: false,
      handler: async () => ({ data: [], tips: [] }),
    };
    expect(getCommandParamFields(entry)).toBeNull();
  });
});
