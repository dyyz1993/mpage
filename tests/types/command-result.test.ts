import { describe, it, expect } from 'vitest';
import type { CommandResult } from '../../src/types.js';

describe('CommandResult type contract', () => {
  it('success result should allow content and tips but not error', () => {
    const result: CommandResult = {
      success: true,
      content: { url: 'http://example.com' },
      tips: 'some tip',
    };
    expect(result.success).toBe(true);
    expect(result.content).toBeTruthy();
  });

  it('failure result should require error and allow tips', () => {
    const result: CommandResult = {
      success: false,
      error: 'Something went wrong',
    };
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('success result with no content is valid', () => {
    const result: CommandResult = {
      success: true,
    };
    expect(result.success).toBe(true);
  });
});
