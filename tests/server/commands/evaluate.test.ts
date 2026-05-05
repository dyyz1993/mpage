import { describe, it, expect, vi } from 'vitest';
import { evaluateCommands } from '../../../src/server/commands/evaluate.js';
import type { Page } from 'playwright-core';

function createMockPage(evaluateReturn?: unknown): Page {
  return {
    evaluate: vi.fn(() => evaluateReturn),
  } as unknown as Page;
}

describe('evaluateCommands', () => {
  describe('evaluate', () => {
    it('should reject with error when expression is missing', async () => {
      const mockPage = createMockPage();
      await expect(evaluateCommands.evaluate(mockPage, {})).rejects.toThrow(
        /expression.*required/i
      );
    });

    it('should reject with error when expression is non-string', async () => {
      const mockPage = createMockPage();
      await expect(evaluateCommands.evaluate(mockPage, { expression: 123 })).rejects.toThrow(
        /expression.*string/i
      );
    });

    it('should succeed with valid string expression', async () => {
      const mockPage = createMockPage(42);
      const result = await evaluateCommands.evaluate(mockPage, { expression: '1+1' });

      expect(result).toStrictEqual({ result: 42 });
    });
  });

  describe('evaluateRaw', () => {
    it('should reject with error when script is missing', async () => {
      const mockPage = createMockPage();
      await expect(evaluateCommands.evaluateRaw(mockPage, {})).rejects.toThrow(/script.*required/i);
    });

    it('should reject with error when script is non-string', async () => {
      const mockPage = createMockPage();
      await expect(evaluateCommands.evaluateRaw(mockPage, { script: 456 })).rejects.toThrow(
        /script.*string/i
      );
    });
  });
});
