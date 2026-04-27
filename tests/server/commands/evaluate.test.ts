import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { evaluateCommands } from '../../../src/server/commands/evaluate.js';
import type { Page } from 'playwright-core';

function createMockPage(evaluateReturn?: unknown): Page {
  return {
    // eslint-disable-next-line require-await
    evaluate: mock.fn(async () => evaluateReturn),
  } as unknown as Page;
}

describe('evaluateCommands', () => {
  describe('evaluate', () => {
    it('should reject with error when expression is missing', async () => {
      const mockPage = createMockPage();
      await assert.rejects(() => evaluateCommands.evaluate(mockPage, {}), /expression.*required/i);
    });

    it('should reject with error when expression is non-string', async () => {
      const mockPage = createMockPage();
      await assert.rejects(
        () => evaluateCommands.evaluate(mockPage, { expression: 123 }),
        /expression.*string/i
      );
    });

    it('should succeed with valid string expression', async () => {
      const mockPage = createMockPage(42);
      const result = await evaluateCommands.evaluate(mockPage, { expression: '1+1' });

      assert.deepStrictEqual(result, { result: 42 });
    });
  });

  describe('evaluateRaw', () => {
    it('should reject with error when script is missing', async () => {
      const mockPage = createMockPage();
      await assert.rejects(() => evaluateCommands.evaluateRaw(mockPage, {}), /script.*required/i);
    });

    it('should reject with error when script is non-string', async () => {
      const mockPage = createMockPage();
      await assert.rejects(
        () => evaluateCommands.evaluateRaw(mockPage, { script: 456 }),
        /script.*string/i
      );
    });
  });
});
