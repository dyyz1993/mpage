import { describe, it, expect } from 'vitest';
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

    expect(mockPage._calls.length).toBe(1);
    const [call] = mockPage._calls;
    expect(typeof call.fn === 'function').toBeTruthy();
    expect(call.args[0]).toBe(dangerousSelector);
  });

  it('should handle selectors with single quotes safely', async () => {
    const selectorWithQuotes = "[data-value='test']";
    const mockPage = createMockPage();

    await expect(
      snapshotCommands.a11y(mockPage, { selector: selectorWithQuotes })
    ).resolves.toBeDefined();

    const [call] = mockPage._calls;
    expect(typeof call.fn === 'function').toBeTruthy();
    expect(call.args[0]).toBe(selectorWithQuotes);
  });

  it('should handle selectors with mixed quotes and special chars', async () => {
    const selector = `[aria-label="it's a \"test\""]`;
    const mockPage = createMockPage();

    await expect(snapshotCommands.a11y(mockPage, { selector })).resolves.toBeDefined();

    const [call] = mockPage._calls;
    expect(typeof call.fn === 'function').toBeTruthy();
    expect(call.args[0]).toBe(selector);
  });

  it('should use default selector "body" when none provided', async () => {
    const mockPage = createMockPage();

    await snapshotCommands.a11y(mockPage, {});

    const [call] = mockPage._calls;
    expect(typeof call.fn === 'function').toBeTruthy();
    expect(call.args[0]).toBe('body');
  });
});
