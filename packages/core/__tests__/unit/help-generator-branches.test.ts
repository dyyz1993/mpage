import { describe, it, expect } from 'vitest';
import { HelpGenerator } from '../../src/help/help-generator.js';
import { z } from 'zod/v4';

describe('HelpGenerator — uncovered branch tests', () => {
  const gen = new HelpGenerator();
  const g = gen as unknown as {
    getZodType(schema: unknown, depth?: number): string;
    zodParameters(schema: unknown, color: boolean, emoji: boolean): string;
    zodResult(schema: unknown, color: boolean, emoji: boolean): string;
  };

  describe('getZodType — ZodObject empty shape', () => {
    it('should return [object] for empty object schema', () => {
      const schema = z.object({});
      const type = g.getZodType(schema);
      expect(type).toBe('[object]');
    });
  });

  describe('getZodType — null schema', () => {
    it('should return [null] for null input', () => {
      const type = g.getZodType(null);
      expect(type).toBe('[null]');
    });
  });

  describe('getZodType — max depth', () => {
    it('should return formatted max-depth when depth=4 on 4-nested array', () => {
      const type = g.getZodType(z.array(z.array(z.array(z.array(z.string())))), 4);
      expect(type).toBe('[max-depth[][]]');
    });
  });

  describe('getZodType — ZodOptional/ZodDefault inner extraction paths', () => {
    it('should extract inner from ZodDefault with innerType', () => {
      const schema = z.string().default('hello');
      const type = g.getZodType(schema);
      expect(type).toBe('[string]');
    });

    it('should extract inner from ZodDefault wrapping an object', () => {
      const schema = z.object({ x: z.number() }).default({ x: 1 });
      const type = g.getZodType(schema);
      expect(type).toBe('[object] { x }');
    });

    it('should handle ZodOptional wrapping ZodObject', () => {
      const schema = z.object({ a: z.string() }).optional();
      const type = g.getZodType(schema);
      expect(type).toBe('[object] { a }');
    });

    it('should handle schema without _def using constructor name', () => {
      const customSchema = {
        constructor: { name: 'CustomType' },
      };
      const type = g.getZodType(customSchema);
      expect(type).toBe('[customtype]');
    });

    it('should handle ZodDefault-like schema where unwrap finds innerType', () => {
      const innerSchema = { _def: { type: 'number' } };
      const schema = {
        _def: { type: 'default', innerType: innerSchema },
      };
      const type = g.getZodType(schema);
      expect(type).toBe('[number]');
    });

    it('should handle ZodDefault-like schema with s.innerType property', () => {
      const innerSchema = { _def: { type: 'boolean' } };
      const schema = {
        _def: { type: 'default' },
        innerType: innerSchema,
      };
      const type = g.getZodType(schema);
      expect(type).toBe('[unknown]');
    });

    it('should handle ZodOptional-like schema with sDef.type fallback', () => {
      const innerSchema = { _def: { type: 'string' } };
      const schema = {
        _def: { type: 'optional', innerType: innerSchema },
      };
      const type = g.getZodType(schema);
      expect(type).toBe('[string]');
    });

    it('should handle ZodDefault-like schema with unwrap fallback', () => {
      const innerSchema = { _def: { type: 'string' } };
      const schema = {
        _def: { type: 'default' },
        unwrap: () => innerSchema,
      };
      const type = g.getZodType(schema);
      expect(type).toBe('[unknown]');
    });

    it('should return [unknown] for ZodDefault with no inner but has defaultValue', () => {
      const schema = {
        _def: { type: 'default', defaultValue: () => 'x' },
      };
      const type = g.getZodType(schema);
      expect(type).toBe('[unknown]');
    });

    it('should return [unknown] for ZodDefault with no inner and no defaultValue', () => {
      const schema = {
        _def: { type: 'default' },
      };
      const type = g.getZodType(schema);
      expect(type).toBe('[unknown]');
    });
  });

  describe('getZodType — ZodArray unwrap fallback', () => {
    it('should handle ZodArray with element type', () => {
      const schema = z.array(z.number());
      const type = g.getZodType(schema);
      expect(type).toBe('[number[]]');
    });

    it('should handle ZodArray-like with unwrap fallback for inner type', () => {
      const innerSchema = { _def: { type: 'string' } };
      const schema = {
        _def: { type: 'array' },
        unwrap: () => ({ _def: { type: innerSchema } }),
      };
      const type = g.getZodType(schema);
      expect(type).toBe('[unknown[]]');
    });

    it('should handle ZodArray-like with no inner returning [unknown]', () => {
      const schema = {
        _def: { type: 'array' },
      };
      const type = g.getZodType(schema);
      expect(type).toBe('[unknown[]]');
    });
  });

  describe('generate — zodParameters fallback to _def.shape', () => {
    it('should handle schema with _def.shape as object', () => {
      const fakeSchema = {
        _def: {
          shape: { field: { _def: { type: 'string' }, isOptional: () => true } },
        },
      };
      const result = g.zodParameters(fakeSchema, false, false);
      expect(result).toContain('field');
    });
  });

  describe('generate — zodResult fallback to _def.shape', () => {
    it('should handle result schema with _def.shape as object', () => {
      const fakeSchema = {
        _def: {
          shape: {
            data: { _def: { type: 'string' } },
            tips: { _def: { type: 'string' } },
          },
        },
      };
      const result = g.zodResult(fakeSchema, false, false);
      expect(result).toContain('data');
      expect(result).not.toContain('tips');
    });
  });

  describe('generate — zodParameters error handling', () => {
    it('should handle unparseable schema gracefully', () => {
      const badSchema = {
        get shape() {
          throw new Error('bad schema');
        },
      };
      const result = g.zodParameters(badSchema, false, false);
      expect(result).toContain('无法解析参数 schema');
    });
  });

  describe('generate — zodResult error handling', () => {
    it('should handle unparseable result schema gracefully', () => {
      const badSchema = {
        get shape() {
          throw new Error('bad result');
        },
      };
      const result = g.zodResult(badSchema, false, false);
      expect(result).toContain('无法解析结果 schema');
    });
  });

  describe('getZodType — error in type detection', () => {
    it('should return [unknown] on exceptions', () => {
      const evil = {
        get _def() {
          throw new Error('boom');
        },
      };
      const type = g.getZodType(evil);
      expect(type).toBe('[unknown]');
    });
  });
});
