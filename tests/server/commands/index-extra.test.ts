import { describe, it, expect, vi } from 'vitest';
import { executePageCommand } from '../../../src/server/commands/index.js';
import type { Page, Frame } from 'playwright-core';

function createMockFrame(url: string, name: string): Frame {
  return {
    url: vi.fn(() => url),
    name: vi.fn(() => name),
    evaluate: vi.fn(() => Promise.resolve(url)),
  } as unknown as Frame;
}

function createMockPage(frames: Frame[] = []): Page {
  return {
    frames: vi.fn(() => frames),
    url: vi.fn(() => 'https://example.com'),
    evaluate: vi.fn(() => Promise.resolve('https://example.com')),
  } as unknown as Page;
}

describe('executePageCommand - frame routing', () => {
  it('should use page context when frame is undefined', async () => {
    const mockPage = createMockPage();
    const result = await executePageCommand(mockPage, 'url', {});
    expect(result).toStrictEqual({ url: 'https://example.com' });
  });

  it('should route to frame by numeric index', async () => {
    const frame0 = createMockFrame('https://frame0.com', 'frame0');
    const frame1 = createMockFrame('https://frame1.com', 'frame1');
    const mockPage = createMockPage([frame0, frame1]);
    const result = await executePageCommand(mockPage, 'url', { frame: 1 });
    expect(result).toStrictEqual({ url: 'https://frame1.com' });
  });

  it('should fall back to page when numeric frame index is out of bounds', async () => {
    const mockPage = createMockPage([]);
    const result = await executePageCommand(mockPage, 'url', { frame: 99 });
    expect(result).toStrictEqual({ url: 'https://example.com' });
  });

  it('should route to frame by URL substring match', async () => {
    const frame0 = createMockFrame('https://cdn.example.com/widget', 'widget');
    const mockPage = createMockPage([frame0]);
    const result = await executePageCommand(mockPage, 'url', { frame: 'cdn.example' });
    expect(result).toStrictEqual({ url: 'https://cdn.example.com/widget' });
  });

  it('should route to frame by name when URL does not match', async () => {
    const frame0 = createMockFrame('https://other.com', 'myframe');
    const mockPage = createMockPage([frame0]);
    const result = await executePageCommand(mockPage, 'url', { frame: 'myframe' });
    expect(result).toStrictEqual({ url: 'https://other.com' });
  });

  it('should fall back to page when string frame ref matches nothing', async () => {
    const frame0 = createMockFrame('https://other.com', 'otherframe');
    const mockPage = createMockPage([frame0]);
    const result = await executePageCommand(mockPage, 'url', { frame: 'nonexistent' });
    expect(result).toStrictEqual({ url: 'https://example.com' });
  });

  it('should fall back to page when frames array is empty and frame is string', async () => {
    const mockPage = createMockPage([]);
    const result = await executePageCommand(mockPage, 'url', { frame: 'anything' });
    expect(result).toStrictEqual({ url: 'https://example.com' });
  });

  it('should pass frame ref as number 0 to first frame', async () => {
    const frame0 = createMockFrame('https://frame0.com', 'frame0');
    const frame1 = createMockFrame('https://frame1.com', 'frame1');
    const mockPage = createMockPage([frame0, frame1]);
    const result = await executePageCommand(mockPage, 'url', { frame: 0 });
    expect(result).toStrictEqual({ url: 'https://frame0.com' });
  });
});
