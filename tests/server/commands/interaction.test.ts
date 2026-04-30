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
    selectOption: mock.fn(() => Promise.resolve([])),
    check: mock.fn(() => Promise.resolve()),
    waitForSelector: mock.fn(() => Promise.resolve({})),
    waitForTimeout: mock.fn(async () => {}),
    waitForLoadState: mock.fn(async () => {}),
    ...overrides,
  } as unknown as Page;
}

describe('interactionCommands - click', () => {
  it('should click element by selector', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.click(mockPage, { selector: '#button' });

    assert.deepStrictEqual(result, { selector: '#button' });
    assert.strictEqual((mockPage.click as ReturnType<typeof mock.fn>).mock.calls.length, 1);
  });

  it('should pass timeout option to click', async () => {
    const mockPage = createMockPage();
    await interactionCommands.click(mockPage, { selector: '#btn', timeout: 5000 });

    const calls = (mockPage.click as ReturnType<typeof mock.fn>).mock.calls;
    const options = calls[0].arguments[1] as Record<string, unknown>;
    assert.strictEqual(options.timeout, 5000);
  });

  it('should pass force option to click', async () => {
    const mockPage = createMockPage();
    await interactionCommands.click(mockPage, { selector: '#btn', force: true });

    const calls = (mockPage.click as ReturnType<typeof mock.fn>).mock.calls;
    const options = calls[0].arguments[1] as Record<string, unknown>;
    assert.strictEqual(options.force, true);
  });

  it('should wait for selector before clicking when element not immediately visible', async () => {
    const mockPage = createMockPage();
    await interactionCommands.click(mockPage, { selector: '#btn', timeout: 3000 });

    const waitCalls = (mockPage.waitForSelector as ReturnType<typeof mock.fn>).mock.calls;
    assert.strictEqual(waitCalls.length, 1, 'should call waitForSelector before click');
    assert.strictEqual(waitCalls[0].arguments[0], '#btn');
  });
});

describe('interactionCommands - select', () => {
  it('should select option by selector and value', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.select(mockPage, {
      selector: '#city',
      value: 'shanghai',
    });

    assert.deepStrictEqual(result, { selector: '#city', value: 'shanghai' });
    assert.strictEqual((mockPage.selectOption as ReturnType<typeof mock.fn>).mock.calls.length, 1);
  });

  it('should call selectOption with correct arguments', async () => {
    const mockPage = createMockPage();
    await interactionCommands.select(mockPage, { selector: '#sel', value: 'opt1' });

    const calls = (mockPage.selectOption as ReturnType<typeof mock.fn>).mock.calls;
    assert.strictEqual(calls[0].arguments[0], '#sel');
    assert.strictEqual(calls[0].arguments[1], 'opt1');
  });
});

describe('interactionCommands - check', () => {
  it('should check checkbox by selector', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.check(mockPage, { selector: '#agree' });

    assert.deepStrictEqual(result, { selector: '#agree' });
    assert.strictEqual((mockPage.check as ReturnType<typeof mock.fn>).mock.calls.length, 1);
  });

  it('should call check with correct selector', async () => {
    const mockPage = createMockPage();
    await interactionCommands.check(mockPage, { selector: '[data-testid=cb]' });

    const calls = (mockPage.check as ReturnType<typeof mock.fn>).mock.calls;
    assert.strictEqual(calls[0].arguments[0], '[data-testid=cb]');
  });
});

describe('interactionCommands - waitForSelector', () => {
  it('should wait for selector with default timeout', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.waitForSelector(mockPage, { selector: '.loaded' });

    assert.deepStrictEqual(result, { selector: '.loaded' });
    const calls = (mockPage.waitForSelector as ReturnType<typeof mock.fn>).mock.calls;
    assert.strictEqual(calls.length, 1);
  });

  it('should wait for selector with custom timeout', async () => {
    const mockPage = createMockPage();
    await interactionCommands.waitForSelector(mockPage, { selector: '.item', timeout: 5000 });

    const calls = (mockPage.waitForSelector as ReturnType<typeof mock.fn>).mock.calls;
    const options = calls[0].arguments[1] as Record<string, unknown>;
    assert.strictEqual(options.timeout, 5000);
  });
});
