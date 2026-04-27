import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { CommandResult } from '../../src/types.js';

describe('CommandResult type contract', () => {
  it('success result should allow content and tips but not error', () => {
    const result: CommandResult = {
      success: true,
      content: { url: 'http://example.com' },
      tips: 'some tip',
    };
    assert.strictEqual(result.success, true);
    assert.ok(result.content);
  });

  it('failure result should require error and allow tips', () => {
    const result: CommandResult = {
      success: false,
      error: 'Something went wrong',
    };
    assert.strictEqual(result.success, false);
    assert.ok(result.error);
  });

  it('success result with no content is valid', () => {
    const result: CommandResult = {
      success: true,
    };
    assert.strictEqual(result.success, true);
  });
});
