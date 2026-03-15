import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { navigationCommands } from '../../src/server/commands/navigation.js';
import type { Page } from 'playwright-core';

function createMockPage(overrides: Partial<Page> = {}): Page {
  return {
    goto: mock.fn(async () => {}),
    title: mock.fn(async () => 'Test Page'),
    url: mock.fn(() => 'https://example.com'),
    ...overrides,
  } as unknown as Page;
}

describe('navigationCommands', () => {
  describe('goto', () => {
    it('should navigate to URL with default options', async () => {
      const mockPage = createMockPage();
      const result = await navigationCommands.goto(mockPage, { url: 'https://example.com' });

      assert.deepStrictEqual(result, { url: 'https://example.com' });
      assert.strictEqual((mockPage.goto as ReturnType<typeof mock.fn>).mock.calls.length, 1);
    });

    it('should navigate with custom waitUntil', async () => {
      const mockPage = createMockPage();
      await navigationCommands.goto(mockPage, {
        url: 'https://example.com',
        waitUntil: 'networkidle',
      });

      const call = (mockPage.goto as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.deepStrictEqual(call.arguments[1], { waitUntil: 'networkidle', timeout: 30000 });
    });

    it('should navigate with custom timeout', async () => {
      const mockPage = createMockPage();
      await navigationCommands.goto(mockPage, {
        url: 'https://example.com',
        timeout: 5000,
      });

      const call = (mockPage.goto as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.deepStrictEqual(call.arguments[1], { waitUntil: 'load', timeout: 5000 });
    });
  });

  describe('title', () => {
    it('should return page title', async () => {
      const mockPage = createMockPage();
      const result = await navigationCommands.title(mockPage, {});

      assert.deepStrictEqual(result, { title: 'Test Page' });
    });
  });

  describe('url', () => {
    it('should return current URL', async () => {
      const mockPage = createMockPage();
      const result = await navigationCommands.url(mockPage, {});

      assert.deepStrictEqual(result, { url: 'https://example.com' });
    });
  });
});
