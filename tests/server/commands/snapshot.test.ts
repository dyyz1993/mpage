import { describe, it } from 'node:test';
import assert from 'node:assert';
import { snapshotCommands } from '../../../src/server/commands/snapshot.js';
import type { Page } from 'playwright-core';

function createMockPage(evaluateResult: unknown = { json: {}, yaml: '' }) {
  const calls: { fn: unknown; args: unknown[] }[] = [];
  const mockPage = {
    evaluate: (fn: unknown, ...args: unknown[]) => {
      calls.push({ fn, args });
      if (typeof fn === 'function') {
        return Promise.resolve(evaluateResult);
      }
      return Promise.reject(new Error('page.evaluate received a string — vulnerable to injection'));
    },
    _calls: calls,
  } as unknown as Page & { _calls: typeof calls };
  return mockPage;
}

describe('a11y command — selector injection safety', () => {
  it('should pass selector as argument, not interpolate into string', async () => {
    const dangerousSelector = `'); throw new Error('injected');//`;
    const mockPage = createMockPage();

    await snapshotCommands.a11y(mockPage, { selector: dangerousSelector });

    assert.equal(mockPage._calls.length, 1, 'evaluate should be called once');
    const [call] = mockPage._calls;
    assert.equal(typeof call.fn, 'function', 'evaluate should receive a function, not a string');
    assert.equal(call.args[0], dangerousSelector, 'selector should be passed as argument');
  });

  it('should handle selectors with single quotes safely', async () => {
    const selectorWithQuotes = "[data-value='test']";
    const mockPage = createMockPage();

    await assert.doesNotReject(async () => {
      await snapshotCommands.a11y(mockPage, { selector: selectorWithQuotes });
    });

    const [call] = mockPage._calls;
    assert.equal(typeof call.fn, 'function');
    assert.equal(call.args[0], selectorWithQuotes);
  });

  it('should handle selectors with mixed quotes and special chars', async () => {
    const selector = `[aria-label="it's a \"test\""]`;
    const mockPage = createMockPage();

    await assert.doesNotReject(async () => {
      await snapshotCommands.a11y(mockPage, { selector });
    });

    const [call] = mockPage._calls;
    assert.equal(typeof call.fn, 'function');
    assert.equal(call.args[0], selector);
  });

  it('should use default selector "body" when none provided', async () => {
    const mockPage = createMockPage();

    await snapshotCommands.a11y(mockPage, {});

    const [call] = mockPage._calls;
    assert.equal(typeof call.fn, 'function');
    assert.equal(call.args[0], 'body');
  });
});
