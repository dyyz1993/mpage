import { describe, it, expect } from 'vitest';
import {
  ok,
  fail,
  withMeta,
  isCommandResult,
  wrapResult,
  type CommandResult,
} from '../../src/command-result.js';

describe('ok()', () => {
  it('should return success result with data and empty tips', () => {
    const result = ok('hello');
    expect(result).toEqual({ success: true, data: 'hello', tips: [] });
  });

  it('should include tips when provided', () => {
    const result = ok(42, ['tip1', 'tip2']);
    expect(result).toEqual({
      success: true,
      data: 42,
      tips: ['tip1', 'tip2'],
    });
  });

  it('should return null data when data is null', () => {
    const result = ok(null);
    expect(result).toEqual({ success: true, data: null, tips: [] });
  });

  it('should handle undefined data', () => {
    const result = ok(undefined);
    expect(result).toEqual({ success: true, data: undefined, tips: [] });
    expect(result.success).toBe(true);
  });

  it('should handle nested object data', () => {
    const data = { user: { name: 'Alice', scores: [1, 2, 3] } };
    const result = ok(data);
    expect(result.data).toEqual(data);
    expect(result.success).toBe(true);
  });

  it('should handle array data', () => {
    const result = ok([1, 2, 3]);
    expect(result).toEqual({ success: true, data: [1, 2, 3], tips: [] });
  });

  it('should default tips to empty array when not provided', () => {
    const result = ok('x');
    expect(result.tips).toEqual([]);
  });
});

describe('fail()', () => {
  it('should return failure result with message', () => {
    const result = fail('something went wrong');
    expect(result).toEqual({
      success: false,
      data: null,
      message: 'something went wrong',
      tips: [],
    });
  });

  it('should include tips when provided', () => {
    const result = fail('error', ['hint']);
    expect(result).toEqual({
      success: false,
      data: null,
      message: 'error',
      tips: ['hint'],
    });
  });

  it('should default tips to empty array', () => {
    const result = fail('no tips');
    expect(result.tips).toEqual([]);
  });
});

describe('withMeta()', () => {
  it('should add meta to a result', () => {
    const result = ok('data');
    const enriched = withMeta(result, { duration: 100, command: 'scrape' });
    expect(enriched).toEqual({
      success: true,
      data: 'data',
      tips: [],
      meta: { duration: 100, command: 'scrape' },
    });
  });

  it('should merge with existing meta', () => {
    const result = withMeta(ok('x'), { duration: 50 });
    const enriched = withMeta(result, { command: 'test' });
    expect(enriched.meta).toEqual({ duration: 50, command: 'test' });
  });

  it('should not mutate original result', () => {
    const result = ok('data');
    const enriched = withMeta(result, { duration: 10 });
    expect(result.meta).toBeUndefined();
    expect(enriched.meta).toEqual({ duration: 10 });
  });

  it('should work with fail result', () => {
    const result = fail('err');
    const enriched = withMeta(result, { site: 'example.com' });
    expect(enriched.meta).toEqual({ site: 'example.com' });
  });
});

describe('isCommandResult()', () => {
  it('should return true for ok result', () => {
    expect(isCommandResult(ok('x'))).toBe(true);
  });

  it('should return true for fail result', () => {
    expect(isCommandResult(fail('err'))).toBe(true);
  });

  it('should return false for null', () => {
    expect(isCommandResult(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isCommandResult(undefined)).toBe(false);
  });

  it('should return false for plain string', () => {
    expect(isCommandResult('hello')).toBe(false);
  });

  it('should return false for plain number', () => {
    expect(isCommandResult(42)).toBe(false);
  });

  it('should return false for object without success and tips', () => {
    expect(isCommandResult({ data: 1 })).toBe(false);
  });

  it('should return false for object with only success', () => {
    expect(isCommandResult({ success: true })).toBe(false);
  });

  it('should return true for object with success and tips', () => {
    expect(isCommandResult({ success: true, tips: [] })).toBe(true);
  });
});

describe('wrapResult()', () => {
  it('should pass through CommandResult unchanged', () => {
    const result = ok('data', ['tip']);
    expect(wrapResult(result)).toBe(result);
  });

  it('should wrap non-CommandResult with ok()', () => {
    const wrapped = wrapResult('raw string');
    expect(wrapped).toEqual({ success: true, data: 'raw string', tips: [] });
  });

  it('should wrap object without success/tips', () => {
    const raw = { items: [1, 2] };
    const wrapped = wrapResult(raw);
    expect(wrapped.success).toBe(true);
    expect(wrapped.data).toBe(raw);
  });

  it('should wrap null', () => {
    const wrapped = wrapResult(null);
    expect(wrapped).toEqual({ success: true, data: null, tips: [] });
  });

  it('should wrap number', () => {
    const wrapped = wrapResult(42);
    expect(wrapped).toEqual({ success: true, data: 42, tips: [] });
  });
});
