import { describe, it, expect, vi } from 'vitest';
import { interactionCommands } from '../../../src/server/commands/interaction.js';
import type { Page, Locator } from 'playwright-core';

function createMockPage(overrides: Record<string, unknown> = {}): Page {
  const mockLocator: Locator = {
    scrollIntoViewIfNeeded: vi.fn(() => Promise.resolve()),
    first: vi.fn(() => ({
      textContent: vi.fn(() => Promise.resolve('')),
      innerHTML: vi.fn(() => Promise.resolve('')),
      evaluate: vi.fn(() => Promise.resolve('')),
      inputValue: vi.fn(() => Promise.resolve('')),
      isChecked: vi.fn(() => Promise.resolve(false)),
      isDisabled: vi.fn(() => Promise.resolve(false)),
      getAttribute: vi.fn(() => Promise.resolve(null)),
    })),
  } as unknown as Locator;

  return {
    click: vi.fn(() => Promise.resolve()),
    dblclick: vi.fn(() => Promise.resolve()),
    fill: vi.fn(() => Promise.resolve()),
    type: vi.fn(() => Promise.resolve()),
    press: vi.fn(() => Promise.resolve()),
    hover: vi.fn(() => Promise.resolve()),
    evaluate: vi.fn(() => Promise.resolve(undefined)),
    locator: vi.fn(() => mockLocator),
    selectOption: vi.fn(() => Promise.resolve([])),
    check: vi.fn(() => Promise.resolve()),
    uncheck: vi.fn(() => Promise.resolve()),
    waitForSelector: vi.fn(() => Promise.resolve({})),
    ...overrides,
  } as unknown as Page;
}

describe('interactionCommands - check branches', () => {
  it('should call uncheck when checked is false', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.check(mockPage, {
      selector: '#cb',
      checked: false,
    });
    expect(result).toStrictEqual({ selector: '#cb', checked: false });
    expect((mockPage.uncheck as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect((mockPage.check as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });

  it('should pass force option to uncheck', async () => {
    const mockPage = createMockPage();
    await interactionCommands.check(mockPage, {
      selector: '#cb',
      checked: false,
      force: true,
    });
    const calls = (mockPage.uncheck as ReturnType<typeof vi.fn>).mock.calls;
    expect((calls[0][1] as Record<string, unknown>).force).toBe(true);
  });

  it('should pass force option to check', async () => {
    const mockPage = createMockPage();
    await interactionCommands.check(mockPage, {
      selector: '#cb',
      checked: true,
      force: true,
    });
    const calls = (mockPage.check as ReturnType<typeof vi.fn>).mock.calls;
    expect((calls[0][1] as Record<string, unknown>).force).toBe(true);
  });
});

describe('interactionCommands - waitForSelector state option', () => {
  it('should pass state=hidden to waitForSelector', async () => {
    const mockPage = createMockPage();
    await interactionCommands.waitForSelector(mockPage, {
      selector: '.loading',
      state: 'hidden',
    });
    const calls = (mockPage.waitForSelector as ReturnType<typeof vi.fn>).mock.calls;
    expect((calls[0][1] as Record<string, unknown>).state).toBe('hidden');
  });

  it('should pass state=attached to waitForSelector', async () => {
    const mockPage = createMockPage();
    await interactionCommands.waitForSelector(mockPage, {
      selector: '#app',
      state: 'attached',
    });
    const calls = (mockPage.waitForSelector as ReturnType<typeof vi.fn>).mock.calls;
    expect((calls[0][1] as Record<string, unknown>).state).toBe('attached');
  });

  it('should pass state=detached to waitForSelector', async () => {
    const mockPage = createMockPage();
    await interactionCommands.waitForSelector(mockPage, {
      selector: '.modal',
      state: 'detached',
    });
    const calls = (mockPage.waitForSelector as ReturnType<typeof vi.fn>).mock.calls;
    expect((calls[0][1] as Record<string, unknown>).state).toBe('detached');
  });

  it('should pass state=visible to waitForSelector', async () => {
    const mockPage = createMockPage();
    await interactionCommands.waitForSelector(mockPage, {
      selector: '.content',
      state: 'visible',
    });
    const calls = (mockPage.waitForSelector as ReturnType<typeof vi.fn>).mock.calls;
    expect((calls[0][1] as Record<string, unknown>).state).toBe('visible');
  });
});

describe('interactionCommands - click with extra options', () => {
  it('should pass clickCount option', async () => {
    const mockPage = createMockPage();
    await interactionCommands.click(mockPage, {
      selector: '#btn',
      clickCount: 3,
    });
    const calls = (mockPage.click as ReturnType<typeof vi.fn>).mock.calls;
    expect((calls[0][1] as Record<string, unknown>).clickCount).toBe(3);
  });

  it('should pass delay option', async () => {
    const mockPage = createMockPage();
    await interactionCommands.click(mockPage, {
      selector: '#btn',
      delay: 100,
    });
    const calls = (mockPage.click as ReturnType<typeof vi.fn>).mock.calls;
    expect((calls[0][1] as Record<string, unknown>).delay).toBe(100);
  });

  it('should pass button option', async () => {
    const mockPage = createMockPage();
    await interactionCommands.click(mockPage, {
      selector: '#btn',
      button: 'right',
    });
    const calls = (mockPage.click as ReturnType<typeof vi.fn>).mock.calls;
    expect((calls[0][1] as Record<string, unknown>).button).toBe('right');
  });
});

describe('interactionCommands - dblclick with delay', () => {
  it('should pass delay option to dblclick', async () => {
    const mockPage = createMockPage();
    await interactionCommands.dblclick(mockPage, {
      selector: '#el',
      delay: 50,
    });
    const calls = (mockPage.dblclick as ReturnType<typeof vi.fn>).mock.calls;
    expect((calls[0][1] as Record<string, unknown>).delay).toBe(50);
  });
});

describe('interactionCommands - fill with timeout', () => {
  it('should pass timeout to waitForSelector in fill', async () => {
    const mockPage = createMockPage({
      evaluate: vi.fn(() => Promise.resolve(undefined)),
    });
    await interactionCommands.fill(mockPage, {
      selector: '#input',
      value: 'test',
      clear: false,
      timeout: 3000,
    });
    const waitCalls = (mockPage.waitForSelector as ReturnType<typeof vi.fn>).mock.calls;
    expect((waitCalls[0][1] as Record<string, unknown>).timeout).toBe(3000);
  });
});
