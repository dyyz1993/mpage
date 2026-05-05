import { describe, it, expect, vi } from 'vitest';
import { navigationCommands } from '../../../src/server/commands/navigation.js';
import type { Page } from 'playwright-core';

function createMockPage(overrides: Partial<Page> = {}): Page {
  return {
    goto: vi.fn(() => {}),
    title: vi.fn(() => 'Test Page'),
    url: vi.fn(() => 'https://example.com'),
    ...overrides,
  } as unknown as Page;
}

describe('navigationCommands', () => {
  describe('goto', () => {
    it('should navigate to URL with default options', async () => {
      const mockPage = createMockPage();
      const result = await navigationCommands.goto(mockPage, { url: 'https://example.com' });

      expect(result).toStrictEqual({ url: 'https://example.com' });
      expect((mockPage.goto as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    });

    it('should navigate with custom waitUntil', async () => {
      const mockPage = createMockPage();
      await navigationCommands.goto(mockPage, {
        url: 'https://example.com',
        waitUntil: 'networkidle',
      });

      const call = (mockPage.goto as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1]).toStrictEqual({ waitUntil: 'networkidle', timeout: 30000 });
    });

    it('should navigate with custom timeout', async () => {
      const mockPage = createMockPage();
      await navigationCommands.goto(mockPage, {
        url: 'https://example.com',
        timeout: 5000,
      });

      const call = (mockPage.goto as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1]).toStrictEqual({ waitUntil: 'load', timeout: 5000 });
    });
  });

  describe('title', () => {
    it('should return page title', async () => {
      const mockPage = createMockPage();
      const result = await navigationCommands.title(mockPage, {});

      expect(result).toStrictEqual({ title: 'Test Page' });
    });
  });

  describe('url', () => {
    it('should return current URL', async () => {
      const mockPage = createMockPage();
      const result = await navigationCommands.url(mockPage, {});

      expect(result).toStrictEqual({ url: 'https://example.com' });
    });
  });
});
