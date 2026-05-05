import { describe, it, expect, vi } from 'vitest';
import {
  getCommandHandler,
  hasCommand,
  executePageCommand,
} from '../../../src/server/commands/index.js';
import type { Page } from 'playwright-core';

function createMockPage(): Page {
  return {
    goto: vi.fn(() => {}),
    title: vi.fn(() => 'Test'),
    url: vi.fn(() => 'https://example.com'),
  } as unknown as Page;
}

describe('commands index', () => {
  describe('getCommandHandler', () => {
    it('should return handler for valid command', () => {
      const handler = getCommandHandler('goto');
      expect(typeof handler === 'function').toBeTruthy();
    });

    it('should return null for invalid command', () => {
      const handler = getCommandHandler('nonexistent');
      expect(handler).toBeNull();
    });

    it('should resolve aliases', () => {
      const handler = getCommandHandler('findByText');
      expect(typeof handler === 'function').toBeTruthy();
    });

    it('should resolve waitForTimeout alias', () => {
      const handler = getCommandHandler('waitForTimeout');
      expect(typeof handler === 'function').toBeTruthy();
    });

    it('should return handler for select, check, waitForSelector', () => {
      expect(typeof getCommandHandler('select') === 'function').toBeTruthy();
      expect(typeof getCommandHandler('check') === 'function').toBeTruthy();
      expect(typeof getCommandHandler('waitForSelector') === 'function').toBeTruthy();
    });
  });

  describe('hasCommand', () => {
    it('should return true for valid command', () => {
      expect(hasCommand('goto')).toBe(true);
      expect(hasCommand('click')).toBe(true);
      expect(hasCommand('fill')).toBe(true);
    });

    it('should return false for invalid command', () => {
      expect(hasCommand('nonexistent')).toBe(false);
    });

    it('should work with aliases', () => {
      expect(hasCommand('findByText')).toBe(true);
      expect(hasCommand('waitForTimeout')).toBe(true);
    });

    it('should recognize select, check, waitForSelector commands', () => {
      expect(hasCommand('select')).toBe(true);
      expect(hasCommand('check')).toBe(true);
      expect(hasCommand('waitForSelector')).toBe(true);
    });
  });

  describe('executePageCommand', () => {
    it('should execute valid command', async () => {
      const mockPage = createMockPage();
      const result = await executePageCommand(mockPage, 'url', {});

      expect(result).toStrictEqual({ url: 'https://example.com' });
    });

    it('should throw for invalid command', () => {
      const mockPage = createMockPage();

      expect(() => executePageCommand(mockPage, 'nonexistent', {})).toThrow(
        'Unknown command: nonexistent'
      );
    });
  });
});
