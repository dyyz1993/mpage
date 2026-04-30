import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  getCommandHandler,
  hasCommand,
  executePageCommand,
} from '../../../src/server/commands/index.js';
import type { Page } from 'playwright-core';

function createMockPage(): Page {
  return {
    // eslint-disable-next-line require-await
    goto: mock.fn(async () => {}),
    // eslint-disable-next-line require-await
    title: mock.fn(async () => 'Test'),
    url: mock.fn(() => 'https://example.com'),
  } as unknown as Page;
}

describe('commands index', () => {
  describe('getCommandHandler', () => {
    it('should return handler for valid command', () => {
      const handler = getCommandHandler('goto');
      assert.ok(typeof handler === 'function');
    });

    it('should return null for invalid command', () => {
      const handler = getCommandHandler('nonexistent');
      assert.strictEqual(handler, null);
    });

    it('should resolve aliases', () => {
      const handler = getCommandHandler('findByText');
      assert.ok(typeof handler === 'function');
    });

    it('should resolve waitForTimeout alias', () => {
      const handler = getCommandHandler('waitForTimeout');
      assert.ok(typeof handler === 'function');
    });

    it('should return handler for select, check, waitForSelector', () => {
      assert.ok(typeof getCommandHandler('select') === 'function');
      assert.ok(typeof getCommandHandler('check') === 'function');
      assert.ok(typeof getCommandHandler('waitForSelector') === 'function');
    });
  });

  describe('hasCommand', () => {
    it('should return true for valid command', () => {
      assert.strictEqual(hasCommand('goto'), true);
      assert.strictEqual(hasCommand('click'), true);
      assert.strictEqual(hasCommand('fill'), true);
    });

    it('should return false for invalid command', () => {
      assert.strictEqual(hasCommand('nonexistent'), false);
    });

    it('should work with aliases', () => {
      assert.strictEqual(hasCommand('findByText'), true);
      assert.strictEqual(hasCommand('waitForTimeout'), true);
    });

    it('should recognize select, check, waitForSelector commands', () => {
      assert.strictEqual(hasCommand('select'), true);
      assert.strictEqual(hasCommand('check'), true);
      assert.strictEqual(hasCommand('waitForSelector'), true);
    });
  });

  describe('executePageCommand', () => {
    it('should execute valid command', async () => {
      const mockPage = createMockPage();
      const result = await executePageCommand(mockPage, 'url', {});

      assert.deepStrictEqual(result, { url: 'https://example.com' });
    });

    it('should throw for invalid command', async () => {
      const mockPage = createMockPage();

      // eslint-disable-next-line no-return-await, require-await
      await assert.rejects(async () => await executePageCommand(mockPage, 'nonexistent', {}), {
        message: 'Unknown command: nonexistent',
      });
    });
  });
});
