import { describe, it, expect } from 'vitest';
import { generateTips, formatResult } from '../../src/core/tips-engine';
import { ok, fail } from '../../src/core/command-result';

describe('tips-engine', () => {
  describe('generateTips', () => {
    it('should return tips for ctx.page errors', () => {
      const tips = generateTips('ctx.page is null');
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some((t) => t.includes('ctx.page'))).toBe(true);
    });

    it('should return tips for NOT_LOGGED_IN errors', () => {
      const tips = generateTips(new Error('NOT_LOGGED_IN'));
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some((t) => t.includes('login'))).toBe(true);
    });

    it('should return tips for INVALID_ARGS errors', () => {
      const tips = generateTips('INVALID_ARGS');
      expect(tips.some((t) => t.includes('coerce'))).toBe(true);
    });

    it('should return tips for Timeout errors', () => {
      const tips = generateTips(new Error('Timeout waiting for selector'));
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some((t) => t.includes('waitForSelector'))).toBe(true);
    });

    it('should return tips for ECONNREFUSED errors', () => {
      const tips = generateTips('ECONNREFUSED 127.0.0.1:3000');
      expect(tips.some((t) => t.includes('网站'))).toBe(true);
    });

    it('should return empty array for unknown errors', () => {
      const tips = generateTips('some random error');
      expect(tips).toEqual([]);
    });

    it('should accept both Error and string', () => {
      const fromError = generateTips(new Error('Timeout'));
      const fromString = generateTips('Timeout');
      expect(fromError.length).toBeGreaterThan(0);
      expect(fromString.length).toBeGreaterThan(0);
    });
  });

  describe('formatResult', () => {
    it('should format success result as JSON', () => {
      const result = ok({ items: [1, 2] });
      const formatted = formatResult(result, 'json');
      const parsed = JSON.parse(formatted);
      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual({ items: [1, 2] });
    });

    it('should format failure result as JSON', () => {
      const result = fail('error msg', ['tip1']);
      const formatted = formatResult(result, 'json');
      const parsed = JSON.parse(formatted);
      expect(parsed.success).toBe(false);
      expect(parsed.message).toBe('error msg');
    });

    it('should format success result as text', () => {
      const result = ok({ count: 5 }, ['a tip']);
      const formatted = formatResult(result, 'text');
      expect(formatted).toContain('"count": 5');
      expect(formatted).toContain('Tips:');
      expect(formatted).toContain('- a tip');
    });

    it('should format failure result as text', () => {
      const result = fail('something failed', ['try this']);
      const formatted = formatResult(result, 'text');
      expect(formatted).toContain('Error: something failed');
      expect(formatted).toContain('Suggestions:');
      expect(formatted).toContain('→ try this');
    });

    it('should format success result as yaml', () => {
      const result = ok({ name: 'test' });
      const formatted = formatResult(result, 'yaml');
      expect(formatted).toContain('success: true');
      expect(formatted).toContain('name: test');
    });

    it('should handle success with message in text mode', () => {
      const result = ok(null);
      result.message = 'Operation completed';
      const formatted = formatResult(result, 'text');
      expect(formatted).toContain('Operation completed');
    });

    it('should not include data section for null data in text mode', () => {
      const result = ok(null);
      const formatted = formatResult(result, 'text');
      expect(formatted).toBe('');
    });
  });
});
