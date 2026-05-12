import { describe, it, expect } from 'vitest';
import { z } from 'zod/v4';
import {
  SiteInstanceImpl,
  validateArgs,
  type ZodSchema,
} from '../../src/protocol/plugin-protocol.js';
import type { CommandContext, StorageContext } from '../../src/protocol/plugin-protocol.js';

function mockStorage(): StorageContext {
  const data = new Map<string, unknown>();
  return {
    get: async <T>(key: string): Promise<T | null> => (data.get(key) as T) ?? null,
    set: async <T>(key: string, value: T): Promise<void> => {
      data.set(key, value);
    },
    delete: async (key: string): Promise<void> => {
      data.delete(key);
    },
    clear: async (): Promise<void> => {
      data.clear();
    },
    keys: async (): Promise<string[]> => [...data.keys()],
  };
}

describe('ZodSchema type export', () => {
  it('should export ZodSchema type', () => {
    const schema: ZodSchema = z.object({ name: z.string() });
    expect(schema).toBeDefined();
    expect(schema.safeParse({ name: 'test' }).success).toBe(true);
  });
});

describe('handler params type inference via command registration', () => {
  it('should register command with parameters schema', () => {
    const site = new SiteInstanceImpl({ name: 'test', url: 'https://example.com' }, mockStorage());

    const schema = z.object({
      id: z.string(),
      count: z.number(),
    });

    site.command('get', {
      description: 'Get item',
      parameters: schema,
      handler: async (_params) => {
        return { success: true as const, data: { id: '', count: 0 } };
      },
    });

    const cmd = site.getCommand('get');
    expect(cmd).not.toBeNull();
    expect(cmd!.name).toBe('get');
    expect(cmd!.parameters).toBe(schema);
    expect(cmd!.description).toBe('Get item');
  });

  it('should register command without parameters', () => {
    const site = new SiteInstanceImpl({ name: 'test', url: 'https://example.com' }, mockStorage());

    site.command('list', {
      description: 'List all',
      handler: async () => {
        return { success: true as const, data: [] };
      },
    });

    const cmd = site.getCommand('list');
    expect(cmd).not.toBeNull();
    expect(cmd!.parameters).toBeUndefined();
  });

  it('should correctly type handler params from schema (compile-time)', () => {
    const site = new SiteInstanceImpl({ name: 'test', url: 'https://example.com' }, mockStorage());

    let receivedParams: unknown = null;

    site.command('typed', {
      description: 'Typed command',
      parameters: z.object({
        name: z.string(),
        age: z.number(),
      }),
      handler: async (params) => {
        receivedParams = params;
        return { success: true as const, data: params };
      },
    });

    expect(site.getCommand('typed')).not.toBeNull();
    expect(receivedParams).toBeNull();
  });
});

describe('validateArgs type inference', () => {
  it('should validate and return typed data', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const result = validateArgs<{ name: string; age: number }>(
      { parameters: schema },
      { name: 'Alice', age: 30 }
    );

    expect(result.name).toBe('Alice');
    expect(result.age).toBe(30);
  });

  it('should throw on invalid args', () => {
    const schema = z.object({
      id: z.string(),
    });

    expect(() => validateArgs({ parameters: schema }, { id: 123 })).toThrow();
  });

  it('should throw on missing required fields', () => {
    const schema = z.object({
      email: z.string(),
      password: z.string(),
    });

    expect(() => validateArgs({ parameters: schema }, { email: 'test@test.com' })).toThrow();
  });

  it('should handle optional fields', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
    });

    const result = validateArgs<{ name: string; age?: number }>(
      { parameters: schema },
      { name: 'Bob' }
    );

    expect(result.name).toBe('Bob');
    expect(result.age).toBeUndefined();
  });

  it('should work with buildInputSchema from options', () => {
    const result = validateArgs<Record<string, unknown>>(
      {
        options: [
          { name: 'limit', type: 'number', description: 'Max items' },
          { name: 'verbose', type: 'boolean', description: 'Verbose output' },
        ],
      },
      { limit: 10, verbose: true }
    );

    expect(result.limit).toBe(10);
    expect(result.verbose).toBe(true);
  });
});
