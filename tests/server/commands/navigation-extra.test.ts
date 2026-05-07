import { describe, it, expect, vi } from 'vitest';
import { navigationCommands } from '../../../src/server/commands/navigation.js';
import type { Page, Frame } from 'playwright-core';

function createMockPage(overrides: Record<string, unknown> = {}): Page {
  return {
    goto: vi.fn(() => Promise.resolve()),
    goBack: vi.fn(() => Promise.resolve()),
    goForward: vi.fn(() => Promise.resolve()),
    reload: vi.fn(() => Promise.resolve()),
    title: vi.fn(() => Promise.resolve('Test Page')),
    url: vi.fn(() => 'https://example.com/page'),
    ...overrides,
  } as unknown as Page;
}

describe('navigationCommands - goBack', () => {
  it('should go back and return URL', async () => {
    const mockPage = createMockPage();
    const result = await navigationCommands.goBack(mockPage, {});
    expect(result).toStrictEqual({ url: 'https://example.com/page' });
    expect((mockPage.goBack as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});

describe('navigationCommands - goForward', () => {
  it('should go forward and return URL', async () => {
    const mockPage = createMockPage();
    const result = await navigationCommands.goForward(mockPage, {});
    expect(result).toStrictEqual({ url: 'https://example.com/page' });
    expect((mockPage.goForward as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});

describe('navigationCommands - reload', () => {
  it('should reload page and return URL', async () => {
    const mockPage = createMockPage();
    const result = await navigationCommands.reload(mockPage, {});
    expect(result).toStrictEqual({ url: 'https://example.com/page' });
    expect((mockPage.reload as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});

describe('navigationCommands - getUrl with Frame', () => {
  it('should use Frame.url() when ctx is a Frame (no Page.url)', async () => {
    const mockFrame = {
      url: vi.fn(() => 'https://frame.example.com'),
      title: vi.fn(() => Promise.resolve('Frame Title')),
    } as unknown as Frame;

    const result = await navigationCommands.url(mockFrame, {});
    expect(result).toStrictEqual({ url: 'https://frame.example.com' });
  });

  it('should use Page.url() when ctx is a Page', async () => {
    const mockPage = createMockPage();
    const result = await navigationCommands.url(mockPage, {});
    expect(result).toStrictEqual({ url: 'https://example.com/page' });
  });
});

describe('navigationCommands - goto with getUrl via Frame fallback', () => {
  it('should navigate and return URL via getUrl', async () => {
    const mockPage = createMockPage();
    const result = await navigationCommands.goto(mockPage, { url: 'https://example.com/new' });
    expect(result).toStrictEqual({ url: 'https://example.com/page' });
  });
});

describe('navigationCommands - goBack with Frame', () => {
  it('should call goBack on page-like context', async () => {
    const mockPage = createMockPage({
      goBack: vi.fn(() => Promise.resolve()),
    });
    await navigationCommands.goBack(mockPage, {});
    expect((mockPage.goBack as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});
