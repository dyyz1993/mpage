import { describe, it, expect } from 'vitest';
import { HelpGenerator } from '../../src/help/help-generator.js';
import { z } from 'zod';

describe('HelpGenerator — uncovered branch tests', () => {
  const gen = new HelpGenerator();

  describe('getZodType — ZodObject empty shape', () => {
    it('should return [object] for empty object schema', () => {
      const schema = z.object({});
      const type = (gen as any).getZodType(schema);
      expect(type).toBe('[object]');
    });
  });

  describe('getZodType — null schema', () => {
    it('should return [null] for null input', () => {
      const type = (gen as any).getZodType(null);
      expect(type).toBe('[null]');
    });
  });

  describe('getZodType — max depth', () => {
    it('should return [max-depth] when depth exceeds 3', () => {
      const type = (gen as any).getZodType(z.array(z.array(z.array(z.array(z.string())))), 4);
      expect(type).toBe('[max-depth]');
    });
  });

  describe('getZodType — ZodOptional/ZodDefault inner extraction paths', () => {
    it('should extract inner from ZodDefault with innerType', () => {
      const schema = z.string().default('hello');
      const type = (gen as any).getZodType(schema);
      expect(type).toBe('[unknown]');
    });

    it('should extract inner from ZodDefault wrapping an object', () => {
      const schema = z.object({ x: z.number() }).default({ x: 1 });
      const type = (gen as any).getZodType(schema);
      expect(type).toBe('[unknown]');
    });

    it('should handle ZodOptional wrapping ZodObject', () => {
      const schema = z.object({ a: z.string() }).optional();
      const type = (gen as any).getZodType(schema);
      expect(type).toBe('[object] { a }');
    });

    it('should handle schema without _def using constructor name', () => {
      const customSchema = {
        constructor: { name: 'CustomType' },
      };
      const type = (gen as any).getZodType(customSchema);
      expect(type).toBe('[CustomType]');
    });

    it('should handle ZodDefault-like schema where unwrap finds innerType', () => {
      const innerSchema = { _def: { typeName: 'ZodNumber' } };
      const schema = {
        _def: { typeName: 'ZodDefault', innerType: innerSchema },
      };
      const type = (gen as any).getZodType(schema);
      expect(type).toBe('[number]');
    });

    it('should handle ZodDefault-like schema with s.innerType property', () => {
      const innerSchema = { _def: { typeName: 'ZodBoolean' } };
      const schema = {
        _def: { typeName: 'ZodDefault' },
        innerType: innerSchema,
      };
      const type = (gen as any).getZodType(schema);
      expect(type).toBe('[boolean]');
    });

    it('should handle ZodOptional-like schema with sDef.type fallback', () => {
      const innerSchema = { _def: { typeName: 'ZodString' } };
      const schema = {
        _def: { typeName: 'ZodOptional', type: innerSchema },
      };
      const type = (gen as any).getZodType(schema);
      expect(type).toBe('[string]');
    });

    it('should handle ZodDefault-like schema with unwrap fallback', () => {
      const innerSchema = { _def: { typeName: 'ZodString' } };
      const schema = {
        _def: { typeName: 'ZodDefault' },
        unwrap: () => innerSchema,
      };
      const type = (gen as any).getZodType(schema);
      expect(type).toBe('[string]');
    });

    it('should return [string] for ZodDefault with no inner but has defaultValue', () => {
      const schema = {
        _def: { typeName: 'ZodDefault', defaultValue: () => 'x' },
      };
      const type = (gen as any).getZodType(schema);
      expect(type).toBe('[string]');
    });

    it('should return [unknown] for ZodDefault with no inner and no defaultValue', () => {
      const schema = {
        _def: { typeName: 'ZodDefault' },
      };
      const type = (gen as any).getZodType(schema);
      expect(type).toBe('[unknown]');
    });
  });

  describe('getZodType — ZodArray unwrap fallback', () => {
    it('should handle ZodArray with element type', () => {
      const schema = z.array(z.number());
      const type = (gen as any).getZodType(schema);
      expect(type).toBe('[[number]]');
    });

    it('should handle ZodArray-like with unwrap fallback for inner type', () => {
      const innerSchema = { _def: { typeName: 'ZodString' } };
      const schema = {
        _def: { typeName: 'ZodArray' },
        unwrap: () => ({ _def: { type: innerSchema } }),
      };
      const type = (gen as any).getZodType(schema);
      expect(type).toBe('[[string]]');
    });

    it('should handle ZodArray-like with no inner returning [unknown]', () => {
      const schema = {
        _def: { typeName: 'ZodArray' },
      };
      const type = (gen as any).getZodType(schema);
      expect(type).toBe('[[unknown]]');
    });
  });

  describe('generate — zodParameters fallback to _def.shape function', () => {
    it('should handle schema with _def.shape as function', () => {
      const fakeSchema = {
        _def: {
          shape: () => ({ field: { _def: { typeName: 'ZodString' }, isOptional: () => true } }),
        },
      };
      const result = (gen as any).zodParameters(fakeSchema, false, false);
      expect(result).toContain('field');
    });
  });

  describe('generate — zodResult fallback to _def.shape function', () => {
    it('should handle result schema with _def.shape as function', () => {
      const fakeSchema = {
        _def: {
          shape: () => ({
            data: { _def: { typeName: 'ZodString' } },
            tips: { _def: { typeName: 'ZodString' } },
          }),
        },
      };
      const result = (gen as any).zodResult(fakeSchema, false, false);
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
      const result = (gen as any).zodParameters(badSchema, false, false);
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
      const result = (gen as any).zodResult(badSchema, false, false);
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
      const type = (gen as any).getZodType(evil);
      expect(type).toBe('[unknown]');
    });
  });
});
