import { describe, it, expect } from 'vitest';
import { generateTips } from '../../src/output/tips-engine.js';

describe('generateTips', () => {
  it('matches ctx.page error', () => {
    const tips = generateTips('ctx.page is not available');
    expect(tips.length).toBeGreaterThanOrEqual(2);
    expect(tips[0]).toContain('ctx.page');
  });

  it('matches storage error', () => {
    const tips = generateTips('storage write failed');
    expect(tips.length).toBeGreaterThanOrEqual(2);
    expect(tips[0]).toContain('ctx.storage');
  });

  it('matches NOT_LOGGED_IN error', () => {
    const tips = generateTips('NOT_LOGGED_IN');
    expect(tips.length).toBeGreaterThanOrEqual(2);
    expect(tips[0]).toContain('login');
  });

  it('matches INVALID_ARGS error', () => {
    const tips = generateTips('INVALID_ARGS: bad params');
    expect(tips.length).toBeGreaterThanOrEqual(2);
    expect(tips[0]).toContain('Zod');
  });

  it('matches ECONNREFUSED error', () => {
    const tips = generateTips('Error: connect ECONNREFUSED 127.0.0.1:3000');
    expect(tips.length).toBeGreaterThanOrEqual(1);
    expect(tips[0]).toContain('可访问');
  });

  it('matches Timeout error case-insensitively', () => {
    const tips = generateTips('Timeout waiting for element');
    expect(tips.length).toBeGreaterThanOrEqual(1);
  });

  it('matches "waiting for selector" error', () => {
    const tips = generateTips('Error: waiting for selector ".item" failed');
    expect(tips.length).toBeGreaterThanOrEqual(1);
    expect(tips[0]).toContain('选择器');
  });

  it('accepts Error object', () => {
    const tips = generateTips(new Error('NOT_LOGGED_IN'));
    expect(tips.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty array for unmatched error', () => {
    const tips = generateTips('some random error message');
    expect(tips).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    const tips = generateTips('');
    expect(tips).toEqual([]);
  });

  it('combines tips from multiple matching patterns', () => {
    const tips = generateTips('NOT_LOGGED_IN and INVALID_ARGS');
    expect(tips.length).toBeGreaterThanOrEqual(4);
  });
});
