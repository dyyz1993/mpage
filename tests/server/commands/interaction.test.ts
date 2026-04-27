import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { interactionCommands } from '../../../src/server/commands/interaction.js';
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

    it('should call page.evaluate after fill to dispatch input/change events for Vue/React reactivity', async () => {
      const mockPage = createMockPage();

      await interactionCommands.fill(mockPage, { selector: 'input', value: 'hello' });

      const evaluateCalls = (mockPage.evaluate as ReturnType<typeof mock.fn>).mock.calls;
      assert.ok(evaluateCalls.length >= 1, 'Should call page.evaluate after fill for reactivity');
      const fnArg = evaluateCalls[0].arguments[0];
      assert.strictEqual(typeof fnArg, 'function', 'evaluate should receive a function');
    });

    it('should NOT pass selector/value as Playwright fill options', async () => {
      const mockPage = createMockPage();

      await interactionCommands.fill(mockPage, {
        selector: 'input',
        value: 'hello',
        timeout: 5000,
      });

      const fillCalls = (mockPage.fill as ReturnType<typeof mock.fn>).mock.calls;
      const options = fillCalls[0].arguments[2] as Record<string, unknown>;
      assert.strictEqual(options['selector'], undefined, 'Should not pass selector as option');
      assert.strictEqual(options['value'], undefined, 'Should not pass value as option');
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

      assert.deepStrictEqual(result, { key: 'Enter', selector: '#input' });
      assert.strictEqual((mockPage.press as ReturnType<typeof mock.fn>).mock.calls.length, 1);
    });

    it('should work with key as first positional argument (no selector provided)', async () => {
      const mockPage = createMockPage();

      await interactionCommands.press(mockPage, { key: 'Enter' });

      const pressCalls = (mockPage.press as ReturnType<typeof mock.fn>).mock.calls;
      const [selector, key] = pressCalls[0].arguments as [string, string];
      assert.strictEqual(key, 'Enter', 'Key should be Enter');
      assert.ok(selector, 'Should have a default selector when none provided');
    });

    it('should NOT pass key/selector as Playwright press options', async () => {
      const mockPage = createMockPage();

      await interactionCommands.press(mockPage, { key: 'Enter', delay: 100 });

      const pressCalls = (mockPage.press as ReturnType<typeof mock.fn>).mock.calls;
      const options = pressCalls[0].arguments[2] as Record<string, unknown> | undefined;
      if (options) {
        assert.strictEqual(options['key'], undefined, 'Should not pass key as option');
        assert.strictEqual(options['selector'], undefined, 'Should not pass selector as option');
      }
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
