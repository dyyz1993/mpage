import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { interactionCommands } from '../../src/server/commands/interaction.js';
import type { Page, Locator } from 'playwright-core';

function createMockPage(overrides: Partial<Page> = {}): Page {
  const mockLocator: Locator = {
    scrollIntoViewIfNeeded: mock.fn(async () => {}),
  } as unknown as Locator;

  return {
    click: mock.fn(async () => {}),
    fill: mock.fn(async () => {}),
    type: mock.fn(async () => {}),
    press: mock.fn(async () => {}),
    hover: mock.fn(async () => {}),
    evaluate: mock.fn(async () => {}),
    locator: mock.fn(() => mockLocator),
    ...overrides,
  } as unknown as Page;
}

describe('interactionCommands', () => {
  describe('click', () => {
    it('should click element by selector', async () => {
      const mockPage = createMockPage();
      const result = await interactionCommands.click(mockPage, { selector: '#button' });

      assert.deepStrictEqual(result, { selector: '#button' });
      assert.strictEqual((mockPage.click as ReturnType<typeof mock.fn>).mock.calls.length, 1);
    });
  });

  describe('fill', () => {
    it('should fill input with value', async () => {
      const mockPage = createMockPage();
      const result = await interactionCommands.fill(mockPage, {
        selector: '#input',
        value: 'hello',
      });

      assert.deepStrictEqual(result, { selector: '#input', value: 'hello' });
      assert.strictEqual((mockPage.fill as ReturnType<typeof mock.fn>).mock.calls.length, 1);
    });
  });

  describe('type', () => {
    it('should type text into element', async () => {
      const mockPage = createMockPage();
      const result = await interactionCommands.type(mockPage, {
        selector: '#input',
        text: 'hello world',
      });

      assert.deepStrictEqual(result, { selector: '#input', text: 'hello world' });
      assert.strictEqual((mockPage.type as ReturnType<typeof mock.fn>).mock.calls.length, 1);
    });
  });

  describe('press', () => {
    it('should press key on element', async () => {
      const mockPage = createMockPage();
      const result = await interactionCommands.press(mockPage, {
        selector: '#input',
        key: 'Enter',
      });

      assert.deepStrictEqual(result, { key: 'Enter' });
      assert.strictEqual((mockPage.press as ReturnType<typeof mock.fn>).mock.calls.length, 1);
    });
  });

  describe('hover', () => {
    it('should hover over element', async () => {
      const mockPage = createMockPage();
      const result = await interactionCommands.hover(mockPage, { selector: '#button' });

      assert.deepStrictEqual(result, { selector: '#button' });
      assert.strictEqual((mockPage.hover as ReturnType<typeof mock.fn>).mock.calls.length, 1);
    });
  });

  describe('scroll', () => {
    it('should scroll to element when selector provided', async () => {
      const mockPage = createMockPage();
      const result = await interactionCommands.scroll(mockPage, { selector: '#section' });

      assert.deepStrictEqual(result, { scrolledTo: '#section' });
    });

    it('should scroll to coordinates when no selector', async () => {
      const mockPage = createMockPage();
      const result = await interactionCommands.scroll(mockPage, { x: 100, y: 200 });

      assert.deepStrictEqual(result, { x: 100, y: 200 });
      assert.strictEqual((mockPage.evaluate as ReturnType<typeof mock.fn>).mock.calls.length, 1);
    });

    it('should default to (0, 0) coordinates', async () => {
      const mockPage = createMockPage();
      const result = await interactionCommands.scroll(mockPage, {});

      assert.deepStrictEqual(result, { x: 0, y: 0 });
    });
  });
});
