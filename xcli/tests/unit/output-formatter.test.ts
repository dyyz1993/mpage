import { describe, it, expect } from 'vitest';
import { OutputFormatter } from '../../src/core/output-formatter';

describe('OutputFormatter', () => {
  const fmt = new OutputFormatter();

  describe('format - JSON mode', () => {
    it('should format data as JSON', () => {
      const result = fmt.format({ items: [1, 2] }, { mode: 'json', color: false, emoji: false });
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({ items: [1, 2] });
    });

    it('should format null as JSON null', () => {
      const result = fmt.format(null, { mode: 'json', color: false, emoji: false });
      expect(result).toBe('null');
    });

    it('should format string as JSON string', () => {
      const result = fmt.format('hello', { mode: 'json', color: false, emoji: false });
      expect(result).toBe('"hello"');
    });

    it('should format array as JSON array', () => {
      const result = fmt.format([1, 2, 3], { mode: 'json', color: false, emoji: false });
      expect(JSON.parse(result)).toEqual([1, 2, 3]);
    });

    it('should pretty print with 2-space indent', () => {
      const result = fmt.format({ a: 1 }, { mode: 'json', color: false, emoji: false });
      expect(result).toContain('\n');
      expect(result).toContain('  ');
    });
  });

  describe('format - YAML mode', () => {
    it('should format primitive values', () => {
      expect(fmt.format('hello', { mode: 'yaml', color: false, emoji: false })).toContain('hello');
      expect(fmt.format(42, { mode: 'yaml', color: false, emoji: false })).toContain('42');
      expect(fmt.format(true, { mode: 'yaml', color: false, emoji: false })).toContain('true');
    });

    it('should format null as null', () => {
      const result = fmt.format(null, { mode: 'yaml', color: false, emoji: false });
      expect(result).toContain('null');
    });

    it('should format empty array as []', () => {
      const result = fmt.format([], { mode: 'yaml', color: false, emoji: false });
      expect(result).toContain('[]');
    });

    it('should format empty object as {}', () => {
      const result = fmt.format({}, { mode: 'yaml', color: false, emoji: false });
      expect(result).toContain('{}');
    });

    it('should format object with key-value pairs', () => {
      const result = fmt.format(
        { name: 'test', count: 5 },
        { mode: 'yaml', color: false, emoji: false }
      );
      expect(result).toContain('name: test');
      expect(result).toContain('count: 5');
    });

    it('should format array items with - prefix', () => {
      const result = fmt.format(['a', 'b'], { mode: 'yaml', color: false, emoji: false });
      expect(result).toContain('-');
      expect(result).toContain('"a"');
      expect(result).toContain('"b"');
    });

    it('should format nested objects', () => {
      const result = fmt.format(
        { outer: { inner: 'value' } },
        { mode: 'yaml', color: false, emoji: false }
      );
      expect(result).toContain('outer:');
      expect(result).toContain('inner: value');
    });

    it('should show tips with emoji when enabled', () => {
      const result = fmt.format(
        { data: 'x', tips: ['tip1'] },
        { mode: 'yaml', color: false, emoji: true }
      );
      expect(result).toContain('💡 tip1');
    });

    it('should show tips without emoji when disabled', () => {
      const result = fmt.format(
        { data: 'x', tips: ['tip1'] },
        { mode: 'yaml', color: false, emoji: false }
      );
      expect(result).toContain('tip1');
      expect(result).not.toContain('💡');
    });

    it('should handle null values in object', () => {
      const result = fmt.format(
        { name: null, value: undefined },
        { mode: 'yaml', color: false, emoji: false }
      );
      expect(result).toContain('null');
    });
  });

  describe('format - text mode', () => {
    it('should return string as-is', () => {
      const result = fmt.format('hello world', { mode: 'text', color: false, emoji: false });
      expect(result).toBe('hello world');
    });

    it('should format null/undefined as empty', () => {
      const withEmoji = fmt.format(null, { mode: 'text', color: false, emoji: true });
      expect(withEmoji).toContain('(empty)');
      expect(withEmoji).toContain('✅');

      const noEmoji = fmt.format(null, { mode: 'text', color: false, emoji: false });
      expect(noEmoji).toBe('(empty)');
    });

    it('should format boolean with emoji', () => {
      expect(fmt.format(true, { mode: 'text', color: false, emoji: true })).toContain('✅ true');
      expect(fmt.format(false, { mode: 'text', color: false, emoji: true })).toContain('❌ false');
      expect(fmt.format(true, { mode: 'text', color: false, emoji: false })).toBe('true');
      expect(fmt.format(false, { mode: 'text', color: false, emoji: false })).toBe('false');
    });

    it('should format number as string', () => {
      expect(fmt.format(42, { mode: 'text', color: false, emoji: false })).toBe('42');
    });

    it('should format empty array', () => {
      const withEmoji = fmt.format([], { mode: 'text', color: false, emoji: true });
      expect(withEmoji).toContain('(empty list)');

      const noEmoji = fmt.format([], { mode: 'text', color: false, emoji: false });
      expect(noEmoji).toBe('(empty list)');
    });

    it('should format array as numbered list', () => {
      const result = fmt.format(['a', 'b', 'c'], { mode: 'text', color: false, emoji: false });
      expect(result).toContain('1. a');
      expect(result).toContain('2. b');
      expect(result).toContain('3. c');
    });

    it('should format object as key-value lines', () => {
      const result = fmt.format(
        { name: 'test', count: 5 },
        { mode: 'text', color: false, emoji: false }
      );
      expect(result).toContain('name: test');
      expect(result).toContain('count: 5');
    });

    it('should apply color to object keys when color=true', () => {
      const result = fmt.format({ name: 'test' }, { mode: 'text', color: true, emoji: false });
      expect(result).toContain('\x1b[36m');
      expect(result).toContain('\x1b[0m');
    });

    it('should not apply color to keys when color=false', () => {
      const result = fmt.format({ name: 'test' }, { mode: 'text', color: false, emoji: false });
      expect(result).not.toContain('\x1b[');
    });

    it('should format empty object', () => {
      const withEmoji = fmt.format({}, { mode: 'text', color: false, emoji: true });
      expect(withEmoji).toBe('{}');

      const noEmoji = fmt.format({}, { mode: 'text', color: false, emoji: false });
      expect(noEmoji).toBe('(empty object)');
    });
  });

  describe('format defaults to text mode', () => {
    it('should default to text when mode not specified', () => {
      const result = fmt.format('hello', { color: false, emoji: false } as any);
      expect(result).toBe('hello');
    });
  });

  describe('formatError', () => {
    it('should format Error object with emoji', () => {
      const result = fmt.formatError(new Error('test error'), { color: false, emoji: true });
      expect(result).toContain('❌ Error');
      expect(result).toContain('test error');
    });

    it('should format string error with emoji', () => {
      const result = fmt.formatError('string error', { color: false, emoji: true });
      expect(result).toContain('❌ Error');
      expect(result).toContain('string error');
    });

    it('should format without emoji', () => {
      const result = fmt.formatError('err', { color: false, emoji: false });
      expect(result).toContain('Error: err');
      expect(result).not.toContain('❌');
    });

    it('should apply red color when color=true', () => {
      const result = fmt.formatError('err', { color: true, emoji: true });
      expect(result).toContain('\x1b[31m');
    });

    it('should not apply color when color=false', () => {
      const result = fmt.formatError('err', { color: false, emoji: true });
      expect(result).not.toContain('\x1b[');
    });
  });

  describe('formatSuccess', () => {
    it('should format with emoji when enabled', () => {
      const result = fmt.formatSuccess('done', { color: false, emoji: true });
      expect(result).toContain('✅');
      expect(result).toContain('done');
    });

    it('should format without emoji', () => {
      const result = fmt.formatSuccess('done', { color: false, emoji: false });
      expect(result).toBe('OK: done');
    });

    it('should apply green color when color=true', () => {
      const result = fmt.formatSuccess('done', { color: true, emoji: true });
      expect(result).toContain('\x1b[32m');
    });
  });
});
