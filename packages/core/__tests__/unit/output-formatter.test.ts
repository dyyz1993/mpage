import { describe, it, expect } from 'vitest';
import { OutputFormatter, outputFormatter } from '../../src/output-formatter.js';

describe('OutputFormatter', () => {
  const fmt = new OutputFormatter();

  describe('format (mode dispatch)', () => {
    it('defaults to text mode', () => {
      const result = fmt.format('hello');
      expect(result).toBe('hello');
    });

    it('formats as json when mode is json', () => {
      const result = fmt.format({ a: 1 }, { mode: 'json', color: false, emoji: false });
      expect(result).toBe(JSON.stringify({ a: 1 }, null, 2));
    });

    it('formats as yaml when mode is yaml', () => {
      const result = fmt.format({ name: 'test' }, { mode: 'yaml', color: false, emoji: false });
      expect(result).toContain('name: test');
    });
  });

  describe('formatJson', () => {
    it('formats objects', () => {
      const result = fmt.format({ x: 1, y: 'hi' }, { mode: 'json', color: false, emoji: false });
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({ x: 1, y: 'hi' });
    });

    it('formats arrays', () => {
      const result = fmt.format([1, 2, 3], { mode: 'json', color: false, emoji: false });
      expect(JSON.parse(result)).toEqual([1, 2, 3]);
    });

    it('formats null', () => {
      const result = fmt.format(null, { mode: 'json', color: false, emoji: false });
      expect(result).toBe('null');
    });

    it('formats strings', () => {
      const result = fmt.format('hello', { mode: 'json', color: false, emoji: false });
      expect(result).toBe('"hello"');
    });
  });

  describe('formatText', () => {
    it('returns string as-is', () => {
      expect(fmt.format('hello', { mode: 'text', color: false, emoji: false })).toBe('hello');
    });

    it('returns number as string', () => {
      expect(fmt.format(42, { mode: 'text', color: false, emoji: false })).toBe('42');
    });

    it('returns true with emoji', () => {
      expect(fmt.format(true, { mode: 'text', color: false, emoji: true })).toContain('✅');
    });

    it('returns true without emoji', () => {
      expect(fmt.format(true, { mode: 'text', color: false, emoji: false })).toBe('true');
    });

    it('returns false with emoji', () => {
      expect(fmt.format(false, { mode: 'text', color: false, emoji: true })).toContain('❌');
    });

    it('returns null with emoji', () => {
      expect(fmt.format(null, { mode: 'text', color: false, emoji: true })).toContain('✅');
      expect(fmt.format(null, { mode: 'text', color: false, emoji: true })).toContain('empty');
    });

    it('returns null without emoji', () => {
      expect(fmt.format(null, { mode: 'text', color: false, emoji: false })).toBe('(empty)');
    });

    it('formats arrays with numbering', () => {
      const result = fmt.format(['a', 'b'], { mode: 'text', color: false, emoji: false });
      expect(result).toContain('1. a');
      expect(result).toContain('2. b');
    });

    it('formats empty array with emoji', () => {
      expect(fmt.format([], { mode: 'text', color: false, emoji: true })).toContain('📭');
    });

    it('formats empty array without emoji', () => {
      expect(fmt.format([], { mode: 'text', color: false, emoji: false })).toBe('(empty list)');
    });

    it('formats objects with colored keys', () => {
      const result = fmt.format({ name: 'test' }, { mode: 'text', color: true, emoji: false });
      expect(result).toContain('\x1b[36mname\x1b[0m');
    });

    it('formats objects without colored keys', () => {
      const result = fmt.format({ name: 'test' }, { mode: 'text', color: false, emoji: false });
      expect(result).toBe('name: test');
    });

    it('formats empty object with emoji', () => {
      expect(fmt.format({}, { mode: 'text', color: false, emoji: true })).toBe('{}');
    });

    it('formats empty object without emoji', () => {
      expect(fmt.format({}, { mode: 'text', color: false, emoji: false })).toBe('(empty object)');
    });
  });

  describe('formatYaml', () => {
    it('formats flat object', () => {
      const result = fmt.format({ a: 1, b: 'hi' }, { mode: 'yaml', color: false, emoji: false });
      expect(result).toContain('a: 1');
      expect(result).toContain('b: hi');
    });

    it('formats null as null', () => {
      const result = fmt.format(null, { mode: 'yaml', color: false, emoji: false });
      expect(result).toContain('null');
    });

    it('formats numbers', () => {
      const result = fmt.format(42, { mode: 'yaml', color: false, emoji: false });
      expect(result).toBe('42');
    });

    it('formats strings with quotes', () => {
      const result = fmt.format('hello', { mode: 'yaml', color: false, emoji: false });
      expect(result).toBe('"hello"');
    });

    it('formats empty array as []', () => {
      const result = fmt.format([], { mode: 'yaml', color: false, emoji: false });
      expect(result).toContain('[]');
    });

    it('formats empty object as {}', () => {
      const result = fmt.format({}, { mode: 'yaml', color: false, emoji: false });
      expect(result).toContain('{}');
    });

    it('formats arrays with dash prefix', () => {
      const result = fmt.format([1, 2], { mode: 'yaml', color: false, emoji: false });
      expect(result).toContain('-');
      expect(result).toContain('1');
      expect(result).toContain('2');
    });

    it('renders tips with emoji', () => {
      const result = fmt.format(
        { data: [], tips: ['hello tip'] },
        { mode: 'yaml', color: false, emoji: true }
      );
      expect(result).toContain('💡 hello tip');
    });

    it('renders tips without emoji', () => {
      const result = fmt.format(
        { data: [], tips: ['hello tip'] },
        { mode: 'yaml', color: false, emoji: false }
      );
      expect(result).toContain('hello tip');
      expect(result).not.toContain('💡');
    });

    it('formats nested objects', () => {
      const result = fmt.format(
        { outer: { inner: 'val' } },
        { mode: 'yaml', color: false, emoji: false }
      );
      expect(result).toContain('outer:');
      expect(result).toContain('inner: val');
    });
  });

  describe('formatError', () => {
    it('formats Error object with emoji and color', () => {
      const result = fmt.formatError(new Error('boom'), { color: true, emoji: true });
      expect(result).toContain('❌ Error');
      expect(result).toContain('\x1b[31m');
      expect(result).toContain('boom');
    });

    it('formats string error with emoji and color', () => {
      const result = fmt.formatError('oops', { color: true, emoji: true });
      expect(result).toContain('❌ Error');
      expect(result).toContain('oops');
    });

    it('formats error without emoji', () => {
      const result = fmt.formatError('oops', { color: false, emoji: false });
      expect(result).not.toContain('❌');
      expect(result).toBe('Error: oops');
    });

    it('formats error without color', () => {
      const result = fmt.formatError('oops', { color: false, emoji: true });
      expect(result).not.toContain('\x1b[');
      expect(result).toContain('❌ Error');
    });
  });

  describe('formatSuccess', () => {
    it('formats with emoji and color', () => {
      const result = fmt.formatSuccess('done', { color: true, emoji: true });
      expect(result).toContain('✅');
      expect(result).toContain('\x1b[32m');
      expect(result).toContain('done');
    });

    it('formats without emoji', () => {
      const result = fmt.formatSuccess('done', { color: false, emoji: false });
      expect(result).toBe('OK: done');
    });

    it('formats with emoji but no color', () => {
      const result = fmt.formatSuccess('done', { color: false, emoji: true });
      expect(result).toContain('✅');
      expect(result).not.toContain('\x1b[');
    });
  });

  describe('yaml — null values in objects', () => {
    it('should render null values in yaml', () => {
      const result = fmt.format({ key: null }, { mode: 'yaml', color: false, emoji: false });
      expect(result).toContain('key: null');
    });

    it('should render undefined values in yaml', () => {
      const result = fmt.format({ key: undefined }, { mode: 'yaml', color: false, emoji: false });
      expect(result).toContain('key: null');
    });
  });

  describe('yaml — unknown data type fallback', () => {
    it('should stringify function values in yaml', () => {
      const fn = function testFn() {};
      const result = fmt.format(fn, { mode: 'yaml', color: false, emoji: false });
      expect(result).toContain('testFn');
    });
  });

  describe('text — unknown data type fallback', () => {
    it('should stringify function values in text', () => {
      const fn = function myFunc() {};
      const result = fmt.format(fn, { mode: 'text', color: false, emoji: false });
      expect(result).toContain('myFunc');
    });
  });

  describe('exported singleton', () => {
    it('outputFormatter is an instance of OutputFormatter', () => {
      expect(outputFormatter).toBeInstanceOf(OutputFormatter);
    });
  });
});
