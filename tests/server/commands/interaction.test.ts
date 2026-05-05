import { describe, it, expect, vi } from 'vitest';
import { interactionCommands } from '../../../src/server/commands/interaction.js';
import type { Page, Locator } from 'playwright-core';

function createMockPage(overrides: Partial<Page> = {}): Page {
  const mockLocator: Locator = {
    scrollIntoViewIfNeeded: vi.fn(async () => {}),
  } as unknown as Locator;

  return {
    click: vi.fn(async () => {}),
    fill: vi.fn(async () => {}),
    type: vi.fn(async () => {}),
    press: vi.fn(async () => {}),
    hover: vi.fn(async () => {}),
    evaluate: vi.fn(async () => {}),
    locator: vi.fn(() => mockLocator),
    selectOption: vi.fn(() => Promise.resolve([])),
    check: vi.fn(() => Promise.resolve()),
    waitForSelector: vi.fn(() => Promise.resolve({})),
    waitForTimeout: vi.fn(async () => {}),
    waitForLoadState: vi.fn(async () => {}),
    ...overrides,
  } as unknown as Page;
}

describe('interactionCommands - click', () => {
  it('should click element by selector', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.click(mockPage, { selector: '#button' });

    expect(result).toStrictEqual({ selector: '#button' });
    expect((mockPage.click as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('should pass timeout option to click', async () => {
    const mockPage = createMockPage();
    await interactionCommands.click(mockPage, { selector: '#btn', timeout: 5000 });

    const calls = (mockPage.click as ReturnType<typeof vi.fn>).mock.calls;
    const options = calls[0][1] as Record<string, unknown>;
    expect(options.timeout).toBe(5000);
  });

  it('should pass force option to click', async () => {
    const mockPage = createMockPage();
    await interactionCommands.click(mockPage, { selector: '#btn', force: true });

    const calls = (mockPage.click as ReturnType<typeof vi.fn>).mock.calls;
    const options = calls[0][1] as Record<string, unknown>;
    expect(options.force).toBe(true);
  });

  it('should wait for selector before clicking when element not immediately visible', async () => {
    const mockPage = createMockPage();
    await interactionCommands.click(mockPage, { selector: '#btn', timeout: 3000 });

    const waitCalls = (mockPage.waitForSelector as ReturnType<typeof vi.fn>).mock.calls;
    expect(waitCalls.length).toBe(1);
    expect(waitCalls[0][0]).toBe('#btn');
  });
});

describe('interactionCommands - select', () => {
  it('should select option by selector and value', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.select(mockPage, {
      selector: '#city',
      value: 'shanghai',
    });

    expect(result).toStrictEqual({ selector: '#city', value: 'shanghai' });
    expect((mockPage.selectOption as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('should call selectOption with correct arguments', async () => {
    const mockPage = createMockPage();
    await interactionCommands.select(mockPage, { selector: '#sel', value: 'opt1' });

    const calls = (mockPage.selectOption as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe('#sel');
    expect(calls[0][1]).toBe('opt1');
  });
});

describe('interactionCommands - check', () => {
  it('should check checkbox by selector', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.check(mockPage, { selector: '#agree' });

    expect(result).toStrictEqual({ selector: '#agree' });
    expect((mockPage.check as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('should call check with correct selector', async () => {
    const mockPage = createMockPage();
    await interactionCommands.check(mockPage, { selector: '[data-testid=cb]' });

    const calls = (mockPage.check as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe('[data-testid=cb]');
  });
});

describe('interactionCommands - waitForSelector', () => {
  it('should wait for selector with default timeout', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.waitForSelector(mockPage, { selector: '.loaded' });

    expect(result).toStrictEqual({ selector: '.loaded' });
    const calls = (mockPage.waitForSelector as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBe(1);
  });

  it('should wait for selector with custom timeout', async () => {
    const mockPage = createMockPage();
    await interactionCommands.waitForSelector(mockPage, { selector: '.item', timeout: 5000 });

    const calls = (mockPage.waitForSelector as ReturnType<typeof vi.fn>).mock.calls;
    const options = calls[0][1] as Record<string, unknown>;
    expect(options.timeout).toBe(5000);
  });
});
