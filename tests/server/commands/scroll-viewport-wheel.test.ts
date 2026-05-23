import { describe, it, expect, vi } from 'vitest';
import { interactionCommands } from '../../../src/server/commands/interaction.js';
import { navigationCommands } from '../../../src/server/commands/navigation.js';
import type { Page, Locator } from 'playwright-core';

function createMockPage(overrides: Record<string, unknown> = {}): Page {
  const mockLocator: Locator = {
    scrollIntoViewIfNeeded: vi.fn(() => Promise.resolve()),
  } as unknown as Locator;

  return {
    evaluate: vi.fn(() => Promise.resolve()),
    locator: vi.fn(() => mockLocator),
    mouse: {
      move: vi.fn(() => Promise.resolve()),
      down: vi.fn(() => Promise.resolve()),
      up: vi.fn(() => Promise.resolve()),
      click: vi.fn(() => Promise.resolve()),
      dblclick: vi.fn(() => Promise.resolve()),
      wheel: vi.fn(() => Promise.resolve()),
    },
    url: vi.fn(() => 'https://example.com'),
    viewportSize: vi.fn(() => ({ width: 1280, height: 720 })),
    ...overrides,
  } as unknown as Page;
}

describe('interactionCommands - scroll', () => {
  it('should scroll to absolute position with x and y', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.scroll(mockPage, { x: 100, y: 200 });

    expect(result).toStrictEqual({ x: 100, y: 200 });
    expect(mockPage.evaluate).toHaveBeenCalledWith('window.scrollTo(100, 200)');
  });

  it('should scroll to (0, 0) when no args provided', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.scroll(mockPage, {});

    expect(result).toStrictEqual({ x: 0, y: 0 });
    expect(mockPage.evaluate).toHaveBeenCalledWith('window.scrollTo(0, 0)');
  });

  it('should scroll by relative delta with deltaX and deltaY', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.scroll(mockPage, { deltaX: 50, deltaY: -200 });

    expect(result).toStrictEqual({ deltaX: 50, deltaY: -200 });
    expect(mockPage.evaluate).toHaveBeenCalledWith('window.scrollBy(50, -200)');
  });

  it('should scroll by deltaY only when deltaX is 0', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.scroll(mockPage, { deltaX: 0, deltaY: 300 });

    expect(result).toStrictEqual({ deltaX: 0, deltaY: 300 });
    expect(mockPage.evaluate).toHaveBeenCalledWith('window.scrollBy(0, 300)');
  });

  it('should scroll element into view when selector provided', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.scroll(mockPage, { selector: '#footer' });

    expect(result).toStrictEqual({ scrolledTo: '#footer' });
    expect(mockPage.evaluate).not.toHaveBeenCalled();
  });

  it('should prioritize selector over coordinates', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.scroll(mockPage, { selector: '#section', x: 100 });

    expect(result).toStrictEqual({ scrolledTo: '#section' });
  });
});

describe('interactionCommands - mouse wheel', () => {
  it('should call mouse.move then mouse.wheel with deltas', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.mouse(mockPage, {
      action: 'wheel',
      x: 400,
      y: 300,
      deltaX: 10,
      deltaY: -50,
    });

    expect(result).toStrictEqual({ action: 'wheel', x: 400, y: 300 });
    expect(mockPage.mouse.move).toHaveBeenCalledWith(400, 300);
    expect(mockPage.mouse.wheel).toHaveBeenCalledWith(10, -50);
  });

  it('should default deltaX and deltaY to 0', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.mouse(mockPage, {
      action: 'wheel',
      x: 100,
      y: 200,
    });

    expect(mockPage.mouse.wheel).toHaveBeenCalledWith(0, 0);
  });
});

describe('navigationCommands - viewport', () => {
  it('should return current viewport dimensions', async () => {
    const mockPage = createMockPage();
    const result = await navigationCommands.viewport(mockPage, {});

    expect(result).toStrictEqual({ width: 1280, height: 720 });
  });

  it('should return 0 when viewportSize returns null', async () => {
    const mockPage = createMockPage({ viewportSize: vi.fn(() => null) });
    const result = await navigationCommands.viewport(mockPage, {});

    expect(result).toStrictEqual({ width: 0, height: 0 });
  });

  it('should return partial dimensions when only width is set', async () => {
    const mockPage = createMockPage({ viewportSize: vi.fn(() => ({ width: 800 })) });
    const result = await navigationCommands.viewport(mockPage, {});

    expect(result).toStrictEqual({ width: 800, height: 0 });
  });
});
