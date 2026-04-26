import { describe, it, expect } from 'vitest';
import { ok, fail, withMeta, wrapResult, isCommandResult } from '../../src/core/command-result';

describe('command-result', () => {
  describe('ok', () => {
    it('should create a success result with data', () => {
      const result = ok({ items: [1, 2, 3] });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ items: [1, 2, 3] });
      expect(result.tips).toEqual([]);
    });

    it('should create a success result with tips', () => {
      const result = ok('done', ['tip1', 'tip2']);
      expect(result.success).toBe(true);
      expect(result.data).toBe('done');
      expect(result.tips).toEqual(['tip1', 'tip2']);
    });

    it('should default tips to empty array when not provided', () => {
      const result = ok(42);
      expect(result.tips).toEqual([]);
    });
  });

  describe('fail', () => {
    it('should create a failure result', () => {
      const result = fail('something went wrong');
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.message).toBe('something went wrong');
      expect(result.tips).toEqual([]);
    });

    it('should create a failure result with tips', () => {
      const result = fail('error', ['suggestion1']);
      expect(result.success).toBe(false);
      expect(result.tips).toEqual(['suggestion1']);
    });
  });

  describe('withMeta', () => {
    it('should add meta to a result', () => {
      const result = ok('data');
      const withDuration = withMeta(result, { duration: 150, command: 'scrape' });
      expect(withDuration.meta).toEqual({ duration: 150, command: 'scrape' });
    });

    it('should merge meta with existing meta', () => {
      const result = withMeta(ok('data'), { duration: 100 });
      const merged = withMeta(result, { command: 'fetch', site: 'example' });
      expect(merged.meta).toEqual({ duration: 100, command: 'fetch', site: 'example' });
    });
  });

  describe('isCommandResult', () => {
    it('should return true for a valid CommandResult', () => {
      expect(isCommandResult(ok('data'))).toBe(true);
      expect(isCommandResult(fail('error'))).toBe(true);
    });

    it('should return false for non-CommandResult values', () => {
      expect(isCommandResult(null)).toBe(false);
      expect(isCommandResult(undefined)).toBe(false);
      expect(isCommandResult('string')).toBe(false);
      expect(isCommandResult({ success: true })).toBe(false);
      expect(isCommandResult({ data: null })).toBe(false);
    });
  });

  describe('wrapResult', () => {
    it('should return CommandResult as-is', () => {
      const result = ok('data');
      expect(wrapResult(result)).toBe(result);
    });

    it('should wrap a plain object into a success CommandResult', () => {
      const raw = { items: [1, 2], total: 2 };
      const wrapped = wrapResult(raw);
      expect(wrapped.success).toBe(true);
      expect(wrapped.data).toEqual(raw);
      expect(wrapped.tips).toEqual([]);
    });

    it('should wrap a string into a success CommandResult', () => {
      const wrapped = wrapResult('hello');
      expect(wrapped.success).toBe(true);
      expect(wrapped.data).toBe('hello');
    });

    it('should wrap null into a success CommandResult', () => {
      const wrapped = wrapResult(null);
      expect(wrapped.success).toBe(true);
      expect(wrapped.data).toBeNull();
    });
  });
});
